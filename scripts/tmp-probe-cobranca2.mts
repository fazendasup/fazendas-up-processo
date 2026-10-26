import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import { createContaAzulHttp, contaAzulGet, contaAzulPost } from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../server/comercial/integrations/conta-azul/venda-outbound.service.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) throw new Error("sem cliente");

const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);
const sync = await sincronizarContasFinanceirasEnvio(prisma, env);
const contaId = escolherContaCobrancaBoleto(sync.contas, sync.selecionadaId);
console.log("conta financeira", contaId);

try {
  const cats = await contaAzulGet<unknown>(http, "/v1/categorias?tamanho_pagina=20&pagina=1");
  console.log("categorias sample", JSON.stringify(cats).slice(0, 800));
} catch (e) {
  console.log("categorias erro", e instanceof Error ? e.message : e);
}

const total = 12.79;
const vencimento = "2026-10-22";
const bodies = [
  {
    label: "id_cliente sem rateio",
    body: {
      data_competencia: vencimento,
      valor: total,
      observacao: "Probe site",
      descricao: "Pedido probe PF",
      id_cliente: cliente.externalId,
      conta_financeira: contaId,
      condicao_pagamento: {
        parcelas: [
          {
            descricao: "Parcela 1",
            data_vencimento: vencimento,
            nota: "Pagamento pelo site",
            conta_financeira: contaId,
            detalhe_valor: { valor_bruto: total },
          },
        ],
      },
    },
  },
];

for (const item of bodies) {
  try {
    const r = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", item.body);
    console.log(item.label, "OK", JSON.stringify(r).slice(0, 500));
  } catch (e) {
    console.log(item.label, "ERR", e instanceof Error ? e.message : e);
  }
}

await prisma.$disconnect();
