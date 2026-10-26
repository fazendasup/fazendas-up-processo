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
const [ciclosRaw] = await conn.query<any[]>(
  `SELECT * FROM ciclos WHERE projetoId = ?`,
  [PROJETO_ID],
);
const [execs] = await conn.query<any[]>(
  `SELECT * FROM ciclo_caixa_execucoes WHERE projetoId = ?`,
  [PROJETO_ID],
);
const [caixas] = await conn.query<any[]>(
  `SELECT id FROM caixas_agua WHERE projetoId = ?`,
  [PROJETO_ID],
);
const caixaSlug = new Map((caixas as any[]).map((c) => [c.id, `cx-${c.id}`]));

function ymd(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

const ciclos: CicloAplicacao[] = (ciclosRaw as any[]).map((c) => {
  let caixaIds: string[] = [];
  const raw = c.caixaIds;
  const nums = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? JSON.parse(raw || "[]")
      : [];
  caixaIds = nums.map((id: number) => caixaSlug.get(id)).filter(Boolean) as string[];
  return {
    id: `c-${c.id}`,
    nome: c.nome,
    frequencia: c.frequencia,
    diasSemana: c.diasSemana ?? undefined,
    intervaloDias: c.intervaloDias ?? undefined,
    produto: c.produto,
    tipo: c.tipo,
    dosagem: c.dosagem ?? undefined,
    fasesAplicaveis: typeof c.fasesAplicaveis === "string" ? JSON.parse(c.fasesAplicaveis) : c.fasesAplicaveis || [],
    alvo: c.alvo,
    caixaIds,
    execucoesCaixa: (execs as any[])
      .filter((e) => e.cicloId === c.id)
      .map((e) => ({
        caixaId: caixaSlug.get(e.caixaAguaId) || "",
        ultimaExecucao: ymd(e.ultimaExecucao),
        dataAgenda: ymd(e.dataAgenda),
      }))
      .filter((e) => e.caixaId),
    dataInicio: ymd(c.dataInicio),
    ultimaExecucao: ymd(c.ultimaExecucao),
    ativo: Boolean(c.ativo),
  };
});

const hoje = new Date(2026, 9, 23, 12, 0, 0);
const pendentes = ciclos.filter((c) => cicloPendenteNoProtocolo(c, ciclos, hoje));
console.log(
  "PENDENTES 2026-10-23",
  pendentes.map((c) => c.nome),
);
console.log(
  "resumo ativos",
  ciclos
    .filter((c) => c.ativo)
    .map((c) => ({
      nome: c.nome,
      ultima: c.ultimaExecucao,
      agenda: c.execucoesCaixa?.[0]?.dataAgenda,
      caixas: c.caixaIds?.length,
      pendente: cicloPendenteNoProtocolo(c, ciclos, hoje),
    })),
);

await conn.end();
