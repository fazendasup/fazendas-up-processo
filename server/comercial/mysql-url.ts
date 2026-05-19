const MYSQL_DB_NAME_RE = /^[a-zA-Z0-9_]+$/;

/** Nome da base comercial padrão (Opção B) quando só existe `DATABASE_URL` do ERP. */
export const DEFAULT_COMERCIAL_DATABASE_NAME = "fazendas_comercial";

function assertSafeMysqlDatabaseName(name: string): string {
  if (!MYSQL_DB_NAME_RE.test(name)) {
    throw new Error(
      `Nome de base MySQL inválido: "${name}" (use apenas letras, números e _)`,
    );
  }
  return name;
}

/** Extrai o nome da base do path da URL (`/railway` → `railway`). */
export function getMysqlDatabaseNameFromUrl(url: string): string | null {
  const pathname = new URL(url).pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  const name = decodeURIComponent(pathname).trim();
  return name || null;
}

/** Troca só o segmento da base na URL MySQL; preserva user, host, query string. */
export function swapMysqlDatabaseInUrl(url: string, databaseName: string): string {
  const parsed = new URL(url);
  if (databaseName) {
    assertSafeMysqlDatabaseName(databaseName);
    parsed.pathname = `/${databaseName}`;
  } else {
    parsed.pathname = "/";
  }
  return parsed.toString();
}

export { assertSafeMysqlDatabaseName };
