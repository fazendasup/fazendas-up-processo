// ============================================================
// ProtectedRoute — exige login; opcional role admin
// ============================================================

import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { isCommercialAccessRole, isOperationalAdminRole, isPlatformCommercialRole, isProcessAccessRole } from "@shared/const";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** `processo` bloqueia usuários somente-comerciais; `comercial` permite comercial/admin/plataforma. */
  requiredRole?: "user" | "processo" | "admin" | "platform_admin" | "comercial";
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, requiredRole = "user", fallback }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && user) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname.split("?")[0] ?? "";
    if (path === "/login" || path === "/login/") return;
    window.location.replace("/login");
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">A redirecionar para o login…</p>
        </div>
      </div>
    );
  }

  if (requiredRole === "processo" && !isProcessAccessRole(user.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">Esta conta tem acesso somente às áreas liberadas para seu perfil.</p>
          <Button variant="outline" asChild>
            <a href="/projetos">Projetos</a>
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole === "admin" && !isOperationalAdminRole(user.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">Esta página é acessível apenas para administradores.</p>
          <Button variant="outline" asChild>
            <a href="/projetos">Projetos</a>
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole === "platform_admin" && !isPlatformCommercialRole(user.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esta área é exclusiva da equipa da plataforma (contratação de módulos).
          </p>
          <Button variant="outline" asChild>
            <a href="/">Início</a>
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole === "comercial" && !isCommercialAccessRole(user.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">Esta área é exclusiva para usuários comerciais e administradores.</p>
          <Button variant="outline" asChild>
            <a href="/projetos">Projetos</a>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
