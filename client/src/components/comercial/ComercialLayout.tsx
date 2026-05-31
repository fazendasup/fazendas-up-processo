import Header from "@/components/Header";
import { useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { canAccessCommercialPath, homeForCommercialPerfil } from "@/lib/accessPolicy";

export function ComercialLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, {
    staleTime: 60_000,
  });
  const perfil = me.data?.perfil ?? null;
  useEffect(() => {
    if (!perfil) return;
    if (!canAccessCommercialPath(location, perfil)) {
      window.location.replace(homeForCommercialPerfil(perfil));
    }
  }, [perfil, location]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
