// ============================================================
// useRole — Hook para verificar permissões do usuário logado
// ============================================================

import { useAuth } from '@/_core/hooks/useAuth';
import { isCommercialAccessRole, isOperationalAdminRole, isPlatformCommercialRole } from '@shared/const';

export function useRole() {
  const { user, isAuthenticated, loading } = useAuth();

  const isAdmin = isAuthenticated && isOperationalAdminRole(user?.role);
  const isPlatformAdmin = isAuthenticated && isPlatformCommercialRole(user?.role);
  const isOperador = isAuthenticated && user?.role === 'user';
  const isComercial = isAuthenticated && user?.role === 'comercial';
  const canAccessComercial = isAuthenticated && isCommercialAccessRole(user?.role);
  const isLoggedIn = isAuthenticated && !!user;

  return {
    user,
    isAdmin,
    isPlatformAdmin,
    isOperador,
    isComercial,
    canAccessComercial,
    isLoggedIn,
    loading,
    role: user?.role || null,
  };
}
