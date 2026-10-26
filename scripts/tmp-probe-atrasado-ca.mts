import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { getComercialEnv } from "../server/comercial/env";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service";
import {
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client";
import { isoDateLocal } from "../server/financeiroContaAzulFluxo";

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);
const path =
  "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";

async function buscar(qs: URLSearchParams) {
  const porId = new Map<string, Record<string, unknown>>();
  for (let pagina = 1; pagina <= 30; pagina++) {
    qs.set("pagina", String(pagina));
    qs.set("tamanho_pagina", "200");
    const { data } = await http.get(path, { params: Object.fromEntries(qs) });
    // axios params may not handle multi - use url
    const url = `${path}?${qs.toString()}`;
    const res = await http.get(url);
    const itens = (res.data?.itens ?? []) as Array<Record<string, unknown>>;
    for (const i of itens) {
      if (i.id) porId.set(String(i.id), i);
    }
    if (itens.length < 200) break;
  }
  return Array.from(porId.values());
}

function sumAberto(itens: Array<Record<string, unknown>>) {
  let s = 0;
  let q = 0;
  for (const i of itens) {
    const aberto = Number(
      i.valor_em_aberto ?? i.valorEmAberto ?? i.valor_aberto ?? 0,
    );
    if (aberto > 0.009) {
      s += aberto;
      q += 1;
    }
  }
  return { q, total: Math.round(s * 100) / 100 };
}

const hoje = "2026-10-22";
const variants = [
  {
    nome: "status_ATRASADO_venc_2a",
    qs: new URLSearchParams({
      status: "ATRASADO",
      data_vencimento_de: "2024-01-01",
      data_vencimento_ate: hoje,
    }),
  },
  {
    nome: "status_ATRASADO_venc_out",
    qs: new URLSearchParams({
      status: "ATRASADO",
      data_vencimento_de: "2026-10-01",
      data_vencimento_ate: "2026-10-31",
    }),
  },
  {
    nome: "status_EM_ABERTO_venc_out",
    qs: new URLSearchParams({
      status: "EM_ABERTO",
      data_vencimento_de: "2026-10-01",
      data_vencimento_ate: "2026-10-31",
    }),
  },
  {
    nome: "sem_status_venc_out",
    qs: new URLSearchParams({
      data_vencimento_de: "2026-10-01",
      data_vencimento_ate: "2026-10-31",
    }),
  },
];

const out: Record<string, unknown> = {
  screenshot: { vencidos: 6704.15, hoje: 778.66, aVencer: 26045.84 },
};
for (const v of variants) {
  try {
    const itens = await buscar(v.qs);
    out[v.nome] = { ...sumAberto(itens), n: itens.length };
  } catch (e) {
    out[v.nome] = { erro: String(e) };
  }
}

console.log(JSON.stringify(out, null, 2));
await prisma.$disconnect();
process.exit(0);
