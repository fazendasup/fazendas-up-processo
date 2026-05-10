import { COOKIE_NAME, NOT_PLATFORM_ADMIN_MSG, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addDays } from "date-fns";
import * as db from "../db";
import type { InsertPlanoPlantio } from "../../drizzle/schema";
import bcrypt from "bcryptjs";

export const usersRouter = router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        role: z.enum(["user", "admin", "platform_admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.role === "platform_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_PLATFORM_ADMIN_MSG });
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
        return { success: true, id: result.id };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin", "platform_admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
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
      .mutation(async ({ input }) => {
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
        await db.deleteUser(input.id);
        return { success: true };
      }),
});
