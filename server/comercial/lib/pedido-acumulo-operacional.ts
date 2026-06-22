import type { PrismaClient } from "../generated/prisma/index.js";
import { classificarStatusPedido } from "./pedido-status.js";
import type { criarResolverChaveItemConciliacao } from "./produto-operacional.js";

type ResolverChaveItem = ReturnType<typeof criarResolverChaveItemConciliacao>;

type RegraAcumulo = {
  acumulaPedidos?: boolean;
  diasAcumulo?: number | null;
} | null;

type ItemOperacional = {
  id: string;
  produtoId: string;
  produtoNome: string;
  categoria: string | null;
  quantidade: unknown;
  precoUnit: unknown;
  precoEspecial?: boolean;
  observacoes?: string | null;
};

type PedidoComItens = {
  id: string;
  contaAzulCustomerId: string;
  diaSemana: number;
  dataEntrega?: Date;
  pedidoContaAzulId: string | null;
  snapshotConciliacao?: unknown;
  itens: ItemOperacional[];
};

type ContaAzulResumo = {
  id: string;
  statusPedido: string | null;
  itens: Array<{
    produto: string;
    sku?: string | null;
    quantidade: unknown;
  }>;
} | null;

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return Number((v as { toNumber: () => number }).toNumber());
  }
  return Number(v) || 0;
}

function inicioDia(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function adicionarDias(d: Date, dias: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + dias);
  return out;
}

function normalizarNome(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pedidoCriadoAPartirDoContaAzul(pedido: {
  snapshotConciliacao?: unknown;
}): boolean {
  const snapshot = pedido.snapshotConciliacao;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }
  const raw = snapshot as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(raw, "operacional") &&
    raw.operacional === null
  );
}

export function isOrcamentoFaturamentoAcumulado(
  regra: RegraAcumulo,
  statusPedidoCa: string | null | undefined
): boolean {
  if (!regra?.acumulaPedidos) return false;
  return classificarStatusPedido(statusPedidoCa) === "orcamento";
}

function mapQuantidadeItensOperacional(
  itens: ItemOperacional[],
  resolverChave?: ResolverChaveItem
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of itens) {
    const key = resolverChave
      ? resolverChave("operacional", {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
        })
      : `nome:${normalizarNome(item.produtoNome)}`;
    map.set(key, (map.get(key) ?? 0) + num(item.quantidade));
  }
  return map;
}

function mapQuantidadeItensContaAzul(
  itens: Array<{
    produto: string;
    sku?: string | null;
    quantidade: unknown;
  }>,
  resolverChave?: ResolverChaveItem
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of itens) {
    const key = resolverChave
      ? resolverChave("contaAzul", { produto: item.produto, sku: item.sku })
      : `nome:${normalizarNome(item.produto)}`;
    map.set(key, (map.get(key) ?? 0) + num(item.quantidade));
  }
  return map;
}

export function pedidoItensEspelhamContaAzul(
  pedidoItens: ItemOperacional[],
  contaAzulItens: Array<{
    produto: string;
    sku?: string | null;
    quantidade: unknown;
  }>,
  resolverChave?: ResolverChaveItem
): boolean {
  const mapOp = mapQuantidadeItensOperacional(pedidoItens, resolverChave);
  const mapCa = mapQuantidadeItensContaAzul(contaAzulItens, resolverChave);
  const chaves = new Set([...mapOp.keys(), ...mapCa.keys()]);
  for (const chave of chaves) {
    if (Math.abs((mapOp.get(chave) ?? 0) - (mapCa.get(chave) ?? 0)) > 0.001) {
      return false;
    }
  }
  return chaves.size > 0;
}

export function deveOcultarItensFaturamentoAcumulado(
  regra: RegraAcumulo,
  pedido: PedidoComItens,
  contaAzul: ContaAzulResumo,
  resolverChave?: ResolverChaveItem
): boolean {
  if (!contaAzul || pedido.pedidoContaAzulId !== contaAzul.id) return false;
  if (classificarStatusPedido(contaAzul.statusPedido) !== "orcamento") {
    return false;
  }
  if (pedidoCriadoAPartirDoContaAzul(pedido)) return true;
  if (!regra?.acumulaPedidos) return false;
  return pedidoItensEspelhamContaAzul(
    pedido.itens,
    contaAzul.itens,
    resolverChave
  );
}

export type ItensOperacionaisResolvidos = {
  itens: ItemOperacional[];
  avisoAcumulo: string | null;
  volumeFaturamentoOculto: boolean;
};

function formatarDataPt(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

export async function resolverItensOperacionaisExibicao(
  prisma: PrismaClient,
  input: {
    pedido: PedidoComItens;
    regra: RegraAcumulo;
    contaAzul: ContaAzulResumo;
    resolverChave?: ResolverChaveItem;
    diaReferencia: Date;
    referenciaAnterior?: PedidoComItens | null;
  }
): Promise<ItensOperacionaisResolvidos> {
  const { pedido, regra, contaAzul, resolverChave, diaReferencia } = input;

  if (
    !deveOcultarItensFaturamentoAcumulado(
      regra,
      pedido,
      contaAzul,
      resolverChave
    )
  ) {
    return {
      itens: pedido.itens,
      avisoAcumulo: null,
      volumeFaturamentoOculto: false,
    };
  }

  const diasAcumulo = regra?.diasAcumulo ?? 15;
  let anterior = input.referenciaAnterior ?? null;

  if (!anterior) {
    const anteriorDb = await prisma.pedidoOperacional.findFirst({
      where: {
        id: { not: pedido.id },
        contaAzulCustomerId: pedido.contaAzulCustomerId,
        diaSemana: pedido.diaSemana,
        status: { not: "CANCELADO" },
        dataEntrega: {
          gte: adicionarDias(inicioDia(diaReferencia), -21),
          lt: inicioDia(diaReferencia),
        },
        itens: { some: {} },
      },
      include: { itens: true },
      orderBy: [{ dataEntrega: "desc" }, { criadoEm: "desc" }],
    });
    anterior = anteriorDb;
  }

  const labelAcumulo = regra?.acumulaPedidos
    ? `orçamento acumulado (${diasAcumulo} dias)`
    : "orçamento Conta Azul";

  if (anterior?.itens.length) {
    return {
      itens: anterior.itens as ItemOperacional[],
      avisoAcumulo: `Volume do ${labelAcumulo} não entra na operação do dia. Referência: entrega de ${formatarDataPt(anterior.dataEntrega)}.`,
      volumeFaturamentoOculto: true,
    };
  }

  return {
    itens: [],
    avisoAcumulo: regra?.acumulaPedidos
      ? `Pedido vinculado a orçamento de faturamento (${diasAcumulo} dias). Informe o volume operacional desta entrega.`
      : "Pedido criado a partir de orçamento Conta Azul. Informe o volume operacional desta entrega.",
    volumeFaturamentoOculto: true,
  };
}

export function mensagemErroCriarOperacionalDeOrcamentoAcumulado(
  diasAcumulo?: number | null
): string {
  const dias = diasAcumulo ?? 15;
  return `Cliente com faturamento acumulado (${dias} dias): crie o pedido operacional manualmente com o volume desta entrega. O orçamento Conta Azul representa o período acumulado, não o volume do dia.`;
}
