/** Testa PIX abaixo e acima de R$ 10. */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  createContaAzulHttp,
  contaAzulGet,
  contaAzulPost,
  contaAzulDelete,
  contaAzulPatch,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../server/comercial/integrations/conta-azul/venda-outbound.service.ts";

const clienteId = "70f632a6-d009-4cbf-85af-837c330d9760";
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus" }).format(new Date());
const prisma = getComercialPrisma();
const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
const http = createContaAzulHttp(env, cred!.accessToken!);
const sync = await sincronizarContasFinanceirasEnvio(prisma, env);
const contaId = escolherContaCobrancaBoleto(sync.contas, sync.selecionadaId)!;

async function testar(valor: number, tipo: "PIX_COBRANCA" | "LINK_PAGAMENTO") {
  const conta = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", {
    data_competencia: hoje,
    valor,
    observacao: `diag ${tipo} ${valor}`,
    descricao: `diag ${tipo} ${valor}`,
    id_cliente: clienteId,
    conta_financeira: contaId,
    rateio: [{ id_categoria: "9ff07628-759e-4eb9-9f14-36cbb3e4258f", valor }],
    condicao_pagamento: {
      parcelas: [
        {
          descricao: "Parcela 1",
          data_vencimento: hoje,
          conta_financeira: contaId,
          detalhe_valor: { valor_bruto: valor },
        },
      ],
    },
  });
  const parcelaId = String(
    (conta.condicao_pagamento as { parcelas?: Array<{ id?: string }> })?.parcelas?.[0]?.id ?? "",
  );
  const cobranca = await contaAzulPost<{ id?: string; status?: string; url?: string }>(
    http,
    "/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca",
    {
      conta_bancaria: contaId,
      descricao_fatura: `diag ${tipo}`,
      id_parcela: parcelaId,
      data_vencimento: hoje,
      tipo,
      ...(tipo === "LINK_PAGAMENTO" ? { maximo_parcelas: 3 } : {}),
    },
  );
  let final = cobranca;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    final = await contaAzulGet(http, `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${cobranca.id}`);
    if (final.url || (final.status && /FALHA|INVALIDO|REGISTRADO|PAGO/i.test(final.status))) break;
  }
  console.log(tipo, valor, { status: final.status, url: Boolean(final.url) });
  try {
    if (cobranca.id) await contaAzulDelete(http, `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${cobranca.id}`);
  } catch {
    /* */
  }
  try {
    const p = await contaAzulGet<{ versao?: number; nao_pago?: number }>(
      http,
      `/v1/financeiro/eventos-financeiros/parcelas/${parcelaId}`,
    );
    await contaAzulPatch(http, `/v1/financeiro/eventos-financeiros/parcelas/${parcelaId}`, {
      versao: p.versao,
      perda: { data: hoje, valor: Number(p.nao_pago) || valor },
    });
  } catch {
    /* */
  }
}

await testar(7.59, "PIX_COBRANCA");
await testar(12.79, "PIX_COBRANCA");
await testar(12.79, "LINK_PAGAMENTO");
await prisma.$disconnect();
