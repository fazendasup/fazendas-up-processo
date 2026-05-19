/** Rotas do módulo comercial (prefixo `/comercial` no supervisório). */
export function comercialPath(
  path: string,
  search?: Record<string, string | undefined>,
): string {
  const normalized = path.startsWith("/comercial")
    ? path
    : `/comercial${path.startsWith("/") ? path : `/${path}`}`;

  if (!search) return normalized;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null && v !== "") qs.set(k, v);
  }
  const q = qs.toString();
  return q ? `${normalized}?${q}` : normalized;
}
