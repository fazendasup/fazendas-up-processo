export type ComposicaoValorPedido = {
  valorBruto: number;
  valorFrete: number;
  valorDesconto: number;
  valorLiquido: number;
};

/** Aceita number, string e Prisma.Decimal (decimal.js). */
export function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  if (v != null && typeof v === "object") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function valorNumericoEmObjeto(v: unknown): number | null {
  const direto = asNumber(v);
  if (direto != null) return direto;
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return firstNumber(
    o.valor,
    o.value,
    o.total,
    o.totalValue,
    o.valor_total,
    o.valorTotal,
    o.valor_liquido,
    o.valorLiquido,
    o.amount,
  );
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = valorNumericoEmObjeto(value);
    if (n != null) return n;
  }
  return null;
}

function composicaoTemValor(c: ComposicaoValorPedido): boolean {
  return c.valorLiquido > 0 || c.valorBruto > 0;
}

/** Composição confiável vinda da API (frete/desconto ou bruto ≠ líquido). */
export function composicaoCompletaDaBusca(c: ComposicaoValorPedido): boolean {
  if (c.valorFrete > 0 || c.valorDesconto > 0) return true;
  return Math.abs(c.valorBruto - c.valorLiquido) > 0.009;
}

function extrairDescontoValor(c: Record<string, unknown>): number {
  const d = c.desconto ?? c.valor_desconto ?? c.valorDesconto;
  if (d && typeof d === "object") {
    return firstNumber((d as Record<string, unknown>).valor, (d as Record<string, unknown>).value) ?? 0;
  }
  return firstNumber(d) ?? 0;
}

/** Lê `venda.composicao_valor` exatamente como o relatório da Conta Azul (números da API). */
export function composicaoFromComposicaoValorCa(c: Record<string, unknown>): ComposicaoValorPedido | null {
  const bruto = asNumber(c.valor_bruto ?? c.valorBruto);
  const frete = asNumber(c.frete) ?? 0;
  const desconto = extrairDescontoValor(c);
  const liquido = asNumber(c.valor_liquido ?? c.valorLiquido);

  if (liquido != null && liquido >= 0 && bruto != null) {
    return {
      valorBruto: bruto,
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }
  if (liquido != null && liquido > 0) {
    return {
      valorBruto: bruto ?? Math.max(0, liquido - frete + desconto),
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }
  return composicaoFromObjeto(c);
}

export type MetadadosVendaDetalheCa = {
  tipoNegociacao: string | null;
  situacaoNome: string | null;
  composicao: ComposicaoValorPedido | null;
};

export function extrairMetadadosVendaDetalhe(raw: unknown): MetadadosVendaDetalheCa {
  if (!raw || typeof raw !== "object") {
    return { tipoNegociacao: null, situacaoNome: null, composicao: null };
  }
  const root = raw as Record<string, unknown>;
  const venda =
    root.venda && typeof root.venda === "object" ? (root.venda as Record<string, unknown>) : root;

  const compRaw = venda.composicao_valor ?? venda.composicaoValor ?? root.composicao_valor;
  let composicao: ComposicaoValorPedido | null = null;
  if (compRaw && typeof compRaw === "object") {
    composicao = composicaoFromComposicaoValorCa(compRaw as Record<string, unknown>);
  }
  if (!composicao) composicao = composicaoFromVendaDetalhe(raw);

  const situacao = venda.situacao;
  const situacaoNome =
    situacao && typeof situacao === "object"
      ? String((situacao as Record<string, unknown>).nome ?? "").trim() || null
      : null;
  const tipoNegociacao =
    typeof venda.tipo_negociacao === "string"
      ? venda.tipo_negociacao
      : typeof venda.tipoNegociacao === "string"
        ? venda.tipoNegociacao
        : null;

  return { tipoNegociacao, situacaoNome, composicao };
}

export function vendaDetalheDeveSerIgnorada(meta: MetadadosVendaDetalheCa): boolean {
  const tipo = (meta.tipoNegociacao ?? "").toUpperCase().trim();
  if (tipo === "COMPRA") return true;
  const situacao = (meta.situacaoNome ?? "").toUpperCase().trim();
  if (situacao === "CANCELADO") return true;
  return false;
}

function pedidoValoresParecemSoTotal(p: {
  valorBruto?: unknown;
  valorFrete?: unknown;
  valorDesconto?: unknown;
  valorLiquido?: unknown;
}): boolean {
  const frete = asNumber(p.valorFrete) ?? 0;
  const desconto = asNumber(p.valorDesconto) ?? 0;
  if (frete > 0 || desconto > 0) return false;
  const bruto = asNumber(p.valorBruto);
  const liquido = asNumber(p.valorLiquido);
  if (liquido == null || liquido <= 0) return false;
  if (bruto == null) return true;
  return Math.abs(bruto - liquido) < 0.01;
}

/** Pedido gravado só com total (bruto = líquido, sem frete/desconto) — falta detalhe Conta Azul. */
export function pedidoComposicaoProvavelmenteIncompleta(p: {
  valorBruto?: unknown;
  valorFrete?: unknown;
  valorDesconto?: unknown;
  valorLiquido?: unknown;
  composicaoDetalhada?: unknown;
}): boolean {
  return pedidoValoresParecemSoTotal(p);
}

export function pedidoPrecisaEnriquecerComposicao(p: {
  composicaoDetalhada?: unknown;
  valorBruto?: unknown;
  valorFrete?: unknown;
  valorDesconto?: unknown;
  valorLiquido?: unknown;
}): boolean {
  return pedidoValoresParecemSoTotal(p);
}

/** Agregação do dashboard: prioriza valores gravados da Conta Azul sem recalcular o líquido. */
export function composicaoDoPedidoParaDashboard(p: {
  valorBruto: unknown;
  valorFrete: unknown;
  valorDesconto: unknown;
  valorLiquido: unknown;
  valorTotal: unknown;
  composicaoDetalhada?: unknown;
}): ComposicaoValorPedido {
  const frete = asNumber(p.valorFrete) ?? 0;
  const desconto = asNumber(p.valorDesconto) ?? 0;
  const bruto = asNumber(p.valorBruto);
  const liquido = asNumber(p.valorLiquido);
  const total = asNumber(p.valorTotal);

  if (
    p.composicaoDetalhada === true &&
    bruto != null &&
    liquido != null &&
    liquido >= 0 &&
    !pedidoValoresParecemSoTotal(p)
  ) {
    return {
      valorBruto: bruto,
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }

  return composicaoDoPedidoLegado(p);
}

function composicaoDoPedidoLegado(p: {
  valorBruto: unknown;
  valorFrete: unknown;
  valorDesconto: unknown;
  valorLiquido: unknown;
  valorTotal: unknown;
}): ComposicaoValorPedido {
  const liquido = liquidoPedido(p);
  const brutoRaw = p.valorBruto != null ? Number(p.valorBruto) : NaN;
  const frete = Number(p.valorFrete ?? 0);
  const desconto = Number(p.valorDesconto ?? 0);
  if (Number.isFinite(brutoRaw)) {
    return {
      valorBruto: brutoRaw,
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }
  return composicaoFromTotalApenas(liquido);
}

/** Prefere GET /v1/venda/{id}; a busca pode trazer composição parcial e divergir do relatório. */
export function precisaDetalheComposicao(
  fromBusca: ComposicaoValorPedido | null,
  totalFallback: number,
): boolean {
  if (process.env.CONTA_AZUL_SYNC_SKIP_DETAIL === "1") return false;
  void fromBusca;
  return totalFallback > 0;
}

/** Ignora composição vazia da API (evita zerar pedidos que têm total na busca). */
export function normalizarComposicao(
  candidata: ComposicaoValorPedido | null | undefined,
  totalFallback: number,
): ComposicaoValorPedido | null {
  if (!candidata) return null;
  if (composicaoTemValor(candidata)) return candidata;
  return totalFallback > 0 ? null : candidata;
}

/** Extrai composição do item bruto de GET /v1/venda/busca (quando a API envia). */
export function composicaoFromVendaBuscaItem(raw: unknown): ComposicaoValorPedido | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const comp =
    o.composicao_valor ??
    o.composicaoValor ??
    o.composicao_de_valor ??
    o.composicaoDeValor;
  if (!comp || typeof comp !== "object") return null;

  return composicaoFromObjeto(comp as Record<string, unknown>);
}

function composicaoFromObjeto(o: Record<string, unknown>): ComposicaoValorPedido | null {
  const bruto = firstNumber(
    o.valor_bruto,
    o.valorBruto,
    o.bruto,
    o.total_bruto,
    o.totalBruto,
    o.subtotal,
    o.valor_produtos,
    o.valorProdutos,
  );
  const frete = firstNumber(o.frete, o.valor_frete, o.valorFrete, o.total_frete, o.totalFrete) ?? 0;
  const desconto = extrairDescontoValor(o);
  const liquido = firstNumber(
    o.valor_liquido,
    o.valorLiquido,
    o.liquido,
    o.total_liquido,
    o.totalLiquido,
    o.total,
    o.valor_total,
    o.valorTotal,
  );

  if (liquido != null && liquido > 0) {
    return {
      valorBruto: bruto ?? Math.max(0, liquido - frete + desconto),
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }
  if (bruto != null) {
    return {
      valorBruto: bruto,
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: Math.max(0, bruto + frete - desconto),
    };
  }
  return null;
}

/** Extrai composição de GET /v1/venda/{id}. */
export function composicaoFromVendaDetalhe(raw: unknown): ComposicaoValorPedido | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const venda =
    root.venda && typeof root.venda === "object" ? (root.venda as Record<string, unknown>) : root;

  const compRaw = venda.composicao_valor ?? venda.composicaoValor ?? root.composicao_valor;
  if (compRaw && typeof compRaw === "object") {
    const fromCa = composicaoFromComposicaoValorCa(compRaw as Record<string, unknown>);
    if (fromCa) return fromCa;
  }
  return composicaoFromVendaBuscaItem(venda) ?? composicaoFromObjeto(venda) ?? composicaoFromObjeto(root);
}

/** Fallback quando a API só retorna `total`. */
export function composicaoFromTotalApenas(total: number): ComposicaoValorPedido {
  const t = Number.isFinite(total) ? total : 0;
  return {
    valorBruto: t,
    valorFrete: 0,
    valorDesconto: 0,
    valorLiquido: t,
  };
}

export function liquidoPedido(p: {
  valorLiquido?: unknown;
  valorBruto?: unknown;
  valorFrete?: unknown;
  valorDesconto?: unknown;
  valorTotal?: unknown;
}): number {
  const total = asNumber(p.valorTotal);
  const liquido = asNumber(p.valorLiquido);
  if (liquido != null && liquido > 0) return liquido;
  if (liquido === 0 && total != null && total > 0) return total;
  const bruto = asNumber(p.valorBruto);
  const frete = asNumber(p.valorFrete) ?? 0;
  const desconto = asNumber(p.valorDesconto) ?? 0;
  if (bruto != null && bruto > 0) return Math.max(0, bruto + frete - desconto);
  return total ?? liquido ?? 0;
}

export type TotaisComposicao = {
  bruto: number;
  frete: number;
  desconto: number;
  liquido: number;
};

export function totaisVazios(): TotaisComposicao {
  return { bruto: 0, frete: 0, desconto: 0, liquido: 0 };
}

export function somarTotais(acc: TotaisComposicao, p: ComposicaoValorPedido): void {
  acc.bruto += p.valorBruto;
  acc.frete += p.valorFrete;
  acc.desconto += p.valorDesconto;
  acc.liquido += p.valorLiquido;
}
