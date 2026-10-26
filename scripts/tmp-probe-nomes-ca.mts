import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import { sincronizarCatalogoProdutosContaAzul } from "../server/comercial/integrations/conta-azul/produtos-sync.service.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();

const buscas = ["Rabanete", "Crespa Roxa", "Crespa"];

const locais = await prisma.produtoComercial.findMany({
  where: {
    OR: [
      { nome: { contains: "Rabanete" } },
      { nome: { contains: "Restaurante" } },
      { nome: { contains: "Crespa Roxa" } },
      { nome: { contains: "Crespa" } },
    ],
  },
  select: {
    id: true,
    nome: true,
    sku: true,
    contaAzulProdutoId: true,
    ativo: true,
    importadoOperacao: true,
    sincronizadoEm: true,
  },
  orderBy: { nome: "asc" },
});
console.log("=== LOCAIS ===");
for (const p of locais) {
  console.log(
    `${p.importadoOperacao ? "OP" : "  "} | ${p.sku ?? "-"} | ${p.nome} | ca=${p.contaAzulProdutoId ?? "-"} | sync=${p.sincronizadoEm?.toISOString() ?? "-"}`,
  );
}

const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) {
  console.error("sem token");
  process.exit(1);
}
const http = createContaAzulHttp(env, cred.accessToken);

console.log("\n=== CONTA AZUL (busca) ===");
for (const b of buscas) {
  const res = await contaAzulGet<{ items?: Array<Record<string, unknown>> }>(
    http,
    `/v1/produtos?busca=${encodeURIComponent(b)}&tamanho_pagina=30&pagina=1`,
  );
  const items = res.items ?? [];
  console.log(`\nbusca "${b}" (${items.length})`);
  for (const it of items) {
    console.log(`  ${it.codigo ?? it.codigo_sku ?? "-"} | ${it.nome} | ${it.id}`);
  }
}

// Pedido items ativos com esses nomes
const itens = await prisma.pedidoItem.findMany({
  where: {
    OR: [
      { produtoNome: { contains: "Rabanete" } },
      { produtoNome: { contains: "Crespa Roxa" } },
      { nome: { contains: "Rabanete" } },
      { nome: { contains: "Crespa Roxa" } },
    ],
  },
  select: {
    id: true,
    produtoNome: true,
    nome: true,
    produtoId: true,
    pedidoId: true,
  },
  take: 40,
}).catch(async () => {
  // schema pode usar outro campo
  return [];
});
console.log("\n=== ITENS PEDIDO (amostra) ===", itens.length);
for (const i of itens.slice(0, 20)) {
  console.log(i);
}

await prisma.$disconnect();
