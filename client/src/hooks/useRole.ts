// ============================================================
// useRole — Hook para verificar permissões do usuário logado
// ============================================================

import { useAuth } from '@/_core/hooks/useAuth';

export function useRole() {
  const { user, isAuthenticated, loading } = useAuth();

  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isOperador = isAuthenticated && user?.role === 'user';
  const isLoggedIn = isAuthenticated && !!user;

  return {
    user,
    isAdmin,
    isOperador,
    isLoggedIn,
    loading,
    role: user?.role || null,
  };
}
