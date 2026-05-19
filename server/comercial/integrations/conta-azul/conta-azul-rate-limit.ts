/** Intervalo mínimo entre chamadas HTTP à API Conta Azul (evita 429). */
export function contaAzulMinIntervalMs(): number {
  const n = Number(process.env.CONTA_AZUL_API_MIN_INTERVAL_MS ?? 350);
  return Number.isFinite(n) && n >= 0 ? n : 350;
}

let chain: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serializa requisições e respeita intervalo mínimo global. */
export async function contaAzulThrottle(): Promise<void> {
  const minInterval = contaAzulMinIntervalMs();
  const prev = chain;
  let release!: () => void;
  chain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    const wait = Math.max(0, lastRequestAt + minInterval - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  } finally {
    release();
  }
}

/** Lê Retry-After (segundos ou HTTP-date) em respostas 429. */
export function retryAfterMsFromAxios(headers: Record<string, unknown> | undefined): number | null {
  if (!headers) return null;
  const raw = headers["retry-after"] ?? headers["Retry-After"];
  if (raw == null) return null;
  const s = String(raw).trim();
  const sec = Number(s);
  if (Number.isFinite(sec) && sec >= 0) return Math.min(sec * 1000, 120_000);
  const dateMs = Date.parse(s);
  if (!Number.isNaN(dateMs)) return Math.min(Math.max(0, dateMs - Date.now()), 120_000);
  return null;
}
