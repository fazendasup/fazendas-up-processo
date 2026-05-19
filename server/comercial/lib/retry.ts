export type RetryOptions = {
  tentativas: number;
  delayMs: number;
  fator?: number;
  /** Se definido e retornar false, o erro é propagado sem novas tentativas (ex.: HTTP 4xx). */
  isRetryable?: (error: unknown) => boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const fator = opts.fator ?? 2;
  const isRetryable = opts.isRetryable ?? (() => true);
  let delay = opts.delayMs;
  let ultimoErro: unknown;

  for (let i = 0; i < opts.tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      if (!isRetryable(e)) throw e;
      if (i === opts.tentativas - 1) break;
      const jitter = Math.floor(Math.random() * 150);
      await sleep(delay + jitter);
      delay *= fator;
    }
  }

  throw ultimoErro;
}
