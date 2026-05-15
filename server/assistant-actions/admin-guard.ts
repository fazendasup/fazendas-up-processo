import { TRPCError } from "@trpc/server";

const MSG = "Esta ação requer perfil de administrador do projeto.";

export function adminOnlyPreview(isAdmin: boolean): { error: string } | null {
  if (!isAdmin) return { error: MSG };
  return null;
}

export function assertAdminExecute(isAdmin: boolean): void {
  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: MSG });
  }
}
