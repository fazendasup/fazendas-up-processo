/**
 * Repara produtos INATIVOS no Conta Azul que ficaram ativos na operação.
 *
 * Uso (produção / local com COMERCIAL_DATABASE_URL):
 *   npx tsx scripts/reparar-produtos-inativos-ca.ts           # dry-run
 *   npx tsx scripts/reparar-produtos-inativos-ca.ts --apply   # aplica
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  join(process.cwd(), "server/comercial/generated/prisma/index.js"),
) as typeof import("../server/comercial/generated/prisma/index.js");

const url = process.env.COMERCIAL_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("COMERCIAL_DATABASE_URL/DATABASE_URL ausente");

const apply = process.argv.includes("--apply");
const p = new PrismaClient({ datasources: { db: { url } } });

function inativoNoCa(status: string | null | undefined): boolean {
  const st = (status ?? "").toUpperCase();
  return st.length > 0 && st !== "ATIVO" && st !== "ACTIVE";
}

async function main() {
  const candidatos = await p.produtoComercial.findMany({
    where: {
      contaAzulProdutoId: { not: null },
      OR: [{ ativo: true }, { importadoOperacao: true }],
    },
    select: {
      id: true,
      nome: true,
      sku: true,
      statusContaAzul: true,
      ativo: true,
      importadoOperacao: true,
    },
    orderBy: { nome: "asc" },
  });

  const alvos = candidatos.filter(c => inativoNoCa(c.statusContaAzul));

  console.log(
    JSON.stringify(
      {
        modo: apply ? "APPLY" : "DRY-RUN",
        candidatosOperacao: candidatos.length,
        aDesativar: alvos.length,
        amostra: alvos.slice(0, 50).map(a => ({
          nome: a.nome,
          sku: a.sku,
          statusContaAzul: a.statusContaAzul,
          ativo: a.ativo,
          importadoOperacao: a.importadoOperacao,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log(
      "\nDry-run. Para aplicar: npx tsx scripts/reparar-produtos-inativos-ca.ts --apply",
    );
    console.log(
      "Dica: sincronize o catálogo Conta Azul antes (Pedidos → Produtos → Sincronizar) para atualizar statusContaAzul.",
    );
    return;
  }

  if (alvos.length === 0) {
    console.log("Nada a desativar.");
    return;
  }

  const r = await p.produtoComercial.updateMany({
    where: { id: { in: alvos.map(a => a.id) } },
    data: { ativo: false, importadoOperacao: false },
  });
  console.log(`Desativados: ${r.count}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
