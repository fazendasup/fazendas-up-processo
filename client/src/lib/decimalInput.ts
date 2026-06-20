/** Aceita vírgula ou ponto; converte para número ao salvar/calcular. */
export function parseOptDecimal(s: string): number | null {
  let t = s.trim();
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Permite digitar decimais incompletos (ex.: "16," ou "16."). */
export function isPartialDecimalInput(s: string, integersOnly = false): boolean {
  const t = s.trim();
  if (!t) return true;
  if (integersOnly) return /^\d*$/.test(t);
  if (!/^-?\d*[,.]?\d*$/.test(t)) return false;
  return (t.match(/[,.]/g)?.length ?? 0) <= 1;
}

export function endsWithDecimalSeparator(s: string): boolean {
  const t = s.trim();
  return t.endsWith(",") || t.endsWith(".");
}

export function formatDecimalForInput(value: number, maximumFractionDigits = 6): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
}
