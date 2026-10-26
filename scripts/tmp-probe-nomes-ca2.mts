import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();

const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) process.exit(1);
const http = createContaAzulHttp(env, cred.accessToken);

const ids = [
  "cc6803fd-7f3e-4d76-8800-04f98bee3c4a", // Rabano / Restaurantes
  "2a49c9ea-9fc0-4adf-bac2-8bfaca2c0839", // Alface Crespa Roxa 100g
  "83040c7d-cab6-4a46-ba8a-da9ea6201ae7", // Alface Crespa Roxa 120g
  "c1ebfcbe-28c5-4936-afd4-d6b8b1f94cc5", // Rabanete Broto
  "b28c9c35-ea45-4faf-be14-e900cd3cc093", // Rabanete Microverdes
];

console.log("=== DETALHE CA ===");
for (const id of ids) {
  try {
    const det = await contaAzulGet<Record<string, unknown>>(
      http,
      `/v1/produtos/${encodeURIComponent(id)}`,
    );
    console.log({
      id,
      nome: det.nome,
      codigo_sku: det.codigo_sku,
      pesos: det.pesos_dimensoes,
    });
  } catch (e) {
    console.log(id, e instanceof Error ? e.message : e);
  }
}

for (const b of ["Rabanete", "Rabano", "Crespa Roxa"]) {
  const res = await contaAzulGet<{ items?: Array<Record<string, unknown>> }>(
    http,
    `/v1/produtos?busca=${encodeURIComponent(b)}&tamanho_pagina=50&pagina=1`,
  );
  console.log(`\nbusca ${b}`);
  for (const it of res.items ?? []) {
    if (
      String(it.nome).toLowerCase().includes("resta") ||
      String(it.nome).toLowerCase().includes("crespa roxa") ||
      String(it.nome).toLowerCase().includes("raban")
    ) {
      console.log(`  ${it.codigo_sku ?? it.codigo} | ${it.nome} | ${it.id}`);
    }
  }
}

// Pedido items abertos com esses nomes
const itens = await prisma.pedidoItem.findMany({
  where: {
    OR: [
      { produtoNome: { contains: "Rabanete / Restaurantes" } },
      { produtoNome: { contains: "Rabano / Restaurantes" } },
      { produtoNome: { contains: "Crespa Roxa" } },
    ],
  },
  select: {
    id: true,
    produtoNome: true,
    produtoId: true,
    quantidade: true,
    pedido: { select: { id: true, status: true, dataEntrega: true } },
  },
  take: 50,
});
console.log("\n=== PEDIDO ITENS ===");
for (const i of itens) {
  console.log({
    produtoNome: i.produtoNome,
    produtoId: i.produtoId,
    status: i.pedido.status,
    dataEntrega: i.pedido.dataEntrega,
  });
}

// produtos ligados
const prodIds = [...new Set(itens.map((i) => i.produtoId).filter(Boolean))];
const prods = await prisma.produtoComercial.findMany({
  where: { id: { in: prodIds as string[] } },
  select: { id: true, nome: true, sku: true, contaAzulProdutoId: true },
});
console.log("\n=== PRODUTOS DOS ITENS ===");
for (const p of prods) console.log(p);

await prisma.$disconnect();
