import { cn } from '@/lib/utils';
import type { ProntoColheitaVariedadeItem } from '@/lib/utils-farm';

type PanelProps = {
  rows: ProntoColheitaVariedadeItem[];
  /** Ex.: "bandejas" (microverdes) ou "plantas" (furos em maturação FV). */
  unidade: string;
  className?: string;
};

/**
 * Conteúdo do resumo (chips por variedade + total), para usar dentro de um diálogo ou outro contentor.
 */
export function ProntosColheitaPorVariedadePanel({ rows, unidade, className }: PanelProps) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-border/60 bg-muted/25 px-4 py-8 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Nenhuma unidade pronta para colheita neste momento.
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + r.quantidade, 0);
  const u = total === 1 ? unidade.replace(/s$/i, '') : unidade;
  const prontasLabel = total === 1 ? 'pronta para colheita' : 'prontas para colheita';

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/25 bg-amber-500/[0.06] dark:bg-amber-950/25 dark:border-amber-500/30 p-3 sm:p-3.5',
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <div
            key={r.variedadeId}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-border/60 bg-background/85 px-2.5 py-1.5 text-xs shadow-sm"
          >
            <span className="font-medium truncate max-w-[min(200px,100%)]" title={r.nome}>
              {r.nome}
            </span>
            <strong className="shrink-0 tabular-nums text-amber-900 dark:text-amber-100">{r.quantidade}</strong>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10px] text-muted-foreground">
        Total: <strong className="tabular-nums text-foreground">{total}</strong> {u} {prontasLabel}
      </p>
    </div>
  );
}
