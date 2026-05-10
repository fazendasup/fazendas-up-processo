/**
 * Identifica slugs de caixas criadas pelo `admin.seed` (cenário inicial).
 * Caixas criadas ao adicionar torres em Config usam slugs tipo `ca-<nome>-<timestamp>`.
 */
export function isCaixaSlugDoSeedInicial(slug: string): boolean {
  if (slug === "ca-mudas-1") return true;
  if (/^ca-veg-[123]$/.test(slug)) return true;
  if (/^ca-mat-[1-5]$/.test(slug)) return true;
  return false;
}
