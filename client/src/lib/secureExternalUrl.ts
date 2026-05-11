/**
 * Em página servida por HTTPS, carregar `http://...` gera *mixed content* e o browser
 * mostra aviso (“partes do site não são seguras”). Use isto antes de injetar scripts ou pedidos a URLs externas.
 */
export function isInsecureHttpOnHttpsPage(url: string): boolean {
  if (typeof globalThis === "undefined") return false;
  const loc = globalThis.location;
  if (!loc || loc.protocol !== "https:") return false;
  try {
    return new URL(url.trim()).protocol === "http:";
  } catch {
    return false;
  }
}
