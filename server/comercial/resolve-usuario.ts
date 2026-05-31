import type { User } from "../../drizzle/schema";
import { isOperationalAdminRole } from "@shared/const";
import { getComercialPrisma } from "./db";

export async function resolveComercialUsuario(erpUser: User) {
  const prisma = getComercialPrisma();
  const email = erpUser.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.usuario.findFirst({
      where: { email, status: "ATIVO" },
    });
    if (byEmail) return byEmail;
  }

  if (isOperationalAdminRole(erpUser.role)) {
    return prisma.usuario.findFirst({
      where: { status: "ATIVO", perfil: "ADMIN" },
      orderBy: { dataCadastro: "asc" },
    });
  }

  if (erpUser.role === "visitante") {
    return prisma.usuario.findFirst({
      where: { status: "ATIVO", perfil: { in: ["COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"] } },
      orderBy: { dataCadastro: "asc" },
    });
  }

  if (erpUser.role === "comercial") {
    return prisma.usuario.findFirst({
      where: { status: "ATIVO", perfil: { in: ["PROMOTER", "VENDEDOR", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"] } },
      orderBy: { dataCadastro: "asc" },
    });
  }

  return null;
}
