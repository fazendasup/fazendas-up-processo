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

/** Nomes alternativos no Conta Azul (singular/plural, acentos). */
const ALTERNATIVAS_NOME_FICHA: Record<string, string[]> = {
  "Rabanete / Restaurantes": ["Rabanete / Restaurante"],
  "Rúcula / Restaurante": ["Rucula / Restaurante"],
  "Rúcula / Microverdes": ["Rucula / Microverdes"],
  "Nabo Japonês / Restaurante": ["Nabo Japones / Restaurante"],
  "Nabo Japonês / Microverdes": ["Nabo Japones / Microverdes"],
};

export type CopiarPadraoFichaResult = {
  origem: string;
  copiadas: string[];
  jaAlinhadas: string[];
  naoEncontradas: string[];
  erros: string[];
};

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
): Partial<InsertCustoProdutoFicha> {
  return {
    tipo: origem.tipo,
    categoria: origem.categoria,
    unidadeVenda: origem.unidadeVenda,
    precoCompraKg: origem.precoCompraKg,
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
    variedadeId: destino.variedadeId,
  };
}

function precisaCopiar(
  origem: CustoProdutoFichaRow,
  destino: CustoProdutoFichaRow,
  etapasOrigem: CustoProdutoEtapaRow[],
  etapasDestino: CustoProdutoEtapaRow[],
): boolean {
  const esperado = payloadCopia(origem, destino);
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
  etapasOrigem: CustoProdutoEtapaRow[],
  componentesOrigem: CustoProdutoComponenteRow[],
  etapasDestino: CustoProdutoEtapaRow[],
): Promise<"copiada" | "jaAlinhada"> {
  if (!precisaCopiar(origem, destino, etapasOrigem, etapasDestino)) {
    return "jaAlinhada";
  }

  const etapasInsert = deduplicarEtapasLogistica(
    [...etapasOrigem].sort((a, b) => a.ordem - b.ordem || a.id - b.id),
  ).map((e, i) => etapaToInsert(e, i));

  const componentesInsert = [...componentesOrigem]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map((c, i) => componenteToInsert(c, i, destino));

  await custosProdutoDb.updateCustoProdutoFicha(projetoId, destino.id, payloadCopia(origem, destino));
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
  const db = await getDb();
  if (!db) {
    return {
      origem: origemNome,
      copiadas: [],
      jaAlinhadas: [],
      naoEncontradas: [...destinoNomes],
      erros: ["Database not available"],
    };
  }

  const todasFichas = await db.select().from(custosProdutosFichas);
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

  for (const [projetoId, fichas] of porProjeto) {
    const origem = findFichaPorNome(fichas, origemNome);
    if (!origem) continue;
    origemEncontrada = true;

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
        const r = await copiarFichaNoProjeto(
          projetoId,
          origem,
          destino,
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

  return { origem: origemNome, copiadas, jaAlinhadas, naoEncontradas, erros };
}

export async function executarCopiaPadraoCoentroRestaurante(): Promise<CopiarPadraoFichaResult | null> {
  if (process.env.RUN_CUSTOS_COPIAR_PADRAO_COENTRO !== "1") return null;
  return copiarPadraoFichaCustos(COPIA_PADRAO_COENTRO_ORIGEM, COPIA_PADRAO_COENTRO_DESTINOS);
}
