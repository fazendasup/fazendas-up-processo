/**
 * Gera candidatos a INATIVO no Conta Azul sem lista manual.
 *
 * Heurística (proxies — você precisa validar o CSV):
 *  - espelho local com statusContaAzul = ATIVO
 *  - NÃO está na operação (importadoOperacao=false ou ativo=false)
 *  - nunca apareceu em item de pedido operacional
 *
 * NÃO escreve no Conta Azul. Só exporta CSV + resumo JSON.
 *
 * Uso:
 *   npx tsx scripts/candidatos-inativar-conta-azul.ts
 *   npx tsx scripts/candidatos-inativar-conta-azul.ts --out tmp/candidatos-ca.csv
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  join(process.cwd(), "server/comercial/generated/prisma/index.js"),
) as typeof import("../server/comercial/generated/prisma/index.js");

const url = process.env.COMERCIAL_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("COMERCIAL_DATABASE_URL/DATABASE_URL ausente");

const outArgIdx = process.argv.indexOf("--out");
const outPath =
  outArgIdx >= 0 && process.argv[outArgIdx + 1]
    ? process.argv[outArgIdx + 1]!
    : join(process.cwd(), "tmp", "candidatos-inativar-conta-azul.csv");

const p = new PrismaClient({ datasources: { db: { url } } });

function csvEscape(v: string | null | undefined): string {
  const s = v ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isAtivoCa(status: string | null | undefined): boolean {
  const st = (status ?? "").toUpperCase();
  return st === "ATIVO" || st === "ACTIVE" || st === "";
}

async function main() {
  const todos = await p.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null } },
    select: {
      id: true,
      nome: true,
      sku: true,
      contaAzulProdutoId: true,
      statusContaAzul: true,
      ativo: true,
      importadoOperacao: true,
      sincronizadoEm: true,
      _count: { select: { itensPedido: true } },
    },
    orderBy: { nome: "asc" },
  });

  const porStatus = {
    ativoCa: 0,
    inativoCa: 0,
    statusVazio: 0,
    emOperacao: 0,
    comPedido: 0,
  };

  const candidatos = [];
  const manterOperacao = [];

  for (const row of todos) {
    const st = (row.statusContaAzul ?? "").toUpperCase();
    if (!st) porStatus.statusVazio++;
    else if (st === "ATIVO" || st === "ACTIVE") porStatus.ativoCa++;
    else porStatus.inativoCa++;

    const emOp = row.importadoOperacao && row.ativo;
    if (emOp) porStatus.emOperacao++;
    if (row._count.itensPedido > 0) porStatus.comPedido++;

    if (emOp || row._count.itensPedido > 0) {
      manterOperacao.push(row);
      continue;
    }

    // Candidato: espelho diz ATIVO (ou status vazio legado) e não usa na operação.
    if (isAtivoCa(row.statusContaAzul)) {
      candidatos.push(row);
    }
  }

  const header = [
    "contaAzulProdutoId",
    "nome",
    "sku",
    "statusContaAzul",
    "ativoLocal",
    "importadoOperacao",
    "usoPedidos",
    "sincronizadoEm",
  ].join(",");

  const lines = candidatos.map(c =>
    [
      csvEscape(c.contaAzulProdutoId),
      csvEscape(c.nome),
      csvEscape(c.sku),
      csvEscape(c.statusContaAzul),
      String(c.ativo),
      String(c.importadoOperacao),
      String(c._count.itensPedido),
      csvEscape(c.sincronizadoEm?.toISOString() ?? ""),
    ].join(","),
  );

  mkdirSync(join(outPath, ".."), { recursive: true });
  writeFileSync(outPath, [header, ...lines].join("\n"), "utf8");

  console.log(
    JSON.stringify(
      {
        totalEspelhoCa: todos.length,
        porStatus,
        candidatosInativarHeuristica: candidatos.length,
        manterPorOperacaoOuPedido: manterOperacao.length,
        csv: outPath,
        aviso:
          "Heurística: ATIVO no espelho + fora da operação + zero pedidos. " +
          "NÃO é a lista original um-a-um. Valide o CSV antes de qualquer PATCH no Conta Azul. " +
          "Este app historicamente só faz GET de produtos — não reativou status no Conta Azul.",
        amostra: candidatos.slice(0, 30).map(c => ({
          nome: c.nome,
          sku: c.sku,
          statusContaAzul: c.statusContaAzul,
          contaAzulProdutoId: c.contaAzulProdutoId,
        })),
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
