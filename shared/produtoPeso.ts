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

function pesoJaVisivelNoNome(nome: string, peso: string): boolean {
  if (peso === "por kg") return /\bkg\b/i.test(nome);
  const compactPeso = peso.replace(/\s+/g, "").toLowerCase().replace(",", ".");
  const compactNome = nome.replace(/\s+/g, "").toLowerCase().replace(",", ".");
  return compactNome.includes(compactPeso);
}

/** Rótulo para listas/selects: garante que o peso apareça mesmo quando o nome não deixa claro. */
export function labelProdutoComPeso(
  nome: string,
  modoCompra?: string | null,
): string {
  const base = nome.trim() || "Produto sem nome";
  const peso = pesoDoProduto(base, modoCompra);
  if (!peso) return base;
  if (pesoJaVisivelNoNome(base, peso)) return base;
  return `${base} · ${peso}`;
}
