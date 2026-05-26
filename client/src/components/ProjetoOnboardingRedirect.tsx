import { useEffect } from "react";
import { useLocation } from "wouter";
import { isCommercialAccessRole, isOperationalAdminRole } from "@shared/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProjeto } from "@/contexts/ProjetoContext";

function landingForUserRole(role: string | null | undefined): string {
  if (isCommercialAccessRole(role) && !isOperationalAdminRole(role)) {
    return "/comercial/pedidos";
  }
  return "/";
}

/**
 * Só após escolher ou criar projeto em /projetos é que o restante da app fica acessível.
 * Sem projeto ativo, admins escolhem em /projetos; usuários não admin entram direto no projeto vinculado.
 */
export function ProjetoOnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { projetos, activeProjetoId, ready, switchProjeto } = useProjeto();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (authLoading || !user || !ready) return;
    const path = location.split("?")[0] ?? "";
    if (path === "/login" || path === "/login/") return;
    if (path === "/privacidade" || path === "/privacidade/") return;
    const isProjetos = path === "/projetos";
    const isAdmin = isOperationalAdminRole(user.role);
    if (isProjetos && isAdmin) return;

    if (!isAdmin && activeProjetoId != null && isProjetos) {
      setLocation(landingForUserRole(user.role), { replace: true });
      return;
    }

    const projetosAtivos = projetos.filter(p => p.status === "ativo");
    if (!isAdmin && activeProjetoId == null && projetosAtivos.length > 0) {
      switchProjeto(projetosAtivos[0]!.id);
      setLocation(landingForUserRole(user.role), { replace: true });
      return;
    }

    const precisaSelecionar = projetos.length === 0 || activeProjetoId == null;
    if (!precisaSelecionar) return;
    if (!isAdmin && isProjetos) return;
    setLocation("/projetos", { replace: true });
  }, [authLoading, user, ready, projetos, activeProjetoId, location, setLocation, switchProjeto]);

  return <>{children}</>;
}
