import { Prisma, type PrismaClient } from "../generated/prisma/index.js";
import { classificarStatusPedido } from "./pedido-status.js";
import {
  criarIndiceProdutosOperacionais,
  criarResolverChaveItemConciliacao,
  resolverProdutoOperacional,
  type ProdutoOperacionalLookup,
} from "./produto-operacional.js";
import { GO_LIVE_PEDIDOS } from "./semana.js";
import { ymdInTimeZone } from "../../zoned-day.js";

type PedidoOperacionalComItens = Prisma.PedidoOperacionalGetPayload<{
  include: { itens: true; cliente: { select: { externalId: true; nome: true } } };
}>;

export const REGRA_ENTREGA_CONCILIACAO_SELECT = {
  cobraTaxaEntrega: true,
  valorTaxaEntrega: true,
} as const;

export type RegraEntregaConciliacao = {
  cobraTaxaEntrega: boolean;
  valorTaxaEntrega?: Prisma.Decimal | number | string | null;
};

type PedidoContaAzulComItens = Prisma.PedidoGetPayload<{
  include: {
    itens: true;
    cliente: {
      select: {
        externalId: true;
        nome: true;
        regraComercial: { select: { acumulaPedidos: true } & typeof REGRA_ENTREGA_CONCILIACAO_SELECT };
      };
    };
  };
}>;

export type SnapshotConciliacao = {
  operacional?: {
    id: string;
    dataEntrega: string;
    status: string;
    observacoes: string | null;
    itens: Array<{ produtoNome: string; quantidade: number; precoUnit: number | null }>;
  };
  contaAzul?: {
    id: string;
    externalId: string | null;
    numeroVenda: string | null;
    dataPedido: string;
    statusPedido: string;
    valorLiquido: number;
    itens: Array<{ produto: string; sku?: string | null; quantidade: number; precoUnit: number }>;
  };
};

type ResolverChaveItem = ReturnType<typeof criarResolverChaveItemConciliacao>;

async function carregarProdutosConciliacao(prisma: PrismaClient): Promise<ProdutoOperacionalLookup[]> {
  return prisma.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null } },
    select: {
      id: true,
      nome: true,
      sku: true,
      contaAzulProdutoId: true,
      ativo: true,
      importadoOperacao: true,
      categoria: true,
    },
  });
}

export type DivergenciaConciliacao = {
  campo: string;
  operacional: unknown;
  contaAzul: unknown;
};

type OpcoesDivergenciaConciliacao = {
  compararData?: boolean;
  compararItens?: boolean;
  compararValorEstimado?: boolean;
  regraEntrega?: RegraEntregaConciliacao | null;
};

export function pedidoCriadoAPartirDoContaAzul(pedido: { snapshotConciliacao?: unknown }): boolean {
  const snapshot = pedido.snapshotConciliacao;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const raw = snapshot as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(raw, "operacional") && raw.operacional === null;
}

export function taxaEntregaParaConciliacao(
  regra: RegraEntregaConciliacao | null | undefined,
  valorFreteContaAzul?: unknown,
): number {
  if (!regra?.cobraTaxaEntrega) return 0;
  const configurada = num(regra.valorTaxaEntrega);
  if (configurada > 0) return configurada;
  return num(valorFreteContaAzul);
}

export function opcoesCalcularDivergencias(
  operacional: Pick<PedidoOperacionalComItens, "snapshotConciliacao">,
): OpcoesDivergenciaConciliacao {
  const criadoDoContaAzul = pedidoCriadoAPartirDoContaAzul(operacional);
  return {
    compararData: !criadoDoContaAzul,
    compararItens: !criadoDoContaAzul,
    compararValorEstimado: !criadoDoContaAzul,
  };
}

function inicioDia(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function fimDia(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

const CORTE_INICIO_PEDIDOS = inicioDia(GO_LIVE_PEDIDOS);

function antesDoCortePedidos(d: Date): boolean {
  return fimDia(d).getTime() < CORTE_INICIO_PEDIDOS.getTime();
}

function mesmoDia(a: Date, b: Date): boolean {
  return ymdInTimeZone(a, "America/Sao_Paulo") === ymdInTimeZone(b, "America/Sao_Paulo");
}

function diffDias(a: Date, b: Date): number {
  return Math.abs(inicioDia(a).getTime() - inicioDia(b).getTime()) / 86_400_000;
}

function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function snapshotOperacional(pedido: PedidoOperacionalComItens): SnapshotConciliacao["operacional"] {
  return {
    id: pedido.id,
    dataEntrega: pedido.dataEntrega.toISOString(),
    status: pedido.status,
    observacoes: pedido.observacoes,
    itens: pedido.itens.map((i) => ({
      produtoNome: i.produtoNome,
      quantidade: num(i.quantidade),
      precoUnit: i.precoUnit == null ? null : num(i.precoUnit),
    })),
  };
}

export function snapshotContaAzul(pedido: PedidoContaAzulComItens): SnapshotConciliacao["contaAzul"] {
  return {
    id: pedido.id,
    externalId: pedido.externalId,
    numeroVenda: pedido.numeroVenda,
    dataPedido: pedido.dataPedido.toISOString(),
    statusPedido: pedido.statusPedido,
    valorLiquido: num(pedido.valorLiquido ?? pedido.valorTotal),
    itens: pedido.itens.map((i) => ({
      produto: i.produto,
      sku: i.sku,
      quantidade: num(i.quantidade),
      precoUnit: num(i.precoUnit),
    })),
  };
}

export function calcularDivergencias(
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
  opcoes: OpcoesDivergenciaConciliacao = {},
): DivergenciaConciliacao[] {
  const divergencias: DivergenciaConciliacao[] = [];
  const compararData = opcoes.compararData ?? true;
  const compararItens = opcoes.compararItens ?? true;
  const compararValorEstimado = opcoes.compararValorEstimado ?? true;

  if (compararData && !mesmoDia(operacional.dataEntrega, contaAzul.dataPedido)) {
    divergencias.push({
      campo: "data",
      operacional: ymdInTimeZone(operacional.dataEntrega, "America/Sao_Paulo"),
      contaAzul: ymdInTimeZone(contaAzul.dataPedido, "America/Sao_Paulo"),
    });
  }

  if (compararItens) {
    const mapOp = new Map<string, number>();
    for (const item of operacional.itens) {
      const key = resolverChave
        ? resolverChave("operacional", { produtoId: item.produtoId, produtoNome: item.produtoNome })
        : `nome:${normalizarNome(item.produtoNome)}`;
      mapOp.set(key, (mapOp.get(key) ?? 0) + num(item.quantidade));
    }
    const mapCa = new Map<string, number>();
    for (const item of contaAzul.itens) {
      const key = resolverChave
        ? resolverChave("contaAzul", { produto: item.produto, sku: item.sku })
        : `nome:${normalizarNome(item.produto)}`;
      mapCa.set(key, (mapCa.get(key) ?? 0) + num(item.quantidade));
    }

    const nomes = new Set([...Array.from(mapOp.keys()), ...Array.from(mapCa.keys())]);
    for (const nome of Array.from(nomes)) {
      const qOp = mapOp.get(nome) ?? 0;
      const qCa = mapCa.get(nome) ?? 0;
      if (Math.abs(qOp - qCa) > 0.001) {
        divergencias.push({
          campo: `item:${nome || "sem_nome"}`,
          operacional: qOp,
          contaAzul: qCa,
        });
      }
    }
  }

  if (compararValorEstimado) {
    const regraEntrega = opcoes.regraEntrega ?? contaAzul.cliente.regraComercial ?? null;
    const taxaEntrega = taxaEntregaParaConciliacao(regraEntrega, contaAzul.valorFrete);
    const valorItens = operacional.itens.reduce((s, i) => s + num(i.quantidade) * (num(i.precoUnit) || 0), 0);
    const valorOp = valorItens + taxaEntrega;
    const valorCa = num(contaAzul.valorLiquido ?? contaAzul.valorTotal);
    if (valorOp > 0 && valorCa > 0 && Math.abs(valorOp - valorCa) > 0.05) {
      divergencias.push({
        campo: "valor_estimado",
        operacional: taxaEntrega > 0 ? { itens: valorItens, taxaEntrega, total: valorOp } : valorOp,
        contaAzul: valorCa,
      });
    }
  }

  return divergencias;
}

export function scoreSugestaoVinculo(
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
): number {
  if (!documentoContaAzulConciliavel(contaAzul)) return 0;
  const extOp = operacional.contaAzulCustomerId;
  const extCa = contaAzul.cliente.externalId;
  if (!extOp || !extCa || extOp !== extCa) return 0;

  let score = 40;
  const dias = diffDias(operacional.dataEntrega, contaAzul.dataPedido);
  if (dias === 0) score += 35;
  else if (dias <= 2) score += 20;
  else if (dias <= 7) score += 8;
  else return 0;

  const chavesOp = new Set(
    operacional.itens
      .map((i) =>
        resolverChave
          ? resolverChave("operacional", { produtoId: i.produtoId, produtoNome: i.produtoNome })
          : `nome:${normalizarNome(i.produtoNome)}`,
      )
      .filter(Boolean),
  );
  const chavesCa = new Set(
    contaAzul.itens
      .map((i) =>
        resolverChave
          ? resolverChave("contaAzul", { produto: i.produto, sku: i.sku })
          : `nome:${normalizarNome(i.produto)}`,
      )
      .filter(Boolean),
  );
  if (chavesOp.size === 0 || chavesCa.size === 0) return score;

  let overlap = 0;
  for (const chave of Array.from(chavesOp)) {
    if (chavesCa.has(chave)) overlap++;
  }
  score += Math.min(25, Math.round((overlap / Math.max(chavesOp.size, chavesCa.size)) * 25));
  return score;
}

export function diasEntrePedidos(operacional: { dataEntrega: Date }, contaAzul: { dataPedido: Date }): number {
  return diffDias(operacional.dataEntrega, contaAzul.dataPedido);
}

export function documentoContaAzulConciliavel(pedido: {
  statusPedido: string | null;
  cliente: { regraComercial?: { acumulaPedidos: boolean } | null };
}): boolean {
  const cls = classificarStatusPedido(pedido.statusPedido);
  if (cls === "venda") return true;
  return cls === "orcamento" && pedido.cliente.regraComercial?.acumulaPedidos === true;
}

async function registrarEvento(
  prisma: PrismaClient | Prisma.TransactionClient,
  data: {
    pedidoOperacionalId?: string | null;
    pedidoContaAzulId?: string | null;
    tipo: string;
    antes?: unknown;
    depois?: unknown;
    divergencias?: unknown;
    usuarioId?: string | null;
    usuarioNome?: string | null;
    observacoes?: string | null;
  },
) {
  await prisma.pedidoConciliacaoEvento.create({
    data: {
      pedidoOperacionalId: data.pedidoOperacionalId ?? undefined,
      pedidoContaAzulId: data.pedidoContaAzulId ?? undefined,
      tipo: data.tipo,
      antes: data.antes == null ? undefined : (data.antes as Prisma.InputJsonValue),
      depois: data.depois == null ? undefined : (data.depois as Prisma.InputJsonValue),
      divergencias: data.divergencias == null ? undefined : (data.divergencias as Prisma.InputJsonValue),
      usuarioId: data.usuarioId ?? undefined,
      usuarioNome: data.usuarioNome ?? undefined,
      observacoes: data.observacoes ?? undefined,
    },
  });
}

export async function processarConciliacaoAposSyncVenda(
  prisma: PrismaClient,
  pedidoContaAzulId: string,
): Promise<{ sugestoes: number; divergencias: number }> {
  const contaAzul = await prisma.pedido.findUnique({
    where: { id: pedidoContaAzulId },
    include: {
      itens: true,
      cliente: {
        select: {
          externalId: true,
          nome: true,
          regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
        },
      },
    },
  });
  if (!contaAzul?.cliente.externalId) return { sugestoes: 0, divergencias: 0 };
  if (antesDoCortePedidos(contaAzul.dataPedido)) return { sugestoes: 0, divergencias: 0 };
  if (!documentoContaAzulConciliavel(contaAzul)) return { sugestoes: 0, divergencias: 0 };
  if (contaAzul.statusConciliacao === "IGNORADA" || contaAzul.statusConciliacao === "VENDA_ERRADA") {
    return { sugestoes: 0, divergencias: 0 };
  }

  const vinculado = await prisma.pedidoOperacional.findFirst({
    where: { pedidoContaAzulId: contaAzul.id },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
  });

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);

  if (vinculado) {
    const divergencias = calcularDivergencias(vinculado, contaAzul, resolverChave, opcoesCalcularDivergencias(vinculado));
    if (divergencias.length > 0 && vinculado.statusConciliacao === "CONCILIADO") {
      await prisma.$transaction(async (tx) => {
        await tx.pedidoOperacional.update({
          where: { id: vinculado.id },
          data: { statusConciliacao: "DIVERGENTE" },
        });
        await tx.pedido.update({
          where: { id: contaAzul.id },
          data: { statusConciliacao: "DIVERGENTE" },
        });
        await registrarEvento(tx, {
          pedidoOperacionalId: vinculado.id,
          pedidoContaAzulId: contaAzul.id,
          tipo: "VENDA_ALTERADA_CA",
          antes: vinculado.snapshotConciliacao ?? undefined,
          depois: { operacional: snapshotOperacional(vinculado), contaAzul: snapshotContaAzul(contaAzul) },
          divergencias,
        });
      });
      return { sugestoes: 0, divergencias: 1 };
    }
    if (divergencias.length === 0 && vinculado.statusConciliacao === "DIVERGENTE") {
      await prisma.$transaction(async (tx) => {
        await tx.pedidoOperacional.update({
          where: { id: vinculado.id },
          data: {
            statusConciliacao: "CONCILIADO",
            snapshotConciliacao: {
              operacional: snapshotOperacional(vinculado),
              contaAzul: snapshotContaAzul(contaAzul),
            } as Prisma.InputJsonValue,
          },
        });
        await tx.pedido.update({
          where: { id: contaAzul.id },
          data: { statusConciliacao: "CONCILIADA" },
        });
        await registrarEvento(tx, {
          pedidoOperacionalId: vinculado.id,
          pedidoContaAzulId: contaAzul.id,
          tipo: "DIVERGENCIA_RESOLVIDA",
          antes: vinculado.snapshotConciliacao ?? undefined,
          depois: { operacional: snapshotOperacional(vinculado), contaAzul: snapshotContaAzul(contaAzul) },
        });
      });
    }
    return { sugestoes: 0, divergencias: 0 };
  }

  const candidatos = await prisma.pedidoOperacional.findMany({
    where: {
      contaAzulCustomerId: contaAzul.cliente.externalId,
      pedidoContaAzulId: null,
      statusConciliacao: { in: ["PLANEJADO", "VINCULO_SUGERIDO"] },
      dataEntrega: {
        gte: inicioDia(new Date(contaAzul.dataPedido.getTime() - 7 * 86_400_000)),
        lte: fimDia(new Date(contaAzul.dataPedido.getTime() + 7 * 86_400_000)),
      },
    },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    take: 20,
  });

  let melhor: { op: PedidoOperacionalComItens; score: number } | null = null;
  for (const op of candidatos) {
    const score = scoreSugestaoVinculo(op, contaAzul, resolverChave);
    if (score >= 70 && (!melhor || score > melhor.score)) melhor = { op, score };
  }
  if (!melhor) return { sugestoes: 0, divergencias: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.pedidoOperacional.update({
      where: { id: melhor!.op.id },
      data: {
        statusConciliacao: "VINCULO_SUGERIDO",
        sugestaoPedidoContaAzulId: contaAzul.id,
      },
    });
    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        statusConciliacao: "SUGERIDA",
        sugestaoPedidoOperacionalId: melhor!.op.id,
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: melhor!.op.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: "SUGESTAO_VINCULO",
      depois: { score: melhor!.score, operacionalId: melhor!.op.id, contaAzulId: contaAzul.id },
    });
  });

  return { sugestoes: 1, divergencias: 0 };
}

export async function confirmarVinculoConciliacao(
  prisma: PrismaClient,
  input: {
    pedidoOperacionalId: string;
    pedidoContaAzulId: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const [operacional, contaAzul] = await Promise.all([
    prisma.pedidoOperacional.findUnique({
      where: { id: input.pedidoOperacionalId },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    }),
    prisma.pedido.findUnique({
      where: { id: input.pedidoContaAzulId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    }),
  ]);
  if (!operacional || !contaAzul) throw new Error("Pedido operacional ou venda Conta Azul não encontrado.");
  if (operacional.pedidoContaAzulId && operacional.pedidoContaAzulId !== contaAzul.id) {
    throw new Error("Este pedido operacional já está vinculado a outra venda.");
  }
  const outro = await prisma.pedidoOperacional.findFirst({
    where: { pedidoContaAzulId: contaAzul.id, NOT: { id: operacional.id } },
  });
  if (outro) throw new Error("Esta venda Conta Azul já está vinculada a outro pedido operacional.");

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
  const divergencias = calcularDivergencias(operacional, contaAzul, resolverChave, opcoesCalcularDivergencias(operacional));
  const snapshot: SnapshotConciliacao = {
    operacional: snapshotOperacional(operacional),
    contaAzul: snapshotContaAzul(contaAzul),
  };

  await prisma.$transaction(async (tx) => {
    await tx.pedidoOperacional.update({
      where: { id: operacional.id },
      data: {
        pedidoContaAzulId: contaAzul.id,
        sugestaoPedidoContaAzulId: null,
        statusConciliacao: divergencias.length > 0 ? "DIVERGENTE" : "CONCILIADO",
        snapshotConciliacao: snapshot as Prisma.InputJsonValue,
      },
    });
    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        sugestaoPedidoOperacionalId: null,
        statusConciliacao: divergencias.length > 0 ? "DIVERGENTE" : "CONCILIADA",
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: operacional.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: divergencias.length > 0 ? "VINCULO_CONFIRMADO_COM_DIVERGENCIA" : "VINCULO_CONFIRMADO",
      depois: snapshot,
      divergencias: divergencias.length ? divergencias : undefined,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });

  return { divergencias };
}

export async function marcarVendaErrada(
  prisma: PrismaClient,
  input: {
    pedidoContaAzulId: string;
    pedidoOperacionalId?: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  await prisma.$transaction(async (tx) => {
    await tx.pedido.update({
      where: { id: input.pedidoContaAzulId },
      data: {
        statusConciliacao: "VENDA_ERRADA",
        sugestaoPedidoOperacionalId: null,
      },
    });
    if (input.pedidoOperacionalId) {
      await tx.pedidoOperacional.update({
        where: { id: input.pedidoOperacionalId },
        data: {
          statusConciliacao: "VENDA_ERRADA",
          sugestaoPedidoContaAzulId: null,
        },
      });
    }
    await registrarEvento(tx, {
      pedidoOperacionalId: input.pedidoOperacionalId,
      pedidoContaAzulId: input.pedidoContaAzulId,
      tipo: "VENDA_ERRADA",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function ignorarVendaContaAzul(
  prisma: PrismaClient,
  input: { pedidoContaAzulId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: input.pedidoContaAzulId } });
    if (!pedido) throw new Error("Venda não encontrada.");
    await tx.pedido.update({
      where: { id: input.pedidoContaAzulId },
      data: { statusConciliacao: "IGNORADA", sugestaoPedidoOperacionalId: null },
    });
    if (pedido.sugestaoPedidoOperacionalId) {
      await tx.pedidoOperacional.updateMany({
        where: { id: pedido.sugestaoPedidoOperacionalId },
        data: { statusConciliacao: "PLANEJADO", sugestaoPedidoContaAzulId: null },
      });
    }
    await registrarEvento(tx, {
      pedidoContaAzulId: input.pedidoContaAzulId,
      tipo: "VENDA_IGNORADA",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function manterOperacionalComoVerdade(
  prisma: PrismaClient,
  input: { pedidoOperacionalId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const op = await tx.pedidoOperacional.findUnique({ where: { id: input.pedidoOperacionalId } });
    if (!op) throw new Error("Pedido operacional não encontrado.");
    if (op.sugestaoPedidoContaAzulId) {
      await tx.pedido.updateMany({
        where: { id: op.sugestaoPedidoContaAzulId },
        data: { statusConciliacao: "NAO_CONCILIADA", sugestaoPedidoOperacionalId: null },
      });
    }
    await tx.pedidoOperacional.update({
      where: { id: input.pedidoOperacionalId },
      data: {
        statusConciliacao: op.pedidoContaAzulId ? "DIVERGENTE" : "PLANEJADO",
        sugestaoPedidoContaAzulId: null,
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: input.pedidoOperacionalId,
      tipo: "OPERACIONAL_MANTIDO",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function criarOperacionalDeVenda(
  prisma: PrismaClient,
  input: {
    pedidoContaAzulId: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const contaAzul = await prisma.pedido.findUnique({
    where: { id: input.pedidoContaAzulId },
    include: {
      itens: true,
      cliente: {
        select: {
          id: true,
          externalId: true,
          nome: true,
          regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
        },
      },
    },
  });
  if (!contaAzul?.cliente.externalId) throw new Error("Venda sem cliente Conta Azul vinculado.");
  if (antesDoCortePedidos(contaAzul.dataPedido)) {
    throw new Error("Pedidos operacionais começam em 01/06/2026.");
  }

  const existente = await prisma.pedidoOperacional.findFirst({
    where: { pedidoContaAzulId: contaAzul.id },
  });
  if (existente) throw new Error("Esta venda já possui pedido operacional vinculado.");

  const produtosAtivos = await prisma.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null }, ativo: true, importadoOperacao: true },
    select: {
      id: true,
      nome: true,
      sku: true,
      contaAzulProdutoId: true,
      ativo: true,
      importadoOperacao: true,
      categoria: true,
    },
  });
  const indice = criarIndiceProdutosOperacionais(produtosAtivos);
  const faltantes = contaAzul.itens
    .map((item) => {
      const prod = resolverProdutoOperacional(indice, { produto: item.produto, sku: item.sku });
      return prod ? null : item.produto;
    })
    .filter((nome): nome is string => Boolean(nome));
  if (faltantes.length > 0) {
    throw new Error(
      `Produto(s) não ativo(s) na operação: ${faltantes.join(", ")}. Importe/ative no catálogo Conta Azul (aba Produtos).`,
    );
  }

  const operacional = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedidoOperacional.create({
      data: {
        clienteId: contaAzul.cliente.id,
        contaAzulCustomerId: contaAzul.cliente.externalId!,
        dataEntrega: contaAzul.dataPedido,
        diaSemana: contaAzul.dataPedido.getUTCDay(),
        tipoVenda: "AVULSO",
        status: "PENDENTE",
        statusConciliacao: "CONCILIADO",
        pedidoContaAzulId: contaAzul.id,
        observacoes: input.observacoes ?? "Criado a partir da venda Conta Azul.",
        criadoPorId: input.usuario.id,
        editadoPorId: input.usuario.id,
        snapshotConciliacao: {
          operacional: null,
          contaAzul: snapshotContaAzul(contaAzul),
        } as Prisma.InputJsonValue,
        itens: {
          create: contaAzul.itens.map((item) => {
            const prod = resolverProdutoOperacional(indice, { produto: item.produto, sku: item.sku })!;
            return {
              produtoId: prod.id,
              produtoNome: prod.nome,
              categoria: item.categoria ?? prod.categoria,
              quantidade: num(item.quantidade),
              precoUnit: num(item.precoUnit),
            };
          }),
        },
      },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    });

    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: { statusConciliacao: "CONCILIADA", sugestaoPedidoOperacionalId: null },
    });

    await registrarEvento(tx, {
      pedidoOperacionalId: pedido.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: "OPERACIONAL_CRIADO_DE_VENDA",
      depois: { operacional: snapshotOperacional(pedido), contaAzul: snapshotContaAzul(contaAzul) },
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });

    return pedido;
  });

  return { pedidoOperacionalId: operacional.id };
}

export async function desvincularConciliacao(
  prisma: PrismaClient,
  input: { pedidoOperacionalId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const op = await tx.pedidoOperacional.findUnique({ where: { id: input.pedidoOperacionalId } });
    if (!op?.pedidoContaAzulId) throw new Error("Pedido operacional não possui vínculo com Conta Azul.");
    const caId = op.pedidoContaAzulId;
    await tx.pedidoOperacional.update({
      where: { id: op.id },
      data: {
        pedidoContaAzulId: null,
        statusConciliacao: "PLANEJADO",
        snapshotConciliacao: Prisma.DbNull,
        sugestaoPedidoContaAzulId: null,
      },
    });
    await tx.pedido.update({
      where: { id: caId },
      data: { statusConciliacao: "NAO_CONCILIADA", sugestaoPedidoOperacionalId: null },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: op.id,
      pedidoContaAzulId: caId,
      tipo: "DESVINCULADO",
      antes: op.snapshotConciliacao ?? undefined,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}
