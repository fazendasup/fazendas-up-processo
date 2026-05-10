import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useProjeto } from "@/contexts/ProjetoContext";

export type ProjetoTipoGuard = "fazenda_vertical" | "hidroponia" | "microverdes";

const MESSAGES: Record<ProjetoTipoGuard, string> = {
  fazenda_vertical: "Funcionalidade disponível apenas para projetos de fazenda vertical.",
  hidroponia: "Funcionalidade disponível apenas para projetos de hidroponia.",
  microverdes: "Funcionalidade disponível apenas para projetos de microverdes.",
};

const TORRE_TIPOS: ProjetoTipoGuard[] = ["fazenda_vertical", "microverdes"];

/**
 * Redireciona para / se o projeto ativo não for de um dos tipos esperados.
 * Use `tiposTorre` para rotas partilhadas entre fazenda vertical e microverdes (torres/andares).
 */
export function TipoProjetoRouteGuard({
  tipo,
  tiposTorre,
  children,
}: {
  tipo?: ProjetoTipoGuard;
  tiposTorre?: boolean;
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();
  const { activeProjeto, ready } = useProjeto();

  const permitidos: ProjetoTipoGuard[] | null = useMemo(() => {
    if (tiposTorre === true) return TORRE_TIPOS;
    if (tipo != null) return [tipo];
    return null;
  }, [tipo, tiposTorre]);

  useEffect(() => {
    if (!ready || !activeProjeto || !permitidos) return;
    const t = activeProjeto.tipo as ProjetoTipoGuard;
    if (!permitidos.includes(t)) {
      const msg =
        tiposTorre === true
          ? "Esta área é para torres (fazenda vertical ou microverdes)."
          : tipo != null
            ? MESSAGES[tipo]
            : "Tipo de projeto não suportado.";
      toast.info(msg);
      setLocation("/");
    }
  }, [ready, activeProjeto, permitidos, tipo, tiposTorre, setLocation]);

  if (!ready || !activeProjeto || !permitidos) {
    return null;
  }
  if (!permitidos.includes(activeProjeto.tipo as ProjetoTipoGuard)) {
    return null;
  }

  return <>{children}</>;
}
