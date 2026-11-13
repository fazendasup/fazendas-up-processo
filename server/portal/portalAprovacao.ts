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
/** Pedido PJ faturado: sem Pix/cartão no portal após aprovação. */
export const MARCA_PAGAMENTO_FATURADO = "Pagamento: faturado.";

export function pedidoDoSite(obs: string | null | undefined): boolean {
  return (obs ?? "").includes("Pedido pelo site");
}

export function pedidoPessoaSite(obs: string | null | undefined): boolean {
  return (obs ?? "").includes("(pessoa)");
}

export function pedidoAprovadoPelaFazenda(obs: string | null | undefined): boolean {
  return (obs ?? "").includes(MARCA_APROVADO_FAZENDA);
}

export function pedidoFaturadoSite(obs: string | null | undefined): boolean {
  return (obs ?? "").includes(MARCA_PAGAMENTO_FATURADO);
}

/**
 * Faturado na regra comercial = prazo de boleto explícito (> 0 dias).
 * Sem regra, prazo null/0 ou só regras de entrega → à vista no portal.
 */
export function regraComercialEhFaturada(
  regra: { prazoBoletoDias?: number | null } | null | undefined,
): boolean {
  return regra != null && regra.prazoBoletoDias != null && regra.prazoBoletoDias > 0;
}

/**
 * Cliente paga à vista no site (Pix/cartão) após aprovação —
 * PF sempre; PJ só se NÃO tiver regra faturada (prazoBoletoDias > 0).
 */
export async function clientePagaAVistaNoPortal(
  prisma: PrismaClient,
  input: {
    clienteId?: string | null;
    contaAzulCustomerId?: string | null;
    /** Perfil portal PESSOA força à vista mesmo com regra. */
    perfilPessoa?: boolean;
  },
): Promise<boolean> {
  if (input.perfilPessoa) return true;
  let contaAzulId = input.contaAzulCustomerId?.trim() || null;
  if (!contaAzulId && input.clienteId) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: input.clienteId },
      select: { externalId: true },
    });
    contaAzulId = cliente?.externalId?.trim() || null;
  }
  if (!contaAzulId) return true;
  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId: contaAzulId },
    select: { prazoBoletoDias: true },
  });
  return !regraComercialEhFaturada(regra);
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
 * Faturado / empresa sem paywall: após aprovação.
 * À vista (marcador pessoa / aguarda pagamento): após pagamento.
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
  // À vista no portal: Pix/cartão antes da programação.
  if (pedidoPessoaSite(obs) || /Aguardando pagamento\.?/i.test(obs)) {
    if (pedidoFaturadoSite(obs)) {
      return pedidoAprovadoPelaFazenda(obs);
    }
    return (
      obs.includes("Liberado para produção") ||
      obs.includes("Pago via site") ||
      input.status === "PRONTO" ||
      input.status === "ENTREGUE"
    );
  }
  // Faturado / sem paywall: aprovação libera a programação.
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

function anexarMarcaAprovado(
  obs: string | null | undefined,
  opts: { pagaAVista: boolean; faturado?: boolean },
): string {
  const base = (obs ?? "").trim();
  if (base.includes(MARCA_APROVADO_FAZENDA)) {
    if (opts.pagaAVista && !pedidoPessoaSite(base)) return garantirMarcadorPessoaObs(base);
    if (opts.faturado && !pedidoFaturadoSite(base)) {
      return `${base.trim()}\n${MARCA_PAGAMENTO_FATURADO}`;
    }
    return base;
  }
  const comPaywall = opts.pagaAVista ? garantirMarcadorPessoaObs(base) : base;
  const semAguardo = comPaywall
    .replace(/\s*Aguardando aprovação da fazenda\.?/gi, "")
    .replace(/\s*Aguardando pagamento\.?/gi, "")
    .replace(new RegExp(`\\s*${MARCA_PAGAMENTO_FATURADO.replace(".", "\\.")}?`, "gi"), "")
    .trim();
  const linhas = [
    semAguardo ||
      (opts.pagaAVista ? "Pedido pelo site (pessoa)." : "Pedido pelo site."),
    MARCA_APROVADO_FAZENDA,
    opts.pagaAVista ? "Aguardando pagamento." : null,
    opts.faturado ? MARCA_PAGAMENTO_FATURADO : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

/** Resolve se o pedido do site deve cobrar à vista no portal (não faturado). */
async function resolverPedidoPagaAVistaSite(input: {
  prisma: PrismaClient;
  clienteId: string | null | undefined;
  contaAzulCustomerId?: string | null;
  observacoes: string | null | undefined;
}): Promise<{ pagaAVista: boolean; faturado: boolean }> {
  const obs = input.observacoes ?? "";
  if (pedidoFaturadoSite(obs)) return { pagaAVista: false, faturado: true };
  // Já marcado como paywall à vista (PF ou PJ reparado).
  if (pedidoPessoaSite(obs) || formaPagamentoPreferidaDasObservacoes(obs)) {
    return { pagaAVista: true, faturado: false };
  }
  let perfilPessoa = false;
  if (input.clienteId) {
    const acesso = await input.prisma.portalAcesso.findUnique({
      where: { clienteId: input.clienteId },
      select: { perfil: true },
    });
    perfilPessoa = acesso?.perfil === "PESSOA";
  }
  const pagaAVista = await clientePagaAVistaNoPortal(input.prisma, {
    clienteId: input.clienteId,
    contaAzulCustomerId: input.contaAzulCustomerId,
    perfilPessoa,
  });
  return { pagaAVista, faturado: !pagaAVista };
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
 * Equipe aprova pedido do portal (sem Conta Azul).
 * À vista → libera "Aguardando pagamento" no site; cobrança só no clique Pix/cartão.
 * Faturado → libera programação; sem paywall no portal.
 */
export async function aprovarPedidoSite(input: {
  prisma: PrismaClient;
  pedidoId: string;
  usuario?: { id: string; nome: string } | null;
}): Promise<{
  ok: true;
  /** @deprecated use pagaAVista — true quando o site deve cobrar Pix/cartão. */
  pessoa: boolean;
  pagaAVista: boolean;
  faturado: boolean;
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

  const { pagaAVista, faturado } = await resolverPedidoPagaAVistaSite({
    prisma: input.prisma,
    clienteId: pedido.clienteId,
    contaAzulCustomerId: pedido.contaAzulCustomerId,
    observacoes: obs,
  });
  const pagamentoExistente = await input.prisma.portalPedidoPagamento.findUnique({
    where: { pedidoId: pedido.id },
  });

  // Conta Azul NÃO é criada na aprovação — só libera o paywall (à vista) ou a programação (faturado).
  const novasObs = anexarMarcaAprovado(obs, { pagaAVista, faturado });
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
          pagaAVista,
          faturado,
          cobrancaExistente: pagamentoExistente
            ? { status: pagamentoExistente.status, total: Number(pagamentoExistente.total) }
            : null,
        },
      },
    });
  }

  return {
    ok: true,
    pessoa: pagaAVista,
    pagaAVista,
    faturado,
    // Links só existem se já havia cobrança legada; aprovação nova não gera Conta Azul.
    pagamento:
      pagaAVista && pagamentoExistente && pagamentoExistente.status !== "CANCELADO"
        ? {
            status: pagamentoExistente.status,
            pixUrl: pagamentoExistente.pixUrl,
            cartaoUrl: pagamentoExistente.cartaoUrl,
            total: Number(pagamentoExistente.total),
            formaPagamento: formaPagamentoDoRegistro(pagamentoExistente) ?? "pix",
          }
        : null,
  };
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
  if (pedidoFaturadoSite(obs)) {
    throw new LojaErro(400, "Pedido faturado — sem Pix/cartão no portal.");
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
    novasObs = anexarMarcaAprovado(novasObs, { pagaAVista: true, faturado: false });
  } else if (!/Aguardando pagamento\.?/i.test(novasObs)) {
    novasObs = `${novasObs.trim()}\nAguardando pagamento.`;
  }

  await input.prisma.pedidoOperacional.update({
    where: { id: pedido.id },
    data: { observacoes: novasObs },
  });

  if (input.usuario) {
    try {
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
    } catch (error) {
      // Cobrança já está salva — não desfaz por falha de auditoria (ex.: usuário inválido em script).
      console.warn("[portal] auditoria cobranca reparada", pedido.id, error);
    }
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
