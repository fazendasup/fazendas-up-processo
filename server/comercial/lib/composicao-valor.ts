export type ComposicaoValorPedido = {
  valorBruto: number;
  valorFrete: number;
  valorDesconto: number;
  valorLiquido: number;
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

  const c = comp as Record<string, unknown>;
  const bruto = asNumber(c.valor_bruto ?? c.valorBruto);
  const frete = asNumber(c.frete) ?? 0;
  const desconto = asNumber(c.desconto) ?? 0;
  const liquido = asNumber(c.valor_liquido ?? c.valorLiquido);

  if (liquido != null) {
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
  const venda = root.venda;
  if (venda && typeof venda === "object") {
    const fromVenda = composicaoFromVendaBuscaItem(venda);
    if (fromVenda) return fromVenda;
  }
  return composicaoFromVendaBuscaItem(raw);
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
  const liquido = asNumber(p.valorLiquido);
  if (liquido != null) return liquido;
  const bruto = asNumber(p.valorBruto);
  const frete = asNumber(p.valorFrete) ?? 0;
  const desconto = asNumber(p.valorDesconto) ?? 0;
  if (bruto != null) return Math.max(0, bruto + frete - desconto);
  return asNumber(p.valorTotal) ?? 0;
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
