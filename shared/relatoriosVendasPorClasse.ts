/**
 * Mapa exclusivo do relatório "Vendas por classe".
 * Não altera Pedidos → Produtos nem o cadastro do produto.
 *
 * Defaults estáticos + overrides persistidos (editados na tela do relatório).
 */
import {
  CATEGORIA_OPERACAO_OUTROS,
  CATEGORIAS_OPERACAO,
  categoriaOperacaoDoProduto,
  type CategoriaOperacaoOuOutros,
} from "./produtoCategoriaOperacao";

/** Classes sugeridas neste relatório. */
export const CLASSES_VENDA_RELATORIO = [
  "Folhas",
  "Microverdes",
  "Flores",
  "Minimamente processados",
  "In natura",
  "Ervas",
  "Saladas (mix)",
  "Outros",
] as const;

export type ClasseVendaRelatorio = string;

export type MapaVendasPorClasse = {
  unificarClasse?: Record<string, string>;
  produtoParaClasse?: Record<string, string>;
};

/** Defaults de código (opcional). Overrides do banco vencem. */
export const UNIFICAR_CLASSE_DEFAULT: Partial<
  Record<CategoriaOperacaoOuOutros, ClasseVendaRelatorio>
> = {};

export const PRODUTO_PARA_CLASSE_DEFAULT: Record<string, ClasseVendaRelatorio> =
  {};

function normalizarChave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mapaProdutoNorm(
  mapa: Record<string, string> | undefined,
): Map<string, string> {
  return new Map(
    Object.entries(mapa ?? {}).map(([nome, classe]) => [
      normalizarChave(nome),
      classe.trim(),
    ]),
  );
}

const ORDEM_PADRAO = [
  ...CATEGORIAS_OPERACAO,
  CATEGORIA_OPERACAO_OUTROS,
] as string[];

export function ordemClasseVendaRelatorio(classe: string): number {
  const i = CLASSES_VENDA_RELATORIO.indexOf(
    classe as (typeof CLASSES_VENDA_RELATORIO)[number],
  );
  if (i >= 0) return i;
  const j = ORDEM_PADRAO.indexOf(classe);
  if (j >= 0) return CLASSES_VENDA_RELATORIO.length + j;
  return CLASSES_VENDA_RELATORIO.length + ORDEM_PADRAO.length;
}

export function classeBaseOperacional(
  produto: string,
  categoriaOperacional?: string | null,
): string {
  return categoriaOperacaoDoProduto(produto, categoriaOperacional);
}

/**
 * Classe exibida só no relatório de vendas por classe.
 * Base operacional → unificação → override por produto (mapa persistido vence default).
 */
export function classeNoRelatorioVendas(
  produto: string,
  categoriaOperacional?: string | null,
  mapa?: MapaVendasPorClasse | null,
): string {
  const produtoMap = mapaProdutoNorm({
    ...PRODUTO_PARA_CLASSE_DEFAULT,
    ...(mapa?.produtoParaClasse ?? {}),
  });
  const override = produtoMap.get(normalizarChave(produto));
  if (override) return override;

  const base = classeBaseOperacional(produto, categoriaOperacional);
  const unificar = {
    ...UNIFICAR_CLASSE_DEFAULT,
    ...(mapa?.unificarClasse ?? {}),
  } as Record<string, string>;
  const unificada = unificar[base]?.trim();
  return unificada || base;
}

export function parseMapaVendasPorClasse(raw: unknown): MapaVendasPorClasse {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const asRecord = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "string" && val.trim() && k.trim()) {
        out[k.trim()] = val.trim();
      }
    }
    return out;
  };
  return {
    unificarClasse: asRecord(obj.unificarClasse ?? obj.unificar_classe),
    produtoParaClasse: asRecord(
      obj.produtoParaClasse ?? obj.produto_para_classe,
    ),
  };
}

export function listarClassesDisponiveis(
  mapa?: MapaVendasPorClasse | null,
  classesEmUso: string[] = [],
): string[] {
  const set = new Set<string>([
    ...CLASSES_VENDA_RELATORIO,
    ...Object.values(mapa?.unificarClasse ?? {}),
    ...Object.values(mapa?.produtoParaClasse ?? {}),
    ...classesEmUso,
  ]);
  return Array.from(set)
    .map(c => c.trim())
    .filter(Boolean)
    .sort(
      (a, b) =>
        ordemClasseVendaRelatorio(a) - ordemClasseVendaRelatorio(b) ||
        a.localeCompare(b, "pt-BR"),
    );
}
