import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { getComercialEnv } from "../comercial/env";
import {
  contaAzulDelete,
  contaAzulGet,
  contaAzulPatch,
  contaAzulPost,
  createContaAzulHttp,
} from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../comercial/integrations/conta-azul/venda-outbound.service";
import { MIN_ORDER_PESSOA_REAIS, TAXA_CARTAO_PESSOA, todayYmd } from "./portalCalendario";
import { LojaErro } from "./portalLoja";

export type FormaPagamentoPessoa = "pix" | "cartao";

/** Total a cobrar no Conta Azul (produtos + taxa de cartão, se houver). */
export function totalCobrancaPessoa(baseReais: number, forma: FormaPagamentoPessoa): number {
  const base = Math.round(baseReais * 100) / 100;
  if (forma !== "cartao") return base;
  return Math.round(base * (1 + TAXA_CARTAO_PESSOA) * 100) / 100;
}

/** Remove a taxa de cartão de um total já cobrado (ex.: fallback ao trocar para Pix). */
export function baseSemTaxaCartao(
  totalCobrado: number,
  formaAnterior: FormaPagamentoPessoa | null,
): number {
  const total = Math.round(Number(totalCobrado) * 100) / 100;
  if (!(total > 0)) return 0;
  if (formaAnterior === "cartao") {
    return Math.round((total / (1 + TAXA_CARTAO_PESSOA)) * 100) / 100;
  }
  return total;
}

/** Soma dos itens do pedido (sempre sem taxa de cartão). */
export function somarBaseItensPedido(
  itens: Array<{ precoUnit?: unknown; quantidade?: unknown }>,
): number {
  const soma = itens.reduce((acc, item) => {
    const preco = Number(item.precoUnit);
    const qtd = Number(item.quantidade);
    if (!Number.isFinite(preco) || !Number.isFinite(qtd)) return acc;
    return acc + preco * qtd;
  }, 0);
  return Math.round(soma * 100) / 100;
}

/**
 * Base de produtos para nova cobrança.
 * Nunca reutiliza o total cobrado com taxa de cartão como se fosse Pix.
 */
export function resolverBaseCobrancaPessoa(input: {
  itens: Array<{ precoUnit?: unknown; quantidade?: unknown }>;
  totalCobradoAtual: number;
  formaAnterior: FormaPagamentoPessoa | null;
}): number {
  const dosItens = somarBaseItensPedido(input.itens);
  if (dosItens > 0) return dosItens;
  return baseSemTaxaCartao(input.totalCobradoAtual, input.formaAnterior);
}

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
  tentativas = 12,
): Promise<{ id: string; url: string | null; status: string | null }> {
  let url = (inicial.url ?? inicial.URL ?? null) ? String(inicial.url ?? inicial.URL) : null;
  let status = inicial.status ? String(inicial.status) : null;
  if (url) return { id, url, status };
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      const c = await contaAzulGet<CobrancaResposta>(
        http,
        `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(id)}`,
      );
      url = c.url ?? c.URL ? String(c.url ?? c.URL) : null;
      status = c.status ? String(c.status) : status;
      if (url) return { id, url, status };
      if (status && /FALHA_EMISSAO|INVALIDO|CANCELADO|FALHA_CANCELAR/i.test(status)) {
        return { id, url: null, status };
      }
    } catch {
      /* tenta de novo */
    }
    if (i < tentativas) await esperar(Math.min(2500, 500 + i * 400));
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

type ParcelaDetalheCa = {
  id?: string;
  versao?: number;
  status?: string;
  nao_pago?: number;
  total?: number;
  valor_composicao?: { valor_bruto?: number };
  detalhe_valor?: { valor_bruto?: number };
};

/**
 * Encerra parcela órfã/cancelada no Conta Azul (some de "em aberto" sem mover caixa).
 */
async function marcarParcelaComoPerda(
  http: ReturnType<typeof createContaAzulHttp>,
  parcelaId: string | null | undefined,
): Promise<void> {
  const id = parcelaId?.trim();
  if (!id) return;
  try {
    const parcela = await contaAzulGet<ParcelaDetalheCa>(
      http,
      `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(id)}`,
    );
    const status = String(parcela.status ?? "").toUpperCase();
    if (/PERDIDO|CANCELADO|QUITADO|RENEGOCIADO/i.test(status)) return;
    const versao = Number(parcela.versao);
    if (!Number.isFinite(versao) || versao < 1) {
      console.warn("[portal] parcela sem versão para perda", id);
      return;
    }
    const valor =
      Number(parcela.nao_pago) ||
      Number(parcela.valor_composicao?.valor_bruto) ||
      Number(parcela.detalhe_valor?.valor_bruto) ||
      Number(parcela.total) ||
      0;
    if (valor <= 0) return;
    // Conta Azul recusa perda + outros campos na mesma requisição.
    await contaAzulPatch(http, `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(id)}`, {
      versao,
      perda: { data: todayYmd(), valor: Math.round(valor * 100) / 100 },
    });
  } catch (error) {
    console.warn("[portal] marcar parcela como perda", id, error);
  }
}

async function encerrarReceberPortal(
  prisma: PrismaClient,
  parcelaId: string | null | undefined,
  pixCobrancaId?: string | null,
  cartaoCobrancaId?: string | null,
) {
  await cancelarCobrancaCa(prisma, pixCobrancaId);
  await cancelarCobrancaCa(prisma, cartaoCobrancaId);
  const http = await httpContaAzul(prisma);
  if (http) await marcarParcelaComoPerda(http, parcelaId);
}

/**
 * Cria conta a receber no Conta Azul e emite Pix OU link de cartão (uma cobrança por parcela).
 * `total` deve ser sempre a base dos produtos (sem taxa). A taxa de cartão é aplicada aqui.
 */
export async function criarCobrancasPessoa(input: {
  prisma: PrismaClient;
  pedidoId: string;
  contaAzulCustomerId: string;
  /** Soma dos produtos, SEM taxa de cartão. */
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
  linkPendente?: boolean;
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
  const base = Math.round(input.total * 100) / 100;
  if (!(base > 0)) {
    throw new LojaErro(400, "Não foi possível calcular o valor do pedido.");
  }
  const total = totalCobrancaPessoa(base, input.formaPagamento);
  if (total < MIN_ORDER_PESSOA_REAIS) {
    throw new LojaErro(
      400,
      `O pedido mínimo para pessoa física é R$ ${MIN_ORDER_PESSOA_REAIS.toFixed(2).replace(".", ",")}.`,
    );
  }
  const taxaCartao = input.formaPagamento === "cartao" ? Math.round((total - base) * 100) / 100 : 0;
  const descricaoBase = input.descricao.slice(0, 180) || "Pedido Fazendas Up";
  const descricao =
    taxaCartao > 0
      ? `${descricaoBase} · taxa cartão ${Math.round(TAXA_CARTAO_PESSOA * 100)}%`.slice(0, 180)
      : descricaoBase;
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
    await marcarParcelaComoPerda(http, parcelaId);
    const texto = error instanceof Error ? error.message : String(error);
    console.error("[portal] gerar cobrança", error);
    throw new LojaErro(503, texto.includes("Conta Azul") ? texto : "Não foi possível gerar o pagamento agora.");
  }

  // O Conta Azul costuma devolver a cobrança sem URL (AGUARDANDO_CONFIRMACAO).
  // Guardamos o id e o cliente busca o link depois — não desfaz o pedido.
  if (cobranca.status && /FALHA_EMISSAO|INVALIDO/i.test(cobranca.status)) {
    try {
      await contaAzulDelete(
        http,
        `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(cobranca.id)}`,
      );
    } catch {
      /* já inválida */
    }
    await marcarParcelaComoPerda(http, parcelaId);
    throw new LojaErro(
      503,
      total < 10
        ? "O Conta Azul só emite cobrança a partir de R$ 10,00. Ajuste o valor do pedido."
        : "A cobrança foi recusada pelo Conta Azul. Confira se o cadastro tem e-mail, telefone e endereço no Brasil, ou tente outra forma de pagamento.",
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
    linkPendente: !cobranca.url,
  };
}

export async function lerPagamentoPedido(
  prisma: PrismaClient,
  pedidoId: string,
  clienteId: string,
  contaAzulCustomerId?: string | null,
) {
  const pedido = await prisma.pedidoOperacional.findFirst({
    where: {
      id: pedidoId,
      OR: [
        { clienteId },
        ...(contaAzulCustomerId ? [{ contaAzulCustomerId }] : []),
      ],
    },
    select: { id: true, observacoes: true, status: true },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");

  let pagamento = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  if (!pagamento) {
    return {
      pedidoId,
      status: "SEM_COBRANCA",
      pixUrl: null as string | null,
      cartaoUrl: null as string | null,
      total: null as number | null,
      pago: false,
      formaPagamento: null as FormaPagamentoPessoa | null,
      linkPendente: false,
    };
  }

  let status = pagamento.status;
  let pixUrl = pagamento.pixUrl;
  let cartaoUrl = pagamento.cartaoUrl;

  if (status === "AGUARDANDO" && (pagamento.pixCobrancaId || pagamento.cartaoCobrancaId)) {
    const http = await httpContaAzul(prisma);
    if (http) {
      for (const [campo, cobrancaId] of [
        ["pix", pagamento.pixCobrancaId],
        ["cartao", pagamento.cartaoCobrancaId],
      ] as const) {
        if (!cobrancaId) continue;
        try {
          const c = await contaAzulGet<CobrancaResposta>(
            http,
            `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(cobrancaId)}`,
          );
          const url = c.url ?? c.URL ? String(c.url ?? c.URL) : null;
          if (url) {
            if (campo === "pix") pixUrl = url;
            else cartaoUrl = url;
          }
          if (c.status && /^(PAGO|QUITADO)$/i.test(String(c.status).trim())) {
            status = "PAGO";
          }
        } catch {
          /* ignora */
        }
      }
      if (pixUrl !== pagamento.pixUrl || cartaoUrl !== pagamento.cartaoUrl || status !== pagamento.status) {
        pagamento = await prisma.portalPedidoPagamento.update({
          where: { pedidoId },
          data: {
            pixUrl,
            cartaoUrl,
            ...(status === "PAGO" ? { status: "PAGO", pagoEm: new Date() } : {}),
          },
        });
        pixUrl = pagamento.pixUrl;
        cartaoUrl = pagamento.cartaoUrl;
        status = pagamento.status;
        if (status === "PAGO" && !(pedido.observacoes ?? "").includes("Pago via site")) {
          await prisma.pedidoOperacional.update({
            where: { id: pedidoId },
            data: {
              observacoes: `${pedido.observacoes ?? "Pedido pelo site (pessoa)."}\nPago via site. Liberado para produção.`.trim(),
            },
          });
        }
      }
    }
  }

  return {
    pedidoId,
    status,
    pixUrl,
    cartaoUrl,
    total: Number(pagamento.total),
    pago: status === "PAGO",
    formaPagamento: formaPagamentoDoRegistro({ pixUrl, cartaoUrl, pixCobrancaId: pagamento.pixCobrancaId, cartaoCobrancaId: pagamento.cartaoCobrancaId }),
    linkPendente: status === "AGUARDANDO" && !pixUrl && !cartaoUrl,
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
  const temPix = Boolean(pagamento.pixUrl || pagamento.pixCobrancaId);
  const temCartao = Boolean(pagamento.cartaoUrl || pagamento.cartaoCobrancaId);
  // Estado sujo (ambos): cartão vence — a limpeza na troca deve evitar isso, mas o UI
  // não pode mostrar "Abrir Pix" com total de cartão.
  if (temPix && temCartao) return "cartao";
  if (temCartao) return "cartao";
  if (temPix) return "pix";
  return null;
}

/**
 * Cancela pedido do site ainda sem pagamento (restaura estoque e invalida cobrança).
 */
export async function cancelarPedidoCliente(input: {
  prisma: PrismaClient;
  pedidoId: string;
  clienteId: string;
  contaAzulCustomerId?: string | null;
}): Promise<{ ok: true }> {
  const pedido = await input.prisma.pedidoOperacional.findFirst({
    where: {
      id: input.pedidoId,
      OR: [
        { clienteId: input.clienteId },
        ...(input.contaAzulCustomerId
          ? [{ contaAzulCustomerId: input.contaAzulCustomerId }]
          : []),
      ],
    },
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

  await encerrarReceberPortal(
    input.prisma,
    pagamento?.parcelaId,
    pagamento?.pixCobrancaId,
    pagamento?.cartaoCobrancaId,
  );

  // Sem interactive transaction: o proxy MySQL (Railway) costuma derrubar tx longas.
  for (const item of pedido.itens) {
    if (!item.produtoId) continue;
    try {
      await input.prisma.produtoComercial.updateMany({
        where: { id: item.produtoId, estoqueLoja: { not: null } },
        data: { estoqueLoja: { increment: Number(item.quantidade) } },
      });
    } catch (error) {
      console.warn("[portal] restaurar estoque no cancelamento", item.produtoId, error);
    }
  }

  await input.prisma.pedidoOperacional.update({
    where: { id: pedido.id },
    data: {
      status: "CANCELADO",
      observacoes: `${obs}\nCancelado pelo cliente no site.`.trim(),
    },
  });

  if (pagamento) {
    await input.prisma.portalPedidoPagamento.update({
      where: { pedidoId: pedido.id },
      data: {
        status: "CANCELADO",
        pixUrl: null,
        cartaoUrl: null,
        pixCobrancaId: null,
        cartaoCobrancaId: null,
      },
    });
  }

  return { ok: true };
}

/**
 * Corrige pagamento ainda "AGUARDANDO" em pedido já cancelado e encerra a parcela no Conta Azul.
 */
export async function alinharPagamentoPedidoCancelado(
  prisma: PrismaClient,
  pedidoId: string,
): Promise<void> {
  const pedido = await prisma.pedidoOperacional.findUnique({
    where: { id: pedidoId },
    select: { id: true, status: true },
  });
  if (!pedido || pedido.status !== "CANCELADO") return;
  const pagamento = await prisma.portalPedidoPagamento.findUnique({ where: { pedidoId } });
  if (!pagamento || pagamento.status === "CANCELADO" || pagamento.status === "PAGO") return;
  await encerrarReceberPortal(
    prisma,
    pagamento.parcelaId,
    pagamento.pixCobrancaId,
    pagamento.cartaoCobrancaId,
  );
  await prisma.portalPedidoPagamento.update({
    where: { pedidoId },
    data: {
      status: "CANCELADO",
      pixUrl: null,
      cartaoUrl: null,
      pixCobrancaId: null,
      cartaoCobrancaId: null,
    },
  });
}

/** Parcelas Conta Azul que o portal ainda considera cobrança válida do cliente. */
export async function idsParcelasPortalAtivas(
  prisma: PrismaClient,
  clienteId: string,
  contaAzulCustomerId?: string | null,
): Promise<Set<string>> {
  const pedidos = await prisma.pedidoOperacional.findMany({
    where: {
      status: { not: "CANCELADO" },
      OR: [
        { clienteId },
        ...(contaAzulCustomerId ? [{ contaAzulCustomerId }] : []),
      ],
    },
    select: { id: true },
  });
  if (pedidos.length === 0) return new Set();
  const pags = await prisma.portalPedidoPagamento.findMany({
    where: {
      pedidoId: { in: pedidos.map((p) => p.id) },
      status: { in: ["AGUARDANDO", "PAGO"] },
      parcelaId: { not: null },
    },
    select: { parcelaId: true },
  });
  return new Set(pags.map((p) => p.parcelaId!).filter(Boolean));
}

/** Marca como perda parcelas órfãs (ex.: retries/cancelamentos que ficaram no Conta Azul). */
export async function encerrarParcelasOrfasCa(
  prisma: PrismaClient,
  parcelaIds: string[],
): Promise<number> {
  const http = await httpContaAzul(prisma);
  if (!http) return 0;
  let ok = 0;
  for (const id of parcelaIds) {
    const antes = id.trim();
    if (!antes) continue;
    await marcarParcelaComoPerda(http, antes);
    ok += 1;
  }
  return ok;
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
    where: {
      id: input.pedidoId,
      OR: [{ clienteId: input.clienteId }, { contaAzulCustomerId: input.contaAzulCustomerId }],
    },
    include: { itens: { select: { precoUnit: true, quantidade: true } } },
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
  const base = resolverBaseCobrancaPessoa({
    itens: pedido.itens,
    totalCobradoAtual: Number(pagamento.total),
    // Se está Pix com total de cartão, trata como se viesse de cartão para remover a taxa.
    formaAnterior:
      atual === "pix" &&
      Math.abs(Number(pagamento.total) - totalCobrancaPessoa(somarBaseItensPedido(pedido.itens), "cartao")) < 0.02
        ? "cartao"
        : atual,
  });
  if (!(base > 0)) {
    throw new LojaErro(400, "Não foi possível recalcular o valor do pedido para a nova cobrança.");
  }
  const totalEsperado = totalCobrancaPessoa(base, input.formaPagamento);
  const totalAtual = Math.round(Number(pagamento.total) * 100) / 100;
  const mesmaForma = atual === input.formaPagamento;
  const totalOk = Math.abs(totalAtual - totalEsperado) <= 0.009;

  if (mesmaForma && totalOk) {
    return {
      status: pagamento.status,
      pixUrl: pagamento.pixUrl,
      cartaoUrl: pagamento.cartaoUrl,
      total: totalAtual,
      formaPagamento: input.formaPagamento,
    };
  }

  const pago = await cobrancaPaga(input.prisma, pagamento.pixCobrancaId, pagamento.cartaoCobrancaId);
  if (pago) throw new LojaErro(409, "O pagamento já foi confirmado.");

  // Encerra a parcela antiga (perda) antes de abrir outra — evita "vários Pedidos" no Pagamentos.
  await encerrarReceberPortal(
    input.prisma,
    pagamento.parcelaId,
    pagamento.pixCobrancaId,
    pagamento.cartaoCobrancaId,
  );
  // Limpa links antigos já: se a nova cobrança falhar, o UI não reabre Pix/cartão morto.
  await input.prisma.portalPedidoPagamento.update({
    where: { pedidoId: pedido.id },
    data: {
      pixCobrancaId: null,
      pixUrl: null,
      cartaoCobrancaId: null,
      cartaoUrl: null,
      parcelaId: null,
      contaAzulReceberId: null,
    },
  });
  await esperar(800);

  const dataEntrega = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(pedido.dataEntrega);

  try {
    const cobranca = await criarCobrancasPessoa({
      prisma: input.prisma,
      pedidoId: pedido.id,
      contaAzulCustomerId: input.contaAzulCustomerId,
      total: base,
      descricao: `Pedido Fazendas Up ${dataEntrega}`,
      vencimentoYmd: dataEntrega,
      formaPagamento: input.formaPagamento,
    });
    if (Math.abs(cobranca.total - totalEsperado) > 0.009) {
      console.error("[portal] total cobrado diverge do esperado", {
        pedidoId: pedido.id,
        forma: input.formaPagamento,
        base,
        esperado: totalEsperado,
        cobrado: cobranca.total,
      });
    }
    return cobranca;
  } catch (error) {
    console.error("[portal] trocar forma pagamento — nova cobrança falhou", {
      pedidoId: pedido.id,
      forma: input.formaPagamento,
      base,
      error,
    });
    throw error instanceof LojaErro
      ? error
      : new LojaErro(503, "Não foi possível gerar a nova cobrança. Tente de novo em instantes.");
  }
}
