import { Spinner } from "@/components/ui/spinner";

/** Fallback enquanto o chunk da rota carrega (code-splitting). */
export function RoutePageFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background" aria-busy="true">
      <Spinner className="size-8 text-primary" aria-label="Carregando" />
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}
