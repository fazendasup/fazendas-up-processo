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
  gerarInsightsCfo,
  medirQualidadeAlocacao,
  montarAging,
  montarFluxoPorSemana,
  normalizarParcela,
  parcelasAtivasParaRelatorio,
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

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/** Limite de enriquecimento por análise (throttle CA ~200ms/req). */
const MAX_ENRIQUECER_PAGAR = 80;

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
  const pagDe = isoDateLocal(inicio);
  const pagAte = isoDateLocal(fim);

  const itens: ParcelaCaRaw[] = [];
  const tamanho = 200;
  const maxPaginas = 40;
  let aviso: string | undefined;

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const qs = new URLSearchParams({
      pagina: String(pagina),
      tamanho_pagina: String(tamanho),
      data_vencimento_de: vencDe,
      data_vencimento_ate: vencAte,
      data_pagamento_de: pagDe,
      data_pagamento_ate: pagAte,
    });
    let res: BuscaParcelasResponse;
    try {
      res = await contaAzulGet<BuscaParcelasResponse>(
        http,
        `${pathBase}?${qs.toString()}`,
      );
    } catch (e) {
      if (pagina === 1 && /\(400\)/.test(e instanceof Error ? e.message : "")) {
        const qs2 = new URLSearchParams({
          pagina: String(pagina),
          tamanho_pagina: String(tamanho),
          data_vencimento_de: vencDe,
          data_vencimento_ate: vencAte,
        });
        res = await contaAzulGet<BuscaParcelasResponse>(
          http,
          `${pathBase}?${qs2.toString()}`,
        );
        aviso =
          "Filtro por data de pagamento indisponível em parte das consultas; usando vencimento.";
      } else {
        throw e;
      }
    }
    const batch = res.itens ?? [];
    itens.push(...batch);
    if (batch.length < tamanho) break;
  }

  return { itens, aviso };
}

async function fetchCatalogoCategorias(): Promise<Map<string, CategoriaCa>> {
  const map = new Map<string, CategoriaCa>();
  try {
    const env = getComercialEnv();
    const prisma = getComercialPrisma();
    const cred = await ensureValidAccessToken(prisma, env);
    if (!cred?.accessToken) return map;
    const http = createContaAzulHttp(env, cred.accessToken);
    for (let pagina = 1; pagina <= 20; pagina++) {
      const qs = new URLSearchParams({
        pagina: String(pagina),
        tamanho_pagina: "100",
        permite_apenas_filhos: "false",
      });
      const res = await contaAzulGet<{ itens?: CategoriaCa[] }>(
        http,
        `/v1/categorias?${qs.toString()}`,
      );
      const batch = res.itens ?? [];
      for (const c of batch) {
        if (c.id) map.set(c.id, c);
        if (c.nome?.trim()) map.set(`nome:${c.nome.trim().toLowerCase()}`, c);
      }
      if (batch.length < 100) break;
    }
  } catch {
    /* catálogo opcional — DRE fica sem mapeamento */
  }
  return map;
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

async function fetchSaldosContas(): Promise<{
  contas: Array<{ id: string; nome: string; saldo: number | null }>;
  saldoTotal: number | null;
  aviso?: string;
}> {
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

  const contas: Array<{ id: string; nome: string; saldo: number | null }> = [];
  let saldoTotal = 0;
  let algumSaldo = false;

  for (const c of lista.slice(0, 30)) {
    if (!c.id) continue;
    if (c.ativo === false) continue;
    let saldo: number | null = null;
    try {
      const s = await contaAzulGet<{ saldo?: number; saldo_atual?: number }>(
        http,
        `/v1/conta-financeira/${c.id}/saldo-atual`,
      );
      const n = Number(s.saldo_atual ?? s.saldo);
      if (Number.isFinite(n)) {
        saldo = round2(n);
        saldoTotal += n;
        algumSaldo = true;
      }
    } catch {
      /* conta sem saldo */
    }
    contas.push({ id: c.id, nome: c.nome?.trim() || c.id, saldo });
  }

  return {
    contas,
    saldoTotal: algumSaldo ? round2(saldoTotal) : null,
  };
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

async function enriquecerPagarComRateio(
  pagar: ParcelaFinanceiraNorm[],
  catalogo: Map<string, CategoriaCa>,
): Promise<{
  parcelas: ParcelaFinanceiraNorm[];
  enriquecidas: number;
  falhas: number;
  aviso?: string;
}> {
  const ordenadas = [...pagar].sort(
    (a, b) =>
      (b.valor > 0 ? b.valor : b.valorPago) -
      (a.valor > 0 ? a.valor : a.valorPago),
  );
  const alvo = ordenadas.slice(0, MAX_ENRIQUECER_PAGAR);
  const restoIds = new Set(ordenadas.slice(MAX_ENRIQUECER_PAGAR).map(p => p.id));
  const byId = new Map(pagar.map(p => [p.id, p]));

  let enriquecidas = 0;
  let falhas = 0;

  for (const base of alvo) {
    const det = await fetchParcelaDetalhe(base.id);
    if (!det) {
      falhas += 1;
      continue;
    }
    const rateio = rateioDeDetalhe(det);
    const catNome =
      rateio.find(r => r.categoriaNome)?.categoriaNome ||
      det.categorias?.[0]?.nome ||
      base.categoria;
    const catId =
      rateio.find(r => r.categoriaId)?.categoriaId ||
      det.categorias?.[0]?.id ||
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

    byId.set(
      base.id,
      normalizarParcela({
        id: base.id,
        tipo: "pagar",
        descricao: det.descricao || base.descricao,
        valor: Number(det.total ?? det.valor ?? base.valor),
        valorPago: Number(det.pago ?? det.valor_pago ?? base.valorPago),
        valorEmAberto: Number(
          det.nao_pago ??
            Math.max(
              0,
              Number(det.total ?? det.valor ?? base.valor) -
                Number(det.pago ?? det.valor_pago ?? base.valorPago),
            ),
        ),
        status: det.status || base.status,
        dataVencimento: det.data_vencimento || base.dataVencimento,
        dataPagamento: det.data_pagamento || base.dataPagamento,
        dataCompetencia: det.data_competencia || base.dataCompetencia,
        categoria: catNome,
        categorias,
        centrosCusto: centros,
        contraparte: det.fornecedor?.nome || base.contraparte,
        rateio,
        fonteClassificacao:
          rateio.length > 0
            ? "rateio_api"
            : catNome
              ? "listagem_categoria"
              : "sem_classificacao",
        entradaDre: resolverEntradaDre(catalogo, catId, catNome ?? null),
      }),
    );
    if (rateio.length > 0) enriquecidas += 1;
  }

  const aviso =
    restoIds.size > 0
      ? `Rateio detalhado buscado nos ${MAX_ENRIQUECER_PAGAR} maiores títulos a pagar (${restoIds.size} restantes usam só a categoria da listagem).`
      : falhas > 0
        ? `${falhas} parcela(s) sem detalhe de rateio na API.`
        : undefined;

  return {
    parcelas: Array.from(byId.values()),
    enriquecidas,
    falhas,
    aviso,
  };
}

export async function analisarFinanceiroCfoContaAzul(
  inicio: Date,
  fim: Date,
  projetoId: number,
) {
  const prisma = getComercialPrisma();
  const [pagarFetch, receberFetch, saldos, lastSync, catalogo, classifs, ajustes] =
    await Promise.all([
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
      fetchCatalogoCategorias(),
      listFinanceiroCaClassificacoes(projetoId),
      listFinanceiroCaAjustesManuais(projetoId),
    ]);

  let pagar = pagarFetch.itens
    .map(i => mapParcelaListagem(i, "pagar", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  let receber = receberFetch.itens
    .map(i => mapParcelaListagem(i, "receber", catalogo))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);

  const enrich = await enriquecerPagarComRateio(pagar, catalogo);
  pagar = enrich.parcelas;

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

  const resumo = resumirCaixa(receberAtivos, pagarAtivos);
  const rubricas = agregarPorRubrica(pagarAtivos);
  const centrosCusto = agregarPorCentroCusto(pagarAtivos);
  const matrizRubricaCentro = agregarMatrizRubricaCentro(pagarAtivos).slice(0, 120);
  const gruposDre = agregarPorGrupoDre(pagarAtivos, rubricas);
  const qualidadeAlocacao = medirQualidadeAlocacao(pagarAtivos);
  const fornecedores = agregarPorFornecedor(pagarAtivos);
  const fluxoSemanas = montarFluxoPorSemana([...receberAtivos, ...pagarAtivos]);
  const refAging = isoDateLocal(fim);
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
    saldos.aviso,
    enrich.aviso,
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
      inicio: isoDateLocal(inicio),
      fim: isoDateLocal(fim),
    },
    resumo,
    rubricas,
    centrosCusto,
    matrizRubricaCentro,
    gruposDre,
    qualidadeAlocacao,
    fornecedores: fornecedores.slice(0, 100),
    fluxoSemanas,
    agingPagar,
    agingReceber,
    insights,
    contasFinanceiras: saldos.contas,
    saldoContasTotal: saldos.saldoTotal,
    metaEnriquecimento: {
      maxParcelas: MAX_ENRIQUECER_PAGAR,
      comRateioApi: enrich.enriquecidas,
      falhasDetalhe: enrich.falhas,
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
