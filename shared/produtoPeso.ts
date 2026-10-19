/**
 * Peso da embalagem / venda a partir do nome cadastrado e do modo de compra.
 * Ex.: "Alface Americana 100g" → "100 g"; modo KG → "por kg".
 */
export function pesoDoProduto(nome: string, modoCompra?: string | null): string | null {
  const texto = nome.trim();
  if (!texto) return null;

  const comNumero = texto.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramas?)\b/i);
  if (comNumero) {
    const bruto = comNumero[1].replace(",", ".");
    const numero = Number(bruto);
    if (!Number.isFinite(numero) || numero <= 0) return null;
    const unidade = /^kg$/i.test(comNumero[2]) ? "kg" : "g";
    return formatarPeso(numero, unidade);
  }

  if (modoCompra === "KG" || /\bkg\b/i.test(texto)) return "por kg";
  return null;
}

function formatarPeso(valor: number, unidade: "g" | "kg"): string {
  const texto =
    unidade === "kg"
      ? valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })
      : String(Math.round(valor) === valor ? Math.round(valor) : valor);
  return `${texto} ${unidade}`;
}

/** Remove o trecho de peso do nome para exibir nome + badge separados. */
export function nomeProdutoSemPeso(nome: string): string {
  return nome
    .replace(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramas?)\b/gi, " ")
    .replace(/\bpor\s*kg\b/gi, " ")
    .replace(/[-–—·|,]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Texto plano: nome + peso depois (útil em selects/`<option>`).
 * Ex.: "Alface Americana · 100 g"
 */
export function labelProdutoComPeso(
  nome: string,
  modoCompra?: string | null,
): string {
  const base = nome.trim() || "Produto sem nome";
  const peso = pesoDoProduto(base, modoCompra);
  if (!peso) return base;
  const limpo = nomeProdutoSemPeso(base) || base;
  return `${limpo} · ${peso}`;
}

export function partesProdutoComPeso(
  nome: string,
  modoCompra?: string | null,
): { nome: string; peso: string | null; label: string } {
  const base = nome.trim() || "Produto sem nome";
  const peso = pesoDoProduto(base, modoCompra);
  const limpo = peso ? nomeProdutoSemPeso(base) || base : base;
  return {
    nome: limpo,
    peso,
    label: peso ? `${limpo} · ${peso}` : base,
  };
}
