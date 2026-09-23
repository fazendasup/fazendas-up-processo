import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  PUSH_CATEGORIAS,
  categoriasPermitidasParaPerfil,
  normalizarPreferenciasPush,
  type PushCategoria,
} from "@shared/pushNotificacoes";
import {
  deletePushSubscriptionByEndpoint,
  getPushPreferencias,
  preferenciasFromRow,
  savePushPreferencias,
  upsertPushSubscription,
} from "../pushDb";
import {
  getVapidPublicKey,
  pushHabilitadoNoServidor,
  statusPushParaUsuario,
} from "../pushService";

const categoriaSchema = z.enum(PUSH_CATEGORIAS);

async function comercialPerfilDoCtx(user: {
  role: string;
  email: string | null;
}): Promise<string | null> {
  if (user.role !== "comercial" || !user.email) return null;
  try {
    const { getComercialPrisma } = await import("../comercial/db");
    const cu = await getComercialPrisma().usuario.findFirst({
      where: { email: user.email.toLowerCase().trim(), status: "ATIVO" },
      select: { perfil: true },
    });
    return cu?.perfil ?? null;
  } catch {
    return null;
  }
}

export const pushRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const comercialPerfil = await comercialPerfilDoCtx(ctx.user);
    const permitidas = categoriasPermitidasParaPerfil({
      role: ctx.user.role,
      comercialPerfil,
    });
    const prefRow = await getPushPreferencias(ctx.user.id);
    const preferencias = preferenciasFromRow(prefRow, permitidas);
    const status = await statusPushParaUsuario(ctx.user.id);
    return {
      ...status,
      comercialPerfil,
      categoriasPermitidas: permitidas,
      preferencias,
    };
  }),

  vapidPublicKey: protectedProcedure.query(() => {
    if (!pushHabilitadoNoServidor()) {
      return { key: null as string | null };
    }
    return { key: getVapidPublicKey() };
  }),

  salvarPreferencias: protectedProcedure
    .input(
      z.object({
        ativo: z.boolean(),
        categorias: z.record(z.string(), z.boolean()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comercialPerfil = await comercialPerfilDoCtx(ctx.user);
      const permitidas = categoriasPermitidasParaPerfil({
        role: ctx.user.role,
        comercialPerfil,
      });
      if (permitidas.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seu perfil não recebe notificações push.",
        });
      }
      const preferencias = normalizarPreferenciasPush(
        { ativo: input.ativo, categorias: input.categorias },
        permitidas,
      );
      await savePushPreferencias(ctx.user.id, preferencias);
      return preferencias;
    }),

  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url().max(2048),
        keys: z.object({
          p256dh: z.string().min(20).max(255),
          auth: z.string().min(8).max(128),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!pushHabilitadoNoServidor()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Web Push não configurado no servidor (defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY).",
        });
      }
      const comercialPerfil = await comercialPerfilDoCtx(ctx.user);
      const permitidas = categoriasPermitidasParaPerfil({
        role: ctx.user.role,
        comercialPerfil,
      });
      if (permitidas.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seu perfil não recebe notificações push.",
        });
      }
      const ua =
        typeof ctx.req.headers["user-agent"] === "string"
          ? ctx.req.headers["user-agent"].slice(0, 512)
          : null;
      await upsertPushSubscription({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: ua,
      });
      return { ok: true as const };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().min(10).max(2048) }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscriptionByEndpoint(ctx.user.id, input.endpoint);
      return { ok: true as const };
    }),

  /** Envio de teste só para o próprio usuário (categoria permitida). */
  testar: protectedProcedure
    .input(
      z
        .object({
          categoria: categoriaSchema.optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const comercialPerfil = await comercialPerfilDoCtx(ctx.user);
      const permitidas = categoriasPermitidasParaPerfil({
        role: ctx.user.role,
        comercialPerfil,
      });
      const categoria = (input?.categoria ??
        permitidas[0]) as PushCategoria | undefined;
      if (!categoria || !permitidas.includes(categoria)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Nenhuma categoria disponível para o seu perfil.",
        });
      }
      const { enviarPushNotificacao } = await import("../pushService");
      const r = await enviarPushNotificacao({
        categoria,
        titulo: "Fazendas UP — teste",
        corpo: `Notificação de teste (${categoria}).`,
        url: "/",
        tag: `test-${categoria}`,
        userIds: [ctx.user.id],
      });
      return r;
    }),
});
