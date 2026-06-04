import { isOperationalAdminRole, type AppUserRole } from "@shared/const";

export type ComercialPerfil = "VENDEDOR" | "PROMOTER" | "OPERACOES" | "COMERCIAL" | "GERENTE_COMERCIAL" | "ADMIN";

export function isPromoterPerfil(perfil: string | null | undefined): boolean {
  return perfil === "PROMOTER" || perfil === "VENDEDOR";
}

/** Destino logo após login (seleção de projeto para admin; home do módulo para comercial). */
export function homeForUserRole(role: string | null | undefined): string {
  if (isOperationalAdminRole(role)) return "/projetos";
  if (role === "comercial") return "/comercial";
  return "/";
}

/** Painel operacional quando o projeto já está selecionado (Dashboard no menu). */
export function dashboardPathForUserRole(role: string | null | undefined): string {
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
    const allowed = [
      "/comercial/dashboard",
      "/comercial/clientes",
      "/comercial/oportunidades",
      "/comercial/mensagens",
      "/comercial/kpis",
      "/comercial/relatorios",
      "/comercial/execucoes",
      "/estoque",
      "/comercial/estoque-vivo",
      "/comercial/pedidos",
      "/comercial/acompanhamento-avarias",
      "/comercial/varejo",
      "/custos-producao",
      "/receitas",
      "/cadastros",
      "/ciclos",
    ];
    return path === "/comercial" || allowed.some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`));
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
