import { NOT_PLATFORM_ADMIN_MSG, isPlatformCommercialRole, type AppUserRole } from "@shared/const";
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import bcrypt from "bcryptjs";

const appRoleSchema = z.enum(["user", "admin", "platform_admin", "comercial"]);

function projetoRoleForAppRole(role: AppUserRole): "admin" | "operador" | "visualizador" {
  if (role === "admin" || role === "platform_admin") return "admin";
  if (role === "comercial") return "visualizador";
  return "operador";
}

async function projetosGerenciaveis(ctxUser: { id: number; role: string }) {
  if (isPlatformCommercialRole(ctxUser.role)) {
    return db.listProjetosForPlatform({ includeInactive: true });
  }
  return db.listProjetosForUser(ctxUser.id, { includeInactive: true });
}

async function assertPodeGerenciarUsuario(ctxUser: { id: number; role: string }, targetUserId: number) {
  if (isPlatformCommercialRole(ctxUser.role)) return;
  const target = await db.getUserById(targetUserId);
  if (!target || target.role === "platform_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir este usuário" });
  }
  const projetos = await projetosGerenciaveis(ctxUser);
  const visiveis = await db.getUsersForProjetos(projetos.map((p) => p.projeto.id));
  if (!visiveis.some((u) => u.id === targetUserId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir este usuário" });
  }
}

export const usersRouter = router({
    list: adminProcedure.query(async ({ ctx }) => {
      if (isPlatformCommercialRole(ctx.user.role)) {
        return db.getAllUsers();
      }
      const projetos = await projetosGerenciaveis(ctx.user);
      return db.getUsersForProjetos(projetos.map((p) => p.projeto.id));
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        role: appRoleSchema,
        projetoIds: z.array(z.number().int().positive()).default([]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.role === "platform_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_PLATFORM_ADMIN_MSG });
        }
        if (input.role !== "platform_admin" && input.projetoIds.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione ao menos um projeto para este usuário" });
        }
        const projetosPermitidos = await projetosGerenciaveis(ctx.user);
        const allowedProjetoIds = new Set(projetosPermitidos.map((p) => p.projeto.id));
        const projetoIds = input.role === "platform_admin" ? [] : Array.from(new Set(input.projetoIds));
        const invalidProject = projetoIds.find((id) => !allowedProjetoIds.has(id));
        if (invalidProject != null) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para vincular usuário a este projeto" });
        }
        // Verificar se email já existe
        const existing = await db.getUserByEmail(input.email.toLowerCase().trim());
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este email' });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const result = await db.createUserWithPassword({
          name: input.name,
          email: input.email.toLowerCase().trim(),
          passwordHash,
          role: input.role,
        });
        for (const projetoId of projetoIds) {
          await db.addProjetoUser(projetoId, Number(result.id), projetoRoleForAppRole(input.role));
        }
        return { success: true, id: result.id };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: appRoleSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        await assertPodeGerenciarUsuario(ctx.user, input.id);
        if (input.role === "platform_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_PLATFORM_ADMIN_MSG });
        }
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),
    resetPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      }))
      .mutation(async ({ input, ctx }) => {
        await assertPodeGerenciarUsuario(ctx.user, input.id);
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUserPassword(input.id, passwordHash);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Não permitir deletar a si mesmo
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível excluir seu próprio usuário' });
        }
        const target = await db.getUserById(input.id);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        if (target.role === "platform_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Usuários da Equipe FUP não podem ser excluídos",
          });
        }
        await assertPodeGerenciarUsuario(ctx.user, input.id);
        await db.deleteUser(input.id);
        return { success: true };
      }),
});
