import { getComercialPrisma } from "./db";

/**
 * Garante FINANCEIRO no ENUM `usuarios.perfil`.
 * Fallback se `migrate deploy` ainda não tiver corrido em produção.
 */
export async function ensurePerfilFinanceiroEnum(): Promise<void> {
  let prisma: ReturnType<typeof getComercialPrisma>;
  try {
    prisma = getComercialPrisma();
  } catch (e) {
    console.warn(
      "[comercial] ensurePerfilFinanceiroEnum: Prisma indisponível —",
      e instanceof Error ? e.message : e,
    );
    return;
  }

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ Type?: string; type?: string }>>(
      "SHOW COLUMNS FROM `usuarios` LIKE 'perfil'",
    );
    const type = String(rows[0]?.Type ?? rows[0]?.type ?? "");
    if (!type || type.includes("'FINANCEIRO'")) return;

    await prisma.$executeRawUnsafe(`
ALTER TABLE \`usuarios\`
  MODIFY COLUMN \`perfil\` ENUM(
    'VENDEDOR',
    'PROMOTER',
    'LIDER_COLHEITA',
    'GERENTE_COMERCIAL',
    'COMERCIAL',
    'OPERACOES',
    'LOGISTICA',
    'FINANCEIRO',
    'ADMIN'
  ) NOT NULL`);
    console.log("[comercial] ENUM usuarios.perfil atualizado com FINANCEIRO");
  } catch (e) {
    console.error(
      "[comercial] ensurePerfilFinanceiroEnum falhou:",
      e instanceof Error ? e.message : e,
    );
  }
}
