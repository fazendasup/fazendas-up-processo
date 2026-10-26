/**
 * Restaura Thyper como pendente hoje (23/10) sem apagar Calda A / Cercobin / Infinito.
 * Causa do sumiço: ultimaExecucao foi para 2026-10-23 (feito), então a UI tirou da fila.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { cicloPendenteNoProtocolo } from "../client/src/lib/utils-farm";
import type { CicloAplicacao } from "../client/src/lib/types";

const comercial = process.env.COMERCIAL_DATABASE_URL!;
const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

const PROJETO_ID = 2;
const HOJE = "2026-10-23";
const ULTIMA_THYPER = "2026-10-20"; // última aplicação real antes de hoje

const [antes] = await conn.query<any[]>(
  `SELECT id, nome, ativo,
          DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima,
          DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio,
          caixaIds
   FROM ciclos WHERE projetoId = ? AND nome LIKE 'Thyper%' ORDER BY id`,
  [PROJETO_ID],
);
console.log("thyper antes", antes);

// Um só Thyper ativo
const ativos = (antes as any[]).filter((r) => r.ativo);
const principalId = Number((ativos[0] ?? (antes as any[])[0]).id);
for (const row of antes as any[]) {
  if (row.id !== principalId) {
    await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = ?`, [row.id]);
  }
}

const [caixas] = await conn.query<any[]>(
  `SELECT id FROM caixas_agua WHERE projetoId = ? ORDER BY id`,
  [PROJETO_ID],
);
const caixaIds = (caixas as any[]).map((c) => Number(c.id));

await conn.query(
  `UPDATE ciclos SET
     ativo = 1,
     nome = 'Thyper S-50',
     produto = 'Thyper S-50',
     frequencia = 'personalizada',
     intervaloDias = 2,
     alvo = 'caixa',
     fasesAplicaveis = ?,
     caixaIds = ?,
     dataInicio = TIMESTAMP('${ULTIMA_THYPER} 15:00:00'),
     ultimaExecucao = TIMESTAMP('${ULTIMA_THYPER} 15:00:00')
   WHERE id = ?`,
  [JSON.stringify(["mudas", "vegetativa", "maturacao"]), JSON.stringify(caixaIds), principalId],
);

for (const caixaId of caixaIds) {
  await conn.query(
    `INSERT INTO ciclo_caixa_execucoes
       (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda)
     VALUES (?, ?, ?, TIMESTAMP('${ULTIMA_THYPER} 15:00:00'), TIMESTAMP('${HOJE} 15:00:00'))
     ON DUPLICATE KEY UPDATE
       ultimaExecucao = TIMESTAMP('${ULTIMA_THYPER} 15:00:00'),
       dataAgenda = TIMESTAMP('${HOJE} 15:00:00')`,
    [PROJETO_ID, principalId, caixaId],
  );
}

// Garantir Calda A sexta
await conn.query(
  `UPDATE ciclos SET frequencia = 'semanal', diasSemana = ?, ativo = 1,
     dataInicio = LEAST(COALESCE(dataInicio, TIMESTAMP('2026-10-09 15:00:00')), TIMESTAMP('2026-10-09 15:00:00'))
   WHERE projetoId = ? AND nome = 'Calda A'`,
  [JSON.stringify([5]), PROJETO_ID],
);

const [ciclosRaw] = await conn.query<any[]>(`SELECT * FROM ciclos WHERE projetoId = ? AND ativo = 1`, [
  PROJETO_ID,
]);
const [execs] = await conn.query<any[]>(
  `SELECT * FROM ciclo_caixa_execucoes WHERE projetoId = ?`,
  [PROJETO_ID],
);
const slug = new Map(caixaIds.map((id) => [id, `cx-${id}`]));

function ymd(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) {
    // Meio-dia SP gravado como UTC 15:00 → dia civil correto em UTC
    return v.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
}

const ciclos: CicloAplicacao[] = (ciclosRaw as any[]).map((c) => {
  const nums =
    typeof c.caixaIds === "string"
      ? JSON.parse(c.caixaIds || "[]")
      : Array.isArray(c.caixaIds)
        ? c.caixaIds
        : [];
  return {
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: c.frequencia,
    diasSemana: typeof c.diasSemana === "string" ? JSON.parse(c.diasSemana) : c.diasSemana,
    intervaloDias: c.intervaloDias ?? undefined,
    produto: c.produto,
    tipo: c.tipo,
    fasesAplicaveis:
      typeof c.fasesAplicaveis === "string" ? JSON.parse(c.fasesAplicaveis) : c.fasesAplicaveis || [],
    alvo: c.alvo,
    caixaIds: nums.map((id: number) => slug.get(Number(id))).filter(Boolean) as string[],
    execucoesCaixa: (execs as any[])
      .filter((e) => e.cicloId === c.id)
      .map((e) => ({
        caixaId: slug.get(e.caixaAguaId) || "",
        ultimaExecucao: ymd(e.ultimaExecucao),
        dataAgenda: ymd(e.dataAgenda),
      }))
      .filter((e: { caixaId: string }) => e.caixaId),
    dataInicio: ymd(c.dataInicio),
    ultimaExecucao: ymd(c.ultimaExecucao),
    ativo: true,
  };
});

const ref = new Date(2026, 9, 23, 15, 0, 0);
const pendentes = ciclos.filter((c) => cicloPendenteNoProtocolo(c, ciclos, ref)).map((c) => c.nome);
console.log("PENDENTES ESPERADOS NO DASHBOARD:", pendentes);

const [thyperDepois] = await conn.query<any[]>(
  `SELECT c.id, c.nome, c.ativo,
          DATE_FORMAT(c.ultimaExecucao,'%Y-%m-%d') ultima_ciclo,
          COUNT(e.id) execs,
          DATE_FORMAT(MIN(e.ultimaExecucao),'%Y-%m-%d') ultima_cx,
          DATE_FORMAT(MIN(e.dataAgenda),'%Y-%m-%d') agenda_cx
   FROM ciclos c
   LEFT JOIN ciclo_caixa_execucoes e ON e.cicloId = c.id
   WHERE c.projetoId = ? AND c.nome LIKE 'Thyper%'
   GROUP BY c.id, c.nome, c.ativo, c.ultimaExecucao`,
  [PROJETO_ID],
);
console.log("thyper depois", thyperDepois);

await conn.end();

if (!pendentes.includes("Thyper S-50")) {
  console.error("FALHOU: Thyper não está pendente");
  process.exit(1);
}
if (!pendentes.includes("Calda A")) {
  console.error("FALHOU: Calda A não está pendente");
  process.exit(1);
}
console.log("OK — Thyper + Calda A na fila de hoje");
