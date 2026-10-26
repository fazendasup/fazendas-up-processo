import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { getComercialEnv } from "../server/comercial/env";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client";

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);
const path = "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
const qs = new URLSearchParams({
  pagina: "1",
  tamanho_pagina: "3",
  data_vencimento_de: "2026-10-01",
  data_vencimento_ate: "2026-10-31",
});
const res = await contaAzulGet<Record<string, unknown>>(
  http,
  `${path}?${qs.toString()}`,
);
const itens = (res?.itens as unknown[]) ?? [];
const first = itens[0] as Record<string, unknown> | undefined;
console.log(
  JSON.stringify(
    {
      topKeys: Object.keys(res ?? {}),
      n: itens.length,
      keys: first ? Object.keys(first) : [],
      sample: first,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
process.exit(0);
