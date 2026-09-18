/**
 * Saldos bancários do dashboard financeiro.
 * Conta Azul PJ = carteira/cobranças CA (não soma Bradesco/investimentos).
 * Bradesco = API ao vivo ou saldo inicial + baixas CA da conta.
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

type ContaFinanceiraRaw = {
  id?: string;
  nome?: string;
  tipo?: string;
  banco?: string;
  ativo?: boolean;
};

type BuscaParcelasResponse = {
  itens?: Array<{ id?: string; pago?: number }>;
  itens_totais?: number;
};

export type ContaSaldoGrupo = "conta_azul" | "bradesco" | "outro";

export type ContaSaldoDetalhe = {
  id: string;
  nome: string;
  tipo: string | null;
  banco: string | null;
  saldo: number | null;
  grupo: ContaSaldoGrupo;
};

export type SaldosBancariosPayload = {
  saldoContaAzul: number | null;
  saldoBradesco: number | null;
  saldoBradescoFonte: "api" | "manual_mais_movimentos" | null;
  contas: ContaSaldoDetalhe[];
  bradescoConfig: {
    saldoInicial: number | null;
    saldoInicialData: string | null;
    contaId: string | null;
  };
  aviso?: string;
};

function classificarContaFinanceira(c: ContaFinanceiraRaw): ContaSaldoGrupo {
  const banco = String(c.banco ?? "").toUpperCase();
  const tipo = String(c.tipo ?? "").toUpperCase();
  const nome = String(c.nome ?? "").toLowerCase();
  if (banco === "BRADESCO" || nome.includes("bradesco")) return "bradesco";
  if (
    tipo === "COBRANCAS_CONTA_AZUL" ||
    tipo === "RECEBA_FACIL_CARTAO" ||
    tipo === "MEIOS_RECEBIMENTO" ||
    nome.includes("conta azul") ||
    nome.includes("saldo disponível") ||
    nome.includes("saldo disponivel")
  ) {
    return "conta_azul";
  }
  return "outro";
}

async function somarBaixasContaDesde(
  contaId: string,
  dataDe: string,
): Promise<{ recebido: number; pago: number }> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) return { recebido: 0, pago: 0 };
  const http = createContaAzulHttp(env, cred.accessToken);
  const hoje = diaIsoAmericaSp();
  const anoDe = Math.max(2000, Number(dataDe.slice(0, 4)) - 2);
  const anoAte = Number(hoje.slice(0, 4)) + 2;
  const vencAmploDe = `${anoDe}-01-01`;
  const vencAmploAte = `${anoAte}-12-31`;

  const somarPath = async (pathBase: string): Promise<number> => {
    let total = 0;
    const tamanho = 200;
    for (let pagina = 1; pagina <= 40; pagina++) {
      const qs = new URLSearchParams({
        pagina: String(pagina),
        tamanho_pagina: String(tamanho),
        data_vencimento_de: vencAmploDe,
        data_vencimento_ate: vencAmploAte,
        data_pagamento_de: dataDe,
        data_pagamento_ate: hoje,
        ids_contas_financeiras: contaId,
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

async function listarContasComSaldo(): Promise<{
  contas: ContaSaldoDetalhe[];
  aviso?: string;
}> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    return { contas: [], aviso: "Conta Azul não conectado." };
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  let lista: ContaFinanceiraRaw[] = [];
  try {
    const res = await contaAzulGet<
      { itens?: ContaFinanceiraRaw[] } | ContaFinanceiraRaw[]
    >(http, "/v1/conta-financeira?tamanho_pagina=100&apenas_ativo=true");
    lista = Array.from(Array.isArray(res) ? res : (res.itens ?? []));
  } catch (e) {
    return {
      contas: [],
      aviso:
        e instanceof Error ? e.message : "Falha ao listar contas financeiras.",
    };
  }

  const base = lista.filter(c => c.id && c.ativo !== false).slice(0, 40);
  const contas: ContaSaldoDetalhe[] = [];
  const concurrency = 5;
  for (let i = 0; i < base.length; i += concurrency) {
    const chunk = base.slice(i, i + concurrency);
    const part = await Promise.all(
      chunk.map(async c => {
        const id = c.id!;
        const nome = c.nome?.trim() || id;
        const grupo = classificarContaFinanceira(c);
        try {
          const sal = await contaAzulGet<{ saldo_atual?: number }>(
            http,
            `/v1/conta-financeira/${encodeURIComponent(id)}/saldo-atual`,
          );
          const n = Number(sal?.saldo_atual);
          return {
            id,
            nome,
            tipo: c.tipo ?? null,
            banco: c.banco ?? null,
            saldo: Number.isFinite(n) ? round2(n) : null,
            grupo,
          };
        } catch {
          return {
            id,
            nome,
            tipo: c.tipo ?? null,
            banco: c.banco ?? null,
            saldo: null as number | null,
            grupo,
          };
        }
      }),
    );
    contas.push(...part);
  }
  return { contas };
}

export async function buscarSaldosBancarios(
  projetoId: number,
): Promise<SaldosBancariosPayload> {
  const config = await getFinanceiroCaConfig(projetoId);
  const raw = await listarContasComSaldo();

  const contaAzulIdConfig = config?.contaAzulContaId?.trim() || null;
  const bradescoIdConfig = config?.bradescoContaId?.trim() || null;

  let contasCa = raw.contas.filter(c => c.grupo === "conta_azul");
  if (contaAzulIdConfig) {
    const picked = raw.contas.filter(c => c.id === contaAzulIdConfig);
    if (picked.length) contasCa = picked;
  } else {
    const preferidas = contasCa.filter(
      c =>
        /saldo\s*dispon/i.test(c.nome) ||
        c.tipo === "COBRANCAS_CONTA_AZUL" ||
        c.tipo === "RECEBA_FACIL_CARTAO",
    );
    if (preferidas.length) contasCa = preferidas;
  }

  let contasBrad = raw.contas.filter(c => c.grupo === "bradesco");
  if (bradescoIdConfig) {
    const picked = raw.contas.filter(c => c.id === bradescoIdConfig);
    if (picked.length) contasBrad = picked;
  }

  const saldoContaAzul =
    contasCa.filter(c => c.saldo != null).length > 0
      ? round2(contasCa.reduce((s, c) => s + (c.saldo ?? 0), 0))
      : null;

  const saldoInicialRaw = config?.bradescoSaldoInicial;
  const saldoInicial =
    saldoInicialRaw != null && String(saldoInicialRaw).trim() !== ""
      ? Number(saldoInicialRaw)
      : null;
  const saldoInicialData = config?.bradescoSaldoInicialData?.trim() || null;
  const bradescoContaId = contasBrad[0]?.id ?? bradescoIdConfig;

  let saldoBradesco: number | null = null;
  let saldoBradescoFonte: SaldosBancariosPayload["saldoBradescoFonte"] = null;

  if (
    bradescoContaId &&
    saldoInicial != null &&
    Number.isFinite(saldoInicial) &&
    saldoInicialData &&
    /^\d{4}-\d{2}-\d{2}$/.test(saldoInicialData)
  ) {
    const mov = await somarBaixasContaDesde(bradescoContaId, saldoInicialData);
    saldoBradesco = round2(saldoInicial + mov.recebido - mov.pago);
    saldoBradescoFonte = "manual_mais_movimentos";
  } else if (contasBrad.some(c => c.saldo != null)) {
    saldoBradesco = round2(contasBrad.reduce((s, c) => s + (c.saldo ?? 0), 0));
    saldoBradescoFonte = "api";
  }

  const avisos: string[] = [];
  if (raw.aviso) avisos.push(raw.aviso);
  if (saldoContaAzul == null && contasCa.length === 0) {
    avisos.push("Nenhuma conta Conta Azul (cobranças/carteira) encontrada.");
  }

  return {
    saldoContaAzul,
    saldoBradesco,
    saldoBradescoFonte,
    contas: raw.contas,
    bradescoConfig: {
      saldoInicial:
        saldoInicial != null && Number.isFinite(saldoInicial)
          ? saldoInicial
          : null,
      saldoInicialData,
      contaId: bradescoContaId,
    },
    aviso: avisos.length ? avisos.join(" ") : undefined,
  };
}
