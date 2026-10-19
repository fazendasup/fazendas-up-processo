import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { getComercialEnv } from "../comercial/env";
import {
  contaAzulGet,
  contaAzulPost,
  createContaAzulHttp,
} from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../comercial/integrations/conta-azul/venda-outbound.service";
import { todayYmd } from "./portalCalendario";
import { LojaErro } from "./portalLoja";

type CobrancaResposta = {
  id?: string;
  url?: string | null;
  URL?: string | null;
  status?: string | null;
};

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarUrl(
  http: ReturnType<typeof createContaAzulHttp>,
  id: string,
  inicial: CobrancaResposta,
): Promise<{ id: string; url: string | null; status: string | null }> {
  let url = (inicial.url ?? inicial.URL ?? null) ? String(inicial.url ?? inicial.URL) : null;
  let status = inicial.status ? String(inicial.status) : null;
  if (url) return { id, url, status };
  for (let i = 1; i <= 4; i += 1) {
    try {
      const c = await contaAzulGet<CobrancaResposta>(
        http,
        `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(id)}`,
      );
      url = c.url ?? c.URL ? String(c.url ?? c.URL) : null;
      status = c.status ? String(c.status) : status;
      if (url) return { id, url, status };
      if (status && /FALHA_EMISSAO|INVALIDO/i.test(status)) return { id, url: null, status };
    } catch {
      /* tenta de novo */
    }
    if (i < 4) await esperar(600 * i);
  }
  return { id, url, status };
}

async function gerarCobranca(
  http: ReturnType<typeof createContaAzulHttp>,
  input: {
    contaBancaria: string;
    parcelaId: string;
    vencimento: string;
    descricao: string;
    tipo: "PIX_COBRANCA" | "LINK_PAGAMENTO";
  },
) {
  const body: Record<string, unknown> = {
    conta_bancaria: input.contaBancaria,
    descricao_fatura: input.descricao.slice(0, 200),
    id_parcela: input.parcelaId,
    data_vencimento: input.vencimento,
    tipo: input.tipo,
  };
  if (input.tipo === "LINK_PAGAMENTO") body.maximo_parcelas = 3;
  const cobranca = await contaAzulPost<CobrancaResposta>(
    http,
    "/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca",
    body,
  );
  const id = String(cobranca.id ?? "").trim();
  if (!id) throw new LojaErro(503, "A cobrança não foi criada no Conta Azul.");
  return aguardarUrl(http, id, cobranca);
}

function idParcelaDaConta(conta: Record<string, unknown>): string | null {
  const cond = conta.condicao_pagamento;
  if (!cond || typeof cond !== "object") return null;
  const parcelas = (cond as { parcelas?: unknown }).parcelas;
  if (!Array.isArray(parcelas) || parcelas.length === 0) return null;
  const primeira = parcelas[0];
  if (!primeira || typeof primeira !== "object") return null;
  const id = String((primeira as { id?: string }).id ?? "").trim();
  return id || null;
}

/**
 * Cria conta a receber no Conta Azul e emite Pix + link de cartão para o pedido PF.
 */
export async function criarCobrancasPessoa(input: {
  prisma: PrismaClient;
  pedidoId: string;
  contaAzulCustomerId: string;
  total: number;
  descricao: string;
  vencimentoYmd?: string;
}): Promise<{
  status: string;
  pixUrl: string | null;
  cartaoUrl: string | null;
  total: number;
}> {
  const env = getComercialEnv();
  const cred = await ensureValidAccessToken(input.prisma, env);
  if (!cred?.accessToken) {
    throw new LojaErro(503, "Os pagamentos ainda não estão disponíveis. Tente de novo em instantes.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const sync = await sincronizarContasFinanceirasEnvio(input.prisma, env);
  const contaId = escolherContaCobrancaBoleto(sync.contas, sync.selecionadaId);
  if (!contaId) {
    throw new LojaErro(503, "Não há conta de cobrança configurada na fazenda.");
  }

  const vencimento = input.vencimentoYmd || todayYmd();
  const total = Math.round(input.total * 100) / 100;
  const descricao = input.descricao.slice(0, 180) || "Pedido Fazendas Up";

  const conta = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", {
    data_competencia: vencimento,
    valor: total,
    observacao: `Pedido site ${input.pedidoId}`,
    descricao,
    contato: input.contaAzulCustomerId,
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
  });

  const receberId = String(conta.id ?? "").trim();
  let parcelaId = idParcelaDaConta(conta);
  if (!parcelaId && receberId) {
    try {
      const raw = await contaAzulGet<unknown>(
        http,
        `/v1/financeiro/eventos-financeiros/${encodeURIComponent(receberId)}/parcelas`,
      );
      const lista = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
          ? ((raw as { itens?: unknown[]; parcelas?: unknown[] }).itens ??
            (raw as { parcelas?: unknown[] }).parcelas)
          : null;
      if (Array.isArray(lista) && lista[0] && typeof lista[0] === "object") {
        parcelaId = String((lista[0] as { id?: string }).id ?? "").trim() || null;
      }
    } catch {
      /* tenta só com o id da conta */
    }
  }
  if (!parcelaId) {
    throw new LojaErro(503, "A parcela de cobrança não ficou pronta. Tente de novo em instantes.");
  }

  let pix: { id: string; url: string | null; status: string | null } | null = null;
  let cartao: { id: string; url: string | null; status: string | null } | null = null;
  try {
    pix = await gerarCobranca(http, {
      contaBancaria: contaId,
      parcelaId,
      vencimento,
      descricao: `${descricao} · Pix`,
      tipo: "PIX_COBRANCA",
    });
  } catch (error) {
    console.error("[portal] pix cobrança", error);
  }
  try {
    cartao = await gerarCobranca(http, {
      contaBancaria: contaId,
      parcelaId,
      vencimento,
      descricao: `${descricao} · Cartão`,
      tipo: "LINK_PAGAMENTO",
    });
  } catch (error) {
    console.error("[portal] link cartão", error);
  }

  if (!pix?.url && !cartao?.url) {
    throw new LojaErro(503, "Não foi possível gerar Pix nem link de cartão agora.");
  }

  await input.prisma.portalPedidoPagamento.upsert({
    where: { pedidoId: input.pedidoId },
    create: {
      pedidoId: input.pedidoId,
      status: "AGUARDANDO",
      total,
      contaAzulReceberId: receberId || null,
      parcelaId,
      pixCobrancaId: pix?.id ?? null,
      pixUrl: pix?.url ?? null,
      cartaoCobrancaId: cartao?.id ?? null,
      cartaoUrl: cartao?.url ?? null,
    },
    update: {
      status: "AGUARDANDO",
      total,
      contaAzulReceberId: receberId || null,
      parcelaId,
      pixCobrancaId: pix?.id ?? null,
      pixUrl: pix?.url ?? null,
      cartaoCobrancaId: cartao?.id ?? null,
      cartaoUrl: cartao?.url ?? null,
      pagoEm: null,
    },
  });

  return {
    status: "AGUARDANDO",
    pixUrl: pix?.url ?? null,
    cartaoUrl: cartao?.url ?? null,
    total,
  };
}

export async function lerPagamentoPedido(prisma: PrismaClient, pedidoId: string, clienteId: string) {
  const pedido = await prisma.pedidoOperacional.findFirst({
    where: { id: pedidoId, clienteId },
    select: { id: true, observacoes: true, status: true },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  const pagamento = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  if (!pagamento) {
    return {
      pedidoId,
      status: "SEM_COBRANCA",
      pixUrl: null as string | null,
      cartaoUrl: null as string | null,
      total: null as number | null,
      pago: false,
    };
  }

  let status = pagamento.status;
  if (status === "AGUARDANDO" && (pagamento.pixCobrancaId || pagamento.cartaoCobrancaId)) {
    const pago = await cobrancaPaga(prisma, pagamento.pixCobrancaId, pagamento.cartaoCobrancaId);
    if (pago) {
      status = "PAGO";
      await prisma.portalPedidoPagamento.update({
        where: { pedidoId },
        data: { status: "PAGO", pagoEm: new Date() },
      });
      if (!(pedido.observacoes ?? "").includes("Pago via site")) {
        await prisma.pedidoOperacional.update({
          where: { id: pedidoId },
          data: {
            observacoes: "Pedido pelo site (pessoa). Pago via site. Liberado para produção.",
          },
        });
      }
    }
  }

  return {
    pedidoId,
    status,
    pixUrl: pagamento.pixUrl,
    cartaoUrl: pagamento.cartaoUrl,
    total: Number(pagamento.total),
    pago: status === "PAGO",
  };
}

async function cobrancaPaga(
  prisma: PrismaClient,
  pixId: string | null,
  cartaoId: string | null,
): Promise<boolean> {
  const env = getComercialEnv();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) return false;
  const http = createContaAzulHttp(env, cred.accessToken);
  for (const id of [pixId, cartaoId]) {
    if (!id) continue;
    try {
      const c = await contaAzulGet<CobrancaResposta>(
        http,
        `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(id)}`,
      );
      if (c.status && /^(PAGO|QUITADO)$/i.test(String(c.status).trim())) return true;
    } catch {
      /* ignora */
    }
  }
  return false;
}
