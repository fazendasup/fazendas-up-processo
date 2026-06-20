import { inferirGrupoCustoDeTextoContaAzul } from "@shared/custosRentabilidadeOverhead";
import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import { createContaAzulHttp, contaAzulGet } from "./comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import { AcaoApi } from "./comercial/generated/prisma/index.js";

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type ContaAzulParcelaPagar = {
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
};

type ContaAzulBuscaPagarResponse = {
  itens?: ContaAzulParcelaPagar[];
  itens_totais?: number;
};

export type PagamentoContaAzulOverhead = {
  contaAzulParcelaId: string;
  rubrica: string;
  descricao: string | null;
  grupo: string;
  valor: number;
  dataPagamento: string | null;
  dataCompetencia: string | null;
  categoriaContaAzul: string | null;
  fornecedor: string | null;
};

export type PagamentosContaAzulResultado = {
  parcelasPagas: number;
  valorTotal: number;
  itens: PagamentoContaAzulOverhead[];
  ultimaSyncContaAzul: Date | null;
  ultimaSyncStatus: string | null;
  aviso?: string;
};

function montarRubrica(item: ContaAzulParcelaPagar): string {
  const cat = item.categorias?.[0]?.nome?.trim();
  const desc = item.descricao?.trim();
  if (cat && desc && !desc.toLowerCase().includes(cat.toLowerCase())) return `${cat} — ${desc}`;
  return cat || desc || "Despesa Conta Azul";
}

function montarDescricao(item: ContaAzulParcelaPagar): string | null {
  const parts: string[] = [];
  if (item.fornecedor?.nome) parts.push(item.fornecedor.nome);
  if (item.centros_custo?.[0]?.nome) parts.push(`CC: ${item.centros_custo[0].nome}`);
  if (item.data_competencia) parts.push(`Comp.: ${item.data_competencia}`);
  return parts.length ? parts.join(" · ") : null;
}

function parcelaFoiPagaNoPeriodo(item: ContaAzulParcelaPagar, inicio: Date, fim: Date): boolean {
  const pago = Number(item.pago ?? 0);
  if (!Number.isFinite(pago) || pago <= 0) return false;
  const dp = item.data_pagamento?.slice(0, 10);
  if (!dp) return true;
  const dt = new Date(`${dp}T12:00:00`);
  return dt >= inicio && dt <= fim;
}

async function fetchTodasParcelasPagar(
  inicio: Date,
  fim: Date,
): Promise<{ itens: ContaAzulParcelaPagar[]; aviso?: string }> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error("Conta Azul não conectado. Configure em Comercial → Configurações.");
  }

  const http = createContaAzulHttp(env, cred.accessToken);
  const vencDe = isoDateLocal(inicio);
  const vencAte = isoDateLocal(fim);
  const pagDe = isoDateLocal(inicio);
  const pagAte = isoDateLocal(fim);

  const itens: ContaAzulParcelaPagar[] = [];
  const tamanho = 200;
  const maxPaginas = 50;
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
    let res: ContaAzulBuscaPagarResponse;
    try {
      res = await contaAzulGet<ContaAzulBuscaPagarResponse>(
        http,
        `/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar?${qs.toString()}`,
      );
    } catch (e) {
      if (pagina === 1 && /\(400\)/.test(e instanceof Error ? e.message : "")) {
        const qs2 = new URLSearchParams({
          pagina: String(pagina),
          tamanho_pagina: String(tamanho),
          data_vencimento_de: vencDe,
          data_vencimento_ate: vencAte,
        });
        res = await contaAzulGet<ContaAzulBuscaPagarResponse>(
          http,
          `/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar?${qs2.toString()}`,
        );
        aviso =
          "Filtro por data de pagamento indisponível; listagem por vencimento — confira itens antes de incluir.";
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

export async function buscarPagamentosContaAzulPorPeriodo(
  inicio: Date,
  fim: Date,
): Promise<PagamentosContaAzulResultado> {
  const prisma = getComercialPrisma();
  const [fetch, lastSync] = await Promise.all([
    fetchTodasParcelasPagar(inicio, fim),
    prisma.execucaoApi.findFirst({
      where: { acaoApi: AcaoApi.SYNC_CA },
      orderBy: { dataExecucao: "desc" },
      select: { dataExecucao: true, statusExecucao: true },
    }),
  ]);

  const map = new Map<string, PagamentoContaAzulOverhead>();
  for (const item of fetch.itens) {
    if (!item.id) continue;
    if (!parcelaFoiPagaNoPeriodo(item, inicio, fim)) continue;
    const valor = round2(Number(item.pago ?? item.total ?? 0));
    if (valor <= 0) continue;

    const rubrica = montarRubrica(item);
    const textoGrupo = [rubrica, item.categorias?.map((c) => c.nome).join(" "), item.fornecedor?.nome]
      .filter(Boolean)
      .join(" ");
    const mapped: PagamentoContaAzulOverhead = {
      contaAzulParcelaId: item.id,
      rubrica,
      descricao: montarDescricao(item),
      grupo: inferirGrupoCustoDeTextoContaAzul(textoGrupo),
      valor,
      dataPagamento: item.data_pagamento?.slice(0, 10) ?? null,
      dataCompetencia: item.data_competencia?.slice(0, 10) ?? null,
      categoriaContaAzul: item.categorias?.[0]?.nome ?? null,
      fornecedor: item.fornecedor?.nome ?? null,
    };
    map.set(item.id, mapped);
  }

  const itens = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  const valorTotal = round2(itens.reduce((s, i) => s + i.valor, 0));

  return {
    parcelasPagas: itens.length,
    valorTotal,
    itens,
    ultimaSyncContaAzul: lastSync?.dataExecucao ?? null,
    ultimaSyncStatus: lastSync?.statusExecucao ?? null,
    aviso: fetch.aviso,
  };
}
