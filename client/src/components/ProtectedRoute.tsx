// ============================================================
// ProtectedRoute — Controle de acesso por role
// ============================================================

import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin'; // 'user' = operador+admin, 'admin' = só admin
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, requiredRole = 'user', fallback }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <LogIn className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Login Necessário</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Você precisa estar logado para acessar esta funcionalidade.
          </p>
          <Button asChild>
            <a href="/login">Fazer Login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esta página é acessível apenas para administradores.
          </p>
          <Button variant="outline" asChild>
            <a href="/">Voltar ao Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
