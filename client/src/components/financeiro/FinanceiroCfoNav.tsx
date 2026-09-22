import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type FinanceiroCfoNavPage =
  | "dashboard"
  | "comparativo"
  | "analise"
  | "compras-nf";

const ITENS: Array<{
  id: FinanceiroCfoNavPage;
  href: string;
  label: string;
}> = [
  { id: "dashboard", href: "/financeiro-cfo", label: "Dashboard" },
  {
    id: "comparativo",
    href: "/financeiro-cfo/comparativo",
    label: "Comparativo por rúbrica",
  },
  {
    id: "analise",
    href: "/financeiro-cfo/analise",
    label: "Análise Conta Azul",
  },
  {
    id: "compras-nf",
    href: "/financeiro-cfo/compras-nf",
    label: "Compras por NF",
  },
];

/** Navegação entre as páginas do Financeiro CFO, com destaque da página ativa. */
export function FinanceiroCfoNav({
  active,
  className,
}: {
  active: FinanceiroCfoNavPage;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1",
        className,
      )}
      aria-label="Navegação financeiro"
    >
      {ITENS.map(item => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
