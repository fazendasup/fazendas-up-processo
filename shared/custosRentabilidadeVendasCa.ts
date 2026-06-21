export const PRODUTO_VENDA_SEM_ITENS_CHAVE = "__sem_itens_sincronizados__";
export const PRODUTO_VENDA_SEM_ITENS_NOME = "Venda CA (sem itens sincronizados)";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Rateia o valor líquido do pedido (CA) entre linhas, proporcional ao bruto de cada linha. */
export function alocarReceitaLiquidaPorLinhas(valorLiquido: number, brutosLinha: number[]): number[] {
  const liquido = Math.max(0, valorLiquido);
  if (brutosLinha.length === 0) return [];

  const brutos = brutosLinha.map((b) => Math.max(0, b));
  const totalBruto = brutos.reduce((s, b) => s + b, 0);

  if (totalBruto <= 0) {
    if (liquido <= 0) return brutos.map(() => 0);
    const base = round2(liquido / brutos.length);
    let allocated = 0;
    return brutos.map((_, i) => {
      if (i === brutos.length - 1) return round2(liquido - allocated);
      allocated += base;
      return base;
    });
  }

  let allocated = 0;
  return brutos.map((b, i) => {
    if (i === brutos.length - 1) return round2(liquido - allocated);
    const share = round2(liquido * (b / totalBruto));
    allocated += share;
    return share;
  });
}
