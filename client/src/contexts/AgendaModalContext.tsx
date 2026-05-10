import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AgendaDoDiaModal } from "@/components/AgendaDoDiaModal";
import type { AgendaFocus } from "@/lib/agendaFocus";

type AgendaCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Abre o modal; por defeito mostra a agenda completa. Passar o foco do alerta para filtrar. */
  openAgenda: (focus?: AgendaFocus) => void;
  focus: AgendaFocus;
};

const AgendaModalContext = createContext<AgendaCtx | null>(null);

export function AgendaModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<AgendaFocus>("full");

  const openAgenda = useCallback((f: AgendaFocus = "full") => {
    setFocus(f);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) setFocus("full");
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen: handleOpenChange,
      openAgenda,
      focus,
    }),
    [open, handleOpenChange, openAgenda, focus],
  );

  return (
    <AgendaModalContext.Provider value={value}>
      {children}
      <AgendaDoDiaModal open={open} focus={focus} onOpenChange={handleOpenChange} />
    </AgendaModalContext.Provider>
  );
}

export function useAgendaModal(): AgendaCtx {
  const ctx = useContext(AgendaModalContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
      openAgenda: () => {},
      focus: "full",
    };
  }
  return ctx;
}
