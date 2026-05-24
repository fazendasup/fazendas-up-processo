import Header from "@/components/Header";
import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const PEDIDOS_NAV = [
  { href: "/comercial/pedidos", label: "Pedidos" },
  { href: "/comercial/pedidos-historico", label: "Histórico" },
] as const;

const CENTRAL_NAV = [
  { href: "/comercial/dashboard", label: "Painel", end: true },
  { href: "/comercial/clientes", label: "Carteira" },
  { href: "/comercial/oportunidades", label: "Oportunidades" },
  { href: "/comercial/mensagens", label: "Mensagens" },
  { href: "/comercial/kpis", label: "KPIs" },
  { href: "/comercial/configuracoes", label: "Configurações" },
] as const;

function navClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  ].join(" ");
}

export function ComercialLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  const isPedidosArea = location === "/comercial/pedidos" || location.startsWith("/comercial/pedidos-");
  const nav = me.data?.perfil === "VENDEDOR" ? PEDIDOS_NAV : isPedidosArea ? PEDIDOS_NAV : CENTRAL_NAV;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <div className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <nav className="flex flex-wrap items-center gap-0.5" aria-label={isPedidosArea ? "Pedidos comerciais" : "Central comercial"}>
            {nav.map(item => {
              const active =
                location === item.href ||
                (item.href !== "/comercial/dashboard" &&
                  item.href !== "/comercial/pedidos" &&
                  location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={navClass(active)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair do supervisório</span>
          </button>
        </div>
      </div>
      <main className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6 md:px-6">{children}</div>
      </main>
    </div>
  );
}

