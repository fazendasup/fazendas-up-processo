import axios, { type AxiosInstance } from "axios";
import type { Env } from "../../env";
import { withRetry } from "../../lib/retry";
import { contaAzulThrottle, retryAfterMsFromAxios } from "./conta-azul-rate-limit";

function contaAzulErroAmigavel(e: unknown): Error {
  if (!axios.isAxiosError(e)) return e instanceof Error ? e : new Error(String(e));
  const status = e.response?.status;
  const raw = e.response?.data;
  let detalhe: string | undefined;
  if (raw && typeof raw === "object" && "error" in raw && typeof (raw as { error: unknown }).error === "string") {
    detalhe = (raw as { error: string }).error;
  } else if (typeof raw === "string") {
    detalhe = raw;
  }
  let base = detalhe ?? e.message;
  if (status === 429) {
    base =
      "Muitas requisições à API (limite excedido). Aguarde 1–2 minutos e tente o sync de novo. O sync automático usa menos chamadas; use o botão manual com calma.";
  }
  return new Error(`Conta Azul${status != null ? ` (${status})` : ""}: ${base}`);
}

function isContaAzulRetryable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return true;
  const s = err.response?.status;
  return s == null || s >= 500 || s === 429 || s === 408;
}

function delayForContaAzulRetry(err: unknown, attempt: number, baseDelayMs: number): number {
  if (axios.isAxiosError(err)) {
    const fromHeader = retryAfterMsFromAxios(err.response?.headers as Record<string, unknown> | undefined);
    if (fromHeader != null) return fromHeader;
    if (err.response?.status === 429) return Math.max(baseDelayMs, 4_000 * (attempt + 1));
  }
  return baseDelayMs;
}

export function createContaAzulHttp(env: Env, accessToken: string): AxiosInstance {
  const base = env.CONTA_AZUL_API_BASE_URL ?? "https://api-v2.contaazul.com";
  return axios.create({
    baseURL: base,
    timeout: 20_000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  });
}

/** Detalhe por id é o que estoura rate limit; /v1/venda/busca e /v1/pessoas não entram na fila. */
function contaAzulPathPrecisaThrottle(path: string): boolean {
  const p = (path.split("?")[0] ?? path).toLowerCase();
  if (!p.includes("/v1/venda/")) return false;
  if (p.endsWith("/v1/venda/busca")) return false;
  return true;
}

export async function contaAzulGet<T>(client: AxiosInstance, path: string): Promise<T> {
  try {
    return await withRetry(
      async () => {
        if (contaAzulPathPrecisaThrottle(path)) {
          await contaAzulThrottle();
        }
        const { data } = await client.get<T>(path);
        return data;
      },
      {
        tentativas: 6,
        delayMs: 800,
        fator: 2,
        isRetryable: isContaAzulRetryable,
        delayForError: delayForContaAzulRetry,
      },
    );
  } catch (e) {
    throw contaAzulErroAmigavel(e);
  }
}
