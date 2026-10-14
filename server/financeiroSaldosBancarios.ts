/**
 * Saldo bancário consolidado do dashboard financeiro.
 * Conta Azul API de saldo-atual é ignorada (costuma vir errada).
 * O usuário informa saldo inicial + data. A partir daí o sistema soma
 * o caixa do Bradesco e da Conta Azul IP:
 * baixas recebidas − baixas pagas, sem PIX entre essas contas,
 * e abate transferência que sai delas (cartão, Inter e as demais).
 * Lançamento que existe só no extrato, sem título nem transferência,
 * não entra — a fatura do cartão precisa ser informada como pagamento
 * da conta corrente para o cartão.
 */
import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import {
  createContaAzulHttp,
  contaAzulGet,
} from "./comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import {
  ehRecebimentoDaPropriaEmpresa,
  ehTransferenciaEntreContas,
  efeitoTransferenciaNoCaixaConsolidado,
} from "@shared/financeiroProjecaoDesembolso";
import { getFinanceiroCaConfig } from "./financeiroConfigDb";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type ParcelaBuscaSaldo = {
  id?: string;
  pago?: number;
  descricao?: string;
  categorias?: Array<{ nome?: string }>;
};

type BuscaParcelasResponse = {
  itens?: ParcelaBuscaSaldo[];
  itens_totais?: number;
};

type LadoSaldo = "rec" | "pag";

/** PIX entre Bradesco e Conta Azul não muda o caixa dos dois juntos. */
function parcelaEntraNoSaldo(item: ParcelaBuscaSaldo, lado: LadoSaldo): boolean {
  const pago = Number(item.pago ?? 0);
  if (!Number.isFinite(pago) || pago <= 0) return false;
  const descricao = item.descricao ?? "";
  if (lado === "rec" && ehRecebimentoDaPropriaEmpresa(descricao)) return false;
  if (lado !== "pag") return true;
  const categoria =
    item.categorias
      ?.map(c => c.nome?.trim())
      .filter(Boolean)
      .join(" ") ?? "";
  return !ehTransferenciaEntreContas(descricao, categoria);
}

type TransferenciaCaixa = {
  valor?: number;
  origem?: { conta_financeira?: { nome?: string } };
  destino?: { conta_financeira?: { nome?: string } };
};

type TransferenciasResponse = {
  itens?: TransferenciaCaixa[];
  itens_totais?: number;
};

export type SaldosBancariosPayload = {
  /** Saldo consolidado: inicial + recebido − pago (todas as contas). */
  saldoBancario: number | null;
  /** Alias legado do dashboard (mesmo valor). */
  saldoContaAzul: number | null;
  saldoBradesco: number | null;
  saldoBradescoFonte: "manual_mais_movimentos" | null;
  movimentos: {
    recebido: number;
    pago: number;
  } | null;
  contas: Array<{
    id: string;
    nome: string;
    saldo: number | null;
    grupo: "conta_azul" | "bradesco" | "outro";
    tipo: string | null;
    banco: string | null;
  }>;
  /** Config da âncora (campos legados bradesco* no banco). */
  bradescoConfig: {
    saldoInicial: number | null;
    saldoInicialData: string | null;
    contaId: string | null;
  };
  aviso?: string;
};

const baixasDesdeCache = new Map<
  string,
  { at: number; value: { recebido: number; pago: number; aviso?: string } }
>();
const BAIXAS_DESDE_TTL_MS = 3 * 60_000;

async function somarBaixasTodasContasDesde(
  dataDe: string,
  force = false,
): Promise<{ recebido: number; pago: number; aviso?: string }> {
  const cached = baixasDesdeCache.get(dataDe);
  if (!force && cached && Date.now() - cached.at < BAIXAS_DESDE_TTL_MS) {
    return cached.value;
  }
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    return { recebido: 0, pago: 0, aviso: "Conta Azul não conectado." };
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const hoje = diaIsoAmericaSp();
  const anoDe = Math.max(2000, Number(dataDe.slice(0, 4)) - 2);
  const anoAte = Number(hoje.slice(0, 4)) + 2;
  const vencAmploDe = `${anoDe}-01-01`;
  const vencAmploAte = `${anoAte}-12-31`;

  const somarPath = async (pathBase: string, lado: LadoSaldo): Promise<number> => {
    let total = 0;
    const tamanho = 200;
    for (let pagina = 1; pagina <= 80; pagina++) {
      const qs = new URLSearchParams({
        pagina: String(pagina),
        tamanho_pagina: String(tamanho),
        data_vencimento_de: vencAmploDe,
        data_vencimento_ate: vencAmploAte,
        data_pagamento_de: dataDe,
        data_pagamento_ate: hoje,
      });
      let res: BuscaParcelasResponse;
      try {
        res = await contaAzulGet<BuscaParcelasResponse>(
          http,
          `${pathBase}?${qs.toString()}`,
        );
      } catch {
        break;
      }
      const batch = res.itens ?? [];
      for (const item of batch) {
        if (!parcelaEntraNoSaldo(item, lado)) continue;
        total += Number(item.pago ?? 0);
      }
      if (batch.length < tamanho) break;
    }
    return round2(total);
  };

  const somarTransferenciasForaDoCaixa = async (): Promise<{
    saida: number;
    entrada: number;
    aviso?: string;
  }> => {
    let saida = 0;
    let entrada = 0;
    const tamanho = 200;
    try {
      for (let pagina = 1; pagina <= 40; pagina++) {
        const qs = new URLSearchParams({
          pagina: String(pagina),
          tamanho_pagina: String(tamanho),
          data_inicio: dataDe,
          data_fim: hoje,
        });
        const res = await contaAzulGet<TransferenciasResponse>(
          http,
          `/v1/financeiro/transferencias?${qs.toString()}`,
        );
        const batch = res.itens ?? [];
        for (const item of batch) {
          const valor = Number(item.valor ?? 0);
          if (!Number.isFinite(valor) || valor === 0) continue;
          const efeito = efeitoTransferenciaNoCaixaConsolidado(
            item.origem?.conta_financeira?.nome,
            item.destino?.conta_financeira?.nome,
          );
          if (efeito === "saida") saida += Math.abs(valor);
          else if (efeito === "entrada") entrada += Math.abs(valor);
        }
        if (batch.length < tamanho) break;
      }
    } catch {
      return {
        saida: 0,
        entrada: 0,
        aviso:
          "Não foi possível ler as transferências para cartão e outras contas.",
      };
    }
    return { saida: round2(saida), entrada: round2(entrada) };
  };

  const [recebidoTitulos, pagoTitulos, transferencias] = await Promise.all([
    somarPath(
      "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar",
      "rec",
    ),
    somarPath("/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar", "pag"),
    somarTransferenciasForaDoCaixa(),
  ]);
  const value = {
    recebido: round2(recebidoTitulos + transferencias.entrada),
    pago: round2(pagoTitulos + transferencias.saida),
    aviso: transferencias.aviso,
  };
  baixasDesdeCache.set(dataDe, { at: Date.now(), value });
  return value;
}

function lerSaldoInicialConfig(config: Awaited<ReturnType<typeof getFinanceiroCaConfig>>): {
  saldoInicial: number | null;
  saldoInicialData: string | null;
} {
  // Prefer campos novos; fallback nos legados bradesco*.
  const raw =
    config?.saldoBancarioInicial ?? config?.bradescoSaldoInicial ?? null;
  const dataRaw =
    config?.saldoBancarioInicialData?.trim() ||
    config?.bradescoSaldoInicialData?.trim() ||
    null;
  const saldoInicial =
    raw != null && String(raw).trim() !== "" ? Number(raw) : null;
  return {
    saldoInicial:
      saldoInicial != null && Number.isFinite(saldoInicial)
        ? saldoInicial
        : null,
    saldoInicialData:
      dataRaw && /^\d{4}-\d{2}-\d{2}$/.test(dataRaw) ? dataRaw : null,
  };
}

export async function buscarSaldosBancarios(
  projetoId: number,
  opts?: { force?: boolean },
): Promise<SaldosBancariosPayload> {
  const config = await getFinanceiroCaConfig(projetoId);
  const { saldoInicial, saldoInicialData } = lerSaldoInicialConfig(config);

  const bradescoConfig = {
    saldoInicial,
    saldoInicialData,
    contaId: null as string | null,
  };

  if (saldoInicial == null || !saldoInicialData) {
    return {
      saldoBancario: null,
      saldoContaAzul: null,
      saldoBradesco: null,
      saldoBradescoFonte: null,
      movimentos: null,
      contas: [],
      bradescoConfig,
      aviso:
        "Informe o saldo bancário inicial e a data âncora. O sistema abate as movimentações de todas as contas a partir dessa data.",
    };
  }

  const mov = await somarBaixasTodasContasDesde(saldoInicialData, opts?.force === true);
  const saldoBancario = round2(saldoInicial + mov.recebido - mov.pago);

  return {
    saldoBancario,
    saldoContaAzul: saldoBancario,
    saldoBradesco: null,
    saldoBradescoFonte: "manual_mais_movimentos",
    movimentos: { recebido: mov.recebido, pago: mov.pago },
    contas: [],
    bradescoConfig,
    aviso: mov.aviso,
  };
}
