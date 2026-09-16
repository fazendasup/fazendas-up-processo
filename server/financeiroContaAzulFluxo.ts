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
  montarFluxoPorDia,
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
import * as moEquipeDb from "./custosMoEquipeDb";
import { colaboradoresFolha052026 } from "@shared/custosMoEquipeFolha052026";

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
  // Janela ampla só para achar baixas no mês com vencimento fora do mês.
  const vencAmploDe = isoDateLocal(
    new Date(inicio.getFullYear() - 2, inicio.getMonth(), inicio.getDate()),
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
        if (item.id) porId.set(item.id, item);
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
      data_vencimento_ate: vencAte,
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

  /** Só nomes — saldo por conta é lento na API e não bloqueia o pacote. */
  const contas = lista
    .filter(c => c.id && c.ativo !== false)
    .slice(0, 40)
    .map(c => ({
      id: c.id!,
      nome: c.nome?.trim() || c.id!,
      saldo: null as number | null,
    }));

  return {
    contas,
    saldoTotal: null,
    aviso:
      contas.length > 0
        ? "Saldos por conta omitidos nesta carga rápida; use o Conta Azul para saldo atual."
        : undefined,
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

export async function analisarFinanceiroCfoContaAzul(
  inicio: Date,
  fim: Date,
  projetoId: number,
) {
  const prisma = getComercialPrisma();
  const [pagarFetch, receberFetch, saldos, lastSync, classifs, ajustes, equipesMo] =
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
      listFinanceiroCaClassificacoes(projetoId),
      listFinanceiroCaAjustesManuais(projetoId),
      moEquipeDb.listMoEquipes(projetoId).catch(() => []),
    ]);

  /** Catálogo DRE é opcional — não bloqueia se a API de categorias estiver lenta. */
  const catalogo = new Map<string, CategoriaCa>();

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

  const resumo = resumirCaixa(receberAtivos, pagarAtivos);
  const rubricas = agregarPorRubrica(pagarAtivos);
  const centrosCusto = agregarPorCentroCusto(pagarAtivos);
  const matrizRubricaCentro = agregarMatrizRubricaCentro(pagarAtivos).slice(0, 120);
  const gruposDre = agregarPorGrupoDre(pagarAtivos, rubricas);
  const qualidadeAlocacao = medirQualidadeAlocacao(pagarAtivos);
  const nomesEquipe = Array.from(
    new Set(
      [
        ...equipesMo.map(e => e.nome),
        ...colaboradoresFolha052026().map(c => c.nome),
      ].filter(Boolean),
    ),
  );
  const fornecedores = agregarPorFornecedor(pagarAtivos, {
    excluirPessoal: true,
    nomesEquipe,
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
    saldos.aviso,
    "Rateio detalhado carrega ao abrir cada lançamento (carga rápida da listagem).",
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
