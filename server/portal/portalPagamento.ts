import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { getComercialEnv } from "../comercial/env";
import {
  contaAzulDelete,
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

export type FormaPagamentoPessoa = "pix" | "cartao";

type CobrancaResposta = {
  id?: string;
  url?: string | null;
  URL?: string | null;
  status?: string | null;
};

type CategoriaCa = { id?: string; nome?: string; tipo?: string };

let cacheCategoriaReceitaId: string | null = null;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function idCategoriaReceitaVendas(
  http: ReturnType<typeof createContaAzulHttp>,
): Promise<string> {
  if (cacheCategoriaReceitaId) return cacheCategoriaReceitaId;
  const receitas: CategoriaCa[] = [];
  for (let pagina = 1; pagina <= 8; pagina += 1) {
    const resposta = await contaAzulGet<{ itens?: CategoriaCa[]; items?: CategoriaCa[] }>(
      http,
      `/v1/categorias?tamanho_pagina=100&pagina=${pagina}`,
    );
    const itens = resposta.itens ?? resposta.items ?? [];
    if (itens.length === 0) break;
    for (const item of itens) {
      if (String(item.tipo ?? "").toUpperCase() === "RECEITA") receitas.push(item);
    }
  }
  const escolhida =
    receitas.find((item) => /receitas?\s+de\s+vendas?/i.test(item.nome ?? "")) ??
    receitas.find((item) => /venda/i.test(item.nome ?? "")) ??
    receitas[0];
  const id = String(escolhida?.id ?? "").trim();
  if (!id) throw new LojaErro(503, "Não há categoria de receita configurada no Conta Azul.");
  cacheCategoriaReceitaId = id;
  return id;
}

async function aguardarUrl(
  http: ReturnType<typeof createContaAzulHttp>,
  id: string,
  inicial: CobrancaResposta,
): Promise<{ id: string; url: string | null; status: string | null }> {
  let url = (inicial.url ?? inicial.URL ?? null) ? String(inicial.url ?? inicial.URL) : null;
  let status = inicial.status ? String(inicial.status) : null;
  if (url) return { id, url, status };
  for (let i = 1; i <= 6; i += 1) {
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
    if (i < 6) await esperar(700 * i);
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
 * Cria conta a receber no Conta Azul e emite Pix OU link de cartão (uma cobrança por parcela).
 */
export async function criarCobrancasPessoa(input: {
  prisma: PrismaClient;
  pedidoId: string;
  contaAzulCustomerId: string;
  total: number;
  descricao: string;
  vencimentoYmd?: string;
  formaPagamento: FormaPagamentoPessoa;
}): Promise<{
  status: string;
  pixUrl: string | null;
  cartaoUrl: string | null;
  total: number;
  formaPagamento: FormaPagamentoPessoa;
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
  const categoriaId = await idCategoriaReceitaVendas(http);

  let conta: Record<string, unknown>;
  try {
    conta = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", {
      data_competencia: vencimento,
      valor: total,
      observacao: `Pedido site ${input.pedidoId}`,
      descricao,
      id_cliente: input.contaAzulCustomerId,
      conta_financeira: contaId,
      rateio: [{ id_categoria: categoriaId, valor: total }],
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
  } catch (error) {
    const texto = error instanceof Error ? error.message : String(error);
    console.error("[portal] contas-a-receber", error);
    throw new LojaErro(503, texto.includes("Conta Azul") ? texto : "Não foi possível abrir a cobrança agora.");
  }

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

  const tipo = input.formaPagamento === "cartao" ? "LINK_PAGAMENTO" : "PIX_COBRANCA";
  let cobranca: { id: string; url: string | null; status: string | null };
  try {
    cobranca = await gerarCobranca(http, {
      contaBancaria: contaId,
      parcelaId,
      vencimento,
      descricao: `${descricao} · ${input.formaPagamento === "cartao" ? "Cartão" : "Pix"}`,
      tipo,
    });
  } catch (error) {
    const texto = error instanceof Error ? error.message : String(error);
    console.error("[portal] gerar cobrança", error);
    throw new LojaErro(503, texto.includes("Conta Azul") ? texto : "Não foi possível gerar o pagamento agora.");
  }

  if (!cobranca.url) {
    throw new LojaErro(
      503,
      "O Conta Azul ainda não liberou o link de pagamento. Tente de novo em instantes.",
    );
  }

  const pixUrl = input.formaPagamento === "pix" ? cobranca.url : null;
  const cartaoUrl = input.formaPagamento === "cartao" ? cobranca.url : null;

  await input.prisma.portalPedidoPagamento.upsert({
    where: { pedidoId: input.pedidoId },
    create: {
      pedidoId: input.pedidoId,
      status: "AGUARDANDO",
      total,
      contaAzulReceberId: receberId || null,
      parcelaId,
      pixCobrancaId: input.formaPagamento === "pix" ? cobranca.id : null,
      pixUrl,
      cartaoCobrancaId: input.formaPagamento === "cartao" ? cobranca.id : null,
      cartaoUrl,
    },
    update: {
      status: "AGUARDANDO",
      total,
      contaAzulReceberId: receberId || null,
      parcelaId,
      pixCobrancaId: input.formaPagamento === "pix" ? cobranca.id : null,
      pixUrl,
      cartaoCobrancaId: input.formaPagamento === "cartao" ? cobranca.id : null,
      cartaoUrl,
      pagoEm: null,
    },
  });

  return {
    status: "AGUARDANDO",
    pixUrl,
    cartaoUrl,
    total,
    formaPagamento: input.formaPagamento,
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
      formaPagamento: null as FormaPagamentoPessoa | null,
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
            observacoes: `${pedido.observacoes ?? "Pedido pelo site (pessoa)."}\nPago via site. Liberado para produção.`.trim(),
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
    formaPagamento: formaPagamentoDoRegistro(pagamento),
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

async function httpContaAzul(prisma: PrismaClient) {
  const env = getComercialEnv();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) return null;
  return createContaAzulHttp(env, cred.accessToken);
}

async function cancelarCobrancaCa(prisma: PrismaClient, cobrancaId: string | null | undefined) {
  if (!cobrancaId) return;
  const http = await httpContaAzul(prisma);
  if (!http) return;
  try {
    await contaAzulDelete(
      http,
      `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(cobrancaId)}`,
    );
  } catch (error) {
    console.warn("[portal] cancelar cobrança Conta Azul", cobrancaId, error);
  }
}

export function formaPagamentoDoRegistro(pagamento: {
  pixUrl?: string | null;
  cartaoUrl?: string | null;
  pixCobrancaId?: string | null;
  cartaoCobrancaId?: string | null;
}): FormaPagamentoPessoa | null {
  if (pagamento.pixUrl || pagamento.pixCobrancaId) return "pix";
  if (pagamento.cartaoUrl || pagamento.cartaoCobrancaId) return "cartao";
  return null;
}

/**
 * Cancela pedido do site ainda sem pagamento (restaura estoque e invalida cobrança).
 */
export async function cancelarPedidoCliente(input: {
  prisma: PrismaClient;
  pedidoId: string;
  clienteId: string;
}): Promise<{ ok: true }> {
  const pedido = await input.prisma.pedidoOperacional.findFirst({
    where: { id: input.pedidoId, clienteId: input.clienteId },
    include: { itens: true },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  if (pedido.status === "CANCELADO") throw new LojaErro(409, "Este pedido já foi cancelado.");
  if (pedido.status === "ENTREGUE" || pedido.status === "PRONTO") {
    throw new LojaErro(409, "Este pedido já entrou em separação. Fale com a fazenda.");
  }

  const obs = pedido.observacoes ?? "";
  const doSite = obs.includes("Pedido pelo site");
  const pessoa = obs.includes("(pessoa)");
  const pagamento = await input.prisma.portalPedidoPagamento.findUnique({ where: { pedidoId: pedido.id } });

  if (pagamento?.status === "PAGO") {
    throw new LojaErro(409, "Este pedido já foi pago. Fale com a fazenda para qualquer alteração.");
  }

  if (pessoa) {
    if (!pagamento || pagamento.status !== "AGUARDANDO") {
      throw new LojaErro(409, "Só é possível cancelar enquanto o pagamento estiver em aberto.");
    }
  } else if (!(doSite && pedido.status === "PENDENTE")) {
    throw new LojaErro(409, "Só é possível cancelar pedidos do site ainda aguardando aprovação.");
  }

  await cancelarCobrancaCa(input.prisma, pagamento?.pixCobrancaId);
  await cancelarCobrancaCa(input.prisma, pagamento?.cartaoCobrancaId);

  await input.prisma.$transaction(async (tx) => {
    for (const item of pedido.itens) {
      if (!item.produtoId) continue;
      const produto = await tx.produtoComercial.findUnique({
        where: { id: item.produtoId },
        select: { estoqueLoja: true },
      });
      if (produto?.estoqueLoja == null) continue;
      await tx.produtoComercial.update({
        where: { id: item.produtoId },
        data: { estoqueLoja: { increment: Number(item.quantidade) } },
      });
    }
    await tx.pedidoOperacional.update({
      where: { id: pedido.id },
      data: {
        status: "CANCELADO",
        observacoes: `${obs}\nCancelado pelo cliente no site.`.trim(),
      },
    });
    if (pagamento) {
      await tx.portalPedidoPagamento.update({
        where: { pedidoId: pedido.id },
        data: {
          status: "CANCELADO",
          pixUrl: null,
          cartaoUrl: null,
        },
      });
    }
  });

  return { ok: true };
}

/**
 * Troca Pix ↔ cartão: cancela a cobrança atual e emite a nova.
 */
export async function alterarFormaPagamentoPedido(input: {
  prisma: PrismaClient;
  pedidoId: string;
  clienteId: string;
  contaAzulCustomerId: string;
  formaPagamento: FormaPagamentoPessoa;
}): Promise<{
  status: string;
  pixUrl: string | null;
  cartaoUrl: string | null;
  total: number;
  formaPagamento: FormaPagamentoPessoa;
}> {
  const pedido = await input.prisma.pedidoOperacional.findFirst({
    where: { id: input.pedidoId, clienteId: input.clienteId },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  if (pedido.status === "CANCELADO") throw new LojaErro(409, "Pedido cancelado.");
  const obs = pedido.observacoes ?? "";
  if (!obs.includes("(pessoa)")) {
    throw new LojaErro(400, "Só pedidos de pessoa física têm Pix/cartão no site.");
  }

  const pagamento = await input.prisma.portalPedidoPagamento.findUnique({ where: { pedidoId: pedido.id } });
  if (!pagamento || pagamento.status !== "AGUARDANDO") {
    throw new LojaErro(409, "Só é possível trocar o pagamento enquanto estiver em aberto.");
  }

  const atual = formaPagamentoDoRegistro(pagamento);
  if (atual === input.formaPagamento) {
    return {
      status: pagamento.status,
      pixUrl: pagamento.pixUrl,
      cartaoUrl: pagamento.cartaoUrl,
      total: Number(pagamento.total),
      formaPagamento: input.formaPagamento,
    };
  }

  const pago = await cobrancaPaga(input.prisma, pagamento.pixCobrancaId, pagamento.cartaoCobrancaId);
  if (pago) throw new LojaErro(409, "O pagamento já foi confirmado.");

  await cancelarCobrancaCa(input.prisma, pagamento.pixCobrancaId);
  await cancelarCobrancaCa(input.prisma, pagamento.cartaoCobrancaId);

  // Nova conta a receber: a parcela antiga já teve cobrança e a API não permite segunda na mesma.
  const dataEntrega = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(pedido.dataEntrega);

  return criarCobrancasPessoa({
    prisma: input.prisma,
    pedidoId: pedido.id,
    contaAzulCustomerId: input.contaAzulCustomerId,
    total: Number(pagamento.total),
    descricao: `Pedido Fazendas Up ${dataEntrega}`,
    vencimentoYmd: dataEntrega,
    formaPagamento: input.formaPagamento,
  });
}
