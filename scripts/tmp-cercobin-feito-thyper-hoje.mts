/**
 * Cercobin já foi aplicado neste ciclo (após Infinito 19).
 * Assume aplicação em 22/10 (dia da agenda / folga 3d).
 * Thyper: última 20/10 → devida 22/10; com folga 1d após Cercobin → liberar HOJE 23/10.
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { instanteMeioDia } from "../shared/cicloSequencia.ts";

const PROJETO_ID = 1;
const CERCOBIN_YMD = "2026-10-22";
const THYPER_AGENDA_YMD = "2026-10-23"; // hoje — atrasado desde 22, ok após cercobin 22

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

function parseIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const [ciclos] = await conn.query<any[]>(
  `SELECT id, nome, caixaIds FROM ciclos WHERE projetoId = ? AND ativo = 1`,
  [PROJETO_ID],
);
const cercobin = ciclos.find((c) => String(c.nome).toLowerCase().includes("cercobin"));
const thyper = ciclos.find((c) => String(c.nome).toLowerCase().includes("thyper"));
if (!cercobin || !thyper) throw new Error("Cercobin/Thyper não encontrados");

const caixas = parseIds(cercobin.caixaIds);
const dtCercobin = instanteMeioDia(CERCOBIN_YMD);
const dtThyperAgenda = instanteMeioDia(THYPER_AGENDA_YMD);

// 1) Cercobin feito em 22/10
await conn.query(
  `UPDATE ciclos
   SET ultimaExecucao = ?, ultimoExecutorNome = 'Registro pós-aplicação', dataInicio = ?
   WHERE id = ? AND projetoId = ?`,
  [dtCercobin, dtCercobin, cercobin.id, PROJETO_ID],
);

for (const caixaId of caixas) {
  const [ex] = await conn.query<any[]>(
    `SELECT id FROM ciclo_caixa_execucoes WHERE cicloId = ? AND caixaAguaId = ?`,
    [cercobin.id, caixaId],
  );
  if (ex[0]) {
    await conn.query(
      `UPDATE ciclo_caixa_execucoes
       SET ultimaExecucao = ?, dataAgenda = NULL, executorNome = 'Registro pós-aplicação'
       WHERE id = ?`,
      [dtCercobin, ex[0].id],
    );
  } else {
    await conn.query(
      `INSERT INTO ciclo_caixa_execucoes
        (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda, executorNome)
       VALUES (?, ?, ?, ?, NULL, 'Registro pós-aplicação')`,
      [PROJETO_ID, cercobin.id, caixaId, dtCercobin],
    );
  }
}

// 2) Thyper: limpar adiamento; agenda = hoje (23) — devida 22, liberada após cercobin 22
await conn.query(
  `UPDATE ciclo_caixa_execucoes SET dataAgenda = ? WHERE projetoId = ? AND cicloId = ?`,
  [dtThyperAgenda, PROJETO_ID, thyper.id],
);

console.log({
  cercobin: `registrado aplicado em ${CERCOBIN_YMD} → próxima ~05/11`,
  thyper: `agenda ${THYPER_AGENDA_YMD} (hoje) — última 20/10, intervalo 2d, folga ok após cercobin 22`,
  caixas: caixas.length,
});

await conn.end();
