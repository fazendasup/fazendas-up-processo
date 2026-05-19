import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { ModuloContratavel } from "../../shared/const";
import type { PrismaClient, Usuario } from "../comercial/generated/prisma";
import type { ComercialEnv } from "../comercial/env";
import { sdk } from "./sdk";

export type ProjetoTipo = "fazenda_vertical" | "hidroponia" | "microverdes";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  projetoId: number | null;
  projetoTipo: ProjetoTipo | null;
  /** Preenchido após `requireProjetoMiddleware` quando o projeto está ativo. */
  projetoModulos: Record<ModuloContratavel, boolean> | null;
  /** Módulo Central Comercial (após `comercialProcedure`). */
  prisma?: PrismaClient;
  comercialUsuario?: Usuario;
  comercialEnv?: ComercialEnv;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    projetoId: null,
    projetoTipo: null,
    projetoModulos: null,
  };
}
