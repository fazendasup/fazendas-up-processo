/**
 * Separa agendas que colidem nas folgas de segurança (hoje 23/10):
 * - Cercobin: permanece devido (22/10) → aplicar HOJE
 * - Thyper: agenda 24/10 (1 dia após Cercobin)
 * - Bio: agenda 25/10 (1 dia após Thyper)
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { instanteMeioDia } from "../shared/cicloSequencia.ts";

const PROJETO_ID = 1;
const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [ciclos] = await conn.query<any[]>(
  `SELECT id, nome FROM ciclos WHERE projetoId = ? AND ativo = 1`,
  [PROJETO_ID],
);
const thyper = ciclos.find((c) => String(c.nome).toLowerCase().includes("thyper"));
const bio = ciclos.find((c) => String(c.nome).toLowerCase() === "bio");
const cercobin = ciclos.find((c) => String(c.nome).toLowerCase().includes("cercobin"));

if (!thyper || !bio || !cercobin) throw new Error("ciclos faltando");

const dtThyper = instanteMeioDia("2026-10-24");
const dtBio = instanteMeioDia("2026-10-25");

// Thyper: agenda 24/10 em todas as execuções (mantém ultima 20/10)
await conn.query(
  `UPDATE ciclo_caixa_execucoes SET dataAgenda = ? WHERE projetoId = ? AND cicloId = ?`,
  [dtThyper, PROJETO_ID, thyper.id],
);

// Bio: garantir execuções com agenda 25/10 nas caixas do ciclo
const [bioRow] = await conn.query<any[]>(`SELECT caixaIds FROM ciclos WHERE id = ?`, [bio.id]);
let caixas: number[] = [];
try {
  caixas = Array.isArray(bioRow[0].caixaIds)
    ? bioRow[0].caixaIds
    : JSON.parse(bioRow[0].caixaIds || "[]");
} catch {
  caixas = [];
}

for (const caixaId of caixas) {
  const [ex] = await conn.query<any[]>(
    `SELECT id FROM ciclo_caixa_execucoes WHERE cicloId = ? AND caixaAguaId = ?`,
    [bio.id, caixaId],
  );
  if (ex[0]) {
    await conn.query(
      `UPDATE ciclo_caixa_execucoes SET dataAgenda = ?, ultimaExecucao = NULL WHERE id = ?`,
      [dtBio, ex[0].id],
    );
  } else {
    await conn.query(
      `INSERT INTO ciclo_caixa_execucoes
        (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda, executorNome)
       VALUES (?, ?, ?, NULL, ?, 'Correção folga')`,
      [PROJETO_ID, bio.id, caixaId, dtBio],
    );
  }
}

console.log({
  cercobin: "mantém agenda 22/10 → aplicar HOJE (23)",
  thyper: "agenda 24/10",
  bio: "agenda 25/10",
  caixasBio: caixas.length,
});

await conn.end();
