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

/**
 * Remove código Conta Azul colado no nome, ex.: "Alface (ALFAC16)" → "Alface".
 * Não remove parênteses com texto legível (ex.: "Mix (salada)").
 */
export function nomeProdutoSemCodigoCa(nome: string): string {
  return nome
    .replace(/\s*\(([A-Za-z]{2,}\d{1,6}|[A-Z0-9._-]{4,24})\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
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

/** Nome limpo para UI: sem SKU Conta Azul e sem gramas no texto. */
export function nomeProdutoParaExibicao(nome: string): string {
  const semCodigo = nomeProdutoSemCodigoCa(nome.trim());
  return nomeProdutoSemPeso(semCodigo) || semCodigo || nome.trim();
}

export type ProdutoPesoRef = {
  nome?: string | null;
  modoCompra?: string | null;
};

/**
 * Peso direto no nome/modo; se faltar, tenta outro produto do catálogo com o mesmo nome-base
 * (ex.: "Alface Crespa Verde (ALFAC12)" herda de "Alface Crespa Verde 100g").
 */
export function pesoDoProdutoComCatalogo(
  nome: string,
  modoCompra?: string | null,
  catalogo?: ProdutoPesoRef[] | null,
): string | null {
  const direto = pesoDoProduto(nome, modoCompra);
  if (direto) return direto;
  if (!catalogo?.length) return null;

  const base = nomeProdutoParaExibicao(nome).toLowerCase();
  if (!base) return null;

  let melhor: string | null = null;
  for (const p of catalogo) {
    const outroNome = (p.nome ?? "").trim();
    if (!outroNome || outroNome === nome) continue;
    if (nomeProdutoParaExibicao(outroNome).toLowerCase() !== base) continue;
    const w = pesoDoProduto(outroNome, p.modoCompra);
    if (!w) continue;
    if (w !== "por kg") return w;
    melhor = melhor ?? w;
  }
  return melhor;
}

/**
 * Texto plano: nome + peso depois (útil em selects/`<option>`).
 * Ex.: "Alface Americana · 100 g" — nunca usa SKU no lugar do peso.
 */
export function labelProdutoComPeso(
  nome: string,
  modoCompra?: string | null,
  catalogo?: ProdutoPesoRef[] | null,
): string {
  const base = nome.trim() || "Produto sem nome";
  const limpo = nomeProdutoParaExibicao(base) || base;
  const peso = pesoDoProdutoComCatalogo(base, modoCompra, catalogo);
  if (!peso) return limpo;
  return `${limpo} · ${peso}`;
}

export function partesProdutoComPeso(
  nome: string,
  modoCompra?: string | null,
  catalogo?: ProdutoPesoRef[] | null,
): { nome: string; peso: string | null; label: string } {
  const base = nome.trim() || "Produto sem nome";
  const limpo = nomeProdutoParaExibicao(base) || base;
  const peso = pesoDoProdutoComCatalogo(base, modoCompra, catalogo);
  return {
    nome: limpo,
    peso,
    label: peso ? `${limpo} · ${peso}` : limpo,
  };
}
