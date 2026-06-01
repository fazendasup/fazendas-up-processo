import Header from "@/components/Header";
import { isPainelComercialArea, PainelComercialNav } from "@/components/comercial/PainelComercialNav";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import type { ReactNode } from "react";

export function ComercialLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  const showPainelNav = isPainelComercialArea(location);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      {showPainelNav ? (
        <div className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[100rem] px-3 py-2 sm:px-5">
            <PainelComercialNav perfil={me.data?.perfil} />
          </div>
        </div>
      ) : null}
      <main className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
