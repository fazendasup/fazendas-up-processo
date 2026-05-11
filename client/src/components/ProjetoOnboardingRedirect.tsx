import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProjeto } from "@/contexts/ProjetoContext";

/**
 * Só após escolher ou criar projeto em /projetos é que o restante da app fica acessível.
 * Sem projeto ativo (cookie/localStorage), mantém o utilizador em /projetos.
 */
export function ProjetoOnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { projetos, activeProjetoId, ready } = useProjeto();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (authLoading || !user || !ready) return;
    const path = location.split("?")[0] ?? "";
    if (path === "/login" || path === "/login/") return;
    if (path === "/privacidade" || path === "/privacidade/") return;
    if (path === "/projetos") return;

    const precisaSelecionar = projetos.length === 0 || activeProjetoId == null;
    if (!precisaSelecionar) return;
    setLocation("/projetos", { replace: true });
  }, [authLoading, user, ready, projetos.length, activeProjetoId, location, setLocation]);

  return <>{children}</>;
}
