import type { Env } from "./env";

/** Sentry opcional — só ativa se @sentry/node estiver instalado e SENTRY_DSN definido. */
export function initSentry(_env: Env) {
  /* noop no supervisório por padrão */
}

export const Sentry = {
  captureException: (_e: unknown) => undefined,
  captureMessage: (_msg: string, _opts?: unknown) => undefined,
};
