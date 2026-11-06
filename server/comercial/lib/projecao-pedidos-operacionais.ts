/**
 * Projeção de venda a partir dos pedidos operacionais (página Pedidos).
 * Preço: item → tabela especial do cliente → catálogo.
 */

export type FontePrecoProjecao =
  | "item"
  | "item_especial"
  | "tabela_cliente"
  | "catalogo"
  | "sem_preco";

export type ItemProjecaoInput = {
  quantidade: unknown;
  precoUnit: unknown;
  precoEspecial?: boolean | null;
  produto?: { precoBase?: unknown } | null;
  precoEspecialCliente?: unknown;
};

export type PedidoProjecaoInput = {
  id: string;
  dataEntrega: Date;
  status: string;
  freteCortesia?: boolean | null;
  contaAzulCustomerId: string;
  cliente?: { nome?: string | null } | null;
  itens: ItemProjecaoInput[];
  regra?: {
    cobraTaxaEntrega?: boolean | null;
    valorTaxaEntrega?: unknown;
    precosEspeciais?: Array<{ produtoId: string; preco: unknown }>;
  } | null;
  /** Mapa produtoId → preço especial já resolvido (opcional). */
  precoEspecialPorProduto?: Map<string, number>;
};

export type DiaProjecao = {
  dia: string;
  pedidos: number;
  clientes: number;
  itens: number;
  unidades: number;
  valorItens: number;
  valorFrete: number;
  valor: number;
  semPreco: number;
};

function money(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolverPrecoProjecao(item: {
  precoUnit: unknown;
  precoEspecial?: boolean | null;
  precoEspecialCliente?: unknown;
  precoBaseCatalogo?: unknown;
}): { preco: number; fonte: FontePrecoProjecao } {
  const precoItem = item.precoUnit != null ? money(item.precoUnit) : null;
  const precoTabela =
    item.precoEspecialCliente != null ? money(item.precoEspecialCliente) : null;
  const precoCat =
    item.precoBaseCatalogo != null ? money(item.precoBaseCatalogo) : null;

  if (precoItem != null && precoItem > 0) {
    return {
      preco: precoItem,
      fonte: item.precoEspecial ? "item_especial" : "item",
    };
  }
  if (precoTabela != null && precoTabela > 0) {
    return { preco: precoTabela, fonte: "tabela_cliente" };
  }
  if (precoCat != null && precoCat > 0) {
    return { preco: precoCat, fonte: "catalogo" };
  }
  return { preco: 0, fonte: "sem_preco" };
}

function diaKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function vazioDia(dia: string): DiaProjecao {
  return {
    dia,
    pedidos: 0,
    clientes: 0,
    itens: 0,
    unidades: 0,
    valorItens: 0,
    valorFrete: 0,
    valor: 0,
    semPreco: 0,
  };
}

export function agregarProjecaoPedidos(
  pedidos: Array<{
    id: string;
    dataEntrega: Date;
    status: string;
    freteCortesia?: boolean | null;
    contaAzulCustomerId: string;
    itens: Array<{
      produtoId?: string | null;
      quantidade: unknown;
      precoUnit: unknown;
      precoEspecial?: boolean | null;
      produto?: { precoBase?: unknown } | null;
    }>;
    regra?: {
      cobraTaxaEntrega?: boolean | null;
      valorTaxaEntrega?: unknown;
      precosEspeciais?: Array<{ produtoId: string; preco: unknown }>;
    } | null;
  }>,
): {
  porDia: Map<string, DiaProjecao>;
  clientesPorDia: Map<string, Set<string>>;
} {
  const porDia = new Map<string, DiaProjecao>();
  const clientesPorDia = new Map<string, Set<string>>();

  for (const pedido of pedidos) {
    if (pedido.status === "CANCELADO") continue;
    const dia = diaKey(pedido.dataEntrega);
    const atual = porDia.get(dia) ?? vazioDia(dia);
    const clientes = clientesPorDia.get(dia) ?? new Set<string>();

    const especialMap = new Map(
      (pedido.regra?.precosEspeciais ?? []).map(p => [
        p.produtoId,
        money(p.preco),
      ]),
    );

    let valorItensPedido = 0;
    let itensPedido = 0;
    let unidadesPedido = 0;
    let semPrecoPedido = 0;

    for (const item of pedido.itens) {
      const qtd = money(item.quantidade);
      const especial =
        item.produtoId != null ? especialMap.get(item.produtoId) : undefined;
      const { preco, fonte } = resolverPrecoProjecao({
        precoUnit: item.precoUnit,
        precoEspecial: item.precoEspecial,
        precoEspecialCliente: especial,
        precoBaseCatalogo: item.produto?.precoBase,
      });
      valorItensPedido += qtd * preco;
      itensPedido += 1;
      unidadesPedido += qtd;
      if (fonte === "sem_preco") semPrecoPedido += 1;
    }

    let frete = 0;
    if (
      pedido.regra?.cobraTaxaEntrega &&
      !pedido.freteCortesia &&
      money(pedido.regra.valorTaxaEntrega) > 0
    ) {
      frete = money(pedido.regra.valorTaxaEntrega);
    }

    atual.pedidos += 1;
    atual.itens += itensPedido;
    atual.unidades += unidadesPedido;
    atual.valorItens += valorItensPedido;
    atual.valorFrete += frete;
    atual.valor += valorItensPedido + frete;
    atual.semPreco += semPrecoPedido;
    clientes.add(pedido.contaAzulCustomerId);
    atual.clientes = clientes.size;

    porDia.set(dia, atual);
    clientesPorDia.set(dia, clientes);
  }

  for (const [dia, row] of porDia) {
    porDia.set(dia, {
      ...row,
      unidades: Math.round(row.unidades * 1000) / 1000,
      valorItens: round2(row.valorItens),
      valorFrete: round2(row.valorFrete),
      valor: round2(row.valor),
    });
  }

  return { porDia, clientesPorDia };
}

export function resumoFaixa(
  porDia: Map<string, DiaProjecao>,
  clientesPorDia: Map<string, Set<string>>,
  dias: string[],
): Omit<DiaProjecao, "dia"> & { diasComPedido: number } {
  const base = {
    pedidos: 0,
    clientes: 0,
    itens: 0,
    unidades: 0,
    valorItens: 0,
    valorFrete: 0,
    valor: 0,
    semPreco: 0,
    diasComPedido: 0,
  };
  const clientes = new Set<string>();
  for (const dia of dias) {
    const row = porDia.get(dia);
    if (!row) continue;
    base.diasComPedido += 1;
    base.pedidos += row.pedidos;
    base.itens += row.itens;
    base.unidades += row.unidades;
    base.valorItens += row.valorItens;
    base.valorFrete += row.valorFrete;
    base.valor += row.valor;
    base.semPreco += row.semPreco;
    for (const id of clientesPorDia.get(dia) ?? []) clientes.add(id);
  }
  return {
    ...base,
    clientes: clientes.size,
    unidades: Math.round(base.unidades * 1000) / 1000,
    valorItens: round2(base.valorItens),
    valorFrete: round2(base.valorFrete),
    valor: round2(base.valor),
  };
}
