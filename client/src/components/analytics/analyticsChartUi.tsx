import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Margens consistentes com o “chrome” dos cartões Aurora. */
export const ANALYTICS_MARGIN = { top: 8, right: 14, left: 6, bottom: 8 };

/**
 * Área de plotagem: bordo suave + fundo — alinha o gráfico ao restante do dashboard.
 */
export function ChartPlotChrome({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/15 p-2 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.35)]",
        "[&_.recharts-cartesian-grid-horizontal_line]:stroke-border/45 [&_.recharts-cartesian-grid-vertical_line]:stroke-border/35",
        className
      )}
    >
      {children}
    </div>
  );
}

export type LollipopPayload = { taxa?: number; lollipopInvert?: boolean };

function lollipopFill(t: number, invert: boolean): string {
  if (!invert) {
    return t >= 80 ? "hsl(142 71% 45%)" : t >= 60 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";
  }
  return t > 20 ? "hsl(0 84% 60%)" : t > 10 ? "hsl(38 92% 50%)" : "hsl(142 71% 45%)";
}

/** Haste + ponto (lollipop) para barras horizontais 0–100. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape API do Recharts
export function HorizontalLollipopShape(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: LollipopPayload;
  };
  const taxa = Number(payload?.taxa ?? 0);
  const invert = Boolean(payload?.lollipopInvert);
  const fill = lollipopFill(taxa, invert);
  const cy = y + height / 2;
  const span100 = taxa > 0 ? (width / taxa) * 100 : Math.max(width, 0);

  return (
    <g className="recharts-layer">
      <line
        x1={x}
        y1={cy}
        x2={x + span100}
        y2={cy}
        stroke="hsl(var(--muted-foreground) / 0.22)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1={cy}
        x2={x + width}
        y2={cy}
        stroke={fill}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <circle
        cx={x + width}
        cy={cy}
        r={8}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    </g>
  );
}

/** Estado vazio dentro da área do gráfico (não só texto plano). */
export function ChartEmptyWell({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/25 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground max-w-sm">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Radar só faz sentido com ≥3 vértices com dados; senão barras horizontais leem melhor. */
export function shouldUseRadar(rows: { value: number }[]): boolean {
  const positive = rows.filter((r) => r.value > 0).length;
  return rows.length >= 3 && positive >= 2;
}
