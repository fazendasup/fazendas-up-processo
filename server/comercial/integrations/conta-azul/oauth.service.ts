import axios from "axios";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import { withRetry } from "../../lib/retry";

/** Permite redirecionar o usuário de volta para a mesma origem do Vite (ex.: :5174). Só localhost / 127.0.0.1. */
export function safeReturnUrlForOAuth(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null;
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export type ContaAzulOAuthStatePayload = { n: string; ru?: string };

export function encodeOAuthState(payload: ContaAzulOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function decodeOAuthState(raw: string): ContaAzulOAuthStatePayload | null {
  try {
    const s = Buffer.from(raw, "base64url").toString("utf-8");
    const o = JSON.parse(s) as ContaAzulOAuthStatePayload;
    if (!o || typeof o.n !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export type ContaAzulTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf-8").toString("base64")}`;
}

const DEFAULT_AUTH_URL = "https://auth.contaazul.com/oauth2/authorize";
const DEFAULT_TOKEN_URL = "https://auth.contaazul.com/oauth2/token";

export function buildAuthorizationUrl(env: Env, state: string) {
  const clientId = env.CONTA_AZUL_CLIENT_ID?.trim();
  const redirect = env.CONTA_AZUL_REDIRECT_URI?.trim();
  const authUrl = env.CONTA_AZUL_AUTH_URL?.trim() || DEFAULT_AUTH_URL;
  if (!clientId || !redirect) {
    const faltando = [
      !clientId && "CONTA_AZUL_CLIENT_ID",
      !redirect && "CONTA_AZUL_REDIRECT_URI",
    ].filter(Boolean);
    throw new Error(
      `Conta Azul: preencha no arquivo apps/api/.env: ${faltando.join(", ")} (copie do Portal do desenvolvedor).`,
    );
  }
  const u = new URL(authUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("state", state);
  if (env.CONTA_AZUL_SCOPES?.trim()) {
    u.searchParams.set("scope", env.CONTA_AZUL_SCOPES.trim());
  }
  return u.toString();
}

export async function exchangeCodeForTokens(env: Env, code: string): Promise<ContaAzulTokenResponse> {
  const tokenUrl = env.CONTA_AZUL_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
  const clientId = env.CONTA_AZUL_CLIENT_ID?.trim();
  const clientSecret = env.CONTA_AZUL_CLIENT_SECRET?.trim();
  const redirect = env.CONTA_AZUL_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirect) {
    throw new Error(
      "Conta Azul: preencha CONTA_AZUL_CLIENT_ID, CONTA_AZUL_CLIENT_SECRET e CONTA_AZUL_REDIRECT_URI em apps/api/.env",
    );
  }

  return withRetry(
    async () => {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
      });

      const { data } = await axios.post<ContaAzulTokenResponse>(tokenUrl, body.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization: basicAuthHeader(clientId, clientSecret),
        },
        timeout: 15_000,
      });

      return data;
    },
    { tentativas: 3, delayMs: 400 },
  ).catch((e) => {
    logger.error({ err: e }, "Falha ao trocar code por tokens (Conta Azul)");
    if (axios.isAxiosError(e) && e.response?.data != null) {
      const d = e.response.data;
      const detail =
        typeof d === "object" && d !== null
          ? JSON.stringify(d)
          : typeof d === "string"
            ? d
            : String(d);
      throw new Error(`Conta Azul recusou o token: ${detail.slice(0, 500)}`);
    }
    throw e;
  });
}

export async function refreshAccessToken(env: Env, refreshToken: string): Promise<ContaAzulTokenResponse> {
  const tokenUrl = env.CONTA_AZUL_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL;
  const clientId = env.CONTA_AZUL_CLIENT_ID?.trim();
  const clientSecret = env.CONTA_AZUL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Conta Azul: preencha CONTA_AZUL_CLIENT_ID e CONTA_AZUL_CLIENT_SECRET em apps/api/.env");
  }

  return withRetry(
    async () => {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      const { data } = await axios.post<ContaAzulTokenResponse>(tokenUrl, body.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization: basicAuthHeader(clientId, clientSecret),
        },
        timeout: 15_000,
      });
      return data;
    },
    { tentativas: 3, delayMs: 500 },
  );
}
