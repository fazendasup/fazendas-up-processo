import axios, { type AxiosInstance } from "axios";
import type { Env } from "../../env";
import { withRetry } from "../../lib/retry";

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
  const base = detalhe ?? e.message;
  return new Error(`Conta Azul${status != null ? ` (${status})` : ""}: ${base}`);
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

export async function contaAzulGet<T>(client: AxiosInstance, path: string): Promise<T> {
  try {
    return await withRetry(
      async () => {
        const { data } = await client.get<T>(path);
        return data;
      },
      {
        tentativas: 3,
        delayMs: 350,
        isRetryable: (err) => {
          if (!axios.isAxiosError(err)) return true;
          const s = err.response?.status;
          return s == null || s >= 500;
        },
      },
    );
  } catch (e) {
    throw contaAzulErroAmigavel(e);
  }
}
