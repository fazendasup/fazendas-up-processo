import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import {
  createContaAzulHttp,
  contaAzulGet,
} from "./comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import { AcaoApi } from "./comercial/generated/prisma/index.js";
import {
  agregarMatrizRubricaCentro,
  agregarPorCentroCusto,
  agregarPorFornecedor,
  agregarPorGrupoDre,
  agregarPorRubrica,
  aplicarEdicoesClassificacao,
  ajusteManualParaParcela,
  detectarConflitosRubricaPorDestino,
  gerarInsightsCfo,
  medirQualidadeAlocacao,
  montarAging,
  montarComparativoCustoMes,
  montarFluxoPorDia,
  montarFluxoPorSemana,
  montarKpisReducaoCusto,
  normalizarParcela,
  parcelaEhCustoOperacional,
  parcelasAtivasParaRelatorio,
  periodoComparavelAnterior,
  limitarPeriodoComparativoRubricas,
  parcelaNoComparativoRubricas,
  resumirCaixa,
  type AjusteManualInput,
  type ClassificacaoOverride,
  type ParcelaFinanceiraNorm,
  type RateioLinha,
} from "@shared/financeiroCfoInsights";
import {
  listFinanceiroCaAjustesManuais,
  listFinanceiroCaClassificacoes,
} from "./financeiroClassificacaoDb";
import * as moEquipeDb from "./custosMoEquipeDb";
import { colaboradoresFolha052026 } from "@shared/custosMoEquipeFolha052026";
import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";

/** Calendário America/Sao_Paulo — evita deslocar o mês em máquinas UTC/UTC-4. */
function isoDateLocal(d: Date): string {
  return diaIsoAmericaSp(d);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type ParcelaCaRaw = {
  id?: string;
  descricao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  data_competencia?: string;
  status?: string;
  total?: number;
  pago?: number;
  nao_pago?: number;
  categorias?: Array<{ id?: string; nome?: string }>;
  centros_custo?: Array<{ id?: string; nome?: string }>;
  fornecedor?: { id?: string; nome?: string };
  cliente?: { id?: string; nome?: string };
};

type BuscaParcelasResponse = {
  itens?: ParcelaCaRaw[];
  itens_totais?: number;
};

type ContaFinanceiraRaw = {
  id?: string;
  nome?: string;
  tipo?: string;
  ativo?: boolean;
};

type CategoriaCa = {
  id?: string;
  nome?: string;
  tipo?: string;
  entrada_dre?: string;
  considera_custo_dre?: boolean;
};

type CatalogoCategoriasCache = {
  at: number;
  map: Map<string, CategoriaCa>;
};

const CATALOGO_TTL_MS = 15 * 60_000;
let catalogoCategoriasCache: CatalogoCategoriasCache | null = null;

type CategoriasBuscaResponse = {
  itens?: CategoriaCa[];
  itens_totais?: number;
};

/**
 * Catálogo Conta Azul (GET /v1/categorias) — resolve entrada_dre das rúbricas.
 * Sempre mescla folhas + árvore. Não cacheia mapa vazio por muito tempo.
 */
export async function fetchCatalogoCategorias(): Promise<
  Map<string, CategoriaCa>
> {
  if (
    catalogoCategoriasCache &&
    catalogoCategoriasCache.map.size > 0 &&
    Date.now() - catalogoCategoriasCache.at < CATALOGO_TTL_MS
  ) {
    return catalogoCategoriasCache.map;
  }
  if (
    catalogoCategoriasCache &&
    catalogoCategoriasCache.map.size === 0 &&
    Date.now() - catalogoCategoriasCache.at < 30_000
  ) {
    return catalogoCategoriasCache.map;
  }

  const map = new Map<string, CategoriaCa>();
  try {
    const env = getComercialEnv();
    const prisma = getComercialPrisma();
    const cred = await ensureValidAccessToken(prisma, env);
    if (!cred?.accessToken) {
      catalogoCategoriasCache = { at: Date.now(), map };
      return map;
    }
    const http = createContaAzulHttp(env, cred.accessToken);
    const tamanho = 100;
    const maxPaginas = 30;

    const coletar = async (permiteApenasFilhos: boolean) => {
      for (let pagina = 1; pagina <= maxPaginas; pagina++) {
        const qs = new URLSearchParams({
          pagina: String(pagina),
          tamanho_pagina: String(tamanho),
          permite_apenas_filhos: permiteApenasFilhos ? "true" : "false",
        });
        let res: CategoriasBuscaResponse;
        try {
          res = await contaAzulGet<CategoriasBuscaResponse>(
            http,
            `/v1/categorias?${qs.toString()}`,
          );
        } catch {
          break;
        }
        const batch = res.itens ?? [];
        for (const cat of batch) {
          if (cat.id) {
            const prev = map.get(cat.id);
            // Prefere entrada_dre preenchida se já tínhamos o id.
            if (!prev?.entrada_dre || cat.entrada_dre) {
              map.set(cat.id, { ...prev, ...cat });
            }
          }
          if (cat.nome?.trim()) {
            const key = `nome:${cat.nome.trim().toLowerCase()}`;
            const prev = map.get(key);
            if (!prev?.entrada_dre || cat.entrada_dre) {
              map.set(key, { ...prev, ...cat });
            }
          }
        }
        if (batch.length < tamanho) break;
      }
    };

    await coletar(true);
    await coletar(false);
  } catch {
    // catálogo opcional
  }
  catalogoCategoriasCache = { at: Date.now(), map };
  return map;
}

/** IDs de categorias com DRE = receita operacional bruta (vendas). */
export function idsCategoriasReceitaVendas(
  catalogo: Map<string, CategoriaCa>,
): string[] {
  const ids = new Set<string>();
  for (const [key, cat] of catalogo) {
    if (key.startsWith("nome:")) continue;
    const dre = (cat.entrada_dre ?? "").trim().toUpperCase();
    if (dre === "RECEITA_OPERACIONAL_BRUTA" && cat.id) {
      ids.add(cat.id);
    }
  }
  return Array.from(ids);
}

type ParcelaDetalheCa = {
  id?: string;
  descricao?: string;
  status?: string;
  total?: number;
  valor?: number;
  pago?: number;
  valor_pago?: number;
  nao_pago?: number;
  data_vencimento?: string;
  data_pagamento?: string;
  data_competencia?: string;
  categorias?: Array<{ id?: string; nome?: string }>;
  centros_custo?: Array<{ id?: string; nome?: string }>;
  fornecedor?: { id?: string; nome?: string };
  cliente?: { id?: string; nome?: string };
  evento?: {
    tipo?: string;
    rateio?: Array<{
      id_categoria?: string;
      nome_categoria?: string;
      valor?: number;
      valor_bruto?: number;
      rateio_centro_custo?: Array<{
        id_centro_custo?: string;
        nome_centro_custo?: string;
        valor?: number;
      }>;
    }>;
  };
};

async function fetchParcelasPagina(
  http: ReturnType<typeof createContaAzulHttp>,
  pathBase: string,
  qs: URLSearchParams,
): Promise<BuscaParcelasResponse> {
  return contaAzulGet<BuscaParcelasResponse>(
    http,
    `${pathBase}?${qs.toString()}`,
  );
}

/**
 * Busca parcelas do período.
 * Conta Azul exige data_vencimento_*; se também mandamos data_pagamento_*,
 * a API combina em AND e **some títulos em aberto** (sem pagamento).
 * Por isso: (1) vencimento no intervalo; (2) pagamento no intervalo com
 * janela ampla de vencimento — depois unimos por id.
 */
async function fetchParcelasPaginated(
  pathBase: string,
  inicio: Date,
  fim: Date,
): Promise<{ itens: ParcelaCaRaw[]; aviso?: string }> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error(
      "Conta Azul não conectado. Configure em Comercial → Configurações.",
    );
  }

  const http = createContaAzulHttp(env, cred.accessToken);
  const vencDe = isoDateLocal(inicio);
  const vencAte = isoDateLocal(fim);
  const pagDe = vencDe;
  const pagAte = vencAte;
  // Janela ampla de vencimento p/ achar baixas no mês com vencimento fora do mês
  // (atrasados de antes e antecipações com vencimento futuro).
  const vencAmploDe = isoDateLocal(
    new Date(inicio.getFullYear() - 2, inicio.getMonth(), inicio.getDate()),
  );
  const vencAmploAte = isoDateLocal(
    new Date(fim.getFullYear() + 2, fim.getMonth(), fim.getDate()),
  );

  const tamanho = 200;
  const maxPaginas = 40;
  const avisos: string[] = [];
  const porId = new Map<string, ParcelaCaRaw>();

  const coletar = async (
    label: string,
    buildQs: (pagina: number) => URLSearchParams,
  ) => {
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const qs = buildQs(pagina);
      let res: BuscaParcelasResponse;
      try {
        res = await fetchParcelasPagina(http, pathBase, qs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (pagina === 1) {
          avisos.push(`${label}: ${msg}`);
        }
        break;
      }
      const batch = res.itens ?? [];
      for (const item of batch) {
        if (!item.id) continue;
        const prev = porId.get(item.id);
        // Não sobrescrever um registro que já tem data_pagamento com outro sem.
        if (prev?.data_pagamento && !item.data_pagamento) continue;
        porId.set(item.id, item);
      }
      if (batch.length < tamanho) break;
    }
  };

  await coletar("vencimento", pagina => {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: String(tamanho),
      data_vencimento_de: vencDe,
      data_vencimento_ate: vencAte,
    });
    return qs;
  });

  await coletar("pagamento", pagina => {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: String(tamanho),
      data_vencimento_de: vencAmploDe,
      data_vencimento_ate: vencAmploAte,
      data_pagamento_de: pagDe,
      data_pagamento_ate: pagAte,
    });
    return qs;
  });

  return {
    itens: Array.from(porId.values()),
    aviso: avisos.length ? avisos.join(" · ") : undefined,
  };
}

function resolverEntradaDre(
  catalogo: Map<string, CategoriaCa>,
  categoriaId: string | null,
  categoriaNome: string | null,
): string | null {
  if (categoriaId && catalogo.get(categoriaId)?.entrada_dre) {
    return catalogo.get(categoriaId)!.entrada_dre ?? null;
  }
  if (categoriaNome) {
    const byNome = catalogo.get(`nome:${categoriaNome.trim().toLowerCase()}`);
    if (byNome?.entrada_dre) return byNome.entrada_dre;
  }
  return null;
}

async function fetchParcelaDetalhe(id: string): Promise<ParcelaDetalheCa | null> {
  try {
    const env = getComercialEnv();
    const prisma = getComercialPrisma();
    const cred = await ensureValidAccessToken(prisma, env);
    if (!cred?.accessToken) return null;
    const http = createContaAzulHttp(env, cred.accessToken);
    return await contaAzulGet<ParcelaDetalheCa>(
      http,
      `/v1/financeiro/eventos-financeiros/parcelas/${id}`,
    );
  } catch {
    return null;
  }
}

function rateioDeDetalhe(det: ParcelaDetalheCa): RateioLinha[] {
  const linhas = det.evento?.rateio ?? [];
  return linhas
    .map(r => ({
      categoriaId: r.id_categoria ?? null,
      categoriaNome: r.nome_categoria?.trim() || null,
      valor: Number(r.valor ?? r.valor_bruto ?? 0) || 0,
      centros: (r.rateio_centro_custo ?? []).map(c => ({
        id: c.id_centro_custo ?? null,
        nome: c.nome_centro_custo?.trim() || null,
        valor: Number(c.valor ?? 0) || 0,
      })),
    }))
    .filter(r => r.categoriaNome || r.valor > 0 || r.centros.length > 0);
}

/** Rateio detalhado sob demanda (não bloqueia a listagem). */
export async function buscarParcelaDetalheFinanceiro(
  parcelaId: string,
  tipo: "pagar" | "receber" = "pagar",
): Promise<ParcelaFinanceiraNorm | null> {
  if (!parcelaId || parcelaId.startsWith("manual-")) return null;
  const det = await fetchParcelaDetalhe(parcelaId);
  if (!det) return null;
  const rateio = rateioDeDetalhe(det);
  const catNome =
    rateio.find(r => r.categoriaNome)?.categoriaNome ||
    det.categorias?.[0]?.nome ||
    null;
  const centros = [
    ...new Set(
      [
        ...(det.centros_custo ?? []).map(c => c.nome?.trim() || ""),
        ...rateio.flatMap(r => r.centros.map(c => c.nome || "")),
      ].filter(Boolean),
    ),
  ];
  const categorias = [
    ...new Set(
      [
        ...(det.categorias ?? []).map(c => c.nome?.trim() || ""),
        ...rateio.map(r => r.categoriaNome || ""),
      ].filter(Boolean),
    ),
  ];
  const contraparte =
    tipo === "pagar"
      ? det.fornecedor?.nome ?? null
      : det.cliente?.nome ?? null;
  return normalizarParcela({
    id: det.id || parcelaId,
    tipo,
    descricao: det.descricao,
    valor: Number(det.total ?? det.valor ?? 0),
    valorPago: Number(det.pago ?? det.valor_pago ?? 0),
    valorEmAberto: Number(
      det.nao_pago ??
        Math.max(
          0,
          Number(det.total ?? det.valor ?? 0) -
            Number(det.pago ?? det.valor_pago ?? 0),
        ),
    ),
    status: det.status,
    dataVencimento: det.data_vencimento,
    dataPagamento: det.data_pagamento,
    dataCompetencia: det.data_competencia,
    categoria: catNome,
    categorias,
    centrosCusto: centros,
    contraparte,
    rateio,
    fonteClassificacao:
      rateio.length > 0
        ? "rateio_api"
        : catNome
          ? "listagem_categoria"
          : "sem_classificacao",
  });
}

async function fetchSaldosContas(opts?: {
  /** Busca saldo-atual por conta (mais lento; use no dashboard). */
  incluirSaldoAtual?: boolean;
  /** Máximo de contas a consultar saldo. Default 25. */
  maxContas?: number;
}): Promise<{
  contas: Array<{ id: string; nome: string; saldo: number | null }>;
  saldoTotal: number | null;
  aviso?: string;
}> {
  const incluirSaldo = opts?.incluirSaldoAtual === true;
  const maxContas = opts?.maxContas ?? 25;
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    return { contas: [], saldoTotal: null, aviso: "Conta Azul não conectado." };
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  let lista: ContaFinanceiraRaw[] = [];
  try {
    const res = await contaAzulGet<{ itens?: ContaFinanceiraRaw[] } | ContaFinanceiraRaw[]>(
      http,
      "/v1/conta-financeira?tamanho_pagina=100",
    );
    lista = Array.from(Array.isArray(res) ? res : (res.itens ?? []));
  } catch (e) {
    return {
      contas: [],
      saldoTotal: null,
      aviso: e instanceof Error ? e.message : "Falha ao listar contas financeiras.",
    };
  }

  const base = lista
    .filter(c => c.id && c.ativo !== false)
    .slice(0, maxContas);

  if (!incluirSaldo) {
    return {
      contas: base.map(c => ({
        id: c.id!,
        nome: c.nome?.trim() || c.id!,
        saldo: null as number | null,
      })),
      saldoTotal: null,
      aviso:
        base.length > 0
          ? "Saldos por conta omitidos nesta carga rápida; use o Conta Azul para saldo atual."
          : undefined,
    };
  }

  const contas: Array<{ id: string; nome: string; saldo: number | null }> = [];
  const concurrency = 5;
  for (let i = 0; i < base.length; i += concurrency) {
    const chunk = base.slice(i, i + concurrency);
    const part = await Promise.all(
      chunk.map(async c => {
        const id = c.id!;
        const nome = c.nome?.trim() || id;
        try {
          const sal = await contaAzulGet<{ saldo_atual?: number }>(
            http,
            `/v1/conta-financeira/${encodeURIComponent(id)}/saldo-atual`,
          );
          const n = Number(sal?.saldo_atual);
          return {
            id,
            nome,
            saldo: Number.isFinite(n) ? round2(n) : null,
          };
        } catch {
          return { id, nome, saldo: null as number | null };
        }
      }),
    );
    contas.push(...part);
  }

  const comSaldo = contas.filter(c => c.saldo != null);
  const saldoTotal =
    comSaldo.length > 0
      ? round2(comSaldo.reduce((s, c) => s + (c.saldo ?? 0), 0))
      : null;

  return {
    contas,
    saldoTotal,
    aviso:
      saldoTotal == null && contas.length > 0
        ? "Não foi possível obter saldo atual das contas no Conta Azul."
        : undefined,
  };
}

/**
 * Saldo bancário consolidado (manual + movimentos). Com projetoId usa a
 * âncora gravada; sem projetoId, listagem bruta legado da API.
 */
export async function buscarSaldoContasAzul(projetoId?: number): Promise<{
  saldoTotal: number | null;
  contas: Array<{ id: string; nome: string; saldo: number | null }>;
  aviso?: string;
}> {
  if (projetoId != null) {
    const { buscarSaldosBancarios } = await import("./financeiroSaldosBancarios");
    const s = await buscarSaldosBancarios(projetoId);
    return {
      saldoTotal: s.saldoBancario,
      contas:
        s.saldoBancario != null
          ? [
              {
                id: "saldo-bancario",
                nome: "Saldo disponível (todas as contas)",
                saldo: s.saldoBancario,
              },
            ]
          : [],
      aviso: s.aviso,
    };
  }
  return fetchSaldosContas({ incluirSaldoAtual: true, maxContas: 30 });
}

function mapParcelaListagem(
  raw: ParcelaCaRaw,
  tipo: "receber" | "pagar",
  catalogo: Map<string, CategoriaCa>,
): ParcelaFinanceiraNorm | null {
  if (!raw.id) return null;
  const contraparte =
    tipo === "pagar"
      ? raw.fornecedor?.nome ?? null
      : raw.cliente?.nome ?? null;
  const categorias = (raw.categorias ?? [])
    .map(c => c.nome?.trim() || "")
    .filter(Boolean);
  const centrosCusto = (raw.centros_custo ?? [])
    .map(c => c.nome?.trim() || "")
    .filter(Boolean);
  const catId = raw.categorias?.[0]?.id ?? null;
  const catNome = categorias[0] ?? null;
  return normalizarParcela({
    id: raw.id,
    tipo,
    descricao: raw.descricao,
    valor: Number(raw.total ?? 0),
    valorPago: Number(raw.pago ?? 0),
    valorEmAberto: Number(
      raw.nao_pago ??
        Math.max(0, Number(raw.total ?? 0) - Number(raw.pago ?? 0)),
    ),
    status: raw.status,
    dataVencimento: raw.data_vencimento,
    dataPagamento: raw.data_pagamento,
    dataCompetencia: raw.data_competencia,
    categoria: catNome,
    categorias,
    centrosCusto,
    contraparte,
    entradaDre: resolverEntradaDre(catalogo, catId, catNome),
    fonteClassificacao: catNome ? "listagem_categoria" : "sem_classificacao",
  });
}

export async function analisarFinanceiroCfoContaAzul(
  inicio: Date,
  fim: Date,
  projetoId: number,
  opts?: { compararMesAnterior?: boolean },
) {
  const compararMesAnterior = opts?.compararMesAnterior !== false;
  const prisma = getComercialPrisma();
  const prevRaw = periodoComparavelAnterior(inicio, fim);
  const prev = compararMesAnterior
    ? limitarPeriodoComparativoRubricas(prevRaw.inicio, prevRaw.fim)
    : null;
  const buscarMesAnterior = !!prev;

  const [
    pagarFetch,
    receberFetch,
    saldos,
    lastSync,
    classifs,
    ajustes,
    equipesMo,
    pagarPrevFetch,
  ] = await Promise.all([
      fetchParcelasPaginated(
        "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
        inicio,
        fim,
      ),
      fetchParcelasPaginated(
        "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
        inicio,
        fim,
      ),
      fetchSaldosContas(),
      prisma.execucaoApi.findFirst({
        where: { acaoApi: AcaoApi.SYNC_CA },
        orderBy: { dataExecucao: "desc" },
        select: { dataExecucao: true, statusExecucao: true },
      }),
      listFinanceiroCaClassificacoes(projetoId),
      listFinanceiroCaAjustesManuais(projetoId),
      moEquipeDb.listMoEquipes(projetoId).catch(() => []),
      buscarMesAnterior && prev
        ? fetchParcelasPaginated(
            "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
            prev.inicio,
            prev.fim,
          )
        : Promise.resolve({ itens: [] as ParcelaCaRaw[], aviso: undefined }),
    ]);

  /** Catálogo DRE — resolve entrada_dre; não bloqueia se a API falhar. */
  const catalogo = await fetchCatalogoCategorias();

  let pagar = pagarFetch.itens
    .map(i => mapParcelaListagem(i, "pagar", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  let receber = receberFetch.itens
    .map(i => mapParcelaListagem(i, "receber", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);

  const overrides: ClassificacaoOverride[] = classifs.map(c => ({
    tipo: c.tipo,
    chave: c.chave,
    rubricaOverride: c.rubricaOverride,
    centroCustoOverride: c.centroCustoOverride,
    excluido: c.excluido,
    nota: c.nota,
  }));

  pagar = aplicarEdicoesClassificacao(pagar, overrides);
  receber = aplicarEdicoesClassificacao(receber, overrides);

  const ajustesNorm: AjusteManualInput[] = ajustes.map(a => ({
    id: a.id,
    tipo: a.tipo,
    descricao: a.descricao,
    contraparte: a.contraparte,
    rubrica: a.rubrica,
    centroCusto: a.centroCusto,
    valor: Number(a.valor),
    dataCompetencia: a.dataCompetencia,
    dataVencimento: a.dataVencimento,
    nota: a.nota,
  }));
  for (const a of ajustesNorm) {
    const p = ajusteManualParaParcela(a);
    if (a.nota) p.notaClassificacao = a.nota;
    if (p.tipo === "pagar") pagar.push(p);
    else receber.push(p);
  }

  const pagarAtivos = parcelasAtivasParaRelatorio(pagar);
  const receberAtivos = parcelasAtivasParaRelatorio(receber);
  const excluidos = [...pagar, ...receber].filter(p => p.excluido);
  const pagarCusto = pagarAtivos.filter(parcelaEhCustoOperacional);

  const resumo = resumirCaixa(receberAtivos, pagarAtivos);
  const rubricas = agregarPorRubrica(pagarCusto);
  const centrosCusto = agregarPorCentroCusto(pagarCusto);
  const matrizRubricaCentro = agregarMatrizRubricaCentro(pagarCusto).slice(0, 120);
  const gruposDre = agregarPorGrupoDre(pagarCusto, rubricas);
  const qualidadeAlocacao = medirQualidadeAlocacao(pagarCusto);
  const nomesEquipe = Array.from(
    new Set(
      [
        ...equipesMo.map(e => e.nome),
        ...colaboradoresFolha052026().map(c => c.nome),
      ].filter(Boolean),
    ),
  );
  const fornecedores = agregarPorFornecedor(pagarCusto, {
    excluirPessoal: true,
    nomesEquipe,
  });

  let comparativo = null as ReturnType<typeof montarComparativoCustoMes> | null;
  let conflitosRubricaDestino: ReturnType<
    typeof detectarConflitosRubricaPorDestino
  > = [];
  let pagarPrevAtivos: ParcelaFinanceiraNorm[] = [];
  if (buscarMesAnterior && prev) {
    let pagarPrev = pagarPrevFetch.itens
      .map(i => mapParcelaListagem(i, "pagar", catalogo))
      .filter((x): x is ParcelaFinanceiraNorm => !!x);
    pagarPrev = aplicarEdicoesClassificacao(pagarPrev, overrides);
    for (const a of ajustesNorm) {
      const p = ajusteManualParaParcela(a);
      if (p.tipo !== "pagar") continue;
      const ref =
        p.dataCompetencia || p.dataVencimento || p.dataPagamento || "";
      if (
        ref >= isoDateLocal(prev.inicio) &&
        ref <= isoDateLocal(prev.fim)
      ) {
        if (a.nota) p.notaClassificacao = a.nota;
        pagarPrev.push(p);
      }
    }
    pagarPrevAtivos = parcelasAtivasParaRelatorio(pagarPrev)
      .filter(p => parcelaNoComparativoRubricas(p))
      .filter(parcelaEhCustoOperacional);
    const rubricasPrev = agregarPorRubrica(pagarPrevAtivos);
    comparativo = montarComparativoCustoMes(rubricas, rubricasPrev, {
      inicio: isoDateLocal(prev.inicio),
      fim: isoDateLocal(prev.fim),
    });
  }

  conflitosRubricaDestino = detectarConflitosRubricaPorDestino(
    buscarMesAnterior
      ? [...pagarAtivos, ...pagarPrevAtivos]
      : pagarAtivos,
    { excluirPessoal: true, nomesEquipe },
  ).slice(0, 80);

  const kpisReducao = montarKpisReducaoCusto({
    rubricas,
    qualidade: qualidadeAlocacao,
    aPagarEmAberto: resumo.aPagarEmAberto,
    titulosPagar: pagarAtivos.filter(p => p.tipo === "pagar").length,
    comparativo,
  });

  const periodoInicio = isoDateLocal(inicio);
  const periodoFim = isoDateLocal(fim);
  const todasAtivas = [...receberAtivos, ...pagarAtivos];
  const fluxoDias = montarFluxoPorDia(todasAtivas, periodoInicio, periodoFim);
  const fluxoSemanas = montarFluxoPorSemana(todasAtivas);
  const refAging = periodoFim;
  const agingPagar = montarAging(pagarAtivos, refAging);
  const agingReceber = montarAging(receberAtivos, refAging);
  const insights = gerarInsightsCfo({
    resumo,
    qualidadeAlocacao,
    saldoContas: saldos.saldoTotal,
  });

  const avisos = [
    pagarFetch.aviso,
    receberFetch.aviso,
    pagarPrevFetch.aviso,
    saldos.aviso,
    "Rateio detalhado carrega ao abrir o detalhe do lançamento.",
  ].filter(Boolean) as string[];

  const sortPorValor = (a: ParcelaFinanceiraNorm, b: ParcelaFinanceiraNorm) =>
    (b.valor > 0 ? b.valor : b.valorPago) - (a.valor > 0 ? a.valor : a.valorPago);

  const rubricasSugestoes = Array.from(
    new Set(
      [
        ...rubricas.map(r => r.label),
        ...classifs.map(c => c.rubricaOverride).filter(Boolean),
        ...ajustes.map(a => a.rubrica),
      ].filter(Boolean) as string[],
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const centrosSugestoes = Array.from(
    new Set(
      [
        ...centrosCusto.map(c => c.label),
        ...classifs.map(c => c.centroCustoOverride).filter(Boolean),
        ...ajustes.map(a => a.centroCusto).filter(Boolean),
      ].filter(Boolean) as string[],
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    periodo: {
      inicio: periodoInicio,
      fim: periodoFim,
    },
    resumo,
    kpisReducao,
    comparativo,
    conflitosRubricaDestino,
    rubricas,
    centrosCusto,
    matrizRubricaCentro,
    gruposDre,
    qualidadeAlocacao,
    fornecedores: fornecedores.slice(0, 100),
    fluxoDias,
    fluxoSemanas,
    agingPagar,
    agingReceber,
    insights,
    contasFinanceiras: saldos.contas,
    saldoContasTotal: saldos.saldoTotal,
    metaEnriquecimento: {
      maxParcelas: 0,
      comRateioApi: 0,
      falhasDetalhe: 0,
      sobDemanda: true as const,
    },
    classificacoes: classifs,
    ajustesManuais: ajustes,
    rubricasSugestoes,
    centrosSugestoes,
    contagens: {
      parcelasPagar: pagarAtivos.filter(p => p.tipo === "pagar").length,
      parcelasReceber: receberAtivos.filter(p => p.tipo === "receber").length,
      rubricas: rubricas.length,
      centrosCusto: centrosCusto.length,
      categoriasCatalogo: catalogo.size,
      excluidos: excluidos.length,
      editados: [...pagarAtivos, ...receberAtivos].filter(p => p.editadoManual).length,
      manuais: ajustesNorm.length,
    },
    lancamentosPagar: [...pagar].sort(sortPorValor).slice(0, 400),
    lancamentosReceber: [...receber].sort(sortPorValor).slice(0, 200),
    topPagarEmAberto: [...pagarAtivos]
      .filter(p => p.valorEmAberto > 0)
      .sort((a, b) => b.valorEmAberto - a.valorEmAberto)
      .slice(0, 50),
    topReceberEmAberto: [...receberAtivos]
      .filter(p => p.valorEmAberto > 0)
      .sort((a, b) => b.valorEmAberto - a.valorEmAberto)
      .slice(0, 50),
    avisos,
    ultimaSyncContaAzul: lastSync?.dataExecucao ?? null,
    ultimaSyncStatus: lastSync?.statusExecucao ?? null,
  };
}

/** Contas a pagar normalizadas + overrides do projeto (para projeção). */
export async function buscarParcelasPagarParaProjecao(
  inicio: Date,
  fim: Date,
  projetoId: number,
): Promise<ParcelaFinanceiraNorm[]> {
  const [fetch, classifs] = await Promise.all([
    fetchParcelasPaginated(
      "/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar",
      inicio,
      fim,
    ),
    listFinanceiroCaClassificacoes(projetoId),
  ]);
  const catalogo = await fetchCatalogoCategorias();
  let pagar = fetch.itens
    .map(i => mapParcelaListagem(i, "pagar", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  pagar = aplicarEdicoesClassificacao(
    pagar,
    classifs.map(c => ({
      tipo: c.tipo,
      chave: c.chave,
      rubricaOverride: c.rubricaOverride,
      centroCustoOverride: c.centroCustoOverride,
      excluido: c.excluido,
      nota: c.nota,
    })),
  );
  return parcelasAtivasParaRelatorio(pagar);
}

/** Contas a receber normalizadas + overrides (comparativo de receita). */
export async function buscarParcelasReceberParaComparativo(
  inicio: Date,
  fim: Date,
  projetoId: number,
): Promise<ParcelaFinanceiraNorm[]> {
  const [fetch, classifs] = await Promise.all([
    fetchParcelasPaginated(
      "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
      inicio,
      fim,
    ),
    listFinanceiroCaClassificacoes(projetoId),
  ]);
  const catalogo = await fetchCatalogoCategorias();
  let receber = fetch.itens
    .map(i => mapParcelaListagem(i, "receber", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  receber = aplicarEdicoesClassificacao(
    receber,
    classifs.map(c => ({
      tipo: c.tipo,
      chave: c.chave,
      rubricaOverride: c.rubricaOverride,
      centroCustoOverride: c.centroCustoOverride,
      excluido: c.excluido,
      nota: c.nota,
    })),
  );
  // Não remove “excluído” local: o comparativo de caixa deve bater com o Conta Azul.
  return receber.map(p => (p.excluido ? { ...p, excluido: false } : p));
}

/**
 * Só baixas a receber com data_pagamento em [inicio, fim].
 * Conta Azul exige data_vencimento_*: usamos janela ampla de vencimento.
 * Ideal p/ “ainda entra” — o filtro da API já limita o período de caixa,
 * mesmo quando a listagem omite data_pagamento no JSON.
 *
 * Se `idsCategorias` for passado, a API restringe a essas categorias
 * (ex.: só RECEITA_OPERACIONAL_BRUTA).
 */
export async function buscarBaixasReceberPorPeriodoPagamento(
  inicio: Date,
  fim: Date,
  projetoId: number,
  opts?: { idsCategorias?: string[] },
): Promise<ParcelaFinanceiraNorm[]> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error(
      "Conta Azul não conectado. Configure em Comercial → Configurações.",
    );
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const pathBase =
    "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
  const pagDe = isoDateLocal(inicio);
  const pagAte = isoDateLocal(fim);
  const vencAmploDe = isoDateLocal(
    new Date(inicio.getFullYear() - 2, inicio.getMonth(), inicio.getDate()),
  );
  const vencAmploAte = isoDateLocal(
    new Date(fim.getFullYear() + 2, fim.getMonth(), fim.getDate()),
  );
  const tamanho = 200;
  const maxPaginas = 40;
  const porId = new Map<string, ParcelaCaRaw>();
  const idsCat = (opts?.idsCategorias ?? []).filter(Boolean);

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: String(tamanho),
      data_vencimento_de: vencAmploDe,
      data_vencimento_ate: vencAmploAte,
      data_pagamento_de: pagDe,
      data_pagamento_ate: pagAte,
    });
    for (const id of idsCat) {
      qs.append("ids_categorias", id);
    }
    let res: BuscaParcelasResponse;
    try {
      res = await fetchParcelasPagina(http, pathBase, qs);
    } catch {
      break;
    }
    const batch = res.itens ?? [];
    for (const item of batch) {
      if (item.id) porId.set(item.id, item);
    }
    if (batch.length < tamanho) break;
  }

  const [classifs, catalogo] = await Promise.all([
    listFinanceiroCaClassificacoes(projetoId),
    fetchCatalogoCategorias(),
  ]);
  let receber = Array.from(porId.values())
    .map(i => mapParcelaListagem(i, "receber", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  receber = aplicarEdicoesClassificacao(
    receber,
    classifs.map(c => ({
      tipo: c.tipo,
      chave: c.chave,
      rubricaOverride: c.rubricaOverride,
      centroCustoOverride: c.centroCustoOverride,
      excluido: c.excluido,
      nota: c.nota,
    })),
  );
  return receber.map(p => (p.excluido ? { ...p, excluido: false } : p));
}

/**
 * Títulos a receber com vencimento em [inicio, fim] (só filtro de vencimento).
 * Usado para trazer vencidos em aberto de meses anteriores.
 */
export async function buscarParcelasReceberPorVencimento(
  inicio: Date,
  fim: Date,
  projetoId: number,
): Promise<ParcelaFinanceiraNorm[]> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error(
      "Conta Azul não conectado. Configure em Comercial → Configurações.",
    );
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const vencDe = isoDateLocal(inicio);
  const vencAte = isoDateLocal(fim);
  const tamanho = 200;
  const maxPaginas = 40;
  const porId = new Map<string, ParcelaCaRaw>();

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: String(tamanho),
      data_vencimento_de: vencDe,
      data_vencimento_ate: vencAte,
    });
    try {
      const res = await fetchParcelasPagina(
        http,
        "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
        qs,
      );
      const batch = res.itens ?? [];
      for (const item of batch) {
        if (item.id) porId.set(item.id, item);
      }
      if (batch.length < tamanho) break;
    } catch {
      break;
    }
  }

  const classifs = await listFinanceiroCaClassificacoes(projetoId);
  const catalogo = await fetchCatalogoCategorias();
  let receber = Array.from(porId.values())
    .map(i => mapParcelaListagem(i, "receber", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  receber = aplicarEdicoesClassificacao(
    receber,
    classifs.map(c => ({
      tipo: c.tipo,
      chave: c.chave,
      rubricaOverride: c.rubricaOverride,
      centroCustoOverride: c.centroCustoOverride,
      excluido: c.excluido,
      nota: c.nota,
    })),
  );
  return parcelasAtivasParaRelatorio(receber);
}
