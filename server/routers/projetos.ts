import {
  MODULOS_CONTRATAVEIS,
  ONE_YEAR_MS,
  PROJETO_ATIVO_COOKIE,
  PROJETO_FORBIDDEN_ERR_MSG,
  PROJETO_INATIVO_ERR_MSG,
  isOperationalAdminRole,
  isPlatformCommercialRole,
} from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  adminProcedure,
  platformAdminProcedure,
  projectProcedure,
  protectedProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

/**
 * Gestão de projeto (editar, usuários, mover dados): platform_admin gere todos;
 * admin operacional gere SOMENTE os projetos que ele mesmo criou (dono). Ser apenas
 * membro não dá poder de gestão — evita acesso administrativo cruzado entre projetos.
 */
async function assertPodeGerenciarProjeto(user: { id: number; role: string }, projetoId: number) {
  if (isPlatformCommercialRole(user.role)) return;
  const owner = await db.isProjetoOwner(user.id, projetoId);
  if (!owner) {
    throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_FORBIDDEN_ERR_MSG });
  }
}

async function assertPodeGerenciarVinculoUsuario(ctxUser: { id: number; role: string }, targetUserId: number) {
  const target = await db.getUserById(targetUserId);
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
  }
  if (isPlatformCommercialRole(ctxUser.role)) return target;
  if (target.role === "platform_admin" || (target.id !== ctxUser.id && target.criadoPorId !== ctxUser.id)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir este usuário" });
  }
  return target;
}

export const projetosRouter = router({
  /**
   * Reexecuta a mesma lógica do arranque do servidor (projeto padrão + linhas em projeto_usuarios).
   * Só administrador global — altera vínculos em todo o servidor.
   */
  resyncBootstrap: adminProcedure.mutation(async () => {
    return db.ensureProjetoMembershipsBootstrap();
  }),

  /** Lista de projetos do usuário — sem agregar contagens (evita falhar a lista inteira se uma tabela ainda não existir). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const includeInactive = isOperationalAdminRole(ctx.user.role);
    if (isPlatformCommercialRole(ctx.user.role)) {
      return db.listProjetosForPlatform({ includeInactive: true });
    }
    return db.listProjetosForUser(ctx.user.id, { includeInactive });
  }),

  /**
   * Projetos que o usuário pode GERIR (criar/atribuir usuários): platform_admin → todos;
   * admin operacional → apenas os que ele criou (dono). Usado no formulário de novo usuário.
   */
  gerenciaveis: adminProcedure.query(async ({ ctx }) => {
    if (isPlatformCommercialRole(ctx.user.role)) {
      return db.listProjetosForPlatform({ includeInactive: true });
    }
    return db.listProjetosOwnedBy(ctx.user.id, { includeInactive: true });
  }),

  /** Contagens opcionais (ex.: página Projetos). Falhas por tabela são ignoradas (zeros). */
  operationalCounts: protectedProcedure
    .input(z.object({ projetoIds: z.array(z.number().int().positive()) }))
    .query(async ({ ctx, input }) => {
      const includeInactive = isOperationalAdminRole(ctx.user.role);
      const allowed = new Set(
        (isPlatformCommercialRole(ctx.user.role)
          ? await db.listProjetosForPlatform({ includeInactive: true })
          : await db.listProjetosForUser(ctx.user.id, { includeInactive })
        ).map((r) => r.projeto.id),
      );
      const ids = input.projetoIds.filter((id) => allowed.has(id));
      return db.getOperationalCountsForProjetos(ids);
    }),

  /**
   * Admin: move dados operacionais de um projeto para outro (ex.: legado noutro ID).
   * Destino não pode ter slugs/fases em conflito com a origem.
   */
  reassignOperationalData: adminProcedure
    .input(
      z.object({
        fromProjetoId: z.number().int().positive(),
        toProjetoId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Isolamento: só pode mover dados entre projetos aos quais o usuário pertence (platform_admin: todos).
      await assertPodeGerenciarProjeto(ctx.user, input.fromProjetoId);
      await assertPodeGerenciarProjeto(ctx.user, input.toProjetoId);
      try {
        await db.reassignOperationalDataBetweenProjetos(input.fromProjetoId, input.toProjetoId);
        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
    }),

  /**
   * Migra todo o cadastro operacional antigo para "Fazenda Vertical Principal" (qualquer usuário autenticado).
   * Atribui `projetoId` em linhas NULL, une outras origens, devolve contagens de verificação e erros parciais.
   */
  /** Administrador — reatribui dados operacionais de legado para "Fazenda Vertical Principal". */
  migrateLegacyDataToFazendaVerticalPrincipal: adminProcedure.mutation(async () => {
    try {
      const result = await db.migrateAllOperationalDataToFazendaVerticalPrincipal();
      return {
        ok: true as const,
        fvpId: result.fvpId,
        mergedFrom: result.mergedFrom,
        mergeErrors: result.mergeErrors,
        nullRowsUpdated: result.nullRowsUpdated,
        verification: result.verification,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const projeto = await db.getProjetoByIdForUser(ctx.user.id, input.id);
      if (!projeto) {
        throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_FORBIDDEN_ERR_MSG });
      }
      return projeto;
    }),

  create: adminProcedure
    .input(
      z.object({
        nome: z.string().min(1),
        tipo: z.enum(["fazenda_vertical", "hidroponia", "microverdes"]),
        descricao: z.string().optional(),
        endereco: z.string().optional(),
        responsavelId: z.number().optional(),
        /** Só usado em `microverdes`: liga o módulo de caixas d'água (medições, ligação a torres). */
        usarCaixaAgua: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.createProjeto(
        {
          nome: input.nome.trim(),
          tipo: input.tipo,
          descricao: input.descricao?.trim() || null,
          endereco: input.endereco?.trim() || null,
          responsavelId: input.responsavelId ?? null,
          status: "ativo",
          usarCaixaAgua: input.usarCaixaAgua,
        },
        ctx.user.id,
        "admin",
      );
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().nullable().optional(),
        endereco: z.string().nullable().optional(),
        responsavelId: z.number().nullable().optional(),
        usarCaixaAgua: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.id);
      const { id, ...rest } = input;
      await db.updateProjeto(id, rest);
      return { success: true };
    }),

  setOwner: platformAdminProcedure
    .input(
      z.object({
        projetoId: z.number().int().positive(),
        ownerUserId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.ownerUserId != null) {
        const user = await db.getUserById(input.ownerUserId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        if (user.role !== "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "O dono do projeto deve ser um Administrador operacional.",
          });
        }
        await db.addProjetoUser(input.projetoId, input.ownerUserId, "admin");
      }
      await db.updateProjetoOwner(input.projetoId, input.ownerUserId);
      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.id);
      await db.deactivateProjeto(input.id);
      return { success: true };
    }),

  reactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.id);
      await db.reactivateProjeto(input.id);
      return { success: true };
    }),

  addUser: adminProcedure
    .input(
      z.object({
        projetoId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "operador", "visualizador"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.projetoId);
      await assertPodeGerenciarVinculoUsuario(ctx.user, input.userId);
      await db.addProjetoUser(input.projetoId, input.userId, input.role);
      return { success: true };
    }),

  removeUser: adminProcedure
    .input(z.object({ projetoId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.projetoId);
      await assertPodeGerenciarVinculoUsuario(ctx.user, input.userId);
      const projeto = await db.getProjetoById(input.projetoId);
      if (projeto?.criadoPorId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Troque o dono do projeto antes de remover este usuário.",
        });
      }
      await db.removeProjetoUser(input.projetoId, input.userId);
      return { success: true };
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        projetoId: z.number(),
        userId: z.number(),
        role: z.enum(["admin", "operador", "visualizador"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPodeGerenciarProjeto(ctx.user, input.projetoId);
      await assertPodeGerenciarVinculoUsuario(ctx.user, input.userId);
      await db.updateProjetoUserRole(input.projetoId, input.userId, input.role);
      return { success: true };
    }),

  listUsers: adminProcedure.input(z.object({ projetoId: z.number() })).query(async ({ ctx, input }) => {
    await assertPodeGerenciarProjeto(ctx.user, input.projetoId);
    return db.listProjetoUsers(input.projetoId);
  }),

  switchActive: protectedProcedure
    .input(z.object({ projetoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const projeto = isPlatformCommercialRole(ctx.user.role)
        ? await db.getProjetoById(input.projetoId)
        : await db.getProjetoByIdForUser(ctx.user.id, input.projetoId);
      if (!projeto) {
        throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_FORBIDDEN_ERR_MSG });
      }
      if (projeto.status !== "ativo") {
        throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_INATIVO_ERR_MSG });
      }
      ctx.res.cookie(PROJETO_ATIVO_COOKIE, String(input.projetoId), {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });
      return { success: true as const };
    }),

  /** Módulos contratados do projeto ativo (para menu e guards no cliente). */
  modulosAtivos: projectProcedure.query(async ({ ctx }) => {
    return db.getProjetoModulosMap(projetoIdFromCtx(ctx));
  }),

  /** Gestão comercial: todos os projetos com mapa de módulos (só equipa da plataforma). */
  listagemModulosPlataforma: platformAdminProcedure.query(async () => {
    const rows = await db.listAllProjetosBasico();
    const out: { id: number; nome: string; tipo: string; status: string; modulos: Awaited<ReturnType<typeof db.getProjetoModulosMap>> }[] = [];
    for (const p of rows) {
      out.push({
        ...p,
        modulos: await db.getProjetoModulosMap(p.id),
      });
    }
    return out;
  }),

  definirModuloProjeto: platformAdminProcedure
    .input(
      z.object({
        projetoId: z.number().int().positive(),
        modulo: z.enum(MODULOS_CONTRATAVEIS),
        habilitado: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.setProjetoModuloHabilitado(input.projetoId, input.modulo, input.habilitado);
      return { ok: true as const };
    }),

  /**
   * Elimina definitivamente o projeto e todos os dados associados (irreversível).
   * Só equipa da plataforma; exige confirmação pelo nome exato do projeto.
   */
  deletePermanente: platformAdminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        confirmNome: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const row = await db.getProjetoById(input.id);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado." });
      }
      if (row.nome.trim() !== input.confirmNome.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O nome não coincide com o projeto. Escreva o nome exatamente como aparece na lista.",
        });
      }
      try {
        await db.deleteProjetoPermanente(input.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
      return { ok: true as const };
    }),
});
