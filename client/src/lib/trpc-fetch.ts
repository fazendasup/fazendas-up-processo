/** Timeout padrão das chamadas tRPC (queries rápidas). */
export const TRPC_DEFAULT_TIMEOUT_MS = 25_000;

/** Sync Conta Azul e operações longas (30 min). */
export const TRPC_LONG_TIMEOUT_MS =
  Number(import.meta.env.VITE_TRPC_LONG_TIMEOUT_MS) || 30 * 60_000;

const LONG_TRPC_PATHS = new Set([
  "comercial.integracoes.sincronizarContaAzul",
  "comercial.integracoes.aplicarInteligenciaComercial",
  "comercial.pedidos.copiarSemanaAnterior",
  "comercial.relatorios.resumo",
  "financeiroCfo.analise",
  "financeiroCfo.dashboard",
  "financeiroCfo.projecaoDesembolso",
  "financeiroCfo.comparativoProjecao",
]);

export function isLongRunningTrpcOp(path: string): boolean {
  return LONG_TRPC_PATHS.has(path);
}

export function createTrpcFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const ctrl = new AbortController();
    const timeoutReason = new DOMException(
      "A consulta passou do tempo limite e foi interrompida.",
      "TimeoutError",
    );
    const t = setTimeout(() => ctrl.abort(timeoutReason), timeoutMs);
    const upstream = init?.signal;
    if (upstream) {
      const repassar = () => {
        const reason = upstream.reason;
        ctrl.abort(
          reason instanceof Error
            ? reason
            : new DOMException("The operation was aborted.", "AbortError"),
        );
      };
      if (upstream.aborted) repassar();
      else upstream.addEventListener("abort", repassar, { once: true });
    }
    return globalThis
      .fetch(input, {
        ...(init ?? {}),
        credentials: "include",
        signal: ctrl.signal,
      })
      .finally(() => clearTimeout(t));
  };
}

export function isTrpcAbortError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return m.includes("abort") || m.includes("aborted");
}
