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

export const ENV = {
  // Required
  databaseUrl: process.env.DATABASE_URL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",

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
   * @see https://platform.openai.com/docs/api-reference
   */
  openAiApiKey: (process.env.OPENAI_API_KEY ?? "").trim(),
  /** Modelo para Chat Completions (sem pesquisa web). */
  openAiChatModel: (process.env.OPENAI_CHAT_MODEL ?? "gpt-5.4-mini").trim() || "gpt-5.4-mini",
  /** Modelo para Responses API + ferramenta `web_search`. */
  openAiResponsesModel: (process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5.4-mini").trim() || "gpt-5.4-mini",
};

// Validate required environment variables
if (!ENV.databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
if (!ENV.cookieSecret && ENV.isProduction) {
  throw new Error("JWT_SECRET environment variable is required in production");
}
