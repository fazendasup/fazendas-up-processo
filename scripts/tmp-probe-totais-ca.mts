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

async function fetchTotais(extra: Record<string, string>) {
  const qs = new URLSearchParams({
    pagina: "1",
    tamanho_pagina: "1",
    data_vencimento_de: "2026-10-01",
    data_vencimento_ate: "2026-10-31",
    ...extra,
  });
  const res = await contaAzulGet<Record<string, unknown>>(
    http,
    `${path}?${qs.toString()}`,
  );
  return {
    itens_totais: res.itens_totais,
    totais: res.totais,
  };
}

const variants = {
  sem_status: await fetchTotais({}),
  em_aberto: await fetchTotais({ status: "EM_ABERTO" }),
  atrasado: await fetchTotais({ status: "ATRASADO" }),
  pending: await fetchTotais({ status: "PENDING" }),
  overdue: await fetchTotais({ status: "OVERDUE" }),
};

console.log(
  JSON.stringify(
    {
      screenshot: {
        vencidos: 6704.15,
        hoje: 778.66,
        aVencer: 26045.84,
        total: 33528.65,
      },
      variants,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
process.exit(0);
