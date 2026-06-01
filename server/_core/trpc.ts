import {
  MODULO_NAO_CONTRATADO_MSG,
  NOT_ADMIN_ERR_MSG,
  NOT_PLATFORM_ADMIN_MSG,
  isCommercialAccessRole,
  isOperationalAdminRole,
  isPlatformCommercialRole,
  isVisitorRole,
  PROJETO_ATIVO_COOKIE,
  PROJETO_FORBIDDEN_ERR_MSG,
  PROJETO_HEADER,
  PROJETO_INATIVO_ERR_MSG,
  PROJETO_REQUIRED_ERR_MSG,
  PROJETO_TIPO_ERR_MSG,
  UNAUTHED_ERR_MSG,
  VISITOR_READONLY_MSG,
} from "@shared/const";
import type { ModuloContratavel } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import { parse } from "cookie";
import superjson from "superjson";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import type { PerfilUsuario } from "../comercial/generated/prisma";
import { getComercialEnv } from "../comercial/env";
import { getComercialPrisma } from "../comercial/db";
import { resolveComercialUsuario } from "../comercial/resolve-usuario";
import type { TrpcContext } from "./context";
import type { ProjetoTipo } from "./context";

/** Use in project-scoped procedures; runtime is guaranteed after requireProjetoMiddleware. */
export function projetoIdFromCtx(ctx: TrpcContext): number {
  const id = ctx.projetoId;
  if (id == null) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: PROJETO_REQUIRED_ERR_MSG });
  }
  return id;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireProjetoWritable = t.middleware(async ({ ctx, next, type }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const user = ctx.user as User;
  const isReadOnlyProjectUser =
    ctx.projetoUsuarioRole === "visualizador" && user.role !== "comercial";
  if (type === "mutation" && (isVisitorRole(user.role) || isReadOnlyProjectUser)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: VISITOR_READONLY_MSG,
    });
  }
  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

function readProjetoIdFromRequest(req: TrpcContext["req"]): number | undefined {
  const h = req.headers[PROJETO_HEADER] ?? req.headers[PROJETO_HEADER.toLowerCase()];
  const fromHeader = Array.isArray(h) ? h[0] : h;
  if (typeof fromHeader === "string" && fromHeader.trim() !== "") {
    const n = Number(fromHeader.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const cookies = parse(cookieHeader);
  const raw = cookies[PROJETO_ATIVO_COOKIE];
  if (!raw || raw.trim() === "") return undefined;
  const n = Number(raw.trim());
  if (Number.isFinite(n) && n > 0) return n;
  return undefined;
}

const requireProjetoMiddleware = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const pid = readProjetoIdFromRequest(ctx.req);
  if (pid == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: PROJETO_REQUIRED_ERR_MSG });
  }

  const row = isPlatformCommercialRole(ctx.user.role)
    ? await db.getProjetoById(pid)
    : await db.resolveProjetoForUser(ctx.user.id, pid);
  if (!row) {
    const exists = await db.getProjetoByIdForUser(ctx.user.id, pid);
    if (exists && exists.status !== "ativo") {
      throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_INATIVO_ERR_MSG });
    }
    throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_FORBIDDEN_ERR_MSG });
  }

  if (row.status !== "ativo") {
    throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_INATIVO_ERR_MSG });
  }

  const projetoTipo = row.tipo as ProjetoTipo;
  const projetoModulos = await db.getProjetoModulosMap(pid);
  const membership = isPlatformCommercialRole(ctx.user.role)
    ? ({ role: "admin" } as const)
    : await db.getProjetoMembership(ctx.user.id, pid);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      projetoId: pid,
      projetoTipo,
      projetoUsuarioRole: membership?.role ?? null,
      projetoModulos,
    },
  });
});

/** Requer usuário logado + projeto válido (header/cookie) com acesso e status ativo. */
export const projectProcedure = t.procedure
  .use(requireUser)
  .use(requireProjetoMiddleware)
  .use(requireProjetoWritable);

function requireContratacaoModulo(modulo: ModuloContratavel) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const map = ctx.projetoModulos;
    if (!map || !map[modulo]) {
      throw new TRPCError({ code: "FORBIDDEN", message: MODULO_NAO_CONTRATADO_MSG });
    }
    const user = ctx.user as User;
    return next({
      ctx: {
        ...ctx,
        user,
        projetoModulos: map,
      } as TrpcContext,
    });
  });
}

/** Projeto ativo + módulo contratado. */
export function projectProcedureComModulo(modulo: ModuloContratavel) {
  return projectProcedure.use(requireContratacaoModulo(modulo));
}

export const estoqueModuleProcedure = projectProcedureComModulo("estoque");
export const automacaoModuleProcedure = projectProcedureComModulo("automacao");
export const inteligenciaModuleProcedure = projectProcedureComModulo("inteligencia");
export const visaoCultivoModuleProcedure = projectProcedureComModulo("visao_cultivo");
export const custosProducaoModuleProcedure = projectProcedureComModulo("custos_producao");
export const comercialModuleProcedure = projectProcedureComModulo("comercial");

const requireGlobalAdmin = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user || !isOperationalAdminRole(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(requireGlobalAdmin);

const requirePlatformCommercialAdmin = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user || ctx.user.role !== "platform_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_PLATFORM_ADMIN_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Equipa da plataforma (contratação de módulos, etc.) — não confundir com `admin` operacional do cliente. */
export const platformAdminProcedure = t.procedure
  .use(requireUser)
  .use(requirePlatformCommercialAdmin);

/** Projeto ativo + role global admin (sem exigir tipo de projeto específico). */
export const adminProjectProcedure = projectProcedure.use(requireGlobalAdmin);

const requireEstoqueAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (isOperationalAdminRole(ctx.user.role)) {
    return next({ ctx: { ...ctx, user: ctx.user } });
  }
  if (ctx.user.role !== "comercial") {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }

  const comercialUsuario = await resolveComercialUsuario(ctx.user);
  if (!comercialUsuario || comercialUsuario.perfil === "PROMOTER" || comercialUsuario.perfil === "VENDEDOR") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Promoters acessam somente Pedidos e Acompanhamento de avarias." });
  }
  return next({ ctx: { ...ctx, user: ctx.user, comercialUsuario } });
});

export const adminEstoqueProjectProcedure = estoqueModuleProcedure.use(requireGlobalAdmin);
export const estoqueAccessProjectProcedure = estoqueModuleProcedure.use(requireEstoqueAccess);
export const adminAutomacaoModuleProcedure = automacaoModuleProcedure.use(requireGlobalAdmin);
export const adminInteligenciaProjectProcedure = inteligenciaModuleProcedure.use(requireGlobalAdmin);
export const adminVisaoCultivoProjectProcedure = visaoCultivoModuleProcedure.use(requireGlobalAdmin);
export const adminCustosProducaoProjectProcedure = custosProducaoModuleProcedure.use(requireGlobalAdmin);

function isProjetoComTorres(tipo: ProjetoTipo | null | undefined): boolean {
  return tipo === "fazenda_vertical" || tipo === "microverdes";
}

const requireProjetoComTorres = t.middleware(async (opts) => {
  if (!isProjetoComTorres(opts.ctx.projetoTipo)) {
    throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_TIPO_ERR_MSG });
  }
  return opts.next({ ctx: opts.ctx });
});

/** Torres / andares / perfis / furos — fazenda vertical e microverdes (estrutura semelhante). */
export const fazendaVerticalProcedure = projectProcedure.use(requireProjetoComTorres);

const requireHidroponia = t.middleware(async (opts) => {
  if (opts.ctx.projetoTipo !== "hidroponia") {
    throw new TRPCError({ code: "FORBIDDEN", message: PROJETO_TIPO_ERR_MSG });
  }
  return opts.next({ ctx: opts.ctx });
});

export const hidroponiaProcedure = projectProcedure.use(requireHidroponia);

/** Admin global + projeto hidroponia (bancadas, caixas de bancada). */
export const adminHidroponiaProcedure = hidroponiaProcedure.use(requireGlobalAdmin);

/** Admin global + projeto fazenda vertical (torres, estrutura). */
export const adminFazendaVerticalProcedure = fazendaVerticalProcedure.use(requireGlobalAdmin);

const requireComercialModule = t.middleware(async ({ ctx, next, path }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!isCommercialAccessRole(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  const comercialUsuario = await resolveComercialUsuario(ctx.user);
  if (!comercialUsuario) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Nenhum usuário comercial ativo vinculado. Cadastre o mesmo e-mail no módulo ou um perfil ADMIN comercial.",
    });
  }
  if (
    (comercialUsuario.perfil === "PROMOTER" || comercialUsuario.perfil === "VENDEDOR") &&
    !path.startsWith("comercial.pedidos") &&
    !path.startsWith("comercial.varejo")
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Promoters acessam somente Pedidos e Acompanhamento de avarias." });
  }
  let comercialEnv;
  try {
    comercialEnv = getComercialEnv();
  } catch (e) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: e instanceof Error ? e.message : "Módulo comercial não configurado",
    });
  }
  return next({
    ctx: {
      ...ctx,
      prisma: getComercialPrisma(),
      comercialUsuario,
      comercialEnv,
    },
  });
});

/** Projeto com módulo comercial + usuário comercial/admin + sessão Prisma do Comercia. */
export const comercialProcedure = comercialModuleProcedure.use(requireComercialModule);

export function comercialRequirePerfis(...perfis: PerfilUsuario[]) {
  return t.middleware(({ ctx, next }) => {
    const u = ctx.comercialUsuario;
    if (!u || !perfis.includes(u.perfil)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Permissão insuficiente" });
    }
    return next({ ctx });
  });
}
