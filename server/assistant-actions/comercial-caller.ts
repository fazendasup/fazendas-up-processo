import type { User } from "../../drizzle/schema";
import { getComercialEnv } from "../comercial/env";
import { getComercialPrisma } from "../comercial/db";
import { getComercialOwnerProjetoId } from "../comercial/owner-projeto";
import { resolveComercialUsuario } from "../comercial/resolve-usuario";
import type { TrpcContext } from "../_core/context";
import { appRouter } from "../routers";
import { TRPCError } from "@trpc/server";
import type { ComercialPedidosAssistantProcedure } from "../comercial/assistant-pedidos-allowlist";

/** Caller tRPC com o mesmo isolamento do módulo comercial (como a UI de Pedidos). */
export async function createComercialPedidosCaller(user: User, projetoId: number) {
  const ownerProjetoId = await getComercialOwnerProjetoId();
  if (ownerProjetoId == null || projetoId !== ownerProjetoId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "O módulo comercial só pode ser alterado no projeto comercial principal (COMERCIAL_PROJETO_ID).",
    });
  }
  const comercialUsuario = await resolveComercialUsuario(user);
  if (!comercialUsuario) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Nenhum usuário comercial ativo vinculado ao usuário logado.",
    });
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

  const ctx: TrpcContext = {
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user,
    projetoId,
    projetoTipo: null,
    projetoUsuarioRole: "admin",
    projetoModulos: {
      comercial: true,
      estoque: false,
      automacao: false,
      inteligencia: false,
      visao_cultivo: false,
      custos_producao: false,
    },
    prisma: getComercialPrisma(),
    comercialUsuario,
    comercialEnv,
  };

  return appRouter.createCaller(ctx);
}

export async function runComercialPedidosMutation(
  user: User,
  projetoId: number,
  procedure: ComercialPedidosAssistantProcedure,
  input: unknown,
): Promise<unknown> {
  const caller = await createComercialPedidosCaller(user, projetoId);
  const fn = caller.comercial.pedidos[procedure] as (input: unknown) => Promise<unknown>;
  return fn(input);
}
