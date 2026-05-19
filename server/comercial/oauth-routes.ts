import type { Express, Request } from "express";
import { getComercialEnv } from "./env";
import { getComercialPrisma } from "./db";
import { logger } from "./lib/logger";
import {
  buildAuthorizationUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeCodeForTokens,
  safeReturnUrlForOAuth,
} from "./integrations/conta-azul/oauth.service";

function resolveWebBaseFromOAuthCallback(req: Request, env: ReturnType<typeof getComercialEnv>): string {
  const st = req.query.state;
  if (typeof st === "string") {
    const decoded = decodeOAuthState(st);
    if (decoded?.ru) {
      const safe = safeReturnUrlForOAuth(decoded.ru);
      if (safe) {
        const base = safe.replace(/\/$/, "");
        if (base.includes("/comercial")) return base;
        return `${base}/comercial`;
      }
    }
  }
  return `${env.WEB_URL.replace(/\/$/, "")}/comercial`;
}

export function registerComercialOAuthRoutes(app: Express) {
  app.get("/integrations/conta-azul/auth", (req, res) => {
    try {
      const env = getComercialEnv();
      const rawReturn = req.query.return_url;
      let ru: string | undefined;
      if (typeof rawReturn === "string") {
        const safe = safeReturnUrlForOAuth(rawReturn);
        if (safe) ru = safe;
      }
      const state = encodeOAuthState({
        n: `st_${Math.random().toString(36).slice(2)}`,
        ...(ru ? { ru } : {}),
      });
      const url = buildAuthorizationUrl(env, state);
      res.redirect(url);
    } catch (e) {
      logger.error({ err: e }, "Falha ao iniciar OAuth Conta Azul");
      const msg = e instanceof Error ? e.message : "OAuth Conta Azul não configurado";
      res.status(500).type("text/plain; charset=utf-8").send(msg);
    }
  });

  app.get("/integrations/conta-azul/callback", async (req, res) => {
    let env;
    try {
      env = getComercialEnv();
    } catch (e) {
      res.status(500).send(e instanceof Error ? e.message : "Comercial não configurado");
      return;
    }

    const webBase = resolveWebBaseFromOAuthCallback(req, env);
    const oauthErr = req.query.error;

    if (typeof oauthErr === "string") {
      const desc =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : oauthErr;
      logger.warn({ oauthErr, desc }, "Conta Azul devolveu erro no callback OAuth");
      return res.redirect(
        `${webBase}/configuracoes?ca=error&reason=${encodeURIComponent(desc.slice(0, 300))}`
      );
    }

    try {
      const code = req.query.code;
      if (typeof code !== "string") throw new Error("code ausente");
      const tokens = await exchangeCodeForTokens(env, code);
      const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;

      await getComercialPrisma().integrationCredential.upsert({
        where: { provider: "CONTA_AZUL" },
        create: {
          provider: "CONTA_AZUL",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          metadata: { tokenType: tokens.token_type ?? "Bearer" },
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? undefined,
          expiresAt,
        },
      });

      res.redirect(`${webBase}/configuracoes?ca=connected`);
    } catch (e) {
      logger.error({ err: e }, "Callback OAuth Conta Azul falhou");
      const msg = e instanceof Error ? e.message : String(e);
      res.redirect(
        `${webBase}/configuracoes?ca=error&reason=${encodeURIComponent(msg.slice(0, 450))}`
      );
    }
  });
}
