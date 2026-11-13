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

function anexarMarcaAprovado(obs: string | null | undefined): string {
  const base = (obs ?? "").trim();
  if (base.includes(MARCA_APROVADO_FAZENDA)) return base;
  const semAguardo = base
    .replace(/\s*Aguardando aprovação da fazenda\.?/gi, "")
    .replace(/\s*Aguardando pagamento\.?/gi, "")
    .trim();
  const pessoa = pedidoPessoaSite(semAguardo);
  const linhas = [
    semAguardo || (pessoa ? "Pedido pelo site (pessoa)." : "Pedido pelo site."),
    MARCA_APROVADO_FAZENDA,
    pessoa ? "Aguardando pagamento." : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

/**
 * Equipe aprova pedido do portal: libera programação (empresa) ou emite cobrança (pessoa).
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

  const pessoa = pedidoPessoaSite(obs);
  const pagamentoExistente = await input.prisma.portalPedidoPagamento.findUnique({
    where: { pedidoId: pedido.id },
  });

  if (pessoa && pagamentoExistente && pagamentoExistente.status !== "CANCELADO") {
    // Já tinha cobrança (legado): só marca aprovado.
    await input.prisma.pedidoOperacional.update({
      where: { id: pedido.id },
      data: { observacoes: anexarMarcaAprovado(obs) },
    });
    if (input.usuario) {
      await input.prisma.pedidoOperacionalAuditoria.create({
        data: {
          pedidoId: pedido.id,
          usuarioId: input.usuario.id,
          usuarioNome: input.usuario.nome,
          acao: "portal_pedido_aprovado",
          antes: { observacoes: obs },
          depois: { observacoes: anexarMarcaAprovado(obs), legadoComCobranca: true },
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
    const forma =
      formaPagamentoPreferidaDasObservacoes(obs) ??
      (formaPagamentoDoRegistro(pagamentoExistente ?? {}) as FormaPagamentoPessoa | null) ??
      "pix";
    const base = baseCobrancaPedidoSite({ observacoes: obs, itens: pedido.itens });
    if (!(base > 0)) {
      throw new LojaErro(400, "Não foi possível calcular o valor do pedido para cobrança.");
    }
    if (!pedido.contaAzulCustomerId?.trim()) {
      throw new LojaErro(400, "Cliente sem vínculo Conta Azul.");
    }
    const dataEntrega = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Manaus",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(pedido.dataEntrega);
    const taxa = taxaEntregaDasObservacoes(obs);
    cobranca = await criarCobrancasPessoa({
      prisma: input.prisma,
      pedidoId: pedido.id,
      contaAzulCustomerId: pedido.contaAzulCustomerId,
      total: base,
      descricao:
        taxa > 0
          ? `Pedido Fazendas Up ${dataEntrega} · taxa entrega`
          : `Pedido Fazendas Up ${dataEntrega}`,
      vencimentoYmd: dataEntrega,
      formaPagamento: forma,
    });
  }

  const novasObs = anexarMarcaAprovado(obs);
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
