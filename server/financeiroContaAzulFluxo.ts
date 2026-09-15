import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import {
  createContaAzulHttp,
  contaAzulGet,
} from "./comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import { AcaoApi } from "./comercial/generated/prisma/index.js";
import {
  agregarPorFornecedor,
  agregarPorSetor,
  detectarOportunidadesCompra,
  gerarInsightsCfo,
  montarFluxoPorSemana,
  normalizarParcela,
  resumirCaixa,
  type ParcelaFinanceiraNorm,
} from "@shared/financeiroCfoInsights";

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
    lista = Array.isArray(res) ? res : (res.itens ?? []);
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
      /* conta sem saldo ou endpoint restrito */
    }
    contas.push({ id: c.id, nome: c.nome?.trim() || c.id, saldo });
  }

  return {
    contas,
    saldoTotal: algumSaldo ? round2(saldoTotal) : null,
  };
}

function mapParcela(
  raw: ParcelaCaRaw,
  tipo: "receber" | "pagar",
): ParcelaFinanceiraNorm | null {
  if (!raw.id) return null;
  const contraparte =
    tipo === "pagar"
      ? raw.fornecedor?.nome ?? null
      : raw.cliente?.nome ?? null;
  return normalizarParcela({
    id: raw.id,
    tipo,
    descricao: raw.descricao,
    valor: Number(raw.total ?? 0),
    valorPago: Number(raw.pago ?? 0),
    valorEmAberto: Number(raw.nao_pago ?? Math.max(0, Number(raw.total ?? 0) - Number(raw.pago ?? 0))),
    status: raw.status,
    dataVencimento: raw.data_vencimento,
    dataPagamento: raw.data_pagamento,
    dataCompetencia: raw.data_competencia,
    categoria: raw.categorias?.[0]?.nome ?? null,
    contraparte,
  });
}

export async function analisarFinanceiroCfoContaAzul(inicio: Date, fim: Date) {
  const prisma = getComercialPrisma();
  const [pagarFetch, receberFetch, saldos, lastSync] = await Promise.all([
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
  ]);

  const pagar = pagarFetch.itens
    .map(i => mapParcela(i, "pagar"))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);
  const receber = receberFetch.itens
    .map(i => mapParcela(i, "receber"))
    .filter((x): x is ParcelaFinanceiraNorm => !!x);

  const resumo = resumirCaixa(receber, pagar);
  const setores = agregarPorSetor(pagar);
  const fornecedores = agregarPorFornecedor(pagar);
  const oportunidadesCompra = detectarOportunidadesCompra(pagar);
  const fluxoSemanas = montarFluxoPorSemana([...receber, ...pagar]);
  const insights = gerarInsightsCfo({
    resumo,
    setores,
    fornecedores,
    oportunidadesCompra,
    saldoContas: saldos.saldoTotal,
  });

  const avisos = [pagarFetch.aviso, receberFetch.aviso, saldos.aviso].filter(
    Boolean,
  ) as string[];

  const economiaPotencial = round2(
    oportunidadesCompra.reduce(
      (s, o) => s + (o.economiaPotencialEstimada ?? 0),
      0,
    ) +
      insights
        .filter(i => i.tipo === "recuperacao" || i.tipo === "setor")
        .reduce((s, i) => s + (i.impactoEstimado ?? 0), 0) *
        0.35,
  );

  return {
    periodo: {
      inicio: isoDateLocal(inicio),
      fim: isoDateLocal(fim),
    },
    resumo,
    setores,
    fornecedores: fornecedores.slice(0, 40),
    oportunidadesCompra,
    fluxoSemanas,
    insights,
    contasFinanceiras: saldos.contas,
    saldoContasTotal: saldos.saldoTotal,
    economiaPotencialEstimada: economiaPotencial,
    contagens: {
      parcelasPagar: pagar.length,
      parcelasReceber: receber.length,
    },
    topPagarEmAberto: [...pagar]
      .filter(p => p.valorEmAberto > 0)
      .sort((a, b) => b.valorEmAberto - a.valorEmAberto)
      .slice(0, 15),
    topReceberEmAberto: [...receber]
      .filter(p => p.valorEmAberto > 0)
      .sort((a, b) => b.valorEmAberto - a.valorEmAberto)
      .slice(0, 15),
    avisos,
    ultimaSyncContaAzul: lastSync?.dataExecucao ?? null,
    ultimaSyncStatus: lastSync?.statusExecucao ?? null,
  };
}
