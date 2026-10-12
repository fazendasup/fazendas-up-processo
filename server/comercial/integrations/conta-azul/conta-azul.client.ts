import axios, { type AxiosInstance } from "axios";
import { detalheHttpContaAzul, mensagemCorpoContaAzul } from "@shared/contaAzulErroUsuario";
import type { Env } from "../../env";
import { withRetry } from "../../lib/retry";
import { contaAzulThrottle, retryAfterMsFromAxios } from "./conta-azul-rate-limit";

function contaAzulErroAmigavel(e: unknown): Error {
  if (!axios.isAxiosError(e)) return e instanceof Error ? e : new Error(String(e));
  const status = e.response?.status;
  const detalhe = mensagemCorpoContaAzul(e.response?.data);
  return new Error(detalheHttpContaAzul(status, detalhe, e.message));
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

/** Detalhe por id / escrita é o que estoura rate limit; buscas leves não entram na fila. */
function contaAzulPathPrecisaThrottle(path: string): boolean {
  const p = (path.split("?")[0] ?? path).toLowerCase();
  if (p.endsWith("/v1/venda/busca")) return false;
  if (p === "/v1/pessoas" || p.startsWith("/v1/pessoas?")) return false;
  if (p === "/v1/orcamentos" || p.startsWith("/v1/orcamentos?")) return true;
  if (p.includes("/v1/venda")) return true;
  if (p.includes("/v1/orcamento")) return true;
  if (p.includes("/v1/conta-financeira")) return true;
  if (p.includes("/v1/financeiro")) return true;
  return false;
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

class ContaAzulStatusRetry extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

/** Download binário (PDF do boleto, XML/ZIP da nota). 429 e 5xx entram no retry. */
export async function contaAzulGetBytes(
  client: AxiosInstance,
  path: string,
): Promise<{ status: number; data: Buffer; contentType: string }> {
  try {
    return await withRetry(
      async () => {
        if (contaAzulPathPrecisaThrottle(path)) {
          await contaAzulThrottle();
        }
        const response = await client.get<ArrayBuffer>(path, {
          responseType: "arraybuffer",
          headers: {
            accept: "application/pdf, application/xml, application/zip, application/octet-stream, */*",
          },
          validateStatus: () => true,
        });
        if (response.status === 429 || response.status >= 500) {
          throw new ContaAzulStatusRetry(response.status);
        }
        return {
          status: response.status,
          data: Buffer.from(response.data),
          contentType: String(response.headers["content-type"] ?? "application/octet-stream"),
        };
      },
      {
        tentativas: 4,
        delayMs: 800,
        fator: 2,
        isRetryable: (err) => err instanceof ContaAzulStatusRetry || isContaAzulRetryable(err),
        delayForError: delayForContaAzulRetry,
      },
    );
  } catch (e) {
    throw contaAzulErroAmigavel(e);
  }
}

/** PATCH parcial. 204 também é sucesso. */
export async function contaAzulPatch(
  client: AxiosInstance,
  path: string,
  body: unknown,
): Promise<void> {
  try {
    await withRetry(
      async () => {
        await contaAzulThrottle();
        await client.patch(path, body, {
          headers: { "Content-Type": "application/json" },
          validateStatus: (status) => status >= 200 && status < 300,
        });
      },
      {
        tentativas: 4,
        delayMs: 1000,
        fator: 2,
        isRetryable: isContaAzulRetryable,
        delayForError: delayForContaAzulRetry,
      },
    );
  } catch (e) {
    throw contaAzulErroAmigavel(e);
  }
}

/** POST na API Conta Azul (venda, orçamento, etc.) — mesmo throttle/retry do GET. */
export async function contaAzulPost<T>(
  client: AxiosInstance,
  path: string,
  body: unknown,
): Promise<T> {
  try {
    return await withRetry(
      async () => {
        await contaAzulThrottle();
        const { data } = await client.post<T>(path, body, {
          headers: { "Content-Type": "application/json" },
        });
        return data;
      },
      {
        tentativas: 4,
        delayMs: 1000,
        fator: 2,
        isRetryable: isContaAzulRetryable,
        delayForError: delayForContaAzulRetry,
      },
    );
  } catch (e) {
    throw contaAzulErroAmigavel(e);
  }
}
