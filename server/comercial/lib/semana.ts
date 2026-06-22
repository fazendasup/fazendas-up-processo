/**
 * Utilitários de semana operacional (segunda → domingo) para o fechamento semanal.
 *
 * O sistema de pedidos operacionais entra em produção em 01/06/2026 (uma segunda-feira).
 * Semanas anteriores ao go-live não contam para o gate de fechamento.
 */

/** Início da operação de pedidos: segunda-feira, 01/06/2026 00:00 (horário local). */
export const GO_LIVE_PEDIDOS = new Date(2026, 5, 1, 0, 0, 0, 0);

/** Segunda-feira 00:00:00.000 da semana que contém `d`. */
export function inicioSemana(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // getDay(): 0 = domingo, 1 = segunda ... 6 = sábado. Queremos voltar até segunda.
  const diaSemana = out.getDay();
  const diff = (diaSemana + 6) % 7; // segunda → 0, domingo → 6
  out.setDate(out.getDate() - diff);
  return out;
}

/** Domingo 23:59:59.999 da semana que contém `d`. */
export function fimSemana(d: Date): Date {
  const inicio = inicioSemana(d);
  const out = new Date(inicio);
  out.setDate(out.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Adiciona `n` semanas a uma data (preservando o horário). */
export function adicionarSemanas(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n * 7);
  return out;
}

/** Início da semana do go-live (a primeira semana que o gate considera). */
export function inicioSemanaGoLive(): Date {
  return inicioSemana(GO_LIVE_PEDIDOS);
}

/** Semana piloto de go-live (01/06–07/06/2026): fechamento sem exigir conciliação CA. */
export function isSemanaGoLive(semanaInicio: Date): boolean {
  return inicioSemana(semanaInicio).getTime() === inicioSemanaGoLive().getTime();
}

export function semanaIgnoraConciliacaoFechamento(semanaInicio: Date): boolean {
  return isSemanaGoLive(semanaInicio);
}

/**
 * Lista os inícios de semana (segundas) no intervalo `[de, ate)`, a partir do go-live.
 * Útil para varrer semanas anteriores à semana alvo em busca de pendências.
 */
export function semanasEntre(de: Date, ate: Date): Date[] {
  const out: Date[] = [];
  let cursor = inicioSemana(de);
  const limite = inicioSemana(ate);
  while (cursor.getTime() < limite.getTime()) {
    out.push(new Date(cursor));
    cursor = adicionarSemanas(cursor, 1);
  }
  return out;
}

/** Rótulo curto da semana (ex.: "02/06–08/06"). */
export function rotuloSemana(inicio: Date): string {
  const fim = fimSemana(inicio);
  const fmt = (x: Date) =>
    `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(inicio)}–${fmt(fim)}`;
}

/** Segunda-feira da semana imediatamente anterior à semana que contém `semanaAlvoInicio`. */
export function semanaAnteriorInicio(semanaAlvoInicio: Date): Date {
  return adicionarSemanas(semanaAlvoInicio, -1);
}

/** Intervalo (seg–dom) da semana passada em relação ao dia `d`. */
export function intervaloSemanaAnterior(d: Date): { inicio: Date; fim: Date } {
  const inicio = semanaAnteriorInicio(inicioSemana(d));
  return { inicio, fim: fimSemana(inicio) };
}
