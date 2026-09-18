/**
 * Saldo bancário consolidado do dashboard financeiro.
 * Conta Azul API de saldo-atual é ignorada (costuma vir errada).
 * O usuário informa saldo inicial + data; o sistema aplica baixas de
 * TODAS as contas (recebido − pago) a partir dessa data.
 */
import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import {
  createContaAzulHttp,
  contaAzulGet,
} from "./comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import { getFinanceiroCaConfig } from "./financeiroConfigDb";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type BuscaParcelasResponse = {
  itens?: Array<{ id?: string; pago?: number }>;
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

async function somarBaixasTodasContasDesde(
  dataDe: string,
): Promise<{ recebido: number; pago: number; aviso?: string }> {
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

  const somarPath = async (pathBase: string): Promise<number> => {
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
        const pago = Number(item.pago ?? 0);
        if (Number.isFinite(pago) && pago > 0) total += pago;
      }
      if (batch.length < tamanho) break;
    }
    return round2(total);
  };

  const [recebido, pago] = await Promise.all([
    somarPath("/v1/financeiro/eventos-financeiros/contas-a-receber/buscar"),
    somarPath("/v1/financeiro/eventos-financeiros/contas-a-pagar/buscar"),
  ]);
  return { recebido, pago };
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

  const mov = await somarBaixasTodasContasDesde(saldoInicialData);
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
