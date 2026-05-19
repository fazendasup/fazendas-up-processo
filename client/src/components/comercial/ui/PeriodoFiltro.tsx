import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { hojeIsoLocal, labelPreset, type PeriodoPreset } from "@/lib/comercial/periodo";

const PRESETS: { id: PeriodoPreset; label: string }[] = [
  { id: "semana_atual", label: "Esta semana" },
  { id: "mes_atual", label: "Este mês" },
  { id: "todo_periodo", label: "Todo o período" },
  { id: "ultimos_12_meses", label: "Últimos 12 meses" },
  { id: "personalizado", label: "Personalizado" },
];

type Props = {
  preset: PeriodoPreset;
  onPresetChange: (p: PeriodoPreset) => void;
  customInicio: string;
  customFim: string;
  onCustomInicio: (v: string) => void;
  onCustomFim: (v: string) => void;
  className?: string;
};

export function PeriodoFiltro({
  preset,
  onPresetChange,
  customInicio,
  customFim,
  onCustomInicio,
  onCustomFim,
  className = "",
}: Props) {
  const hoje = hojeIsoLocal();

  return (
    <motion.div className={`flex flex-col gap-2 ${className}`}>
      <motion.div layout className="flex flex-wrap rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/20">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPresetChange(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-200 ${
              preset === id
                ? "bg-gradient-to-r from-cyan-600/25 to-emerald-500/20 text-slate-900 shadow-sm dark:from-cyan-500/30 dark:to-emerald-500/20 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {preset === "personalizado" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-50/50 px-3 py-2 dark:border-cyan-400/20 dark:bg-cyan-950/20">
          <Calendar className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden />
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            De
            <input
              type="date"
              value={customInicio}
              max={customFim || hoje}
              onChange={(e) => onCustomInicio(e.target.value)}
              className="rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-sm font-medium text-slate-900 dark:border-white/15 dark:bg-black/40 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Até
            <input
              type="date"
              value={customFim}
              min={customInicio}
              max={hoje}
              onChange={(e) => onCustomFim(e.target.value)}
              className="rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-sm font-medium text-slate-900 dark:border-white/15 dark:bg-black/40 dark:text-slate-100"
            />
          </label>
        </div>
      ) : null}

      <p className="text-xs text-slate-500 dark:text-slate-500">
        Período:{" "}
        <span className="font-semibold text-slate-800 dark:text-slate-300">
          {labelPreset(preset, { inicio: customInicio, fim: customFim })}
        </span>
      </p>
    </motion.div>
  );
}
