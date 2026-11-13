/** Entrega B2B: 1 dia útil, sem sábado, domingo ou feriado de Manaus. */

export const MIN_ORDER_REAIS = 300;
export const MIN_ORDER_RECORRENTE_REAIS = 150;
/** Limiar de entrega grátis para pessoa física (abaixo: retirada ou taxa). */
export const MIN_ORDER_PESSOA_REAIS = 200;
/** Taxa de entrega quando o pedido fica abaixo do limiar de entrega grátis. */
export const TAXA_ENTREGA_ABAIXO_MINIMO_REAIS = 20;
/** Conta Azul recusa cobrança Pix/cartão abaixo deste valor. */
export const MIN_COBRANCA_CONTA_AZUL_REAIS = 10;

export type ModalidadeEntrega = "entrega" | "retirada";

/** Taxa de entrega cobrada quando o cliente escolhe entrega abaixo do limiar. */
export function taxaEntregaAbaixoMinimo(
  totalProdutos: number,
  minimoEntregaGratis: number,
  modalidade: ModalidadeEntrega,
): number {
  if (modalidade === "retirada") return 0;
  if (totalProdutos >= minimoEntregaGratis) return 0;
  return TAXA_ENTREGA_ABAIXO_MINIMO_REAIS;
}

/** Acréscimo no total cobrado quando o cliente paga com cartão. */
export const TAXA_CARTAO_PESSOA = 0.05;
export const LEAD_BUSINESS_DAYS = 1;
const TIMEZONE = "America/Manaus";

const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-09-05",
  "2026-09-07",
  "2026-10-12",
  "2026-10-24",
  "2026-11-02",
  "2026-11-15",
  "2026-12-25",
  "2027-01-01",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-04-21",
  "2027-05-01",
  "2027-05-27",
  "2027-09-05",
  "2027-09-07",
  "2027-10-12",
  "2027-10-24",
  "2027-11-02",
  "2027-11-15",
  "2027-12-25",
]);

export function todayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function isBusinessDay(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAYS.has(ymd);
}

function nextBusinessDay(ymd: string): string {
  let cursor = ymd;
  for (let i = 0; i < 21 && !isBusinessDay(cursor); i += 1) {
    cursor = addCalendarDays(cursor, 1);
  }
  return cursor;
}

export function addBusinessDays(ymd: string, businessDays: number): string {
  let cursor = ymd;
  let left = businessDays;
  while (left > 0) {
    cursor = addCalendarDays(cursor, 1);
    if (isBusinessDay(cursor)) left -= 1;
  }
  return cursor;
}

export function earliestDeliveryYmd(now = new Date()): string {
  const today = todayYmd(now);
  const start = isBusinessDay(today) ? today : nextBusinessDay(today);
  return addBusinessDays(start, LEAD_BUSINESS_DAYS);
}

export function upcomingDeliveryDates(now = new Date(), count = 16): string[] {
  const dates: string[] = [];
  let cursor = earliestDeliveryYmd(now);
  while (dates.length < count) {
    if (isBusinessDay(cursor)) dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function entregaPermitida(ymd: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !isBusinessDay(ymd)) return false;
  if (ymd < earliestDeliveryYmd(now)) return false;
  return ymd <= addCalendarDays(todayYmd(now), 70);
}
