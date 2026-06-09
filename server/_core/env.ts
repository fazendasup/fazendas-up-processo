import { randomBytes } from "node:crypto";

/**
 * URLs “sentinela” usadas no passado para silenciar OAuth: tratamos como **desligado**
 * para não disparar chamadas HTTP nem ruído no terminal quando o login é só email/senha.
 */
const OAUTH_DISABLED_SENTINELS = new Set([
  "http://127.0.0.1:9",
  "http://localhost:9",
]);

/** OAuth Manus/WebDev: só considera ligado com URL HTTP(S) real configurada. */
export function resolveOAuthServerUrl(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t || OAUTH_DISABLED_SENTINELS.has(t)) return "";
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return t;
  } catch {
    return "";
  }
}

const oauthServerUrl = resolveOAuthServerUrl(process.env.OAUTH_SERVER_URL);

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sem `JWT_SECRET` o processo não arranca em produção.
 * `ALLOW_EPHEMERAL_JWT=1` gera um segredo só na memória (útil para desbloquear deploy; sessões resetam a cada restart — defina `JWT_SECRET` no painel).
 */
function resolveCookieSecret(): string {
  const fromEnv = (process.env.JWT_SECRET ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;
  if (!isProduction) return "";
  if (process.env.ALLOW_EPHEMERAL_JWT === "1") {
    const secret = randomBytes(32).toString("hex");
    console.warn(
      "[env] ALLOW_EPHEMERAL_JWT=1 — JWT efémero neste processo. Defina JWT_SECRET no Railway para sessões estáveis.",
    );
    return secret;
  }
  return "";
}

export const ENV = {
  // Required
  databaseUrl: process.env.DATABASE_URL ?? "",
  cookieSecret: resolveCookieSecret(),
  isProduction,

  /**
   * Opcional — integração OAuth (portal Manus / WebDev).
   * Sem URL válida o app usa apenas login email/senha; não validamos nem chamamos servidor OAuth.
   */
  appId: process.env.VITE_APP_ID ?? "fazendas-up-local",
  oAuthServerUrl: oauthServerUrl,
  /** `true` somente com `OAUTH_SERVER_URL` HTTP(S) configurada e não-sentinel. */
  oauthIntegrationEnabled: oauthServerUrl.length > 0,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // Optional - for Manus Forge API integration (storage, LLM, etc)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  frontendForgeApiUrl: process.env.VITE_FRONTEND_FORGE_API_URL ?? "",
  frontendForgeApiKey: process.env.VITE_FRONTEND_FORGE_API_KEY ?? "",
  /** Chave Google Maps — lida em runtime (Railway) sem depender do build Vite. */
  googleMapsApiKey: (
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.VITE_GOOGLE_MAPS_API_KEY ??
    process.env.VITE_FRONTEND_FORGE_API_KEY ??
    ""
  ).trim(),

  /**
   * MQTT (opcional) — ver `docs/MQTT-INTEGRACAO.md` e `server/_core/mqtt.ts`.
   * Sem `MQTT_URL`, o bridge não liga e o resto da app funciona igual.
   */
  mqttUrl: process.env.MQTT_URL?.trim() ?? "",
  mqttUsername: process.env.MQTT_USERNAME?.trim() ?? "",
  mqttPassword: process.env.MQTT_PASSWORD ?? "",
  mqttClientId: process.env.MQTT_CLIENT_ID?.trim() ?? "",
  mqttTopicPrefix: (process.env.MQTT_TOPIC_PREFIX?.trim() || "fazendasup").replace(/^\/+|\/+$/g, ""),
  /** Só afeta `mqtts://`: `1` = aceita certificados não confiáveis (apenas dev). */
  mqttTlsInsecure: process.env.MQTT_TLS_INSECURE === "1",

  /**
   * Assistente de chat (OpenAI). Sem chave, o endpoint de chat devolve erro claro.
   * Modelos: https://developers.openai.com/api/docs/models/gpt-5.4-mini
   */
  openAiApiKey: (process.env.OPENAI_API_KEY ?? "").trim(),
  /** Modelo para Chat Completions (sem pesquisa web). Predefinição: GPT-5.4 mini na API OpenAI. */
  openAiChatModel: (process.env.OPENAI_CHAT_MODEL ?? "gpt-5.4-mini").trim() || "gpt-5.4-mini",
  /** Modelo para Responses API + ferramenta `web_search` (mesma família que suporta web search na doc). */
  openAiResponsesModel: (process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5.4-mini").trim() || "gpt-5.4-mini",
};

// Validate required environment variables
if (!ENV.databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
if (!ENV.cookieSecret && ENV.isProduction) {
  throw new Error(
    "JWT_SECRET em falta em produção. No Railway: Variables → JWT_SECRET (string longa aleatória). " +
      "Emergência pontual: ALLOW_EPHEMERAL_JWT=1 (sessões resetam a cada deploy).",
  );
}
