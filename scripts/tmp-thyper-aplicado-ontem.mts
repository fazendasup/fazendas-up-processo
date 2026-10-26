/**
 * Marca Thyper S-50 como aplicado ontem (2026-10-23) em todas as caixas.
 * Atualiza DB local (DATABASE_URL) e Railway (COMERCIAL → database railway).
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

const APLICADO_YMD = "2026-10-23";
const aplicadoTs = `${APLICADO_YMD} 15:00:00`;

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

async function marcarThyper(conn: Connection, label: string) {
  const [projetos] = await conn.query<any[]>(
    `SELECT DISTINCT projetoId FROM ciclos WHERE nome LIKE 'Thyper%'`,
  );
  console.log(`\n=== ${label} projetos=`, projetos);

  for (const { projetoId } of projetos as { projetoId: number }[]) {
    const [thyperRows] = await conn.query<any[]>(
      `SELECT id, nome, ativo, caixaIds,
              DATE_FORMAT(ultimaExecucao,'%Y-%m-%d') ultima
       FROM ciclos
       WHERE projetoId = ? AND nome LIKE 'Thyper%'
       ORDER BY ativo DESC, id ASC`,
      [projetoId],
    );
    if (!(thyperRows as any[]).length) continue;
    console.log(`projeto ${projetoId} thyper`, thyperRows);

    const ativos = (thyperRows as any[]).filter((r) => r.ativo);
    const principal = ativos[0] ?? (thyperRows as any[])[0];

    for (const row of thyperRows as any[]) {
      if (row.id !== principal.id && row.ativo) {
        await conn.query(`UPDATE ciclos SET ativo = 0 WHERE id = ?`, [row.id]);
        console.log(`  desativou dup id=${row.id}`);
      }
    }

    let caixaIds = parseIds(principal.caixaIds);
    if (caixaIds.length === 0) {
      const [caixas] = await conn.query<any[]>(
        `SELECT id FROM caixas_agua WHERE projetoId = ? ORDER BY id`,
        [projetoId],
      );
      caixaIds = (caixas as any[]).map((c) => Number(c.id));
    }

    await conn.query(
      `UPDATE ciclos SET
         ativo = 1,
         nome = 'Thyper S-50',
         produto = 'Thyper S-50',
         frequencia = 'personalizada',
         intervaloDias = 2,
         alvo = 'caixa',
         caixaIds = ?,
         ultimaExecucao = TIMESTAMP(?),
         ultimoExecutorNome = 'Registro pós-aplicação (ontem)'
       WHERE id = ?`,
      [JSON.stringify(caixaIds), aplicadoTs, principal.id],
    );

    for (const caixaId of caixaIds) {
      await conn.query(
        `INSERT INTO ciclo_caixa_execucoes
           (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda, executorNome)
         VALUES (?, ?, ?, TIMESTAMP(?), NULL, 'Registro pós-aplicação (ontem)')
         ON DUPLICATE KEY UPDATE
           ultimaExecucao = TIMESTAMP(?),
           dataAgenda = NULL,
           executorNome = 'Registro pós-aplicação (ontem)'`,
        [projetoId, principal.id, caixaId, aplicadoTs, aplicadoTs],
      );
    }

    const [depois] = await conn.query<any[]>(
      `SELECT c.id,
              DATE_FORMAT(c.ultimaExecucao,'%Y-%m-%d') ultima_ciclo,
              COUNT(e.id) caixas,
              DATE_FORMAT(MIN(e.ultimaExecucao),'%Y-%m-%d') ultima_cx,
              SUM(CASE WHEN e.dataAgenda IS NOT NULL THEN 1 ELSE 0 END) com_agenda
       FROM ciclos c
       LEFT JOIN ciclo_caixa_execucoes e ON e.cicloId = c.id
       WHERE c.id = ?
       GROUP BY c.id, c.ultimaExecucao`,
      [principal.id],
    );
    console.log(`  depois`, depois);
  }
}

const targets: Array<{ label: string; conn: Connection }> = [];

if (process.env.DATABASE_URL) {
  targets.push({
    label: "DATABASE_URL",
    conn: await mysql.createConnection(process.env.DATABASE_URL),
  });
}

if (process.env.COMERCIAL_DATABASE_URL) {
  const u = new URL(
    process.env.COMERCIAL_DATABASE_URL.replace(/^mysql:\/\//, "http://"),
  );
  targets.push({
    label: "railway (via COMERCIAL_DATABASE_URL)",
    conn: await mysql.createConnection({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: "railway",
    }),
  });
}

if (!targets.length) throw new Error("Nenhuma connection string");

for (const t of targets) {
  try {
    await marcarThyper(t.conn, t.label);
  } catch (err) {
    console.error(`FALHA ${t.label}:`, err instanceof Error ? err.message : err);
  } finally {
    await t.conn.end();
  }
}

console.log(`\nOK — Thyper aplicado em ${APLICADO_YMD}; próxima prevista ~2026-10-25`);
