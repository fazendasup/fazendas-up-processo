import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissPwaInstallHint,
  isIosSafari,
  isPwaStandalone,
  wasPwaInstallDismissed,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

export function PwaInstallHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPwaStandalone() || wasPwaInstallDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari()) {
      const timer = window.setTimeout(() => setVisible(true), 2500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const close = () => {
    dismissPwaInstallHint();
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    close();
  };

  if (!visible || isPwaStandalone()) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-900 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instale o Fazendas UP</p>
          {deferredPrompt ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione à tela inicial para abrir em tela cheia, como um app, sem baixar pela loja.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No iPhone, toque em <Share className="inline h-3.5 w-3.5" /> Compartilhar e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {deferredPrompt ? (
              <Button size="sm" onClick={() => void install()}>
                Instalar agora
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={close}>
              Agora não
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          onClick={close}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
