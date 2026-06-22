import type { CategoriaProdutoCusto, TipoEtapaProcesso } from "@shared/custosProduto";
import type { RegimeMoEtapa } from "@shared/custosMoEquipe";
import { mapaCustoHoraProcessamento } from "@shared/custosMoEquipe";
import type { ProcessoModeloRecord } from "@shared/custosLinhaProcessoIndustrial";
import {
  etapasProcessoDeModelo,
  etapasProcessoPadraoParaPerfil,
  inferirPerfilDeEtapas,
  mapeamentoEfetivoParaCalculo,
  perfilTemProcessamentoIndustrial,
  sugerirMapeamentoProduto,
  type CustosProdutoProcessoConfig,
  type EtapaProcessoPadrao,
  type MapeamentoProdutoComercial,
  type PerfilProcessoProduto,
} from "@shared/custosProdutoProcessoPadrao";
import type {
  CustoProdutoComponenteRow,
  CustoProdutoEtapaRow,
  CustoProdutoFichaRow,
  InsertCustoProdutoComponente,
  InsertCustoProdutoEtapa,
} from "../drizzle/schema";
import { getComercialPrisma } from "./comercial/db";
import * as mapDb from "./custosProdutoComercialMapDb";
import * as custosProdutoDb from "./custosProdutoDb";
import { getProcessoConfig } from "./custosProdutoProcessoDb";
import * as modelosDb from "./custosProdutoProcessoModelosDb";
import { mapMoEquipeRowToInput } from "./moEquipeMapper";
import * as moEquipeDb from "./custosMoEquipeDb";

type EtapaPersist = Omit<InsertCustoProdutoEtapa, "fichaId">;

function etapaSignature(etapas: EtapaPersist[]): string {
  return JSON.stringify(
    etapas.map((e) => ({
      t: e.tipo,
      n: e.nome,
      u: e.custoPorUnidade,
      kg: e.custoPorKgProcessado,
      p: e.custoPercentual,
      m: e.minutosPorUnidade,
      r: e.regimeMo,
    })),
  );
}

function etapasPadraoParaPersist(etapas: EtapaProcessoPadrao[]): EtapaPersist[] {
  return etapas.map((e, i) => ({
    tipo: e.tipo as TipoEtapaProcesso,
    nome: e.nome,
    custoPorUnidade: String(e.custoPorUnidade),
    custoPorKgProcessado: e.custoPorKgProcessado != null ? String(e.custoPorKgProcessado) : null,
    custoPercentual: e.custoPercentual != null ? String(e.custoPercentual) : null,
    minutosPorUnidade: e.minutosPorUnidade != null ? String(e.minutosPorUnidade) : null,
    regimeMo: e.regimeMo as RegimeMoEtapa,
    ordem: i,
  }));
}

function rowsToPersist(etapas: CustoProdutoEtapaRow[]): EtapaPersist[] {
  return [...etapas]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map((e, i) => ({
      tipo: e.tipo as TipoEtapaProcesso,
      nome: e.nome,
      custoPorUnidade: e.custoPorUnidade,
      custoPorKgProcessado: e.custoPorKgProcessado,
      custoPercentual: e.custoPercentual,
      minutosPorUnidade: e.minutosPorUnidade,
      regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
      ordem: i,
    }));
}

function componenteToInsert(c: CustoProdutoComponenteRow): Omit<InsertCustoProdutoComponente, "fichaId"> {
  return {
    tipo: c.tipo,
    variedadeId: c.variedadeId,
    estoqueItemId: c.estoqueItemId,
    produtoComercialId: c.produtoComercialId,
    componenteFichaId: c.componenteFichaId,
    nomeManual: c.nomeManual,
    quantidadePorUnidade: c.quantidadePorUnidade,
    unidadeComponente: c.unidadeComponente,
    custoUnitarioManual: c.custoUnitarioManual,
    ordem: c.ordem,
  };
}

export function etapasEsperadasParaMapeamento(
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  modelo: ProcessoModeloRecord,
  mapaHora: ReturnType<typeof mapaCustoHoraProcessamento>,
): EtapaProcessoPadrao[] {
  return etapasProcessoDeModelo(perfil, categoria, modelo, mapaHora);
}

export function etapasEsperadasParaConfigLegacy(
  perfil: PerfilProcessoProduto,
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig,
): EtapaProcessoPadrao[] {
  return etapasProcessoPadraoParaPerfil(perfil, categoria, config);
}

export type ProcessoCalculoOverride = {
  processoModeloId?: number | null;
  perfilProcesso?: PerfilProcessoProduto;
  categoriaCusto?: CategoriaProdutoCusto;
};

/** Etapas derivadas do modelo vinculado + R$/h atual (sem ler valores congelados no DB). */
export async function etapasProcessoAoVivoParaFicha(
  projetoId: number,
  ficha: CustoProdutoFichaRow,
  etapasDb: CustoProdutoEtapaRow[],
  mapaHora: ReturnType<typeof mapaCustoHoraProcessamento>,
  override?: ProcessoCalculoOverride,
): Promise<EtapaProcessoPadrao[] | null> {
  const defaultModelo = await modelosDb.getDefaultProcessoModelo(projetoId);
  const defaultModeloId = defaultModelo?.id ?? null;
  const mapRows = await mapDb.listComercialMap(projetoId);
  const map = new Map(mapRows.map((m) => [m.produtoComercialId, m]));

  let perfil: PerfilProcessoProduto;
  let categoria: CategoriaProdutoCusto;
  let modeloId: number | null;

  if (ficha.produtoComercialId) {
    let prodNome = ficha.nome;
    let prodCat: string | null = null;
    try {
      const prisma = getComercialPrisma();
      const p = await prisma.produtoComercial.findUnique({
        where: { id: ficha.produtoComercialId },
        select: { nome: true, categoria: true },
      });
      if (p) {
        prodNome = p.nome;
        prodCat = p.categoria;
      }
    } catch {
      /* comercial opcional */
    }
    const m = resolverMapeamentoEfetivo(ficha.produtoComercialId, prodNome, prodCat, map);
    perfil = m.perfilProcesso;
    categoria = m.categoriaCusto;
    modeloId = modeloIdDoMapeamento(m, defaultModeloId);
  } else {
    const sugerido = sugerirMapeamentoProduto("", ficha.nome, null);
    perfil = inferirPerfilDeEtapas(etapasDb);
    categoria = (ficha.categoria ?? "outros") as CategoriaProdutoCusto;
    if (
      perfilTemProcessamentoIndustrial(perfil) &&
      !perfilTemProcessamentoIndustrial(sugerido.perfilProcesso)
    ) {
      perfil = sugerido.perfilProcesso;
      categoria = sugerido.categoriaCusto;
    }
    modeloId = defaultModeloId;
  }

  if (override?.perfilProcesso) perfil = override.perfilProcesso;
  if (override?.categoriaCusto) categoria = override.categoriaCusto;
  if (override?.processoModeloId !== undefined) {
    modeloId = override.processoModeloId ?? defaultModeloId;
  }

  if (modeloId == null) {
    const config = await getProcessoConfig(projetoId);
    return etapasProcessoPadraoParaPerfil(perfil, categoria, config);
  }

  const modelo = await modelosDb.getProcessoModeloById(projetoId, modeloId);
  if (!modelo) {
    const config = await getProcessoConfig(projetoId);
    return etapasProcessoPadraoParaPerfil(perfil, categoria, config);
  }

  return etapasEsperadasParaMapeamento(perfil, categoria, modelo, mapaHora);
}

/** Detecta se etapas gravadas divergem do modelo ao vivo (modo manual). */
export async function detectarEtapasModoManualFicha(
  projetoId: number,
  ficha: CustoProdutoFichaRow,
  etapasDb: CustoProdutoEtapaRow[],
  mapaHora: ReturnType<typeof mapaCustoHoraProcessamento>,
): Promise<boolean> {
  const aoVivo = await etapasProcessoAoVivoParaFicha(projetoId, ficha, etapasDb, mapaHora);
  if (!aoVivo) return false;
  return !etapasDbEquivalemAoModelo(etapasDb, aoVivo);
}

export type RepararMapeamentoResult = {
  mapasAtualizados: number;
  fichasCategoriaAtualizadas: number;
};

/** Corrige mapas comerciais stale e alinha categoria das fichas vinculadas. */
export async function repararMapeamentoComercialProdutos(projetoId: number): Promise<RepararMapeamentoResult> {
  const mapRows = await mapDb.listComercialMap(projetoId);
  const map = new Map(mapRows.map((m) => [m.produtoComercialId, m]));
  let produtos: Array<{ id: string; nome: string; categoria: string | null }> = [];
  try {
    const prisma = getComercialPrisma();
    produtos = await prisma.produtoComercial.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, categoria: true },
    });
  } catch {
    return { mapasAtualizados: 0, fichasCategoriaAtualizadas: 0 };
  }

  const toUpsert: MapeamentoProdutoComercial[] = [];
  for (const p of produtos) {
    const mapeado = resolveMapeamentoProduto(p.id, p.nome, p.categoria, map);
    const efetivo = resolverMapeamentoEfetivo(p.id, p.nome, p.categoria, map);
    const changed =
      mapeado.categoriaCusto !== efetivo.categoriaCusto ||
      mapeado.perfilProcesso !== efetivo.perfilProcesso ||
      (mapeado.processoModeloId ?? null) !== (efetivo.processoModeloId ?? null);
    if (changed || !map.has(p.id)) toUpsert.push(efetivo);
  }

  if (toUpsert.length > 0) await mapDb.upsertComercialMap(projetoId, toUpsert);

  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  let fichasCategoriaAtualizadas = 0;
  for (const ficha of fichas) {
    if (!ficha.produtoComercialId) continue;
    const prod = produtos.find((p) => p.id === ficha.produtoComercialId);
    if (!prod) continue;
    const efetivo = resolverMapeamentoEfetivo(ficha.produtoComercialId, prod.nome, prod.categoria, map);
    if (ficha.categoria === efetivo.categoriaCusto) continue;
    await custosProdutoDb.updateCustoProdutoFicha(projetoId, ficha.id, {
      categoria: efetivo.categoriaCusto,
    });
    fichasCategoriaAtualizadas += 1;
  }

  return { mapasAtualizados: toUpsert.length, fichasCategoriaAtualizadas };
}

async function mapaHoraProjeto(projetoId: number) {
  const [equipesRows, modoMo] = await Promise.all([
    moEquipeDb.listMoEquipes(projetoId),
    moEquipeDb.getModoCustoMoEquipe(projetoId),
  ]);
  return mapaCustoHoraProcessamento(equipesRows.map(mapMoEquipeRowToInput), modoMo);
}

function resolveMapeamentoProduto(
  produtoComercialId: string,
  nome: string,
  categoriaComercial: string | null,
  map: Map<string, MapeamentoProdutoComercial>,
): MapeamentoProdutoComercial {
  return map.get(produtoComercialId) ?? sugerirMapeamentoProduto(produtoComercialId, nome, categoriaComercial);
}

/** Mapa persistido + sugestão pelo nome — corrige mapas antigos (ex.: alface granel com lavagem). */
export function resolverMapeamentoEfetivo(
  produtoComercialId: string,
  nome: string,
  categoriaComercial: string | null,
  map: Map<string, MapeamentoProdutoComercial>,
): MapeamentoProdutoComercial {
  const sugerido = sugerirMapeamentoProduto(produtoComercialId, nome, categoriaComercial);
  const mapeado = resolveMapeamentoProduto(produtoComercialId, nome, categoriaComercial, map);
  return mapeamentoEfetivoParaCalculo(mapeado, sugerido);
}

export function etapasDbEquivalemAoModelo(
  etapasDb: CustoProdutoEtapaRow[],
  esperadas: EtapaProcessoPadrao[],
): boolean {
  return etapaSignature(rowsToPersist(etapasDb)) === etapaSignature(etapasPadraoParaPersist(esperadas));
}

function modeloIdDoMapeamento(
  m: MapeamentoProdutoComercial,
  defaultModeloId: number | null,
): number | null {
  return m.processoModeloId ?? defaultModeloId;
}

export type SyncModeloFichasResult = {
  total: number;
  fichas: number;
  atualizadas: number;
};

export async function sincronizarFichasComModeloProcesso(
  projetoId: number,
  opts: { processoModeloId: number; isDefault: boolean },
): Promise<SyncModeloFichasResult> {
  await custosProdutoDb.ensureCustosProdutosTables();
  const modelo = await modelosDb.getProcessoModeloById(projetoId, opts.processoModeloId);
  if (!modelo) return { total: 0, fichas: 0, atualizadas: 0 };

  const defaultModelo = await modelosDb.getDefaultProcessoModelo(projetoId);
  const defaultModeloId = defaultModelo?.id ?? null;
  const mapaHora = await mapaHoraProjeto(projetoId);
  const mapRows = await mapDb.listComercialMap(projetoId);
  const map = new Map(mapRows.map((m) => [m.produtoComercialId, m]));

  let produtoById = new Map<string, { nome: string; categoria: string | null }>();
  try {
    const prisma = getComercialPrisma();
    const produtos = await prisma.produtoComercial.findMany({
      where: { ativo: true, importadoOperacao: true },
      select: { id: true, nome: true, categoria: true },
    });
    produtoById = new Map(produtos.map((p) => [p.id, { nome: p.nome, categoria: p.categoria }]));
  } catch {
    produtoById = new Map();
  }

  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  if (fichas.length === 0) return { total: 0, fichas: 0, atualizadas: 0 };

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

  let atualizadas = 0;
  let fichasAlvo = 0;

  for (const ficha of fichas) {
    const etapasAtuais = etapByFicha.get(ficha.id) ?? [];
    let perfil: PerfilProcessoProduto;
    let categoria: CategoriaProdutoCusto;

    if (ficha.produtoComercialId) {
      const prod = produtoById.get(ficha.produtoComercialId);
      const m = resolverMapeamentoEfetivo(
        ficha.produtoComercialId,
        prod?.nome ?? ficha.nome,
        prod?.categoria ?? null,
        map,
      );
      if (modeloIdDoMapeamento(m, defaultModeloId) !== opts.processoModeloId) continue;
      perfil = m.perfilProcesso;
      categoria = m.categoriaCusto;
    } else if (opts.isDefault) {
      perfil = inferirPerfilDeEtapas(etapasAtuais);
      categoria = (ficha.categoria ?? "outros") as CategoriaProdutoCusto;
    } else {
      continue;
    }

    fichasAlvo += 1;
    const esperadas = etapasEsperadasParaMapeamento(perfil, categoria, modelo, mapaHora);
    const depois = etapasPadraoParaPersist(esperadas);
    const antes = rowsToPersist(etapasAtuais);

    if (etapaSignature(antes) === etapaSignature(depois)) continue;

    const componentes = (compByFicha.get(ficha.id) ?? []).map(componenteToInsert);
    await custosProdutoDb.replaceComponentesEtapas(ficha.id, componentes, depois);
    atualizadas += 1;
  }

  return { total: fichas.length, fichas: fichasAlvo, atualizadas };
}

export async function sincronizarFichasComProcessoConfig(
  projetoId: number,
): Promise<SyncModeloFichasResult> {
  await custosProdutoDb.ensureCustosProdutosTables();
  const config = await getProcessoConfig(projetoId);
  const defaultModelo = await modelosDb.getDefaultProcessoModelo(projetoId);
  if (defaultModelo) {
    return sincronizarFichasComModeloProcesso(projetoId, {
      processoModeloId: defaultModelo.id,
      isDefault: true,
    });
  }

  const mapRows = await mapDb.listComercialMap(projetoId);
  const map = new Map(mapRows.map((m) => [m.produtoComercialId, m]));
  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  if (fichas.length === 0) return { total: 0, fichas: 0, atualizadas: 0 };

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

  let produtoById = new Map<string, { nome: string; categoria: string | null }>();
  try {
    const prisma = getComercialPrisma();
    const produtos = await prisma.produtoComercial.findMany({
      where: { ativo: true, importadoOperacao: true },
      select: { id: true, nome: true, categoria: true },
    });
    produtoById = new Map(produtos.map((p) => [p.id, { nome: p.nome, categoria: p.categoria }]));
  } catch {
    produtoById = new Map();
  }

  let atualizadas = 0;
  let fichasAlvo = 0;

  for (const ficha of fichas) {
    const etapasAtuais = etapByFicha.get(ficha.id) ?? [];
    let perfil: PerfilProcessoProduto;
    let categoria: CategoriaProdutoCusto;

    if (ficha.produtoComercialId) {
      const m = map.get(ficha.produtoComercialId);
      if (m?.processoModeloId != null) continue;
      const prod = produtoById.get(ficha.produtoComercialId);
      const resolved = resolverMapeamentoEfetivo(
        ficha.produtoComercialId,
        prod?.nome ?? ficha.nome,
        prod?.categoria ?? null,
        map,
      );
      if (resolved.processoModeloId != null) continue;
      perfil = resolved.perfilProcesso;
      categoria = resolved.categoriaCusto;
    } else {
      perfil = inferirPerfilDeEtapas(etapasAtuais);
      categoria = (ficha.categoria ?? "outros") as CategoriaProdutoCusto;
    }

    fichasAlvo += 1;
    const esperadas = etapasEsperadasParaConfigLegacy(perfil, categoria, config);
    const depois = etapasPadraoParaPersist(esperadas);
    const antes = rowsToPersist(etapasAtuais);

    if (etapaSignature(antes) === etapaSignature(depois)) continue;

    const componentes = (compByFicha.get(ficha.id) ?? []).map(componenteToInsert);
    await custosProdutoDb.replaceComponentesEtapas(ficha.id, componentes, depois);
    atualizadas += 1;
  }

  return { total: fichas.length, fichas: fichasAlvo, atualizadas };
}
