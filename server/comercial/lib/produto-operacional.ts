import type { ProdutoComercial } from "../generated/prisma/index.js";

export type ProdutoOperacionalLookup = Pick<
  ProdutoComercial,
  "id" | "nome" | "sku" | "contaAzulProdutoId" | "ativo" | "importadoOperacao" | "categoria"
>;

function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function criarIndiceProdutosOperacionais(produtos: ProdutoOperacionalLookup[]) {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const porSku = new Map<string, ProdutoOperacionalLookup>();
  const porCaId = new Map<string, ProdutoOperacionalLookup>();
  const porNome = new Map<string, ProdutoOperacionalLookup>();

  for (const p of produtos) {
    if (p.sku) porSku.set(p.sku, p);
    if (p.contaAzulProdutoId) porCaId.set(p.contaAzulProdutoId, p);
    const nomeKey = normalizarNome(p.nome);
    if (nomeKey) porNome.set(nomeKey, p);
  }

  return { porId, porSku, porCaId, porNome };
}

export function resolverProdutoOperacional(
  indice: ReturnType<typeof criarIndiceProdutosOperacionais>,
  item: { produto?: string; produtoNome?: string; sku?: string | null; produtoId?: string },
): ProdutoOperacionalLookup | null {
  if (item.produtoId) {
    const porId = indice.porId.get(item.produtoId);
    if (porId?.ativo) return porId;
  }
  const sku = item.sku?.trim();
  if (sku) {
    const porCa = indice.porCaId.get(sku);
    if (porCa?.ativo) return porCa;
    const porSku = indice.porSku.get(sku);
    if (porSku?.ativo) return porSku;
  }
  const nome = item.produtoNome ?? item.produto ?? "";
  const porNome = indice.porNome.get(normalizarNome(nome));
  if (porNome?.ativo) return porNome;
  return null;
}

export type ChaveItemConciliacao = string;

export function criarResolverChaveItemConciliacao(produtos: ProdutoOperacionalLookup[]) {
  const indice = criarIndiceProdutosOperacionais(produtos);

  return (
    lado: "operacional" | "contaAzul",
    item: { produtoId?: string; produtoNome?: string; produto?: string; sku?: string | null },
  ): ChaveItemConciliacao => {
    if (lado === "operacional" && item.produtoId) return `pid:${item.produtoId}`;
    if (lado === "contaAzul") {
      const sku = item.sku?.trim();
      if (sku) {
        const porCa = indice.porCaId.get(sku);
        if (porCa) return `pid:${porCa.id}`;
        const porSku = indice.porSku.get(sku);
        if (porSku) return `pid:${porSku.id}`;
      }
      const porNome = indice.porNome.get(normalizarNome(item.produto ?? ""));
      if (porNome) return `pid:${porNome.id}`;
    }
    const nome = item.produtoNome ?? item.produto ?? "";
    return `nome:${normalizarNome(nome) || "sem_nome"}`;
  };
}

export function listarProdutosFaltantesVenda(
  indice: ReturnType<typeof criarIndiceProdutosOperacionais>,
  itens: Array<{ produto: string; sku?: string | null }>,
  catalogo: ProdutoOperacionalLookup[],
): Array<{ nome: string; sku: string | null; produtoCatalogoId: string | null; podeAtivar: boolean }> {
  const faltantes: Array<{ nome: string; sku: string | null; produtoCatalogoId: string | null; podeAtivar: boolean }> = [];
  const catalogoIndice = criarIndiceProdutosOperacionais(catalogo);

  for (const item of itens) {
    const resolvido = resolverProdutoOperacional(indice, { produto: item.produto, sku: item.sku });
    if (resolvido) continue;

    const sku = item.sku?.trim() ?? null;
    let catalogoItem =
      (sku ? catalogoIndice.porCaId.get(sku) : null) ??
      (sku ? catalogoIndice.porSku.get(sku) : null) ??
      catalogoIndice.porNome.get(normalizarNome(item.produto)) ??
      null;

    faltantes.push({
      nome: item.produto,
      sku,
      produtoCatalogoId: catalogoItem?.id ?? null,
      podeAtivar: Boolean(catalogoItem && !catalogoItem.ativo),
    });
  }

  return faltantes;
}
