import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  COMERCIAL_DATABASE_URL: z.string().min(1).optional(),
  /** URL pública do supervisório (OAuth Conta Azul volta para /comercial/configuracoes). */
  COMERCIAL_WEB_URL: z.string().url().optional(),
  COMERCIAL_API_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(24).optional(),
  JWT_REFRESH_SECRET: z.string().min(24).optional(),
  JWT_ACCESS_TTL: z.string().default("8h"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  SENTRY_DSN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  CONTA_AZUL_CLIENT_ID: z.string().optional(),
  CONTA_AZUL_CLIENT_SECRET: z.string().optional(),
  CONTA_AZUL_REDIRECT_URI: z.string().optional(),
  CONTA_AZUL_AUTH_URL: z.string().url().optional(),
  CONTA_AZUL_TOKEN_URL: z.string().url().optional(),
  CONTA_AZUL_API_BASE_URL: z.string().url().optional(),
  CONTA_AZUL_SCOPES: z.string().optional(),
  CONTA_AZUL_VENDAS_SYNC_DIAS: z.coerce.number().int().min(1).max(365).default(365),
  MANYCHAT_API_KEY: z.string().optional(),
  MANUS_API_URL: z.string().url().optional(),
  MANUS_API_KEY: z.string().optional(),
  WEB_SEARCH_API_KEY: z.string().optional(),
  WEB_SEARCH_ENGINE_ID: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  ENABLE_COMERCIAL_INTEGRATION_CRON: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform(v => v === "true" || v === "1"),
});

export type ComercialEnv = z.infer<typeof envSchema> & {
  DATABASE_URL: string;
  API_URL: string;
  WEB_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
};

let cached: ComercialEnv | null = null;

/** URL MySQL do módulo comercial (Prisma). Aceita fallback para `DATABASE_URL` do supervisório. */
export function resolveComercialDatabaseUrl(): string {
  const url =
    process.env.COMERCIAL_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!url) {
    throw new Error(
      "Defina COMERCIAL_DATABASE_URL (MySQL do módulo comercial) ou DATABASE_URL no painel do host",
    );
  }
  return url;
}

/**
 * Garante `COMERCIAL_DATABASE_URL` no processo — o client gerado valida esse nome no schema Prisma.
 */
export function ensureComercialDatabaseUrlEnv(): string {
  const url = resolveComercialDatabaseUrl();
  if (!process.env.COMERCIAL_DATABASE_URL?.trim()) {
    process.env.COMERCIAL_DATABASE_URL = url;
  }
  return url;
}

export function getComercialEnv(): ComercialEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[Comercial] env inválido:", parsed.error.flatten().fieldErrors);
    throw new Error("Variáveis de ambiente do módulo comercial inválidas");
  }

  const dbUrl = resolveComercialDatabaseUrl();
  ensureComercialDatabaseUrlEnv();

  const port = Number(process.env.PORT ?? 3456);
  const publicApp =
    process.env.PUBLIC_APP_URL?.trim() ||
    (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/^https?:\/\//, "")}`
      : "");
  const web =
    parsed.data.COMERCIAL_WEB_URL?.trim() ||
    publicApp ||
    (process.env.NODE_ENV === "development"
      ? `http://localhost:${port}`
      : "");
  const api =
    parsed.data.COMERCIAL_API_URL?.trim() ||
    publicApp ||
    (process.env.NODE_ENV === "development"
      ? `http://localhost:${port}`
      : "");

  if (!web || !api) {
    throw new Error(
      "Defina COMERCIAL_WEB_URL e COMERCIAL_API_URL (ou PUBLIC_APP_URL / RAILWAY_PUBLIC_DOMAIN) em produção",
    );
  }

  const redirectUri =
    parsed.data.CONTA_AZUL_REDIRECT_URI?.trim() ||
    `${web.replace(/\/$/, "")}/integrations/conta-azul/callback`;

  const jwtAccess =
    parsed.data.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    "dev-comercial-access-secret-min-24-chars";
  const jwtRefresh =
    parsed.data.JWT_REFRESH_SECRET?.trim() ||
    process.env.JWT_REFRESH_SECRET?.trim() ||
    "dev-comercial-refresh-secret-min-24";

  cached = {
    ...parsed.data,
    DATABASE_URL: dbUrl,
    API_URL: api.replace(/\/$/, ""),
    WEB_URL: web.replace(/\/$/, ""),
    CONTA_AZUL_REDIRECT_URI: redirectUri,
    JWT_ACCESS_SECRET: jwtAccess,
    JWT_REFRESH_SECRET: jwtRefresh,
  };

  return cached;
}

/** Tipo legado usado pelos serviços copiados do Comercia. */
export type Env = ComercialEnv;
