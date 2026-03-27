// ============================================================
// Capacidade — Gantt por Torre/Andar + Projeção semanal
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutGrid,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useState, useMemo } from 'react';

// ---- Helpers ----

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const FASE_COLORS: Record<string, string> = {
  mudas: 'bg-emerald-400',
  vegetativa: 'bg-blue-400',
  maturacao: 'bg-amber-400',
};

const FASE_LABELS: Record<string, string> = {
  mudas: 'Mudas',
  vegetativa: 'Vegetativa',
  maturacao: 'Maturação',
};

export default function CapacidadePage() {
  const { data } = useFazenda();
  const planosQuery = trpc.planosPlantio.list.useQuery();
  const planos = planosQuery.data || [];

  const [faseFilter, setFaseFilter] = useState<string>('all');
  const [weeksOffset, setWeeksOffset] = useState(0);

  // ---- Gantt Data ----
  const today = useMemo(() => new Date(), []);
  const ganttStart = useMemo(() => addDays(startOfWeek(today), weeksOffset * 7 * 4 - 14), [weeksOffset]);
  const ganttEnd = useMemo(() => addDays(ganttStart, 90), [ganttStart]); // 90 days window
  const ganttDays = 90;

  // Build tower/floor data
  const towerFloors = useMemo(() => {
    const torres = faseFilter === 'all'
      ? data.torres
      : data.torres.filter((t) => t.fase === faseFilter);

    return torres.map((torre) => {
      const torreAndares = data.andares
        .filter((a) => a.torreId === torre.id)
        .sort((a, b) => a.numero - b.numero);

      return {
        torre,
        andares: torreAndares.map((andar) => {
          // Current occupation
          const isOccupied = andar.furos?.some((f) => f.status === 'plantado') || false;
          const plantCount = andar.furos?.filter((f) => f.status === 'plantado').length || 0;
          const totalSlots = andar.furos?.length || 0;
          const occupancyPct = totalSlots > 0 ? Math.round((plantCount / totalSlots) * 100) : 0;
          const needsWash = !andar.lavado;

          // Find planned events for this floor
          // (simplified: match by torre slug)
          const plannedBars: { start: Date; end: Date; label: string; color: string; type: string }[] = [];

          // Real occupation bar (if occupied)
          if (isOccupied && andar.dataEntrada) {
            const entryDate = new Date(andar.dataEntrada);
            // Estimate end based on variety days
            const varDias = andar.variedades?.[0]
              ? (data.variedades.find((v) => v.id === andar.variedades[0])?.diasMaturacao || 30)
              : 30;
            const endDate = addDays(entryDate, varDias);
            plannedBars.push({
              start: entryDate,
              end: endDate > ganttEnd ? ganttEnd : endDate,
              label: `${andar.variedades?.[0] || 'Ocupado'} (${occupancyPct}%)`,
              color: FASE_COLORS[torre.fase] || 'bg-gray-400',
              type: 'real',
            });
          }

          return {
            andar,
            isOccupied,
            plantCount,
            totalSlots,
            occupancyPct,
            needsWash,
            plannedBars,
          };
        }),
      };
    });
  }, [data, faseFilter, ganttStart, ganttEnd]);

  // Planned bars from planos
  const planoBars = useMemo(() => {
    return planos
      .filter((p: any) => p.status !== 'cancelado')
      .map((p: any) => ({
        id: p.id,
        start: new Date(p.dataInicioGerminacao),
        end: new Date(p.dataColheitaPrevista),
        label: `${p.variedadeNome} (${p.quantidadePlantas}pl)`,
        status: p.status,
        receitaNome: p.receitaNome,
      }));
  }, [planos]);

  // ---- Projeção de Capacidade ----
  const projection = useMemo(() => {
    const weeks: { weekStart: Date; weekLabel: string; byFase: Record<string, { total: number; occupied: number; available: number }> }[] = [];
    const fases = ['mudas', 'vegetativa', 'maturacao'];

    for (let w = 0; w < 8; w++) {
      const weekStart = addDays(startOfWeek(today), w * 7);
      const weekEnd = addDays(weekStart, 6);

      const byFase: Record<string, { total: number; occupied: number; available: number }> = {};

      fases.forEach((fase) => {
        const torresFase = data.torres.filter((t) => t.fase === fase);
        const andaresFase = data.andares.filter((a) => torresFase.some((t) => t.id === a.torreId));
        const total = andaresFase.length;

        // Count currently occupied (simplified: if has plants, it's occupied)
        let occupied = 0;
        andaresFase.forEach((andar) => {
          const hasPlants = andar.furos?.some((f) => f.status === 'plantado') || false;
          if (hasPlants) occupied++;
        });

        // Add planned occupations that overlap this week
        planos.forEach((p: any) => {
          if (p.status === 'cancelado') return;
          const pStart = new Date(p.dataInicioGerminacao);
          const pEnd = new Date(p.dataColheitaPrevista);
          if (pStart <= weekEnd && pEnd >= weekStart) {
            // This plan overlaps this week — estimate 1 floor per plan
            // Only count if not already counted as real occupation
            if (p.status === 'planejado') occupied++;
          }
        });

        occupied = Math.min(occupied, total);
        byFase[fase] = { total, occupied, available: total - occupied };
      });

      weeks.push({
        weekStart,
        weekLabel: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`,
        byFase,
      });
    }

    return weeks;
  }, [data, planos, today]);

  // Gantt day columns
  const dayColumns = useMemo(() => {
    const cols: Date[] = [];
    for (let i = 0; i < ganttDays; i++) {
      cols.push(addDays(ganttStart, i));
    }
    return cols;
  }, [ganttStart, ganttDays]);

  // Week markers for gantt header
  const weekMarkers = useMemo(() => {
    const markers: { date: Date; label: string; offset: number }[] = [];
    for (let i = 0; i < ganttDays; i += 7) {
      const d = addDays(ganttStart, i);
      markers.push({ date: d, label: formatShortDate(d), offset: i });
    }
    return markers;
  }, [ganttStart, ganttDays]);

  function getBarStyle(start: Date, end: Date) {
    const startDay = Math.max(0, diffDays(ganttStart, start));
    const endDay = Math.min(ganttDays, diffDays(ganttStart, end));
    if (endDay <= 0 || startDay >= ganttDays) return null;
    const left = (startDay / ganttDays) * 100;
    const width = ((endDay - startDay) / ganttDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            Capacidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize a ocupação e planeje a capacidade das torres
          </p>
        </div>

        <Tabs defaultValue="gantt">
          <TabsList>
            <TabsTrigger value="gantt" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Gantt de Ocupação
            </TabsTrigger>
            <TabsTrigger value="projecao" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Projeção Semanal
            </TabsTrigger>
          </TabsList>

          {/* ---- Gantt ---- */}
          <TabsContent value="gantt" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={faseFilter} onValueChange={setFaseFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar por fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fases</SelectItem>
                  <SelectItem value="mudas">Mudas</SelectItem>
                  <SelectItem value="vegetativa">Vegetativa</SelectItem>
                  <SelectItem value="maturacao">Maturação</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeeksOffset(weeksOffset - 1)}
                  className="p-1 rounded hover:bg-muted"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground px-2">
                  {formatShortDate(ganttStart)} — {formatShortDate(ganttEnd)}
                </span>
                <button
                  onClick={() => setWeeksOffset(weeksOffset + 1)}
                  className="p-1 rounded hover:bg-muted"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="flex border-b bg-muted/30">
                    <div className="w-40 shrink-0 p-2 text-xs font-semibold border-r">Torre / Andar</div>
                    <div className="flex-1 relative h-8">
                      {weekMarkers.map((m, i) => (
                        <div
                          key={i}
                          className="absolute top-0 text-[9px] text-muted-foreground border-l border-dashed border-muted-foreground/20 h-full flex items-center pl-1"
                          style={{ left: `${(m.offset / ganttDays) * 100}%` }}
                        >
                          {m.label}
                        </div>
                      ))}
                      {/* Today marker */}
                      {(() => {
                        const todayOffset = diffDays(ganttStart, today);
                        if (todayOffset >= 0 && todayOffset < ganttDays) {
                          return (
                            <div
                              className="absolute top-0 h-full w-px bg-red-500 z-10"
                              style={{ left: `${(todayOffset / ganttDays) * 100}%` }}
                            />
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Rows */}
                  {towerFloors.map(({ torre, andares }) => (
                    <div key={torre.id}>
                      {/* Torre header */}
                      <div className="flex border-b bg-muted/10">
                        <div className="w-40 shrink-0 p-2 border-r">
                          <span className="text-xs font-bold">{torre.nome}</span>
                          <Badge variant="outline" className="ml-1 text-[9px]">
                            {FASE_LABELS[torre.fase] || torre.fase}
                          </Badge>
                        </div>
                        <div className="flex-1" />
                      </div>

                      {/* Andar rows */}
                      {andares.map(({ andar, isOccupied, occupancyPct, needsWash, plannedBars }) => (
                        <div key={`${torre.id}-${andar.numero}`} className="flex border-b hover:bg-muted/5">
                          <div className="w-40 shrink-0 p-1.5 border-r flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground w-6">A{andar.numero}</span>
                            {isOccupied ? (
                              <span className="text-[9px] text-emerald-600 font-medium">{occupancyPct}%</span>
                            ) : needsWash ? (
                              <span className="text-[9px] text-red-500">Lavagem</span>
                            ) : (
                              <span className="text-[9px] text-green-600">Livre</span>
                            )}
                          </div>
                          <div className="flex-1 relative h-7">
                            {/* Real occupation bars */}
                            {plannedBars.map((bar, i) => {
                              const style = getBarStyle(bar.start, bar.end);
                              if (!style) return null;
                              return (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`absolute top-1 h-5 rounded-sm ${bar.color} opacity-80 cursor-pointer`}
                                      style={style}
                                    >
                                      <span className="text-[8px] text-white px-1 truncate block leading-5">
                                        {bar.label}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{bar.label}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatShortDate(bar.start)} — {formatShortDate(bar.end)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {/* Today marker */}
                            {(() => {
                              const todayOffset = diffDays(ganttStart, today);
                              if (todayOffset >= 0 && todayOffset < ganttDays) {
                                return (
                                  <div
                                    className="absolute top-0 h-full w-px bg-red-500/30"
                                    style={{ left: `${(todayOffset / ganttDays) * 100}%` }}
                                  />
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {towerFloors.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Nenhuma torre encontrada para o filtro selecionado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Planned timeline (separate section) */}
            {planoBars.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Planos de Plantio no Período
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="flex border-b bg-muted/30">
                      <div className="w-40 shrink-0 p-2 text-xs font-semibold border-r">Plano</div>
                      <div className="flex-1 relative h-8">
                        {weekMarkers.map((m, i) => (
                          <div
                            key={i}
                            className="absolute top-0 text-[9px] text-muted-foreground border-l border-dashed border-muted-foreground/20 h-full flex items-center pl-1"
                            style={{ left: `${(m.offset / ganttDays) * 100}%` }}
                          >
                            {m.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {planoBars.map((bar) => {
                      const style = getBarStyle(bar.start, bar.end);
                      const statusColor = bar.status === 'planejado' ? 'bg-blue-400'
                        : bar.status === 'em_germinacao' ? 'bg-emerald-400'
                        : bar.status === 'em_producao' ? 'bg-amber-400'
                        : 'bg-green-400';
                      return (
                        <div key={bar.id} className="flex border-b hover:bg-muted/5">
                          <div className="w-40 shrink-0 p-1.5 border-r">
                            <span className="text-[10px] truncate block">{bar.label}</span>
                          </div>
                          <div className="flex-1 relative h-7">
                            {style && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute top-1 h-5 rounded-sm ${statusColor} opacity-70 cursor-pointer`}
                                    style={style}
                                  >
                                    <span className="text-[8px] text-white px-1 truncate block leading-5">
                                      {bar.receitaNome}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{bar.label}</p>
                                  <p className="text-[10px]">{bar.receitaNome}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatShortDate(bar.start)} — {formatShortDate(bar.end)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-400" /> Mudas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-400" /> Vegetativa</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-400" /> Maturação</span>
              <span className="flex items-center gap-1"><span className="w-px h-4 bg-red-500" /> Hoje</span>
            </div>
          </TabsContent>

          {/* ---- Projeção Semanal ---- */}
          <TabsContent value="projecao" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Previsão de andares disponíveis por fase nas próximas 8 semanas, considerando a ocupação atual e os planos de plantio.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Semana</th>
                    {['mudas', 'vegetativa', 'maturacao'].map((fase) => (
                      <th key={fase} colSpan={3} className="text-center p-2 font-semibold border-l">
                        {FASE_LABELS[fase]}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-1" />
                    {['mudas', 'vegetativa', 'maturacao'].map((fase) => (
                      <React.Fragment key={fase}>
                        <th className="p-1 text-center border-l">Total</th>
                        <th className="p-1 text-center">Ocup.</th>
                        <th className="p-1 text-center">Disp.</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projection.map((week, i) => (
                    <tr key={i} className={`border-b ${i === 0 ? 'bg-primary/5 font-medium' : ''}`}>
                      <td className="p-2">{week.weekLabel}</td>
                      {['mudas', 'vegetativa', 'maturacao'].map((fase) => {
                        const d = week.byFase[fase];
                        const pct = d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0;
                        return (
                          <React.Fragment key={fase}>
                            <td className="p-1 text-center border-l">{d.total}</td>
                            <td className="p-1 text-center">
                              <span className={pct > 80 ? 'text-red-600 font-semibold' : pct > 50 ? 'text-amber-600' : ''}>
                                {d.occupied}
                              </span>
                            </td>
                            <td className="p-1 text-center">
                              <span className={d.available === 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                {d.available}
                              </span>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual capacity bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['mudas', 'vegetativa', 'maturacao'].map((fase) => {
                const currentWeek = projection[0];
                if (!currentWeek) return null;
                const d = currentWeek.byFase[fase];
                const pct = d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0;
                return (
                  <Card key={fase}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold">{FASE_LABELS[fase]}</span>
                        <Badge variant="outline" className="text-[10px]">{pct}% ocupado</Badge>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>{d.occupied} ocupados</span>
                        <span>{d.available} disponíveis</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Need React import for Fragment
import React from 'react';
