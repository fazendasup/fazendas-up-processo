/**
 * Limpeza local: garante comercial@visioneer.com.br como platform_admin e remove utilizadores de teste.
 * Uso: node scripts/cleanup-dev-test-users.mjs
 * Requer DATABASE_URL no .env (mesmo formato que o resto do projeto).
 */
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const COMMERCIAL_EMAIL = "comercial@visioneer.com.br";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL?.trim()) {
  console.error("DATABASE_URL não definida. Copie env.defaults para .env ou defina a variável.");
  process.exit(1);
}

/** Colunas que referenciam users.id (reapontar para o comercial antes de apagar). Nome tabela MySQL + coluna. */
const USER_FK_COLUMNS = [
  ["projetos", "responsavelId"],
  ["vision_cultivo_analyses", "createdByUserId"],
  ["vision_training_samples", "createdByUserId"],
  ["planos_plantio", "criadoPorId"],
  ["receitas_crescimento", "criadoPorId"],
  ["tarefas", "atribuidoParaId"],
  ["tarefas", "concluidoPorId"],
  ["manutencoes", "abertoPorId"],
  ["manutencoes", "concluidoPorId"],
  ["recommendation_rules", "criadoPorId"],
  ["recommendation_rules", "aprovadoPorId"],
  ["registros_colheita", "executadoPorId"],
  ["germinacao", "executadoPorId"],
  ["ciclos", "ultimoExecutorId"],
  ["medicoes_caixa", "executadoPorId"],
  ["medicoes_bancada", "medidoPor"],
  ["aplicacoes_caixa", "executadoPorId"],
  ["aplicacoes_andar", "executadoPorId"],
  ["aplicacoes_bancada", "aplicadoPor"],
  ["transplantios", "executadoPorId"],
  ["intelligent_alerts", "lidoPorId"],
  ["intelligent_alerts", "resolvidoPorId"],
  ["intelligent_alerts", "ignoradoPorId"],
  ["alert_events", "usuarioId"],
];

function isTestUserRow(row) {
  const email = (row.email || "").toLowerCase();
  const openId = String(row.openId || "");
  if (email === COMMERCIAL_EMAIL.toLowerCase()) return false;
  if (
    email.endsWith("@test.com") ||
    email.endsWith("@test.local") ||
    email.endsWith("@iso.test") ||
    /^testlogin_/i.test(email) ||
    /^newuser_.*@test\.com$/i.test(email) ||
    /^operator.*@test\.com$/i.test(email) ||
    /^admin.*@test\.com$/i.test(email) ||
    /^admin-sensitive@test\.com$/i.test(email) ||
    /^operator-sensitive@test\.com$/i.test(email) ||
    /^operator-onda2@test\.com$/i.test(email) ||
    /^admin-onda2@test\.com$/i.test(email) ||
    openId.startsWith("test-") ||
    openId.includes("test_operator")
  ) {
    return true;
  }
  return false;
}

async function tableExists(conn, name) {
  const [rows] = await conn.execute(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [name],
  );
  return rows.length > 0;
}

async function columnExists(conn, table, col) {
  const [rows] = await conn.execute(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
    [table, col],
  );
  return rows.length > 0;
}

/** Migração 0024 pode não estar aplicada; sem isto o UPDATE para platform_admin falha. */
async function ensureUsersRoleEnumHasPlatformAdmin(conn) {
  const [rows] = await conn.execute(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role' LIMIT 1",
  );
  const ct = rows[0]?.COLUMN_TYPE || "";
  if (ct.includes("platform_admin")) return;
  await conn.execute(
    "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'admin', 'platform_admin') NOT NULL DEFAULT 'user'",
  );
  console.log("[OK] ENUM users.role atualizado para incluir platform_admin (como em drizzle/0024).");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  try {
    await ensureUsersRoleEnumHasPlatformAdmin(conn);

    const [comRows] = await conn.execute(
      "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [COMMERCIAL_EMAIL],
    );
    if (!comRows.length) {
      throw new Error(`Utilizador ${COMMERCIAL_EMAIL} não encontrado. Rode: pnpm db:seed-admin`);
    }
    const comercialId = comRows[0].id;
    await conn.execute("UPDATE users SET role = 'platform_admin' WHERE id = ?", [comercialId]);
    console.log(`[OK] ${COMMERCIAL_EMAIL} (id=${comercialId}) -> role=platform_admin`);

    const [all] = await conn.execute("SELECT id, email, openId, name FROM users");
    const toDelete = all.filter(isTestUserRow);
    const ids = toDelete.map((r) => r.id).filter((id) => id !== comercialId);
    if (ids.length === 0) {
      console.log("[OK] Nenhum utilizador de teste encontrado pelos critérios.");
      return;
    }

    console.log(`Encontrados ${ids.length} utilizador(es) de teste a remover:`, toDelete.map((r) => `${r.email || r.openId} (id=${r.id})`).join(", "));

    await conn.beginTransaction();
    for (const id of ids) {
      for (const [table, col] of USER_FK_COLUMNS) {
        if (!(await tableExists(conn, table))) continue;
        if (!(await columnExists(conn, table, col))) continue;
        try {
          await conn.execute(`UPDATE \`${table}\` SET \`${col}\` = ? WHERE \`${col}\` = ?`, [comercialId, id]);
        } catch (e) {
          console.warn(`[aviso] ${table}.${col}:`, e.message);
        }
      }
      try {
        await conn.execute("DELETE FROM projeto_usuarios WHERE userId = ?", [id]);
      } catch (e) {
        console.warn("[aviso] projeto_usuarios:", e.message);
      }
      await conn.execute("DELETE FROM users WHERE id = ?", [id]);
      console.log(`[removido] user id=${id}`);
    }

    await conn.commit();
    console.log(`[OK] Limpeza concluída. ${COMMERCIAL_EMAIL} permanece como platform_admin.`);
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      /* ignore */
    }
    throw e;
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
