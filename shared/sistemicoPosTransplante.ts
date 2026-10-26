/**
 * Infinito/Cercobin atuam na caixa (solução compartilhada), não no andar.
 * Com transplantio semanal escalonado, um lote novo precisa de cobertura cedo
 * na fase — mesmo que a cadência de 10 dias da caixa ainda não tenha vencido.
 */

import { adicionarDiasYmd, ymdCalendario } from "./cicloSequencia";

/** Dias mínimos desde o último Infinito na caixa para reagendar por lote novo. */
export const MIN_DIAS_INFINITO_POS_TRANSPLANTE = 7;

export type AgendaSistemicoPosTransplante = {
  /** YYYY-MM-DD para Infinito nesta caixa, ou null se não precisa. */
  infinitoYmd: string | null;
  /** YYYY-MM-DD para Cercobin (≥3 após Infinito agendado/último), ou null. */
  cercobinYmd: string | null;
};

/**
 * Decide se o transplantio para veg/mat puxa Infinito (e Cercobin) na caixa destino.
 * Respeita folga do Thyper (≥1 dia) e não reaplica Infinito se ainda está fresco.
 */
export function agendaSistemicoPosTransplante(input: {
  hojeYmd: string;
  faseDestino: string;
  ultimaInfinitoYmd?: string | Date | null;
  ultimaCercobinYmd?: string | Date | null;
  ultimaThyperYmd?: string | Date | null;
  /** Já existe agenda futura de Infinito nesta caixa. */
  agendaInfinitoYmd?: string | Date | null;
}): AgendaSistemicoPosTransplante {
  const fase = input.faseDestino.trim().toLowerCase();
  if (fase !== "vegetativa" && fase !== "maturacao") {
    return { infinitoYmd: null, cercobinYmd: null };
  }

  const ultimaInf = ymdCalendario(input.ultimaInfinitoYmd ?? null);
  const agendaInf = ymdCalendario(input.agendaInfinitoYmd ?? null);
  if (agendaInf && agendaInf >= input.hojeYmd) {
    // Já está puxado para hoje/futuro (ex.: vazamento / operação manual).
    const cercobin = cercobinAposInfinito(
      agendaInf,
      input.hojeYmd,
      ymdCalendario(input.ultimaCercobinYmd ?? null),
    );
    return { infinitoYmd: null, cercobinYmd: cercobin };
  }

  if (ultimaInf) {
    const liberado = adicionarDiasYmd(ultimaInf, MIN_DIAS_INFINITO_POS_TRANSPLANTE);
    if (input.hojeYmd < liberado) {
      return { infinitoYmd: null, cercobinYmd: null };
    }
  }

  let infinitoYmd = input.hojeYmd;
  const thyper = ymdCalendario(input.ultimaThyperYmd ?? null);
  if (thyper) {
    const minAposThyper = adicionarDiasYmd(thyper, 1);
    if (infinitoYmd < minAposThyper) infinitoYmd = minAposThyper;
  }

  const cercobinYmd = cercobinAposInfinito(
    infinitoYmd,
    input.hojeYmd,
    ymdCalendario(input.ultimaCercobinYmd ?? null),
  );

  return { infinitoYmd, cercobinYmd };
}

function cercobinAposInfinito(
  infinitoYmd: string,
  hojeYmd: string,
  ultimaCercobinYmd: string | null,
): string | null {
  const candidata = adicionarDiasYmd(infinitoYmd, 3);
  if (ultimaCercobinYmd) {
    const liberado = adicionarDiasYmd(ultimaCercobinYmd, MIN_DIAS_INFINITO_POS_TRANSPLANTE);
    if (candidata < liberado) return null;
  }
  return candidata < hojeYmd ? hojeYmd : candidata;
}
