import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AgendaFocus } from "@/lib/agendaFocus";

/** O painel da agenda é pesado (+1000 linhas); só carrega o chunk quando o usuário abre o modal pela 1.ª vez. */
const AgendaDoDiaModal = lazy(async () => {
  const m = await import(/* @vite-ignore */ "@/components/AgendaDoDiaModal");
  return { default: m.AgendaDoDiaModal };
});

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
  /** Mantém o modal montado depois da 1.ª abertura para não voltar a pagar o lazy-load ao fechar. */
  const [modalEverOpened, setModalEverOpened] = useState(false);

  const openAgenda = useCallback((f: AgendaFocus = "full") => {
    setModalEverOpened(true);
    setFocus(f);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((v: boolean) => {
    if (v) setModalEverOpened(true);
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
      {modalEverOpened && (
        <Suspense
          fallback={
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80"
              aria-busy="true"
              aria-label="Carregando agenda"
            >
              <Spinner className="size-10 text-primary" />
            </div>
          }
        >
          <AgendaDoDiaModal open={open} focus={focus} onOpenChange={handleOpenChange} />
        </Suspense>
      )}
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
