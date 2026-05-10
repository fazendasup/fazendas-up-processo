import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { MODULO_NAO_CONTRATADO_MSG } from "@shared/const";
import type { ModuloContratavel } from "@shared/const";
import { useProjeto } from "@/contexts/ProjetoContext";

/**
 * Redireciona para `/` se o módulo não estiver contratado para o projeto ativo.
 */
export function ModuloProjetoRouteGuard({
  modulo,
  children,
}: {
  modulo: ModuloContratavel;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const { activeProjetoId, ready, modulosAtivos } = useProjeto();

  const permitido = useMemo(() => {
    if (activeProjetoId == null || modulosAtivos == null) return null;
    return modulosAtivos[modulo] === true;
  }, [activeProjetoId, modulosAtivos, modulo]);

  useEffect(() => {
    if (!ready || activeProjetoId == null) return;
    if (modulosAtivos == null) return;
    if (permitido === false) {
      toast.info(MODULO_NAO_CONTRATADO_MSG);
      setLocation("/");
    }
  }, [ready, activeProjetoId, modulosAtivos, permitido, setLocation]);

  if (!ready || activeProjetoId == null) {
    return null;
  }
  if (modulosAtivos == null) {
    return (
      <div className="container py-16 text-center text-sm text-muted-foreground" aria-busy="true">
        A carregar permissões do projeto…
      </div>
    );
  }
  if (!modulosAtivos[modulo]) {
    return null;
  }

  return <>{children}</>;
}
