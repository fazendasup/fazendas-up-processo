/** Recharts — paletas para tema claro e escuro */

export type ThemeMode = "light" | "dark";

export const CHART = {
  green: { light: "#6EE7B7", mid: "#34D399", dark: "#059669", stroke: "#10B981" },
  blue: { light: "#93C5FD", mid: "#38BDF8", dark: "#0284C7", stroke: "#0EA5E9" },
} as const;

const slate = {
  dark: { grid: "#334155", tick: "#94a3b8", axis: "#475569" },
  /** Eixos e grelha mais escuros no tema claro — melhor leitura */
  light: { grid: "#cbd5e1", tick: "#475569", axis: "#94a3b8" },
};

function tooltipProps(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      cursor: { fill: "rgba(34, 211, 238, 0.06)" },
      contentStyle: {
        borderRadius: 12,
        border: "1px solid rgba(34, 211, 238, 0.25)",
        boxShadow: "0 16px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.06) inset",
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(12px)",
        padding: "10px 14px",
      },
      labelStyle: { color: "#f1f5f9", fontWeight: 700, fontSize: 12, marginBottom: 4 },
      itemStyle: { color: "#cbd5e1", fontSize: 13, fontWeight: 600 },
      animationDuration: 200,
    };
  }
  return {
    cursor: { fill: "rgba(30, 64, 175, 0.06)" },
    contentStyle: {
      borderRadius: 12,
      border: "1px solid rgba(226, 232, 240, 0.95)",
      boxShadow: "0 12px 40px -14px rgba(15, 23, 42, 0.12)",
      background: "rgba(255, 255, 255, 0.97)",
      backdropFilter: "blur(10px)",
      padding: "10px 14px",
    },
    labelStyle: { color: "#0f172a", fontWeight: 700, fontSize: 12, marginBottom: 4 },
    itemStyle: { color: "#334155", fontSize: 13, fontWeight: 600 },
    animationDuration: 200,
  };
}

function cursorLine(mode: ThemeMode) {
  if (mode === "dark") {
    return { stroke: "#22d3ee", strokeWidth: 1, strokeOpacity: 0.45, strokeDasharray: "4 4" };
  }
  return { stroke: "#1d4ed8", strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: "4 4" };
}

/** Props derivadas do tema da aplicação (use com useTheme().theme) */
export function buildChartTheme(mode: ThemeMode) {
  const s = mode === "dark" ? slate.dark : slate.light;
  const grid = {
    stroke: s.grid,
    strokeOpacity: mode === "dark" ? 0.45 : 0.65,
    vertical: false as const,
    horizontal: true,
  };
  const axisX = {
    tick: { fontSize: 11, fill: s.tick, fontWeight: 500 },
    tickLine: false,
    axisLine: { stroke: s.axis, strokeWidth: 1 },
    tickMargin: 8,
  };
  const axisY = {
    tick: { fontSize: 11, fill: s.tick, fontWeight: 500 },
    tickLine: false,
    axisLine: false,
    tickMargin: 6,
  };
  const axisYCategory = {
    ...axisY,
    width: 128,
    tick: { fontSize: 10, fill: s.tick, fontWeight: 500 },
  };
  return {
    chartGridProps: grid,
    chartAxisXProps: axisX,
    chartAxisYProps: axisY,
    chartAxisYCategoryProps: axisYCategory,
    chartTooltipProps: tooltipProps(mode),
    chartTooltipCursorLine: cursorLine(mode),
  };
}

const _darkDefaults = buildChartTheme("dark");
export const chartGridProps = _darkDefaults.chartGridProps;
export const chartAxisXProps = _darkDefaults.chartAxisXProps;
export const chartAxisYProps = _darkDefaults.chartAxisYProps;
export const chartAxisYCategoryProps = _darkDefaults.chartAxisYCategoryProps;
export const chartTooltipProps = _darkDefaults.chartTooltipProps;
export const chartTooltipCursorLine = _darkDefaults.chartTooltipCursorLine;

export const chartAnimation = { isAnimationActive: true as const, animationDuration: 450, animationEasing: "ease-out" as const };
