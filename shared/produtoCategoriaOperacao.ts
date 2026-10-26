/**
 * Categorias operacionais da produção / catálogo comercial.
 * Ordem = ordem de exibição no painel.
 */
export const CATEGORIAS_OPERACAO = [
  "Folhas",
  "Microverdes",
  "Flores",
  "Minimamente processados",
  "In natura",
  "Ervas",
  "Saladas (mix)",
] as const;

export type CategoriaOperacao = (typeof CATEGORIAS_OPERACAO)[number];

export const CATEGORIA_OPERACAO_OUTROS = "Outros";

export type CategoriaOperacaoOuOutros =
  | CategoriaOperacao
  | typeof CATEGORIA_OPERACAO_OUTROS;

const ALIASES: Record<string, CategoriaOperacao> = {
  folhas: "Folhas",
  folhosa: "Folhas",
  folhosas: "Folhas",
  desfolhado: "Folhas",
  desfolhados: "Folhas",
  alface: "Folhas",
  microverde: "Microverdes",
  microverdes: "Microverdes",
  broto: "Microverdes",
  brotos: "Microverdes",
  flor: "Flores",
  flores: "Flores",
  buque: "Flores",
  "minimamente processados": "Minimamente processados",
  "minimamente processado": "Minimamente processados",
  processado: "Minimamente processados",
  processados: "Minimamente processados",
  "in natura": "In natura",
  innatura: "In natura",
  natura: "In natura",
  legume: "In natura",
  legumes: "In natura",
  hortifruti: "In natura",
  erva: "Ervas",
  ervas: "Ervas",
  pote: "Ervas",
  salada: "Saladas (mix)",
  saladas: "Saladas (mix)",
  mix: "Saladas (mix)",
  "saladas (mix)": "Saladas (mix)",
};

function normalizarChave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Se a categoria cadastrada já for uma das canônicas (ou alias). */
export function categoriaOperacaoDeCadastro(
  categoria: string | null | undefined,
): CategoriaOperacao | null {
  const raw = (categoria ?? "").trim();
  if (!raw) return null;
  const key = normalizarChave(raw);
  if (ALIASES[key]) return ALIASES[key];
  for (const cat of CATEGORIAS_OPERACAO) {
    if (normalizarChave(cat) === key) return cat;
  }
  return null;
}

/**
 * Infere a categoria operacional a partir do nome (e da categoria salva, se houver).
 * Preferência: cadastro explícito → heurística pelo nome.
 */
export function categoriaOperacaoDoProduto(
  nome: string,
  categoria?: string | null,
): CategoriaOperacaoOuOutros {
  const doCadastro = categoriaOperacaoDeCadastro(categoria);
  if (doCadastro) return doCadastro;

  const n = normalizarChave(nome);
  if (!n) return CATEGORIA_OPERACAO_OUTROS;

  if (/\bflor|\bbuque\b/.test(n)) return "Flores";
  if (/\bmicroverde|\bbroto\b/.test(n)) return "Microverdes";
  if (
    /higienizad|descascad|fatiad|processad|desfolhad/.test(n)
  ) {
    return "Minimamente processados";
  }
  if (/\bmix\b|\bsalada\b/.test(n)) return "Saladas (mix)";
  if (
    /alface|couve|rucula|agriao|acelga|baby\s*leaf|\bfolha|\bfolhas\b/.test(n)
  ) {
    return "Folhas";
  }
  if (
    /hortela|manjericao|coentro|oregano|salsa|\bervas?\b|\bpote\b/.test(n)
  ) {
    return "Ervas";
  }
  if (
    /\bkg\b|tomate|batata|cenoura|cebola|alho|beterraba|repolho|nabo|rabanete|rabano/.test(
      n,
    )
  ) {
    return "In natura";
  }

  return CATEGORIA_OPERACAO_OUTROS;
}

export function ordemCategoriaOperacao(
  cat: CategoriaOperacaoOuOutros,
): number {
  const i = CATEGORIAS_OPERACAO.indexOf(cat as CategoriaOperacao);
  return i >= 0 ? i : CATEGORIAS_OPERACAO.length;
}
