import { isOperationalAdminRole, type AppUserRole } from "@shared/const";

export type ComercialPerfil = "VENDEDOR" | "PROMOTER" | "OPERACOES" | "COMERCIAL" | "GERENTE_COMERCIAL" | "ADMIN";

export function isPromoterPerfil(perfil: string | null | undefined): boolean {
  return perfil === "PROMOTER" || perfil === "VENDEDOR";
}

export function homeForUserRole(role: string | null | undefined): string {
  if (isOperationalAdminRole(role)) return "/projetos";
  if (role === "comercial") return "/comercial";
  return "/";
}

export function homeForCommercialPerfil(perfil: string | null | undefined): string {
  return isPromoterPerfil(perfil) ? "/comercial/acompanhamento-avarias" : "/comercial/dashboard";
}

export function canAccessCommercialPath(path: string, perfil: string | null | undefined): boolean {
  if (isPromoterPerfil(perfil)) {
    return path === "/comercial/acompanhamento-avarias" || path === "/comercial/pedidos" || path === "/comercial/varejo";
  }
  if (perfil === "COMERCIAL" || perfil === "OPERACOES") {
    return [
      "/comercial",
      "/comercial/dashboard",
      "/comercial/estoque-vivo",
      "/comercial/pedidos",
      "/comercial/acompanhamento-avarias",
      "/comercial/varejo",
      "/custos-producao",
    ].includes(path);
  }
  return true;
}

export function roleLabel(role: AppUserRole | string | null | undefined, comercialPerfil?: string | null): string {
  if (role === "platform_admin") return "Equipe FUP";
  if (isOperationalAdminRole(role)) return "Administrador";
  if (role === "comercial") return isPromoterPerfil(comercialPerfil) ? "Promoter" : "Comercial";
  if (role === "visitante") return "Visitante";
  return "Operador";
}
