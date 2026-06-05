import { NOT_PLATFORM_ADMIN_MSG, isPlatformCommercialRole, type AppUserRole } from "@shared/const";
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import bcrypt from "bcryptjs";
import { getComercialPrisma } from "../comercial/db";
import { hashPassword as hashComercialPassword } from "../comercial/lib/password";

const appRoleSchema = z.enum(["user", "admin", "platform_admin", "comercial", "visitante"]);
const comercialPerfilSchema = z.enum(["COMERCIAL", "PROMOTER", "LIDER_COLHEITA"]).optional();

function projetoRoleForAppRole(role: AppUserRole): "admin" | "operador" | "visualizador" {
  if (role === "admin" || role === "platform_admin") return "admin";
  if (role === "comercial" || role === "visitante") return "visualizador";
  return "operador";
}

async function projetosGerenciaveis(ctxUser: { id: number; role: string }) {
  if (isPlatformCommercialRole(ctxUser.role)) {
    return db.listProjetosForPlatform({ includeInactive: true });
  }
  // Admin operacional só pode vincular/gerir usuários nos projetos que ELE criou (dono).
  return db.listProjetosOwnedBy(ctxUser.id, { includeInactive: true });
}

async function assertPodeGerenciarUsuario(ctxUser: { id: number; role: string }, targetUserId: number) {
  if (isPlatformCommercialRole(ctxUser.role)) return;
  const target = await db.getUserById(targetUserId);
  if (!target || target.role === "platform_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir este usuário" });
  }
  // Admin operacional só pode gerir usuários que ele próprio criou.
  if (target.criadoPorId !== ctxUser.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir este usuário" });
  }
}

async function upsertComercialUsuario(input: {
  nome: string;
  email: string;
  senhaTemporaria?: string;
  perfil: "COMERCIAL" | "PROMOTER" | "LIDER_COLHEITA";
}) {
  const prisma = getComercialPrisma();
  const email = input.email.toLowerCase().trim();
  const senhaHash = input.senhaTemporaria ? await hashComercialPassword(input.senhaTemporaria) : undefined;

  await prisma.usuario.upsert({
    where: { email },
    create: {
      nome: input.nome,
      email,
      senhaHash: senhaHash ?? (await hashComercialPassword(`Fup@${Date.now()}`)),
      perfil: input.perfil,
      status: "ATIVO",
    },
    update: {
      nome: input.nome,
      perfil: input.perfil,
      status: "ATIVO",
      ...(senhaHash ? { senhaHash } : {}),
    },
  });
}

async function appendComercialPerfis<T extends { email: string | null; role: string }>(rows: T[]) {
  const emails = rows
    .filter((u) => u.role === "comercial" && u.email)
    .map((u) => u.email!.toLowerCase().trim());
  if (emails.length === 0) {
    return rows.map((u) => ({ ...u, comercialPerfil: null as string | null }));
  }

  try {
    const usuarios = await getComercialPrisma().usuario.findMany({
      where: { email: { in: emails } },
      select: { email: true, perfil: true },
    });
    const perfilPorEmail = new Map(usuarios.map((u) => [u.email.toLowerCase().trim(), u.perfil]));
    return rows.map((u) => ({
      ...u,
      comercialPerfil: u.email ? (perfilPorEmail.get(u.email.toLowerCase().trim()) ?? null) : null,
    }));
  } catch {
    return rows.map((u) => ({ ...u, comercialPerfil: null as string | null }));
  }
}

export const usersRouter = router({
    list: adminProcedure.query(async ({ ctx }) => {
      // platform_admin vê todos; admin operacional só vê os usuários que criou (e ele mesmo).
      const rows = isPlatformCommercialRole(ctx.user.role)
        ? await db.getAllUsers()
        : await db.getUsersCreatedByOrSelf(ctx.user.id);
      return appendComercialPerfis(rows);
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        role: appRoleSchema,
        comercialPerfil: comercialPerfilSchema,
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
        const email = input.email.toLowerCase().trim();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este email' });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const result = await db.createUserWithPassword({
          name: input.name,
          email,
          passwordHash,
          role: input.role,
          criadoPorId: ctx.user.id,
        });
        for (const projetoId of projetoIds) {
          await db.addProjetoUser(projetoId, Number(result.id), projetoRoleForAppRole(input.role));
        }
        if (input.role === "comercial") {
          await upsertComercialUsuario({
            nome: input.name,
            email,
            senhaTemporaria: input.password,
            perfil: input.comercialPerfil ?? "COMERCIAL",
          });
        }
        return { success: true, id: result.id };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: appRoleSchema,
        comercialPerfil: comercialPerfilSchema,
      }))
      .mutation(async ({ input, ctx }) => {
        await assertPodeGerenciarUsuario(ctx.user, input.id);
        if (input.role === "platform_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: NOT_PLATFORM_ADMIN_MSG });
        }
        await db.updateUserRole(input.id, input.role);
        if (input.role === "comercial") {
          const user = await db.getUserById(input.id);
          if (user?.email) {
            await upsertComercialUsuario({
              nome: user.name ?? user.email,
              email: user.email,
              perfil: input.comercialPerfil ?? "COMERCIAL",
            });
          }
        }
        return { success: true };
      }),
    resetPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      }))
      .mutation(async ({ input, ctx }) => {
        await assertPodeGerenciarUsuario(ctx.user, input.id);
        const user = await db.getUserById(input.id);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUserPassword(input.id, passwordHash);
        if (user.role === "comercial" && user.email) {
          const perfil = (await appendComercialPerfis([user]))[0]?.comercialPerfil;
          await upsertComercialUsuario({
            nome: user.name ?? user.email,
            email: user.email,
            senhaTemporaria: input.newPassword,
            perfil: perfil === "PROMOTER" || perfil === "LIDER_COLHEITA" ? perfil : "COMERCIAL",
          });
        }
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
