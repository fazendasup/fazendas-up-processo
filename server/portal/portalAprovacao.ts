import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import {
  criarCobrancasPessoa,
  encerrarReceberPortal,
  formaPagamentoDoRegistro,
  somarBaseItensPedido,
  type FormaPagamentoPessoa,
} from "./portalPagamento";
import { LojaErro } from "./portalLoja";

/** Marcador gravado nas observações quando a equipe aprova o pedido do site. */
export const MARCA_APROVADO_FAZENDA = "Aprovado pela fazenda.";

export function pedidoDoSite(obs: string | null | undefined): boolean {
  return (obs ?? "").includes("Pedido pelo site");
}

export function pedidoPessoaSite(obs: string | null | undefined): boolean {
  return (obs ?? "").includes("(pessoa)");
}

export function pedidoAprovadoPelaFazenda(obs: string | null | undefined): boolean {
  return (obs ?? "").includes(MARCA_APROVADO_FAZENDA);
}

/** Garante o marcador (pessoa) nas observações para o portal liberar Pix/cartão. */
export function garantirMarcadorPessoaObs(obs: string | null | undefined): string {
  const base = (obs ?? "").trim();
  if (pedidoPessoaSite(base)) return base;
  if (/Pedido pelo site/i.test(base)) {
    return base.replace(/Pedido pelo site(?!\s*\(pessoa\))/i, "Pedido pelo site (pessoa)");
  }
  return `Pedido pelo site (pessoa).\n${base}`.trim();
}

/** Pedido do site ainda sem aprovação da equipe (pagamento bloqueado). */
export function pedidoAguardandoAprovacaoSite(input: {
  status: string;
  observacoes?: string | null;
  temPagamentoAguardandoOuPago?: boolean;
}): boolean {
  if (input.status === "CANCELADO" || input.status === "ENTREGUE" || input.status === "PRONTO") {
    return false;
  }
  const obs = input.observacoes ?? "";
  if (!pedidoDoSite(obs)) return false;
  if (pedidoAprovadoPelaFazenda(obs)) return false;
  // PF antigo (já com cobrança antes desta regra): não trava como "aguardando aprovação".
  if (pedidoPessoaSite(obs) && input.temPagamentoAguardandoOuPago) return false;
  return input.status === "PENDENTE";
}

/**
 * Pedido do site liberado para a operação do dia (agenda/dashboard).
 * Empresa: após aprovação. Pessoa: após pagamento (ou liberação explícita).
 */
export function pedidoSiteLiberadoNaOperacao(input: {
  status: string;
  observacoes?: string | null;
}): boolean {
  if (input.status === "CANCELADO") return false;
  const obs = input.observacoes ?? "";
  if (!pedidoDoSite(obs)) return true;
  if (pedidoAguardandoAprovacaoSite({
    status: input.status,
    observacoes: obs,
  })) {
    return false;
  }
  if (pedidoPessoaSite(obs)) {
    return (
      obs.includes("Liberado para produção") ||
      obs.includes("Pago via site") ||
      input.status === "PRONTO" ||
      input.status === "ENTREGUE"
    );
  }
  // Empresa: aprovação da fazenda libera a programação/operação.
  return pedidoAprovadoPelaFazenda(obs);
}

/** Taxa de entrega registrada nas observações (ex.: "taxa de R$ 20,00"). */
export function taxaEntregaDasObservacoes(obs: string | null | undefined): number {
  const m = (obs ?? "").match(/taxa de R\$\s*([\d.,]+)/i);
  if (!m?.[1]) return 0;
  const raw = m[1].includes(",")
    ? m[1].replace(/\./g, "").replace(",", ".")
    : m[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function formaPagamentoPreferidaDasObservacoes(
  obs: string | null | undefined,
): FormaPagamentoPessoa | null {
  const texto = obs ?? "";
  if (/Pagamento:\s*cart[aã]o/i.test(texto)) return "cartao";
  if (/Pagamento:\s*Pix/i.test(texto)) return "pix";
  return null;
}

export function baseCobrancaPedidoSite(input: {
  observacoes?: string | null;
  itens: Array<{ precoUnit?: unknown; quantidade?: unknown }>;
}): number {
  const produtos = somarBaseItensPedido(input.itens);
  const taxa = taxaEntregaDasObservacoes(input.observacoes);
  return Math.round((produtos + taxa) * 100) / 100;
}

function anexarMarcaAprovado(obs: string | null | undefined, pessoa?: boolean): string {
  const base = (obs ?? "").trim();
  if (base.includes(MARCA_APROVADO_FAZENDA)) {
    if (pessoa && !pedidoPessoaSite(base)) return garantirMarcadorPessoaObs(base);
    return base;
  }
  const comPessoa = pessoa ? garantirMarcadorPessoaObs(base) : base;
  const semAguardo = comPessoa
    .replace(/\s*Aguardando aprovação da fazenda\.?/gi, "")
    .replace(/\s*Aguardando pagamento\.?/gi, "")
    .trim();
  const ehPessoa = pessoa ?? pedidoPessoaSite(semAguardo);
  const linhas = [
    semAguardo || (ehPessoa ? "Pedido pelo site (pessoa)." : "Pedido pelo site."),
    MARCA_APROVADO_FAZENDA,
    ehPessoa ? "Aguardando pagamento." : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

async function resolverPedidoPessoaSite(input: {
  prisma: PrismaClient;
  clienteId: string | null | undefined;
  observacoes: string | null | undefined;
}): Promise<boolean> {
  if (pedidoPessoaSite(input.observacoes)) return true;
  // Checkout PF grava "Pagamento: Pix|cartão" mesmo se o marcador (pessoa) falhar.
  if (formaPagamentoPreferidaDasObservacoes(input.observacoes)) return true;
  if (!input.clienteId) return false;
  const acesso = await input.prisma.portalAcesso.findUnique({
    where: { clienteId: input.clienteId },
    select: { perfil: true },
  });
  return acesso?.perfil === "PESSOA";
}

async function emitirCobrancaPedidoSite(input: {
  prisma: PrismaClient;
  pedido: {
    id: string;
    contaAzulCustomerId: string | null;
    dataEntrega: Date;
    observacoes: string | null;
    itens: Array<{ precoUnit?: unknown; quantidade?: unknown }>;
  };
  forma?: FormaPagamentoPessoa | null;
}): Promise<Awaited<ReturnType<typeof criarCobrancasPessoa>>> {
  const obs = input.pedido.observacoes ?? "";
  const forma =
    input.forma ??
    formaPagamentoPreferidaDasObservacoes(obs) ??
    "pix";
  const base = baseCobrancaPedidoSite({ observacoes: obs, itens: input.pedido.itens });
  if (!(base > 0)) {
    throw new LojaErro(400, "Não foi possível calcular o valor do pedido para cobrança.");
  }
  if (!input.pedido.contaAzulCustomerId?.trim()) {
    throw new LojaErro(400, "Cliente sem vínculo Conta Azul.");
  }
  const dataEntrega = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(input.pedido.dataEntrega);
  const taxa = taxaEntregaDasObservacoes(obs);
  try {
    return await criarCobrancasPessoa({
      prisma: input.prisma,
      pedidoId: input.pedido.id,
      contaAzulCustomerId: input.pedido.contaAzulCustomerId,
      total: base,
      descricao:
        taxa > 0
          ? `Pedido Fazendas Up ${dataEntrega} · taxa entrega`
          : `Pedido Fazendas Up ${dataEntrega}`,
      vencimentoYmd: dataEntrega,
      formaPagamento: forma,
    });
  } catch (error) {
    if (error instanceof LojaErro) throw error;
    console.error("[portal] emitir cobrança após aprovação", input.pedido.id, error);
    throw new LojaErro(
      503,
      "Não foi possível gerar a cobrança. O pedido permanece aguardando aprovação — tente aprovar de novo.",
    );
  }
}

/**
 * Equipe aprova pedido do portal: libera programação (empresa) ou emite cobrança (pessoa).
 * Cobrança PF é obrigatória: se falhar, não grava "Aprovado pela fazenda.".
 */
export async function aprovarPedidoSite(input: {
  prisma: PrismaClient;
  pedidoId: string;
  usuario?: { id: string; nome: string } | null;
}): Promise<{
  ok: true;
  pessoa: boolean;
  pagamento: {
    status: string;
    pixUrl: string | null;
    cartaoUrl: string | null;
    total: number;
    formaPagamento: FormaPagamentoPessoa;
    linkPendente?: boolean;
  } | null;
}> {
  const pedido = await input.prisma.pedidoOperacional.findUnique({
    where: { id: input.pedidoId },
    include: { itens: { select: { precoUnit: true, quantidade: true } } },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  if (pedido.status === "CANCELADO") {
    throw new LojaErro(409, "Pedido cancelado — não dá para aprovar.");
  }
  const obs = pedido.observacoes ?? "";
  if (!pedidoDoSite(obs)) {
    throw new LojaErro(400, "Só pedidos do site passam por esta aprovação.");
  }
  if (pedidoAprovadoPelaFazenda(obs)) {
    throw new LojaErro(409, "Este pedido já foi aprovado.");
  }
  if (pedido.status !== "PENDENTE") {
    throw new LojaErro(409, "Só é possível aprovar pedidos ainda pendentes.");
  }

  const pessoa = await resolverPedidoPessoaSite({
    prisma: input.prisma,
    clienteId: pedido.clienteId,
    observacoes: obs,
  });
  const pagamentoExistente = await input.prisma.portalPedidoPagamento.findUnique({
    where: { pedidoId: pedido.id },
  });

  if (pessoa && pagamentoExistente && pagamentoExistente.status !== "CANCELADO") {
    // Já tinha cobrança (legado): só marca aprovado.
    const novasObs = anexarMarcaAprovado(obs, true);
    await input.prisma.pedidoOperacional.update({
      where: { id: pedido.id },
      data: { observacoes: novasObs },
    });
    if (input.usuario) {
      await input.prisma.pedidoOperacionalAuditoria.create({
        data: {
          pedidoId: pedido.id,
          usuarioId: input.usuario.id,
          usuarioNome: input.usuario.nome,
          acao: "portal_pedido_aprovado",
          antes: { observacoes: obs },
          depois: { observacoes: novasObs, legadoComCobranca: true },
        },
      });
    }
    return {
      ok: true,
      pessoa: true,
      pagamento: {
        status: pagamentoExistente.status,
        pixUrl: pagamentoExistente.pixUrl,
        cartaoUrl: pagamentoExistente.cartaoUrl,
        total: Number(pagamentoExistente.total),
        formaPagamento: formaPagamentoDoRegistro(pagamentoExistente) ?? "pix",
      },
    };
  }

  let cobranca: Awaited<ReturnType<typeof criarCobrancasPessoa>> | null = null;
  if (pessoa) {
    // Falha aqui = pedido segue aguardando aprovação (sem marca).
    cobranca = await emitirCobrancaPedidoSite({
      prisma: input.prisma,
      pedido,
      forma: formaPagamentoDoRegistro(pagamentoExistente ?? {}) as FormaPagamentoPessoa | null,
    });
  }

  const novasObs = anexarMarcaAprovado(obs, pessoa);
  await input.prisma.pedidoOperacional.update({
    where: { id: pedido.id },
    data: { observacoes: novasObs },
  });

  if (input.usuario) {
    await input.prisma.pedidoOperacionalAuditoria.create({
      data: {
        pedidoId: pedido.id,
        usuarioId: input.usuario.id,
        usuarioNome: input.usuario.nome,
        acao: "portal_pedido_aprovado",
        antes: { observacoes: obs },
        depois: {
          observacoes: novasObs,
          cobranca: cobranca
            ? { status: cobranca.status, total: cobranca.total, forma: cobranca.formaPagamento }
            : null,
        },
      },
    });
  }

  return { ok: true, pessoa, pagamento: cobranca };
}

/**
 * Repara pedido do site já aprovado sem cobrança aberta (ex.: aprovado como empresa por engano,
 * ou cobrança Conta Azul falhou após marca — caso legado). Emite Pix/cartão agora.
 */
export async function garantirCobrancaPedidoSiteAprovado(input: {
  prisma: PrismaClient;
  pedidoId: string;
  formaPagamento?: FormaPagamentoPessoa;
  usuario?: { id: string; nome: string } | null;
}): Promise<{
  ok: true;
  pagamento: Awaited<ReturnType<typeof criarCobrancasPessoa>>;
}> {
  const pedido = await input.prisma.pedidoOperacional.findUnique({
    where: { id: input.pedidoId },
    include: { itens: { select: { precoUnit: true, quantidade: true } } },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  if (pedido.status === "CANCELADO") {
    throw new LojaErro(409, "Pedido cancelado — não dá para gerar cobrança.");
  }
  const obs = pedido.observacoes ?? "";
  if (!pedidoDoSite(obs)) {
    throw new LojaErro(400, "Só pedidos do site usam esta cobrança.");
  }
  if (pedido.status === "PRONTO" || pedido.status === "ENTREGUE") {
    throw new LojaErro(409, "Pedido já entrou em separação.");
  }

  const pagamentoExistente = await input.prisma.portalPedidoPagamento.findUnique({
    where: { pedidoId: pedido.id },
  });
  if (pagamentoExistente?.status === "PAGO") {
    throw new LojaErro(409, "Pedido já está pago.");
  }
  if (pagamentoExistente?.status === "AGUARDANDO") {
    return {
      ok: true,
      pagamento: {
        status: pagamentoExistente.status,
        pixUrl: pagamentoExistente.pixUrl,
        cartaoUrl: pagamentoExistente.cartaoUrl,
        total: Number(pagamentoExistente.total),
        formaPagamento: formaPagamentoDoRegistro(pagamentoExistente) ?? "pix",
        linkPendente: !(pagamentoExistente.pixUrl || pagamentoExistente.cartaoUrl),
      },
    };
  }

  const cobranca = await emitirCobrancaPedidoSite({
    prisma: input.prisma,
    pedido,
    forma: input.formaPagamento ?? null,
  });

  let novasObs = garantirMarcadorPessoaObs(obs);
  if (!pedidoAprovadoPelaFazenda(novasObs)) {
    novasObs = anexarMarcaAprovado(novasObs, true);
  } else if (!/Aguardando pagamento\.?/i.test(novasObs)) {
    novasObs = `${novasObs.trim()}\nAguardando pagamento.`;
  }

  await input.prisma.pedidoOperacional.update({
    where: { id: pedido.id },
    data: { observacoes: novasObs },
  });

  if (input.usuario) {
    await input.prisma.pedidoOperacionalAuditoria.create({
      data: {
        pedidoId: pedido.id,
        usuarioId: input.usuario.id,
        usuarioNome: input.usuario.nome,
        acao: "portal_pedido_cobranca_reparada",
        antes: { observacoes: obs, pagamento: pagamentoExistente?.status ?? null },
        depois: {
          observacoes: novasObs,
          cobranca: { status: cobranca.status, total: cobranca.total, forma: cobranca.formaPagamento },
        },
      },
    });
  }

  return { ok: true, pagamento: cobranca };
}

/**
 * Equipe rejeita/cancela pedido do site ainda aguardando aprovação (restaura estoque).
 */
export async function rejeitarPedidoSite(input: {
  prisma: PrismaClient;
  pedidoId: string;
  motivo?: string;
  usuario?: { id: string; nome: string } | null;
}): Promise<{ ok: true }> {
  const pedido = await input.prisma.pedidoOperacional.findUnique({
    where: { id: input.pedidoId },
    include: { itens: true },
  });
  if (!pedido) throw new LojaErro(404, "Pedido não encontrado.");
  if (pedido.status === "CANCELADO") {
    throw new LojaErro(409, "Este pedido já foi cancelado.");
  }
  const obs = pedido.observacoes ?? "";
  if (!pedidoDoSite(obs)) {
    throw new LojaErro(400, "Só pedidos do site usam esta rejeição.");
  }
  if (pedido.status === "PRONTO" || pedido.status === "ENTREGUE") {
    throw new LojaErro(409, "Pedido já entrou em separação.");
  }

  const pagamento = await input.prisma.portalPedidoPagamento.findUnique({
    where: { pedidoId: pedido.id },
  });
  if (pagamento?.status === "PAGO") {
    throw new LojaErro(409, "Pedido já pago — fale com o financeiro.");
  }

  await encerrarReceberPortal(
    input.prisma,
    pagamento?.parcelaId,
    pagamento?.pixCobrancaId,
    pagamento?.cartaoCobrancaId,
  );

  for (const item of pedido.itens) {
    if (!item.produtoId) continue;
    try {
      await input.prisma.produtoComercial.updateMany({
        where: { id: item.produtoId, estoqueLoja: { not: null } },
        data: { estoqueLoja: { increment: Number(item.quantidade) } },
      });
    } catch (error) {
      console.warn("[portal] restaurar estoque na rejeição", item.produtoId, error);
    }
  }

  const motivo = input.motivo?.trim();
  const novasObs = [
    obs,
    "Rejeitado pela fazenda.",
    motivo ? `Motivo: ${motivo}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await input.prisma.pedidoOperacional.update({
    where: { id: pedido.id },
    data: { status: "CANCELADO", observacoes: novasObs },
  });

  if (pagamento && pagamento.status !== "CANCELADO") {
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

  if (input.usuario) {
    await input.prisma.pedidoOperacionalAuditoria.create({
      data: {
        pedidoId: pedido.id,
        usuarioId: input.usuario.id,
        usuarioNome: input.usuario.nome,
        acao: "portal_pedido_rejeitado",
        antes: { status: pedido.status, observacoes: obs },
        depois: { status: "CANCELADO", observacoes: novasObs },
      },
    });
  }

  return { ok: true };
}
