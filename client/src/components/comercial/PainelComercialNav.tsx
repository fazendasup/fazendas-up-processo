import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  MessageSquareWarning,
  PieChart,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canAccessCommercialPath } from "@/lib/accessPolicy";
import { comercialPath } from "@/lib/comercial/routes";
import { cn } from "@/lib/utils";

export const PAINEL_COMERCIAL_TABS: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/comercial/dashboard", label: "Painel", icon: LayoutGrid },
  { href: "/comercial/clientes", label: "Carteira", icon: Users },
  { href: "/comercial/oportunidades", label: "Oportunidades", icon: Target },
  { href: "/comercial/mensagens", label: "Mensagens", icon: MessageSquareWarning },
  { href: "/comercial/kpis", label: "KPIs", icon: PieChart },
  { href: "/comercial/relatorios", label: "Relatórios", icon: TrendingUp },
];

export function isPainelComercialArea(location: string): boolean {
  const path = location.split("?")[0] ?? "";
  return PAINEL_COMERCIAL_TABS.some(
    (item) => path === item.href || path.startsWith(`${item.href}/`),
  );
}

function isTabActive(location: string, href: string): boolean {
  const path = location.split("?")[0] ?? "";
  if (href === "/comercial/dashboard") {
    return path === "/comercial/dashboard" || path === "/comercial" || path === "/comercial/";
  }
  return path === href || path.startsWith(`${href}/`);
}

export function PainelComercialNav({ perfil }: { perfil: string | null | undefined }) {
  const [location] = useLocation();
  const tabs = PAINEL_COMERCIAL_TABS.filter((item) => canAccessCommercialPath(item.href, perfil));

  if (tabs.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-sm backdrop-blur-sm"
      aria-label="Abas do painel comercial"
    >
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = isTabActive(location, item.href);
        return (
          <Link
            key={item.href}
            href={comercialPath(item.href.replace("/comercial", ""))}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold no-underline transition",
              active
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_20px_-8px_rgba(59,130,246,0.65)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
