import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { getComercialEnv } from "../server/comercial/env";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client";
import { diaIsoAmericaSp } from "../shared/comercial/periodo-america-sp";

const prisma = getComercialPrisma();
const local = await prisma.pedido.findFirst({
  where: { numeroVenda: "5624" },
  select: {
    externalId: true,
    statusPedido: true,
    dataPedido: true,
    valorLiquido: true,
  },
});
console.log("local", {
  st: local?.statusPedido,
  dia: local ? diaIsoAmericaSp(local.dataPedido) : null,
  iso: local?.dataPedido.toISOString(),
  v: local ? Number(local.valorLiquido) : null,
});

const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken || !local?.externalId) throw new Error("sem venda");
const http = createContaAzulHttp(env, cred.accessToken);
const busca = await contaAzulGet<{ itens?: Record<string, unknown>[] }>(
  http,
  "/v1/venda/busca?pagina=1&tamanho_pagina=50&data_inicio=2026-10-01&data_fim=2026-10-01",
);
const item = (busca.itens ?? []).find(o => Number(o.numero) === 5624);
console.log(
  "busca",
  item
    ? {
        data: item.data,
        total: item.total,
        situacao: item.situacao,
        entrega: Object.fromEntries(
          Object.entries(item).filter(([k]) => /entreg|previs|comprom|data/i.test(k)),
        ),
      }
    : "ausente",
);
const raw = await contaAzulGet<Record<string, unknown>>(
  http,
  `/v1/venda/${local.externalId}`,
);
const v = (raw.venda && typeof raw.venda === "object" ? raw.venda : raw) as Record<string, unknown>;
const datas: Record<string, unknown> = {};
for (const [k, val] of Object.entries(v)) {
  if (/data|compromisso|entrega|previs/i.test(k)) datas[k] = val;
}
console.log(JSON.stringify({ datas, situacao: v.situacao, status: v.status, numero: v.numero }, null, 2));
await prisma.$disconnect();
