/**
 * Base da API.
 * - Em dev sem VITE_API_URL: usa caminhos relativos (`/trpc`) + proxy do Vite → evita CORS.
 * - Com VITE_API_URL: chamadas diretas (ex.: produção ou API remota).
 */
function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  return "http://localhost:4000";
}

export const API_URL = getApiBaseUrl();
