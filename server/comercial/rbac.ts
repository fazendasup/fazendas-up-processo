import type { PerfilUsuario } from "./generated/prisma/index";
import { TRPCError } from "@trpc/server";

const ordem: Record<PerfilUsuario, number> = {
  OPERACOES: 1,
  COMERCIAL: 2,
  GERENTE_COMERCIAL: 3,
  ADMIN: 4,
};

export function assertPerfil(usuarioPerfil: PerfilUsuario, minimos: PerfilUsuario[]) {
  const ok = minimos.some(p => ordem[usuarioPerfil] >= ordem[p]);
  if (!ok) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Permissão insuficiente" });
  }
}

export function podeGerenciarUsuarios(perfil: PerfilUsuario) {
  return perfil === "ADMIN" || perfil === "GERENTE_COMERCIAL";
}

export function podeAprovarMensagens(perfil: PerfilUsuario) {
  return perfil === "ADMIN" || perfil === "GERENTE_COMERCIAL" || perfil === "COMERCIAL";
}
