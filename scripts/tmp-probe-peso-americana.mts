import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { extrairPesoLiquidoKgContaAzul } from "../server/comercial/integrations/conta-azul/mappers.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import { pesoDoProduto } from "../shared/produtoPeso.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();

const locais = await prisma.produtoComercial.findMany({
  where: { nome: { contains: "Americana" } },
  select: {
    id: true,
    nome: true,
    sku: true,
    modoCompra: true,
    contaAzulProdutoId: true,
    statusContaAzul: true,
    sincronizadoEm: true,
    ativo: true,
    importadoOperacao: true,
  },
});
console.log(
  "locais Americana",
  locais.map((r) => ({
    ...r,
    pesoParsed: pesoDoProduto(r.nome, r.modoCompra),
  })),
);

const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) {
  console.error("sem token Conta Azul");
  process.exit(1);
}
const http = createContaAzulHttp(env, cred.accessToken);

const busca = await contaAzulGet<unknown>(
  http,
  `/v1/produtos?busca=Americana&tamanho_pagina=20&pagina=1`,
);
const items =
  (busca as { items?: unknown[]; itens?: unknown[]; data?: unknown[] }).items ??
  (busca as { itens?: unknown[] }).itens ??
  (busca as { data?: unknown[] }).data ??
  (Array.isArray(busca) ? busca : []);

console.log(
  "busca lista",
  (items as Record<string, unknown>[]).map((it) => ({
    id: it.id,
    nome: it.nome,
    codigo: it.codigo,
    pesos_dimensoes: it.pesos_dimensoes,
    peso_bruto: it.peso_bruto,
    peso_liquido: it.peso_liquido,
    extracted: extrairPesoLiquidoKgContaAzul(it),
  })),
);

const ids = new Set<string>();
for (const l of locais) {
  if (l.contaAzulProdutoId) ids.add(l.contaAzulProdutoId);
}
for (const it of items as { id?: string }[]) {
  if (it.id) ids.add(String(it.id));
}

for (const id of ids) {
  try {
    const det = await contaAzulGet<Record<string, unknown>>(
      http,
      `/v1/produtos/${encodeURIComponent(id)}`,
    );
    const keys = Object.keys(det).sort();
    console.log("\n=== detalhe", id, "===");
    console.log("nome", det.nome, "codigo", det.codigo);
    console.log("keys", keys.join(", "));
    console.log(
      "pesos fields",
      JSON.stringify(
        {
          pesos_dimensoes: det.pesos_dimensoes,
          pesosDimensoes: det.pesosDimensoes,
          dimensoes: det.dimensoes,
          peso_bruto: det.peso_bruto,
          peso_liquido: det.peso_liquido,
          peso: det.peso,
          pesoBruto: det.pesoBruto,
          pesoLiquido: det.pesoLiquido,
        },
        null,
        2,
      ),
    );
    console.log("extracted", extrairPesoLiquidoKgContaAzul(det));
  } catch (e) {
    console.error("falha detalhe", id, e instanceof Error ? e.message : e);
  }
}

await prisma.$disconnect();
