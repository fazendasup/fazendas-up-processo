import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addDays } from "date-fns";
import * as db from "../db";
import type { InsertPlanoPlantio } from "../../drizzle/schema";
import bcrypt from "bcryptjs";

export const authRouter = router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message:
              "Banco de dados não configurado. Defina DATABASE_URL no .env e reinicie o servidor.",
          });
        }

        let user: Awaited<ReturnType<typeof db.getUserByEmail>>;
        try {
          user = await db.getUserByEmail(input.email.toLowerCase().trim());
        } catch (e) {
          const connRefused = (() => {
            let cur: unknown = e;
            for (let i = 0; i < 4 && cur && typeof cur === "object"; i++) {
              const code = (cur as { code?: string }).code;
              if (code === "ECONNREFUSED") return true;
              cur = (cur as { cause?: unknown }).cause;
            }
            return false;
          })();
          console.error("[Auth] Falha ao consultar usuário:", e);
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: connRefused
              ? "Não foi possível conectar ao MySQL (porta recusada). Inicie o banco (ex.: docker compose up -d) e tente de novo."
              : "Erro ao acessar o banco de dados. Verifique se o MySQL está rodando e se DATABASE_URL está correta.",
          });
        }

        const emailNorm = input.email.toLowerCase().trim();
        if (process.env.AUTH_DEBUG_LOGIN === "1") {
          console.log("[Auth] login debug", {
            emailNorm,
            userFound: Boolean(user),
            hasPasswordHash: Boolean(user?.passwordHash),
          });
        }

        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        let valid = false;
        try {
          valid = await bcrypt.compare(input.password, user.passwordHash);
        } catch (e) {
          console.error("[Auth] bcrypt.compare falhou (hash inválido?):", e);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        if (!valid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        // Criar sessão JWT usando o mesmo mecanismo do OAuth
        const displayName =
          (user.name && String(user.name).trim()) ||
          (user.email && user.email.trim()) ||
          "Usuário";
        let sessionToken: string;
        try {
          sessionToken = await sdk.createSessionToken(user.openId, {
            name: displayName,
            expiresInMs: ONE_YEAR_MS,
          });
        } catch (e) {
          console.error("[Auth] Falha ao assinar sessão (JWT_SECRET / jose):", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao iniciar sessão. Verifique JWT_SECRET no servidor.",
          });
        }
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Atualizar último login (não bloqueia o login se falhar)
        try {
          await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        } catch (e) {
          console.warn("[Auth] Falha ao atualizar lastSignedIn (sessão já foi criada):", e);
        }
        return {
          success: true,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      // Usar clearCookie com opções que cobrem todos os cenários
      const cookieOpts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: -1 });
      // Fallback: clearCookie com variações de secure/sameSite
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: '/', sameSite: 'none' as const, secure: true, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: '/', sameSite: 'none' as const, secure: false, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { httpOnly: true, path: '/', sameSite: 'lax' as const, secure: false, maxAge: -1 });
      return { success: true } as const;
    }),
});
