import { getComercialPrisma } from "./db";

/**
 * Garante coluna `pronto` em pedidos_operacionais_itens.
 * Fallback se migrate deploy não tiver corrido em produção.
 */
export async function ensureItemPedidoProntoColumn(): Promise<void> {
  let prisma: ReturnType<typeof getComercialPrisma>;
  try {
    prisma = getComercialPrisma();
  } catch (e) {
    console.warn(
      "[comercial] ensureItemPedidoProntoColumn: Prisma indisponível —",
      e instanceof Error ? e.message : e,
    );
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `pedidos_operacionais_itens` ADD COLUMN `pronto` BOOLEAN NOT NULL DEFAULT false",
    );
  } catch {
    /* coluna já existe */
  }

  try {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `pedidos_operacionais_itens_pedido_id_pronto_idx` ON `pedidos_operacionais_itens`(`pedido_id`, `pronto`)",
    );
  } catch {
    /* índice já existe */
  }

  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `pedidos_operacionais_itens` ADD COLUMN `quantidade_pronta` DECIMAL(12, 3) NOT NULL DEFAULT 0",
    );
  } catch {
    /* coluna já existe */
  }

  try {
    await prisma.$executeRawUnsafe(
      "UPDATE `pedidos_operacionais_itens` SET `quantidade_pronta` = `quantidade` WHERE `pronto` = true AND `quantidade_pronta` = 0",
    );
  } catch (e) {
    console.warn(
      "[comercial] backfill quantidade_pronta:",
      e instanceof Error ? e.message : e,
    );
  }
}
