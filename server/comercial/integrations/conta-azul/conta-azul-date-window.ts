import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";

/**
 * Conta Azul rejeita intervalos data_*_de..ate maiores que 365 dias inclusive.
 * Offset máximo seguro entre as pontas = 364 dias.
 */
export const CA_MAX_INTERVALO_DIAS = 364;

function parseYmd(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T12:00:00-03:00`);
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return diaIsoAmericaSp(d);
}

/** Diferença em dias civis (ate - de). */
export function diasEntreYmd(de: string, ate: string): number {
  const a = parseYmd(de.slice(0, 10)).getTime();
  const b = parseYmd(ate.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Garante de ≤ ate e (ate − de) ≤ 364; se passar, corta o início. */
export function limitarJanelaCa(de: string, ate: string): { de: string; ate: string } {
  let d = de.slice(0, 10);
  let a = ate.slice(0, 10);
  if (d > a) [d, a] = [a, d];
  if (diasEntreYmd(d, a) > CA_MAX_INTERVALO_DIAS) {
    d = addDaysYmd(a, -CA_MAX_INTERVALO_DIAS);
  }
  return { de: d, ate: a };
}

/** Parte [de, ate] em janelas ≤364 dias (varreduras amplas exigidas pela API). */
export function janelasContaAzul(de: string, ate: string): Array<{ de: string; ate: string }> {
  let d = de.slice(0, 10);
  let a = ate.slice(0, 10);
  if (d > a) [d, a] = [a, d];
  const out: Array<{ de: string; ate: string }> = [];
  let cursor = d;
  while (cursor <= a) {
    const fimChunk = addDaysYmd(cursor, CA_MAX_INTERVALO_DIAS);
    const fim = fimChunk < a ? fimChunk : a;
    out.push({ de: cursor, ate: fim });
    if (fim >= a) break;
    cursor = addDaysYmd(fim, 1);
  }
  return out.length > 0 ? out : [{ de: d, ate: a }];
}

/** Mensagem amigável quando a Conta Azul recusa período / auth. */
export function mensagemErroContaAzulFinanceiro(error: unknown, fallback: string): string {
  const detalhe = error instanceof Error ? error.message : String(error ?? "");
  if (/365|intervalo|data_vencimento|data_pagamento|per[ií]odo/i.test(detalhe)) {
    return "Não foi possível carregar os pagamentos: o Conta Azul recusou o período consultado. Tente de novo em instantes.";
  }
  if (/não conectado|nao conectado|access.?token|unauthorized|\b401\b/i.test(detalhe)) {
    return "O financeiro ainda não está conectado ao Conta Azul. Tente de novo em instantes ou fale com a fazenda.";
  }
  return fallback;
}
