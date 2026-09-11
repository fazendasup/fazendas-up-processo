import { getComercialPrisma } from "./db";

/**
 * Garante tabelas de mixes do estoque vivo (Prisma).
 * Fallback se `migrate deploy` não tiver corrido ou falhado em produção.
 * Schema final: produto_referencia_id opcional (após migration mixes_receita_gramas).
 */
export async function ensureEstoqueVivoMixesTables(): Promise<void> {
  let prisma: ReturnType<typeof getComercialPrisma>;
  try {
    prisma = getComercialPrisma();
  } catch (e) {
    console.warn(
      "[comercial] ensureEstoqueVivoMixesTables: Prisma indisponível —",
      e instanceof Error ? e.message : e,
    );
    return;
  }

  const run = async (sql: string) => {
    await prisma.$executeRawUnsafe(sql);
  };

  try {
    await run(`
CREATE TABLE IF NOT EXISTS \`estoque_vivo_mixes\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`nome\` VARCHAR(191) NOT NULL,
  \`produto_referencia_id\` VARCHAR(191) NULL,
  \`perda_percentual\` DECIMAL(5, 2) NOT NULL DEFAULT 0,
  \`ativo\` BOOLEAN NOT NULL DEFAULT true,
  \`criado_em\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`atualizado_em\` DATETIME(3) NOT NULL,
  INDEX \`estoque_vivo_mixes_ativo_idx\`(\`ativo\`),
  INDEX \`estoque_vivo_mixes_nome_idx\`(\`nome\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    await run(`
CREATE TABLE IF NOT EXISTS \`estoque_vivo_mix_componentes\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`mix_id\` VARCHAR(191) NOT NULL,
  \`produto_id\` VARCHAR(191) NOT NULL,
  \`quantidade\` DECIMAL(14, 4) NOT NULL,
  INDEX \`estoque_vivo_mix_componentes_produto_id_idx\`(\`produto_id\`),
  UNIQUE INDEX \`estoque_vivo_mix_componentes_mix_id_produto_id_key\`(\`mix_id\`, \`produto_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    // Bases que pararam na 1ª migration (referencia obrigatória).
    try {
      await run(
        "ALTER TABLE `estoque_vivo_mixes` MODIFY `produto_referencia_id` VARCHAR(191) NULL",
      );
    } catch {
      /* já nullable ou coluna ausente */
    }

    const fks: Array<[string, string]> = [
      [
        "estoque_vivo_mixes_produto_referencia_id_fkey",
        "ALTER TABLE `estoque_vivo_mixes` ADD CONSTRAINT `estoque_vivo_mixes_produto_referencia_id_fkey` FOREIGN KEY (`produto_referencia_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
      ],
      [
        "estoque_vivo_mix_componentes_mix_id_fkey",
        "ALTER TABLE `estoque_vivo_mix_componentes` ADD CONSTRAINT `estoque_vivo_mix_componentes_mix_id_fkey` FOREIGN KEY (`mix_id`) REFERENCES `estoque_vivo_mixes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
      ],
      [
        "estoque_vivo_mix_componentes_produto_id_fkey",
        "ALTER TABLE `estoque_vivo_mix_componentes` ADD CONSTRAINT `estoque_vivo_mix_componentes_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos_comerciais`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE",
      ],
    ];

    for (const [, ddl] of fks) {
      try {
        await run(ddl);
      } catch {
        /* FK já existe */
      }
    }

    console.log("[comercial] Tabelas estoque_vivo_mixes garantidas.");
  } catch (e) {
    console.error(
      "[comercial] ensureEstoqueVivoMixesTables falhou:",
      e instanceof Error ? e.message : e,
    );
    throw e;
  }
}
