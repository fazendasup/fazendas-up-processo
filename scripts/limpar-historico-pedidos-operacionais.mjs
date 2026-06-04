/**
 * Limpa o histórico operacional de Pedidos antes do go-live (01/06/2026).
 *
 * Remove:
 * - pedidos_operacionais com data_entrega < 01/06/2026 (itens, avarias e auditoria em cascade)
 * - avarias órfãs com data_entrega < 01/06/2026 (caso existam)
 * - fechamentos_semanais com semana_inicio < 01/06/2026
 *
 * Segurança:
 * - roda em dry-run por padrão;
 * - só aplica com --apply e com confirmação textual;
 * - não deve ser usado para apagar histórico do projeto "Fazenda Vertical - FUP".
 *
 * Uso:
 *   node scripts/limpar-historico-pedidos-operacionais.mjs
 *   node scripts/limpar-historico-pedidos-operacionais.mjs --apply --confirm NAO_E_FAZENDA_VERTICAL_FUP
 */
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const GO_LIVE = "2026-06-01 00:00:00";
const apply = process.argv.includes("--apply");
const confirmIndex = process.argv.indexOf("--confirm");
const confirmValue = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : "";
const CONFIRMACAO = "NAO_E_FAZENDA_VERTICAL_FUP";
const dryRun = !apply;

const DATABASE_URL = process.env.COMERCIAL_DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error("COMERCIAL_DATABASE_URL não definida no .env");
  process.exit(1);
}

if (apply && confirmValue !== CONFIRMACAO) {
  console.error(`Confirmação ausente. Para aplicar, use: --apply --confirm ${CONFIRMACAO}`);
  console.error('Não execute este script em dados do projeto "Fazenda Vertical - FUP".');
  process.exit(1);
}

async function count(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return Number(rows[0]?.n ?? 0);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    const pedidos = await count(
      conn,
      "SELECT COUNT(*) AS n FROM pedidos_operacionais WHERE data_entrega < ?",
      [GO_LIVE],
    );
    const itens = await count(
      conn,
      `SELECT COUNT(*) AS n FROM pedidos_operacionais_itens i
       INNER JOIN pedidos_operacionais p ON p.id = i.pedido_id
       WHERE p.data_entrega < ?`,
      [GO_LIVE],
    );
    const avarias = await count(
      conn,
      "SELECT COUNT(*) AS n FROM pedidos_operacionais_avarias WHERE data_entrega < ?",
      [GO_LIVE],
    );
    const auditoria = await count(
      conn,
      `SELECT COUNT(*) AS n FROM pedidos_operacionais_auditoria a
       INNER JOIN pedidos_operacionais p ON p.id = a.pedido_id
       WHERE p.data_entrega < ?`,
      [GO_LIVE],
    );
    const fechamentos = await count(
      conn,
      "SELECT COUNT(*) AS n FROM fechamentos_semanais WHERE semana_inicio < ?",
      [GO_LIVE],
    );

    console.log("Corte:", GO_LIVE);
    console.log("Pedidos operacionais:", pedidos);
    console.log("Itens vinculados:", itens);
    console.log("Avarias vinculadas:", avarias);
    console.log("Auditoria vinculada:", auditoria);
    console.log("Fechamentos semanais:", fechamentos);

    if (dryRun) {
      console.log("[dry-run] Nenhuma alteração aplicada. Use --apply com confirmação para limpar.");
      return;
    }

    if (pedidos + avarias + fechamentos === 0) {
      console.log("[OK] Nada para limpar.");
      return;
    }

    await conn.beginTransaction();
    const [delPedidos] = await conn.execute(
      "DELETE FROM pedidos_operacionais WHERE data_entrega < ?",
      [GO_LIVE],
    );
    const [delAvariasOrfas] = await conn.execute(
      "DELETE FROM pedidos_operacionais_avarias WHERE data_entrega < ?",
      [GO_LIVE],
    );
    const [delFechamentos] = await conn.execute(
      "DELETE FROM fechamentos_semanais WHERE semana_inicio < ?",
      [GO_LIVE],
    );
    await conn.commit();

    console.log("[OK] Limpeza concluída.");
    console.log("Pedidos removidos:", delPedidos.affectedRows ?? 0);
    console.log("Avarias removidas (órfãs/restantes):", delAvariasOrfas.affectedRows ?? 0);
    console.log("Fechamentos removidos:", delFechamentos.affectedRows ?? 0);

    const restantes = await count(conn, "SELECT COUNT(*) AS n FROM pedidos_operacionais");
    console.log("Pedidos restantes:", restantes);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
