// ============================================================
// Calendário de plantio — células discretas; detalhe só no painel ao lado (sem duplicar "Hoje")
// ============================================================

import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  dateKeyLocal,
  eventosPorDia,
  tiposFaseUnicosNoDia,
  type DiaEvento,
  type PlanoRow,
} from '@/lib/planejamentoCalendario';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';

export type { PlanoRow, DiaEvento } from '@/lib/planejamentoCalendario';

const chipClass: Record<DiaEvento['tipo'], string> = {
  germinacao: 'bg-emerald-600/15 text-emerald-950 dark:text-emerald-100 border-emerald-500/25',
  mudas: 'bg-emerald-600/14 text-emerald-950 dark:text-emerald-100 border-emerald-500/22',
  veg: 'bg-green-600/12 text-green-950 dark:text-green-100 border-green-600/20',
  mat: 'bg-green-700/10 text-green-950 dark:text-green-100 border-green-700/18',
  colheita: 'bg-amber-500/20 text-amber-950 dark:text-amber-100 border-amber-500/30',
};

const ORD_TIPO: Record<string, number> = {
  germinacao: 0,
  mudas: 1,
  veg: 2,
  mat: 3,
  colheita: 4,
};

/** Abreviações na célula do calendário (várias fases se coincidirem no mesmo dia). */
const FASE_CAL_LABEL: Record<DiaEvento['tipo'], string> = {
  germinacao: 'Germ.',
  mudas: 'Tr→Mud.',
  veg: 'Veg.',
  mat: 'Mat.',
  colheita: 'Colh.',
};

const faseCalTextClass: Record<DiaEvento['tipo'], string> = {
  germinacao: 'text-emerald-700 dark:text-emerald-300',
  mudas: 'text-emerald-700 dark:text-emerald-300',
  veg: 'text-green-700 dark:text-green-300',
  mat: 'text-green-800 dark:text-green-300',
  colheita: 'text-amber-800 dark:text-amber-200',
};

function PlantioDayButton({
  eventsByDate,
  selectedDayKey,
  children,
  ...props
}: ComponentProps<typeof CalendarDayButton> & {
  eventsByDate: Map<string, DiaEvento[]>;
  selectedDayKey: string | null;
}) {
  const { day, className, ...rest } = props;
  const key = dateKeyLocal(day.date);
  const evs = eventsByDate.get(key) ?? [];
  const n = evs.length;
  const has = n > 0;
  const isSelected = selectedDayKey != null && key === selectedDayKey;
  const fasesDia = tiposFaseUnicosNoDia(evs);
  const fasesTitulo = fasesDia.map((t) => FASE_CAL_LABEL[t]).join(', ');

  return (
    <CalendarDayButton
      day={day}
      className={cn(
        '!aspect-auto min-h-0 h-full max-h-none w-full py-0.5 px-0.5 flex flex-col items-center justify-start gap-0.5',
        has && 'bg-primary/[0.07]',
        isSelected && 'ring-2 ring-primary/35 ring-inset',
        className
      )}
      title={
        has
          ? `${fasesTitulo} — ${n} tarefa(s). Detalhe no painel ao lado.`
          : undefined
      }
      {...rest}
    >
      <span className="text-sm font-medium leading-none tabular-nums shrink-0">{children}</span>
      {has && (
        <div
          className="flex flex-col items-center justify-center gap-0 w-full min-w-0"
          aria-label={`Fases neste dia: ${fasesTitulo}`}
        >
          {fasesDia.map((t) => (
            <span
              key={t}
              className={cn(
                'text-[7px] sm:text-[8px] font-medium leading-tight text-center w-full',
                faseCalTextClass[t]
              )}
            >
              {FASE_CAL_LABEL[t]}
            </span>
          ))}
        </div>
      )}
    </CalendarDayButton>
  );
}

function formatDiaLongo(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

type Props = {
  planos: PlanoRow[];
  selectedDay: Date | null;
  onSelectDay: (d: Date | null) => void;
  calendarMonth: Date;
  onMonthChange: (d: Date) => void;
};

export default function PlantioCalendarioOperacional({
  planos,
  selectedDay,
  onSelectDay,
  calendarMonth,
  onMonthChange,
}: Props) {
  const eventsByDate = useMemo(() => eventosPorDia(planos, { mostrarCronogramaCompleto: true }), [planos]);

  const hoje = useMemo(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  }, []);

  const hojeKey = dateKeyLocal(hoje);

  const daysWithEvents = useMemo(() => {
    const s = new Set<string>();
    eventsByDate.forEach((_, k) => s.add(k));
    return s;
  }, [eventsByDate]);

  const selectedKey = selectedDay ? dateKeyLocal(selectedDay) : null;
  const diaEhHoje = selectedKey != null && selectedKey === hojeKey;
  const eventosSelecionados =
    selectedDay && selectedKey ? eventsByDate.get(selectedKey) ?? [] : [];

  const eventosSelecionadosOrdenados = useMemo(() => {
    return [...eventosSelecionados].sort(
      (a, b) =>
        (ORD_TIPO[a.tipo] ?? 9) - (ORD_TIPO[b.tipo] ?? 9) || a.variedade.localeCompare(b.variedade)
    );
  }, [eventosSelecionados]);

  const components = useMemo(
    () => ({
      DayButton: (p: ComponentProps<typeof CalendarDayButton>) => (
        <PlantioDayButton {...p} eventsByDate={eventsByDate} selectedDayKey={selectedKey} />
      ),
    }),
    [eventsByDate, selectedKey]
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="lg:col-span-3">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] text-muted-foreground mb-2">
              Abreviações (Germ., Tr→Mud. = transplantio para mudas, Veg., Mat., Colh.) no dia do marco. Pode haver
              várias no mesmo dia. Clique no dia para ver o detalhe ao lado.
            </p>
            <Calendar
              mode="single"
              selected={selectedDay || undefined}
              onSelect={(d) => onSelectDay(d ?? null)}
              month={calendarMonth}
              onMonthChange={onMonthChange}
              modifiers={{
                hasEvent: (date) => daysWithEvents.has(dateKeyLocal(date)),
              }}
              modifiersClassNames={{
                hasEvent: '',
                today: '!font-semibold',
              }}
              classNames={{
                day: cn(
                  '!aspect-auto h-auto align-top py-0.5',
                  '[&_button]:!aspect-auto [&_button]:min-h-0 [&_button]:h-auto [&_button]:items-stretch'
                ),
              }}
              className="w-full [--cell-size:2.5rem] sm:[--cell-size:2.85rem]"
              components={components}
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              Borda no dia = selecionado para ver detalhe à direita.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-emerald-500/20">
          <CardHeader className="pb-2 py-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold leading-tight">
                {selectedDay ? (
                  <>
                    {diaEhHoje && (
                      <Badge className="mr-1.5 bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                        Hoje
                      </Badge>
                    )}
                    <span className="capitalize">{formatDiaLongo(selectedDay)}</span>
                  </>
                ) : (
                  'Escolha um dia'
                )}
              </CardTitle>
            </div>
            {!selectedDay && (
              <p className="text-xs text-muted-foreground font-normal">Clique no calendário para ver as tarefas.</p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {selectedDay && eventosSelecionadosOrdenados.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem tarefas neste dia.</p>
            )}
            {selectedDay && eventosSelecionadosOrdenados.length > 0 && (
              <ul className="space-y-1.5 max-h-[min(60vh,22rem)] overflow-y-auto pr-0.5">
                {eventosSelecionadosOrdenados.map((e) => (
                  <li
                    key={e.id}
                    className={cn('rounded-md border px-2.5 py-1.5 text-sm', chipClass[e.tipo])}
                  >
                    <div className="font-semibold">{e.rotulo}</div>
                    <div className="text-foreground/90">{e.variedade}</div>
                    {e.quantidade != null && (
                      <div className="text-xs font-mono text-muted-foreground mt-0.5">{e.quantidade} plantas</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
