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

async function sumStatus(
  status: string | null,
  de: string,
  ate: string,
) {
  const porId = new Map<string, number>();
  for (let pagina = 1; pagina <= 40; pagina++) {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: "200",
      data_vencimento_de: de,
      data_vencimento_ate: ate,
    });
    if (status) qs.set("status", status);
    const res = await contaAzulGet<{
      itens?: Array<Record<string, unknown>>;
    }>(http, `${path}?${qs.toString()}`);
    const batch = res.itens ?? [];
    for (const i of batch) {
      const id = String(i.id ?? "");
      if (!id) continue;
      const aberto = Number(
        i.valor_em_aberto ?? i.valorEmAberto ?? i.valor_aberto ?? 0,
      );
      if (aberto > 0.009) porId.set(id, aberto);
    }
    if (batch.length < 200) break;
  }
  const total = [...porId.values()].reduce((s, v) => s + v, 0);
  return { qtd: porId.size, total: Math.round(total * 100) / 100 };
}

const out = {
  ca: 6704.15,
  ATRASADO_out: await sumStatus("ATRASADO", "2026-10-01", "2026-10-31"),
  ATRASADO_ate_hoje: await sumStatus("ATRASADO", "2024-01-01", "2026-10-22"),
  EM_ABERTO_out: await sumStatus("EM_ABERTO", "2026-10-01", "2026-10-31"),
  OVERDUE_out: await sumStatus("OVERDUE", "2026-10-01", "2026-10-31"),
  sem_status_out: await sumStatus(null, "2026-10-01", "2026-10-31"),
};

console.log(JSON.stringify(out, null, 2));
await prisma.$disconnect();
process.exit(0);
