import { CHART } from "./chartTheme";

type BarVariant = "green" | "blue";

/** Gradientes verticais para barras (preenchimento sofisticado) */
export function ChartBarFillDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-bar-green`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={CHART.green.dark} stopOpacity={0.92} />
        <stop offset="55%" stopColor={CHART.green.mid} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART.green.light} stopOpacity={1} />
      </linearGradient>
      <linearGradient id={`${prefix}-bar-blue`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor={CHART.blue.dark} stopOpacity={0.95} />
        <stop offset="50%" stopColor={CHART.blue.mid} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART.blue.light} stopOpacity={1} />
      </linearGradient>
    </defs>
  );
}

export function barFillUrl(prefix: string, variant: BarVariant) {
  return `url(#${prefix}-bar-${variant})`;
}

/** Gradiente sob a linha (área) */
export function ChartAreaUnderLineDefs({ prefix, colorMid = CHART.green.mid }: { prefix: string; colorMid?: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colorMid} stopOpacity={0.28} />
        <stop offset="65%" stopColor={colorMid} stopOpacity={0.06} />
        <stop offset="100%" stopColor={colorMid} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

const PIE_STOPS: { c1: string; c2: string }[] = [
  { c1: "#047857", c2: "#34D399" },
  { c1: "#1E3A8A", c2: "#60A5FA" },
  { c1: "#B45309", c2: "#FBBF24" },
  { c1: "#4F46E5", c2: "#A5B4FC" },
];

/** Cor sólida para legenda HTML alinhada às fatias do gráfico */
export function pieLegendDotColor(index: number): string {
  return PIE_STOPS[index % PIE_STOPS.length]!.c2;
}

/**
 * Preenchimento sólido das fatias — preferível a `pieSliceFillUrl` (gradiente SVG),
 * que em alguns casos não aplica fill no Recharts e o donut fica “vazio”.
 */
export function pieSliceSolidFill(index: number): string {
  const { c1 } = PIE_STOPS[index % PIE_STOPS.length]!;
  return c1;
}

/** Um gradiente radial por fatia da pizza */
export function ChartPieSliceDefs({ prefix, count }: { prefix: string; count: number }) {
  return (
    <defs>
      {Array.from({ length: count }).map((_, i) => {
        const { c1, c2 } = PIE_STOPS[i % PIE_STOPS.length]!;
        return (
          <radialGradient key={i} id={`${prefix}-pie-${i}`} cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor={c2} stopOpacity={1} />
            <stop offset="100%" stopColor={c1} stopOpacity={1} />
          </radialGradient>
        );
      })}
    </defs>
  );
}

export function pieSliceFillUrl(prefix: string, index: number) {
  return `url(#${prefix}-pie-${index})`;
}
