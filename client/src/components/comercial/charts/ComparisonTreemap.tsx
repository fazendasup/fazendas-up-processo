import { useId, useMemo, type ReactElement } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import { CHART, buildChartTheme } from "./chartTheme";

type Leaf = { name: string; value: number };

type TreemapNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  depth: number;
  index: number;
  value?: number;
};

function TreemapTile({
  x,
  y,
  width,
  height,
  name,
  depth,
  index,
  value,
  formatValue,
  gradPrefix,
}: TreemapNodeProps & { formatValue: (n: number) => string; gradPrefix: string }) {
  const { theme } = useTheme();
  if (depth === 0) return null;
  if (width < 2 || height < 2) return null;
  const v = value ?? 0;
  const fill = `url(#${gradPrefix}-${index % 5})`;
  const r = Math.min(12, width / 8, height / 8);
  const showLabel = width > 56 && height > 36;
  const showValue = width > 72 && height > 52;
  const labelFill = theme === "dark" ? "#f8fafc" : "#0f172a";
  const valueFill = theme === "dark" ? "#94a3b8" : "#475569";
  const stroke = theme === "dark" ? "rgba(148,163,184,0.35)" : "rgba(71,85,105,0.35)";
  const shadow = theme === "dark" ? "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35))" : "drop-shadow(0 2px 8px rgba(15, 23, 42, 0.12))";

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={r}
        ry={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        style={{ filter: shadow }}
      />
      {showLabel ? (
        <text
          x={x + width / 2}
          y={showValue ? y + height / 2 - 6 : y + height / 2 + 4}
          textAnchor="middle"
          fill={labelFill}
          fontSize={Math.min(13, width / 10)}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          {String(name ?? "").length > 18 ? `${String(name).slice(0, 16)}…` : name}
        </text>
      ) : null}
      {showValue ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 14}
          textAnchor="middle"
          fill={valueFill}
          fontSize={Math.min(12, width / 12)}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {formatValue(v)}
        </text>
      ) : null}
    </g>
  );
}

function TreemapDefs({ gradPrefix }: { gradPrefix: string }) {
  return (
    <defs>
      <linearGradient id={`${gradPrefix}-0`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#059669" />
        <stop offset="100%" stopColor="#6EE7B7" />
      </linearGradient>
      <linearGradient id={`${gradPrefix}-1`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="100%" stopColor="#93C5FD" />
      </linearGradient>
      <linearGradient id={`${gradPrefix}-2`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#047857" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
      <linearGradient id={`${gradPrefix}-3`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#172554" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
      <linearGradient id={`${gradPrefix}-4`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={CHART.green.mid} />
        <stop offset="100%" stopColor="#A7F3D0" />
      </linearGradient>
    </defs>
  );
}

type Props = {
  data: Leaf[];
  formatValue: (n: number) => string;
  /** 1 = mais “alongado”; valores típicos 4/3 a 1.6 */
  aspectRatio?: number;
};

/**
 * Comparação de partes por **área** (treemap), sem barras — leitura de proporção como em dashboards financeiros.
 */
export function ComparisonTreemap({ data, formatValue, aspectRatio = 4 / 3 }: Props) {
  const { theme } = useTheme();
  const chartTooltipProps = useMemo(() => buildChartTheme(theme).chartTooltipProps, [theme]);
  const safe = useMemo(() => data.filter((d) => d.value > 0), [data]);
  const gradPrefix = `tm${useId().replace(/:/g, "")}`;

  if (safe.length === 0) {
    return (
      <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-500">
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={safe}
        dataKey="value"
        nameKey="name"
        aspectRatio={aspectRatio}
        type="flat"
        isAnimationActive
        animationDuration={600}
        animationEasing="ease-out"
        stroke="transparent"
        // Recharts typings exigem ReactElement; o render prop devolve componente válido em runtime.
        content={
          ((props: TreemapNodeProps) => (
            <TreemapTile {...props} formatValue={formatValue} gradPrefix={gradPrefix} />
          )) as unknown as ReactElement
        }
      >
        <TreemapDefs gradPrefix={gradPrefix} />
        <Tooltip {...chartTooltipProps} formatter={(v: number) => formatValue(v)} />
      </Treemap>
    </ResponsiveContainer>
  );
}
