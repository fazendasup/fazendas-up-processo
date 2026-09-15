import "dotenv/config";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  join(process.cwd(), "server/comercial/generated/prisma/index.js"),
) as typeof import("../server/comercial/generated/prisma/index.js");

const url =
  process.env.COMERCIAL_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("COMERCIAL_DATABASE_URL/DATABASE_URL ausente");

const p = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const total = await p.produtoComercial.count({
    where: { contaAzulProdutoId: { not: null } },
  });
  const ativosOp = await p.produtoComercial.count({
    where: {
      contaAzulProdutoId: { not: null },
      ativo: true,
      importadoOperacao: true,
    },
  });

  const todos = await p.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null } },
    select: {
      id: true,
      nome: true,
      sku: true,
      ativo: true,
      importadoOperacao: true,
      statusContaAzul: true,
      atualizadoEm: true,
    },
    orderBy: { nome: "asc" },
  });

  const inativosCa = todos.filter(x => {
    const st = (x.statusContaAzul ?? "").toUpperCase();
    return st.length > 0 && st !== "ATIVO" && st !== "ACTIVE";
  });
  const inconsistentes = inativosCa.filter(x => x.ativo || x.importadoOperacao);

  const statusDist = new Map<string, number>();
  for (const x of todos) {
    const key = `${x.statusContaAzul ?? "null"}|ativo=${x.ativo}|op=${x.importadoOperacao}`;
    statusDist.set(key, (statusDist.get(key) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        total,
        ativosOp,
        inativosCa: inativosCa.length,
        inconsistentes: inconsistentes.length,
        amostra: inconsistentes.slice(0, 40).map(x => ({
          id: x.id,
          nome: x.nome,
          sku: x.sku,
          statusContaAzul: x.statusContaAzul,
          ativo: x.ativo,
          importadoOperacao: x.importadoOperacao,
        })),
        statusDist: Object.fromEntries(statusDist),
      },
      null,
      2,
    ),
  );
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
