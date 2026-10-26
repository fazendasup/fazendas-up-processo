/**
 * Sincroniza protocolo Thyper no ERP de produção (MySQL Railway, schema `railway`).
 * Projeto alvo: Fazenda Vertical - FUP (id 2).
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL;
if (!comercial) throw new Error("COMERCIAL_DATABASE_URL ausente");

const u = new URL(comercial.replace(/^mysql:\/\//, "http://"));
const conn = await mysql.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: "railway",
});

const PROJETO_ID = 2;

function parseCaixaIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function upsertExec(
  cicloId: number,
  caixaAguaId: number,
  ultimaYmd: string | null,
  agendaYmd: string | null,
) {
  const ultima = ultimaYmd ? `TIMESTAMP('${ultimaYmd} 15:00:00')` : "NULL";
  const agenda = agendaYmd ? `TIMESTAMP('${agendaYmd} 15:00:00')` : "NULL";
  await conn.query(
    `INSERT INTO ciclo_caixa_execucoes
       (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda)
     VALUES (?, ?, ?, ${ultima}, ${agenda})
     ON DUPLICATE KEY UPDATE
       ultimaExecucao = VALUES(ultimaExecucao),
       dataAgenda = VALUES(dataAgenda)`,
    [PROJETO_ID, cicloId, caixaAguaId],
  );
}

// Desativar Peróxido/Bio em todos os projetos FV (legado)
await conn.query(
  `UPDATE ciclos SET ativo = 0
   WHERE nome IN ('Peróxido', 'Bio') AND ativo = 1`,
);

const [caixasAll] = await conn.query<any[]>(
  `SELECT id, nome, fase FROM caixas_agua WHERE projetoId = ? ORDER BY id`,
  [PROJETO_ID],
);
console.log(
  "caixas",
  (caixasAll as any[]).map((c) => `${c.id}:${c.nome}:${c.fase}`),
);
const todasCaixas = (caixasAll as any[]).map((c) => Number(c.id));
const semMudas = (caixasAll as any[])
  .filter((c) => c.fase !== "mudas")
  .map((c) => Number(c.id));
const soMudas = (caixasAll as any[])
  .filter((c) => c.fase === "mudas")
  .map((c) => Number(c.id));

// Thyper
const [thyperRows] = await conn.query<any[]>(
  `SELECT id, caixaIds FROM ciclos WHERE projetoId = ? AND nome LIKE 'Thyper%' ORDER BY id`,
  [PROJETO_ID],
);
if ((thyperRows as any[]).length === 0) throw new Error("Thyper ausente no projeto 2");
const thyperId = Number((thyperRows as any[])[0].id);
for (const extra of (thyperRows as any[]).slice(1)) {
  await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = ?`, [extra.id]);
}

let thyperCaixas = parseCaixaIds((thyperRows as any[])[0].caixaIds);
if (thyperCaixas.length === 0) thyperCaixas = todasCaixas;

await conn.query(
  `UPDATE ciclos SET
     ativo = 1,
     nome = 'Thyper S-50',
     produto = 'Thyper S-50',
     frequencia = 'personalizada',
     intervaloDias = 2,
     tipo = 'Solução',
     alvo = 'caixa',
     fasesAplicaveis = ?,
     caixaIds = ?,
     dosagem = 'Substitui o peróxido. A cada 2 dias. Conforme SOP.',
     dataInicio = TIMESTAMP('2026-10-20 15:00:00'),
     ultimaExecucao = TIMESTAMP('2026-10-20 15:00:00')
   WHERE id = ?`,
  [JSON.stringify(["mudas", "vegetativa", "maturacao"]), JSON.stringify(thyperCaixas), thyperId],
);

for (const caixaId of thyperCaixas) {
  await upsertExec(thyperId, caixaId, "2026-10-20", "2026-10-23");
}

// Infinito — aplicado 19/10
const [infRows] = await conn.query<any[]>(
  `SELECT id, caixaIds FROM ciclos WHERE projetoId = ? AND nome LIKE 'Infinito%' LIMIT 1`,
  [PROJETO_ID],
);
if ((infRows as any[])[0]) {
  const id = Number((infRows as any[])[0].id);
  let caixas = parseCaixaIds((infRows as any[])[0].caixaIds);
  if (caixas.length === 0) caixas = semMudas;
  await conn.query(
    `UPDATE ciclos SET
       ativo = 1, frequencia = 'quinzenal', intervaloDias = 14, alvo = 'caixa',
       fasesAplicaveis = ?, caixaIds = ?,
       dataInicio = TIMESTAMP('2026-10-19 15:00:00'),
       ultimaExecucao = TIMESTAMP('2026-10-19 15:00:00'),
       dosagem = '310 L: 20 ml. 500 L: 35 ml. Máx. 1 por fase.'
     WHERE id = ?`,
    [JSON.stringify(["vegetativa", "maturacao"]), JSON.stringify(caixas), id],
  );
  for (const caixaId of caixas) {
    await upsertExec(id, caixaId, "2026-10-19", null);
  }
}

// Cercobin — aplicado 22/10
const [cerRows] = await conn.query<any[]>(
  `SELECT id, caixaIds FROM ciclos WHERE projetoId = ? AND nome LIKE 'Cercobin%' LIMIT 1`,
  [PROJETO_ID],
);
if ((cerRows as any[])[0]) {
  const id = Number((cerRows as any[])[0].id);
  let caixas = parseCaixaIds((cerRows as any[])[0].caixaIds);
  if (caixas.length === 0) caixas = semMudas;
  await conn.query(
    `UPDATE ciclos SET
       ativo = 1, frequencia = 'quinzenal', intervaloDias = 14, alvo = 'caixa',
       fasesAplicaveis = ?, caixaIds = ?,
       dataInicio = TIMESTAMP('2026-10-22 15:00:00'),
       ultimaExecucao = TIMESTAMP('2026-10-22 15:00:00'),
       dosagem = '310 L: 6 g. 500 L: 10 g. Máx. 1 por fase.'
     WHERE id = ?`,
    [JSON.stringify(["vegetativa", "maturacao"]), JSON.stringify(caixas), id],
  );
  for (const caixaId of caixas) {
    await upsertExec(id, caixaId, "2026-10-22", null);
  }
}

// Trichoderma mudas — a cada 7 dias a partir de hoje
const [triRows] = await conn.query<any[]>(
  `SELECT id, caixaIds FROM ciclos WHERE projetoId = ? AND nome LIKE '%Trichoderma%' AND ativo = 1 LIMIT 1`,
  [PROJETO_ID],
);
if ((triRows as any[])[0]) {
  const id = Number((triRows as any[])[0].id);
  let caixas = parseCaixaIds((triRows as any[])[0].caixaIds);
  if (caixas.length === 0) caixas = soMudas.length > 0 ? soMudas : todasCaixas.slice(0, 5);
  await conn.query(
    `UPDATE ciclos SET
       ativo = 1, frequencia = 'personalizada', intervaloDias = 7, alvo = 'caixa',
       fasesAplicaveis = ?, caixaIds = ?,
       dataInicio = TIMESTAMP('2026-10-23 15:00:00'),
       ultimaExecucao = NULL
     WHERE id = ?`,
    [JSON.stringify(["mudas"]), JSON.stringify(caixas), id],
  );
}

const [ativos] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, intervaloDias,
          DATE_FORMAT(dataInicio,'%Y-%m-%d') inicio,
          DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima,
          caixaIds
   FROM ciclos WHERE projetoId = ? AND ativo = 1 ORDER BY nome`,
  [PROJETO_ID],
);
console.log("\nativos", ativos);

const [execs] = await conn.query<any[]>(
  `SELECT c.nome,
          COUNT(*) n,
          DATE_FORMAT(MIN(e.ultimaExecucao),'%Y-%m-%d') ultima,
          DATE_FORMAT(MIN(e.dataAgenda),'%Y-%m-%d') agenda
   FROM ciclo_caixa_execucoes e
   JOIN ciclos c ON c.id = e.cicloId
   WHERE c.projetoId = ?
   GROUP BY c.nome
   ORDER BY c.nome`,
  [PROJETO_ID],
);
console.log("execuções", execs);

await conn.end();
console.log("OK sync railway projeto", PROJETO_ID);
