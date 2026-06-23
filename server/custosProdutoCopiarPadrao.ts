import {
  deduplicarEtapasLogistica,
  type TipoComponenteCusto,
  type TipoEtapaProcesso,
} from "@shared/custosProduto";
import type {
  CustoProdutoComponenteRow,
  CustoProdutoEtapaRow,
  CustoProdutoFichaRow,
  InsertCustoProdutoComponente,
  InsertCustoProdutoEtapa,
  InsertCustoProdutoFicha,
} from "../drizzle/schema";
import { custosProdutosFichas } from "../drizzle/schema";
import * as mapDb from "./custosProdutoComercialMapDb";
import * as custosProdutoDb from "./custosProdutoDb";
import * as db from "./db";
import { getDb } from "./db";

/** Copia padrão Coentro / Restaurante → demais SKUs (exceto preço de venda). */
export const COPIA_PADRAO_COENTRO_DESTINOS = [
  "Nabo Japonês / Restaurante",
  "Nabo Japonês / Microverdes",
  "Rabanete / Microverdes",
  "Rabanete / Restaurantes",
  "Rabano / Microverdes",
  "Repolho Roxo / Restaurante",
  "Repolho Roxo / Microverdes",
  "Rúcula / Restaurante",
  "Rúcula / Microverdes",
] as const;

export const COPIA_PADRAO_COENTRO_ORIGEM = "Coentro / Restaurante";

const ORIGEM_ALTERNATIVAS = ["Coentro / Restaurantes", "Coentro/ Restaurante"];

/** Nomes alternativos no Conta Azul (singular/plural, acentos). */
const ALTERNATIVAS_NOME_FICHA: Record<string, string[]> = {
  "Rabanete / Restaurantes": ["Rabanete / Restaurante"],
  "Rabano / Microverdes": ["Rabanete / Microverdes"],
  "Rúcula / Restaurante": ["Rucula / Restaurante"],
  "Rúcula / Microverdes": ["Rucula / Microverdes"],
  "Nabo Japonês / Restaurante": ["Nabo Japones / Restaurante"],
  "Nabo Japonês / Microverdes": ["Nabo Japones / Microverdes"],
  "Repolho Roxo / Restaurante": ["Repolho roxo / Restaurante"],
  "Repolho Roxo / Microverdes": ["Repolho roxo / Microverdes"],
};

const TERMOS_CULTURA: Record<string, string[]> = {
  nabo: ["nabo"],
  rabanete: ["rabanete", "rabano"],
  repolho: ["repolho"],
  rucula: ["rucula", "rúcula"],
  coentro: ["coentro"],
};

export type CopiarPadraoFichaResult = {
  origem: string;
  origemEncontradaComo?: string;
  copiadas: string[];
  jaAlinhadas: string[];
  naoEncontradas: string[];
  erros: string[];
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizarNomeFicha(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findFichaPorNome(
  fichas: CustoProdutoFichaRow[],
  nome: string,
  alternativas: string[] = [],
): CustoProdutoFichaRow | undefined {
  const alvos = new Set([nome, ...alternativas].map(normalizarNomeFicha));
  return fichas.find((f) => alvos.has(normalizarNomeFicha(f.nome)));
}

export function findOrigemCoentro(fichas: CustoProdutoFichaRow[]): CustoProdutoFichaRow | undefined {
  return (
    findFichaPorNome(fichas, COPIA_PADRAO_COENTRO_ORIGEM, ORIGEM_ALTERNATIVAS) ??
    fichas.find((f) => {
      const n = normalizarNomeFicha(f.nome);
      return n.includes("coentro") && n.includes("restaurante");
    })
  );
}

function termoCultura(nomeFicha: string): string | null {
  const prefix = normalizarNomeFicha((nomeFicha.split("/")[0] ?? nomeFicha).trim());
  for (const [termo, keys] of Object.entries(TERMOS_CULTURA)) {
    if (keys.some((k) => prefix.includes(normalizarNomeFicha(k)))) return termo;
  }
  return null;
}

async function variedadeIdParaFicha(
  projetoId: number,
  nomeFicha: string,
  cache: Map<number, Awaited<ReturnType<typeof db.getAllVariedades>>>,
): Promise<number | null> {
  const termo = termoCultura(nomeFicha);
  if (!termo) return null;
  let variedades = cache.get(projetoId);
  if (!variedades) {
    variedades = await db.getAllVariedades(projetoId);
    cache.set(projetoId, variedades);
  }
  const keys = TERMOS_CULTURA[termo] ?? [];
  for (const v of variedades) {
    const vn = normalizarNomeFicha(v.nome);
    if (keys.some((k) => vn.includes(normalizarNomeFicha(k)))) return v.id;
  }
  return null;
}

function categoriaDestino(origem: CustoProdutoFichaRow, destinoNome: string): string {
  if (/microverde/i.test(destinoNome)) return "microverde";
  return origem.categoria;
}

function etapaToInsert(e: CustoProdutoEtapaRow, ordem: number): Omit<InsertCustoProdutoEtapa, "fichaId"> {
  return {
    tipo: e.tipo as TipoEtapaProcesso,
    nome: e.nome,
    custoPorUnidade: e.custoPorUnidade,
    custoPorKgProcessado: e.custoPorKgProcessado,
    custoPercentual: e.custoPercentual,
    minutosPorUnidade: e.minutosPorUnidade,
    regimeMo: e.regimeMo ?? "qualquer",
    ordem,
  };
}

function componenteToInsert(
  c: CustoProdutoComponenteRow,
  ordem: number,
  target: CustoProdutoFichaRow,
): Omit<InsertCustoProdutoComponente, "fichaId"> {
  return {
    tipo: c.tipo as TipoComponenteCusto,
    variedadeId: c.tipo === "variedade" ? target.variedadeId : c.variedadeId,
    estoqueItemId: c.estoqueItemId,
    produtoComercialId:
      c.tipo === "produto_comercial" ? target.produtoComercialId : c.produtoComercialId,
    componenteFichaId: c.componenteFichaId,
    nomeManual: c.nomeManual,
    quantidadePorUnidade: c.quantidadePorUnidade,
    unidadeComponente: c.unidadeComponente,
    custoUnitarioManual: c.custoUnitarioManual,
    ordem,
  };
}

function payloadCopia(
  origem: CustoProdutoFichaRow,
  destino: CustoProdutoFichaRow,
  variedadeIdDestino: number | null,
): Partial<InsertCustoProdutoFicha> {
  return {
    tipo: origem.tipo,
    categoria: categoriaDestino(origem, destino.nome),
    unidadeVenda: origem.unidadeVenda,
    precoCompraKg: origem.precoCompraKg,
    orcamentosCompraKg: origem.orcamentosCompraKg,
    custoCompraUn: origem.custoCompraUn,
    modoCompraMp: origem.modoCompraMp,
    unidadesMpPorUnidade: origem.unidadesMpPorUnidade,
    kgPorUnidadeCompra: origem.kgPorUnidadeCompra,
    kgBrutoPorUnidade: origem.kgBrutoPorUnidade,
    perdaLavagemPct: origem.perdaLavagemPct,
    perdaDescasquePct: origem.perdaDescasquePct,
    perdaSelecaoPct: origem.perdaSelecaoPct,
    kgColhidoPorPlanta: origem.kgColhidoPorPlanta,
    kgProducaoPorUnidade: origem.kgProducaoPorUnidade,
    variedadeId: variedadeIdDestino,
  };
}

function destinoFaltaCamposOrigem(origem: CustoProdutoFichaRow, destino: CustoProdutoFichaRow): boolean {
  const modo = origem.modoCompraMp ?? "kg";
  if (modo === "unidade") {
    const op = num(origem.custoCompraUn);
    const dp = num(destino.custoCompraUn);
    if (op != null && op > 0 && !(dp != null && dp > 0)) return true;
  } else {
    const op = num(origem.precoCompraKg);
    const dp = num(destino.precoCompraKg);
    const ok = num(origem.kgBrutoPorUnidade);
    const dk = num(destino.kgBrutoPorUnidade);
    if (op != null && op > 0 && !(dp != null && dp > 0)) return true;
    if (ok != null && ok > 0 && !(dk != null && dk > 0)) return true;
  }
  if (origem.tipo === "producao_propria") {
    if (origem.kgColhidoPorPlanta != null && destino.kgColhidoPorPlanta == null) return true;
    if (origem.kgProducaoPorUnidade != null && destino.kgProducaoPorUnidade == null) return true;
    if (origem.variedadeId != null && destino.variedadeId == null) return true;
  }
  return false;
}

function precisaCopiar(
  origem: CustoProdutoFichaRow,
  destino: CustoProdutoFichaRow,
  variedadeIdDestino: number | null,
  etapasOrigem: CustoProdutoEtapaRow[],
  etapasDestino: CustoProdutoEtapaRow[],
): boolean {
  if (destinoFaltaCamposOrigem(origem, destino)) return true;

  const esperado = payloadCopia(origem, destino, variedadeIdDestino);
  for (const [k, v] of Object.entries(esperado)) {
    const atual = destino[k as keyof CustoProdutoFichaRow];
    if (String(atual ?? "") !== String(v ?? "")) return true;
  }

  const sig = (etapas: CustoProdutoEtapaRow[]) =>
    JSON.stringify(
      deduplicarEtapasLogistica(
        [...etapas]
          .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
          .map((e) => ({
            tipo: e.tipo,
            nome: e.nome,
            u: e.custoPorUnidade,
            kg: e.custoPorKgProcessado,
            p: e.custoPercentual,
            m: e.minutosPorUnidade,
            r: e.regimeMo ?? "qualquer",
          })),
      ),
    );

  return sig(etapasOrigem) !== sig(etapasDestino);
}

async function copiarMapComercial(
  projetoId: number,
  origemProdutoId: string | null,
  destinoProdutoId: string | null,
): Promise<void> {
  if (!origemProdutoId || !destinoProdutoId || origemProdutoId === destinoProdutoId) return;
  const mapRows = await mapDb.listComercialMap(projetoId);
  const origemMap = mapRows.find((m) => m.produtoComercialId === origemProdutoId);
  if (!origemMap) return;
  await mapDb.upsertComercialMap(projetoId, [
    {
      ...origemMap,
      produtoComercialId: destinoProdutoId,
    },
  ]);
}

async function copiarFichaNoProjeto(
  projetoId: number,
  origem: CustoProdutoFichaRow,
  destino: CustoProdutoFichaRow,
  variedadeIdDestino: number | null,
  etapasOrigem: CustoProdutoEtapaRow[],
  componentesOrigem: CustoProdutoComponenteRow[],
  etapasDestino: CustoProdutoEtapaRow[],
): Promise<"copiada" | "jaAlinhada"> {
  const destinoComVariedade: CustoProdutoFichaRow = {
    ...destino,
    variedadeId: variedadeIdDestino,
  };

  if (
    !precisaCopiar(origem, destino, variedadeIdDestino, etapasOrigem, etapasDestino)
  ) {
    return "jaAlinhada";
  }

  const etapasInsert = deduplicarEtapasLogistica(
    [...etapasOrigem].sort((a, b) => a.ordem - b.ordem || a.id - b.id),
  ).map((e, i) => etapaToInsert(e, i));

  const componentesInsert = [...componentesOrigem]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map((c, i) => componenteToInsert(c, i, destinoComVariedade));

  await custosProdutoDb.updateCustoProdutoFicha(
    projetoId,
    destino.id,
    payloadCopia(origem, destino, variedadeIdDestino),
  );
  await custosProdutoDb.replaceComponentesEtapas(destino.id, componentesInsert, etapasInsert);
  await copiarMapComercial(projetoId, origem.produtoComercialId, destino.produtoComercialId);
  return "copiada";
}

export async function copiarPadraoFichaCustos(
  origemNome: string,
  destinoNomes: readonly string[],
  alternativas: Record<string, string[]> = ALTERNATIVAS_NOME_FICHA,
): Promise<CopiarPadraoFichaResult> {
  await custosProdutoDb.ensureCustosProdutosTables();
  const dbConn = await getDb();
  if (!dbConn) {
    return {
      origem: origemNome,
      copiadas: [],
      jaAlinhadas: [],
      naoEncontradas: [...destinoNomes],
      erros: ["Database not available"],
    };
  }

  const todasFichas = await dbConn.select().from(custosProdutosFichas);
  const porProjeto = new Map<number, CustoProdutoFichaRow[]>();
  for (const f of todasFichas) {
    const list = porProjeto.get(f.projetoId) ?? [];
    list.push(f);
    porProjeto.set(f.projetoId, list);
  }

  const copiadas: string[] = [];
  const jaAlinhadas: string[] = [];
  const naoEncontradas: string[] = [];
  const erros: string[] = [];
  let origemEncontrada = false;
  let origemEncontradaComo: string | undefined;
  const variedadeCache = new Map<number, Awaited<ReturnType<typeof db.getAllVariedades>>>();

  for (const [projetoId, fichas] of porProjeto) {
    const origem = findOrigemCoentro(fichas);
    if (!origem) continue;
    origemEncontrada = true;
    origemEncontradaComo = origem.nome;

    const ids = fichas.map((f) => f.id);
    const [allComp, allEtapas] = await Promise.all([
      custosProdutoDb.listComponentesByFichaIds(ids),
      custosProdutoDb.listEtapasByFichaIds(ids),
    ]);
    const compByFicha = new Map<number, CustoProdutoComponenteRow[]>();
    const etapByFicha = new Map<number, CustoProdutoEtapaRow[]>();
    for (const c of allComp) {
      const list = compByFicha.get(c.fichaId) ?? [];
      list.push(c);
      compByFicha.set(c.fichaId, list);
    }
    for (const e of allEtapas) {
      const list = etapByFicha.get(e.fichaId) ?? [];
      list.push(e);
      etapByFicha.set(e.fichaId, list);
    }

    const etapasOrigem = etapByFicha.get(origem.id) ?? [];
    const componentesOrigem = compByFicha.get(origem.id) ?? [];

    for (const destinoNome of destinoNomes) {
      const destino = findFichaPorNome(fichas, destinoNome, alternativas[destinoNome] ?? []);
      if (!destino) {
        if (!naoEncontradas.includes(destinoNome)) naoEncontradas.push(destinoNome);
        continue;
      }
      try {
        const variedadeIdDestino =
          destino.variedadeId ??
          (await variedadeIdParaFicha(projetoId, destino.nome, variedadeCache));
        const r = await copiarFichaNoProjeto(
          projetoId,
          origem,
          destino,
          variedadeIdDestino,
          etapasOrigem,
          componentesOrigem,
          etapByFicha.get(destino.id) ?? [],
        );
        if (r === "copiada") {
          if (!copiadas.includes(destino.nome)) copiadas.push(destino.nome);
        } else if (!jaAlinhadas.includes(destino.nome)) {
          jaAlinhadas.push(destino.nome);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        erros.push(`${destino.nome}: ${msg}`);
      }
    }
  }

  if (!origemEncontrada) {
    erros.push(`Origem não encontrada: ${origemNome}`);
  }

  return {
    origem: origemNome,
    origemEncontradaComo,
    copiadas,
    jaAlinhadas,
    naoEncontradas,
    erros,
  };
}

/** Roda no arranque (desligue com RUN_CUSTOS_COPIAR_PADRAO_COENTRO=0). */
export async function executarCopiaPadraoCoentroRestaurante(): Promise<CopiarPadraoFichaResult | null> {
  if (process.env.RUN_CUSTOS_COPIAR_PADRAO_COENTRO === "0") return null;
  return copiarPadraoFichaCustos(COPIA_PADRAO_COENTRO_ORIGEM, COPIA_PADRAO_COENTRO_DESTINOS);
}
