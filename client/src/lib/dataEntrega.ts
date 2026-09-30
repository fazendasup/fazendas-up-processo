/**
 * Dia civil da entrega no calendário do servidor (meia-noite UTC).
 * Um navegador a oeste de UTC mostraria o dia anterior se usasse o fuso local.
 */
export function isoDataEntrega(v: string | Date): string {
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}T/.test(v) && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(v)) {
      return v.slice(0, 10);
    }
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** dd/mm do dia civil da entrega. */
export function fmtDataEntrega(v: string | Date): string {
  const iso = isoDataEntrega(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}`;
}
