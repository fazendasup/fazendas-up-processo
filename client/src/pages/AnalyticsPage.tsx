// ============================================================
// Analytics Page — Gráficos e análises operacionais
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ReferenceLine, Area, AreaChart,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity, BarChart3, Sprout, Wrench, TrendingUp, Droplet,
  Scissors, AlertTriangle, Clock, Target, Leaf,
  FileDown, FileText, CheckCircle2, XCircle,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import type { FazendaData, Fase, CaixaAgua, MedicaoCaixa } from '@/lib/types';
import { FASES_CONFIG } from '@/lib/types';
import {
  contarPlantasAndar,
  contarColhidasAndar,
  calcularKPIs,
} from '@/lib/utils-farm';

// ---- Helpers ----

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDateShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

function filterByPeriod<T>(items: T[], getDate: (item: T) => string | null | undefined, period: PeriodFilter): T[] {
  if (period === 'all') return items;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = daysAgo(days);
  return items.filter((item) => {
    const d = parseDate(getDate(item));
    return d && d >= cutoff;
  });
}

// ---- Chart colors ----
const COLORS = {
  ec: '#16a34a',       // green-600
  ph: '#2563eb',       // blue-600
  ecRange: '#dcfce7',  // green-100
  phRange: '#dbeafe',  // blue-100
  mudas: '#22c55e',
  vegetativa: '#3b82f6',
  maturacao: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
};

const PIE_COLORS = [COLORS.mudas, COLORS.vegetativa, COLORS.maturacao, COLORS.purple, COLORS.pink, COLORS.orange, COLORS.teal, COLORS.info];

// ============================================================
// Main Component
// ============================================================

export default function AnalyticsPage() {
  const { data, loading } = useFazenda();
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe a evolução dos indicadores da fazenda
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ecph" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto">
            <TabsTrigger value="ecph" className="text-xs gap-1.5">
              <Droplet className="w-3.5 h-3.5" /> EC/pH
            </TabsTrigger>
            <TabsTrigger value="producao" className="text-xs gap-1.5">
              <Scissors className="w-3.5 h-3.5" /> Produção
            </TabsTrigger>
            <TabsTrigger value="germinacao" className="text-xs gap-1.5">
              <Sprout className="w-3.5 h-3.5" /> Germinação
            </TabsTrigger>
            <TabsTrigger value="manutencao" className="text-xs gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Manutenção
            </TabsTrigger>
            <TabsTrigger value="ocupacao" className="text-xs gap-1.5">
              <Target className="w-3.5 h-3.5" /> Ocupação
            </TabsTrigger>
            <TabsTrigger value="desperdicio" className="text-xs gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Desperdício
            </TabsTrigger>
            <TabsTrigger value="yield" className="text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Yield
            </TabsTrigger>
            <TabsTrigger value="planejado" className="text-xs gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Plan. vs Real
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ecph">
            <ECpHSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="producao">
            <ProducaoSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="germinacao">
            <GerminacaoSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="manutencao">
            <ManutencaoSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="ocupacao">
            <OcupacaoSection data={data} />
          </TabsContent>
          <TabsContent value="desperdicio">
            <DesperdicioSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="yield">
            <YieldSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="planejado">
            <PlanejadoVsRealizadoSection data={data} period={period} />
          </TabsContent>
          <TabsContent value="relatorios">
            <RelatoriosSection data={data} period={period} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
// 1. EC/pH Evolution
// ============================================================

function ECpHSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const [selectedCaixa, setSelectedCaixa] = useState<string>('all');

  const caixas = data.caixasAgua;

  const chartData = useMemo(() => {
    const targetCaixas = selectedCaixa === 'all' ? caixas : caixas.filter((c) => c.id === selectedCaixa);

    // Collect all medições
    const allMedicoes: { date: Date; ec: number; ph: number; caixa: string }[] = [];
    targetCaixas.forEach((caixa) => {
      const filtered = filterByPeriod(caixa.medicoes, (m) => m.dataHora, period);
      filtered.forEach((m) => {
        const d = parseDate(m.dataHora);
        if (d) {
          allMedicoes.push({ date: d, ec: m.ec, ph: m.ph, caixa: caixa.nome });
        }
      });
    });

    // Sort by date
    allMedicoes.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by day for the chart
    const byDay = new Map<string, { ec: number[]; ph: number[] }>();
    allMedicoes.forEach(({ date, ec, ph }) => {
      const key = formatDateShort(date);
      if (!byDay.has(key)) byDay.set(key, { ec: [], ph: [] });
      const entry = byDay.get(key)!;
      entry.ec.push(ec);
      entry.ph.push(ph);
    });

    return Array.from(byDay.entries()).map(([day, { ec, ph }]) => ({
      day,
      ec: +(ec.reduce((a, b) => a + b, 0) / ec.length).toFixed(2),
      ph: +(ph.reduce((a, b) => a + b, 0) / ph.length).toFixed(2),
    }));
  }, [caixas, selectedCaixa, period]);

  // Get ideal ranges for selected caixa
  const idealRange = useMemo(() => {
    if (selectedCaixa === 'all') {
      return { ecMin: 1.0, ecMax: 2.5, phMin: 5.5, phMax: 6.5 };
    }
    const caixa = caixas.find((c) => c.id === selectedCaixa);
    if (!caixa) return { ecMin: 1.0, ecMax: 2.5, phMin: 5.5, phMax: 6.5 };
    const faseConfig = data.fasesConfig[caixa.fase];
    return {
      ecMin: faseConfig.ecMin,
      ecMax: faseConfig.ecMax,
      phMin: faseConfig.phMin,
      phMax: faseConfig.phMax,
    };
  }, [selectedCaixa, caixas, data.fasesConfig]);

  // Summary stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const ecValues = chartData.map((d) => d.ec);
    const phValues = chartData.map((d) => d.ph);
    return {
      ecAvg: +(ecValues.reduce((a, b) => a + b, 0) / ecValues.length).toFixed(2),
      ecMin: Math.min(...ecValues),
      ecMax: Math.max(...ecValues),
      phAvg: +(phValues.reduce((a, b) => a + b, 0) / phValues.length).toFixed(2),
      phMin: Math.min(...phValues),
      phMax: Math.max(...phValues),
      totalMedicoes: chartData.length,
    };
  }, [chartData]);

  const ecChartConfig: ChartConfig = {
    ec: { label: 'EC (mS/cm)', color: COLORS.ec },
  };
  const phChartConfig: ChartConfig = {
    ph: { label: 'pH', color: COLORS.ph },
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedCaixa} onValueChange={setSelectedCaixa}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecionar caixa d'água" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as caixas (média)</SelectItem>
            {caixas.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} ({c.fase})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MiniStat label="EC Média" value={stats.ecAvg} unit="mS/cm" color="emerald" />
          <MiniStat label="EC Mín" value={stats.ecMin} unit="mS/cm" color="emerald" />
          <MiniStat label="EC Máx" value={stats.ecMax} unit="mS/cm" color="emerald" />
          <MiniStat label="pH Médio" value={stats.phAvg} color="blue" />
          <MiniStat label="pH Mín" value={stats.phMin} color="blue" />
          <MiniStat label="pH Máx" value={stats.phMax} color="blue" />
          <MiniStat label="Medições" value={stats.totalMedicoes} color="gray" />
        </div>
      )}

      {chartData.length === 0 ? (
        <EmptyState icon={Droplet} message="Nenhuma medição registrada no período selecionado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* EC Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS.ec }} />
                Evolução EC (mS/cm)
              </CardTitle>
              <CardDescription className="text-xs">
                Faixa ideal: {idealRange.ecMin} - {idealRange.ecMax}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ecChartConfig} className="h-[280px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ecGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.ec} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.ec} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <ReferenceLine y={idealRange.ecMin} stroke={COLORS.ec} strokeDasharray="5 5" strokeOpacity={0.5} />
                  <ReferenceLine y={idealRange.ecMax} stroke={COLORS.ec} strokeDasharray="5 5" strokeOpacity={0.5} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="ec"
                    stroke={COLORS.ec}
                    strokeWidth={2}
                    fill="url(#ecGradient)"
                    dot={{ r: 3, fill: COLORS.ec }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* pH Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS.ph }} />
                Evolução pH
              </CardTitle>
              <CardDescription className="text-xs">
                Faixa ideal: {idealRange.phMin} - {idealRange.phMax}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={phChartConfig} className="h-[280px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.ph} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.ph} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <ReferenceLine y={idealRange.phMin} stroke={COLORS.ph} strokeDasharray="5 5" strokeOpacity={0.5} />
                  <ReferenceLine y={idealRange.phMax} stroke={COLORS.ph} strokeDasharray="5 5" strokeOpacity={0.5} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="ph"
                    stroke={COLORS.ph}
                    strokeWidth={2}
                    fill="url(#phGradient)"
                    dot={{ r: 3, fill: COLORS.ph }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2. Produção (Transplantios + Colheitas)
// ============================================================

function ProducaoSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const transplantios = filterByPeriod(data.transplantios, (t) => t.dataHora, period);

  // Transplantios por variedade
  const porVariedade = useMemo(() => {
    const map = new Map<string, { transplantadas: number; desperdicio: number }>();
    transplantios.forEach((t) => {
      const key = t.variedadeNome;
      const entry = map.get(key) || { transplantadas: 0, desperdicio: 0 };
      entry.transplantadas += t.quantidadeTransplantada;
      entry.desperdicio += t.quantidadeDesperdicio;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([nome, vals]) => ({ nome, ...vals }))
      .sort((a, b) => b.transplantadas - a.transplantadas);
  }, [transplantios]);

  // Transplantios por dia
  const porDia = useMemo(() => {
    const map = new Map<string, number>();
    transplantios.forEach((t) => {
      const d = parseDate(t.dataHora);
      if (d) {
        const key = formatDateShort(d);
        map.set(key, (map.get(key) || 0) + t.quantidadeTransplantada);
      }
    });
    return Array.from(map.entries())
      .map(([dia, quantidade]) => ({ dia, quantidade }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }, [transplantios]);

  // Colheitas (andares com dataColheitaTotal)
  const colheitas = useMemo(() => {
    const filtered = filterByPeriod(
      data.andares.filter((a) => a.dataColheitaTotal),
      (a) => a.dataColheitaTotal,
      period
    );
    return filtered.length;
  }, [data.andares, period]);

  // Total transplantadas
  const totalTransplantadas = transplantios.reduce((s, t) => s + t.quantidadeTransplantada, 0);
  const totalDesperdicio = transplantios.reduce((s, t) => s + t.quantidadeDesperdicio, 0);

  const barConfig: ChartConfig = {
    quantidade: { label: 'Transplantadas', color: COLORS.mudas },
  };

  const barVarConfig: ChartConfig = {
    transplantadas: { label: 'Transplantadas', color: COLORS.mudas },
    desperdicio: { label: 'Desperdício', color: COLORS.danger },
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Transplantadas" value={totalTransplantadas} color="emerald" icon={<Sprout className="w-4 h-4" />} />
        <MiniStat label="Desperdício" value={totalDesperdicio} color="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <MiniStat label="Taxa Aproveit." value={totalTransplantadas > 0 ? `${Math.round((totalTransplantadas / (totalTransplantadas + totalDesperdicio)) * 100)}%` : '-'} color="blue" icon={<TrendingUp className="w-4 h-4" />} />
        <MiniStat label="Andares Colhidos" value={colheitas} color="amber" icon={<Scissors className="w-4 h-4" />} />
      </div>

      {transplantios.length === 0 ? (
        <EmptyState icon={Scissors} message="Nenhum transplantio registrado no período selecionado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Transplantios por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="h-[280px] w-full">
                <BarChart data={porDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantidade" fill={COLORS.mudas} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* By variety */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Por Variedade</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barVarConfig} className="h-[280px] w-full">
                <BarChart data={porVariedade} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={55} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="transplantadas" fill={COLORS.mudas} radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="desperdicio" fill={COLORS.danger} radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3. Germinação
// ============================================================

function GerminacaoSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const lotes = filterByPeriod(data.germinacao, (g) => g.dataPlantio, period);

  // Taxa de germinação por variedade
  const porVariedade = useMemo(() => {
    const map = new Map<string, { total: number; germinadas: number; naoGerminadas: number }>();
    lotes.forEach((l) => {
      const key = l.variedadeNome;
      const entry = map.get(key) || { total: 0, germinadas: 0, naoGerminadas: 0 };
      entry.total += l.quantidade;
      entry.germinadas += l.germinadas;
      entry.naoGerminadas += l.naoGerminadas;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([nome, vals]) => ({
        nome,
        ...vals,
        taxa: vals.total > 0 ? Math.round((vals.germinadas / vals.total) * 100) : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [lotes]);

  // Status distribution
  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    lotes.forEach((l) => {
      map.set(l.status, (map.get(l.status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [lotes]);

  const totalLotes = lotes.length;
  const totalSementes = lotes.reduce((s, l) => s + l.quantidade, 0);
  const totalGerminadas = lotes.reduce((s, l) => s + l.germinadas, 0);
  const taxaGeral = totalSementes > 0 ? Math.round((totalGerminadas / totalSementes) * 100) : 0;

  const barConfig: ChartConfig = {
    taxa: { label: 'Taxa Germinação (%)', color: COLORS.mudas },
  };

  const statusLabels: Record<string, string> = {
    germinando: 'Germinando',
    pronto: 'Pronto',
    transplantado: 'Transplantado',
    cancelado: 'Cancelado',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total Lotes" value={totalLotes} color="emerald" icon={<Sprout className="w-4 h-4" />} />
        <MiniStat label="Total Sementes" value={totalSementes} color="blue" />
        <MiniStat label="Germinadas" value={totalGerminadas} color="emerald" />
        <MiniStat label="Taxa Geral" value={`${taxaGeral}%`} color={taxaGeral >= 80 ? 'emerald' : taxaGeral >= 60 ? 'amber' : 'red'} icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {lotes.length === 0 ? (
        <EmptyState icon={Sprout} message="Nenhum lote de germinação registrado no período selecionado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Taxa por variedade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Germinação por Variedade</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="h-[280px] w-full">
                <BarChart data={porVariedade} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={55} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="taxa" radius={[0, 4, 4, 0]}>
                    {porVariedade.map((entry, i) => (
                      <Cell key={i} fill={entry.taxa >= 80 ? COLORS.success : entry.taxa >= 60 ? COLORS.warning : COLORS.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={{ status: { label: 'Status' } }} className="h-[280px] w-full max-w-[320px]">
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${statusLabels[status] || status}: ${count}`}
                    labelLine={false}
                  >
                    {statusDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 4. Manutenção
// ============================================================

function ManutencaoSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const manutencoes = filterByPeriod(data.manutencoes, (m) => m.dataAbertura, period);

  // Por tipo
  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    manutencoes.forEach((m) => {
      map.set(m.tipo, (map.get(m.tipo) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);
  }, [manutencoes]);

  // Por status
  const porStatus = useMemo(() => {
    const map = new Map<string, number>();
    manutencoes.forEach((m) => {
      map.set(m.status, (map.get(m.status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [manutencoes]);

  // Tempo médio de resolução (em dias)
  const tempoMedioResolucao = useMemo(() => {
    const concluidas = manutencoes.filter((m) => m.status === 'concluida' && m.dataConclusao);
    if (concluidas.length === 0) return null;
    const tempos = concluidas.map((m) => {
      const abertura = parseDate(m.dataAbertura);
      const conclusao = parseDate(m.dataConclusao);
      if (!abertura || !conclusao) return 0;
      return (conclusao.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24);
    });
    return +(tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1);
  }, [manutencoes]);

  // Timeline por dia
  const porDia = useMemo(() => {
    const map = new Map<string, { abertas: number; concluidas: number }>();
    manutencoes.forEach((m) => {
      const d = parseDate(m.dataAbertura);
      if (d) {
        const key = formatDateShort(d);
        const entry = map.get(key) || { abertas: 0, concluidas: 0 };
        entry.abertas++;
        map.set(key, entry);
      }
      if (m.dataConclusao) {
        const d2 = parseDate(m.dataConclusao);
        if (d2) {
          const key = formatDateShort(d2);
          const entry = map.get(key) || { abertas: 0, concluidas: 0 };
          entry.concluidas++;
          map.set(key, entry);
        }
      }
    });
    return Array.from(map.entries())
      .map(([dia, vals]) => ({ dia, ...vals }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  }, [manutencoes]);

  const abertas = manutencoes.filter((m) => m.status === 'aberta').length;
  const emAndamento = manutencoes.filter((m) => m.status === 'em_andamento').length;
  const concluidas = manutencoes.filter((m) => m.status === 'concluida').length;
  const vencidas = manutencoes.filter((m) => {
    if (m.status === 'concluida') return false;
    if (!m.prazo) return false;
    const prazo = parseDate(m.prazo);
    return prazo && prazo < new Date();
  }).length;

  const barConfig: ChartConfig = {
    abertas: { label: 'Abertas', color: COLORS.warning },
    concluidas: { label: 'Concluídas', color: COLORS.success },
  };

  const tipoConfig: ChartConfig = {
    count: { label: 'Quantidade', color: COLORS.info },
  };

  const statusLabels: Record<string, string> = {
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MiniStat label="Abertas" value={abertas} color="amber" icon={<Clock className="w-4 h-4" />} />
        <MiniStat label="Em Andamento" value={emAndamento} color="blue" icon={<Wrench className="w-4 h-4" />} />
        <MiniStat label="Concluídas" value={concluidas} color="emerald" icon={<Target className="w-4 h-4" />} />
        <MiniStat label="Vencidas" value={vencidas} color="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <MiniStat label="Tempo Médio" value={tempoMedioResolucao !== null ? `${tempoMedioResolucao}d` : '-'} color="purple" icon={<Clock className="w-4 h-4" />} />
      </div>

      {manutencoes.length === 0 ? (
        <EmptyState icon={Wrench} message="Nenhuma manutenção registrada no período selecionado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Abertas vs Concluídas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="h-[280px] w-full">
                <BarChart data={porDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="abertas" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidas" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Por tipo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Frequência por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={tipoConfig} className="h-[280px] w-full">
                <BarChart data={porTipo} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="tipo" tick={{ fontSize: 10 }} width={75} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {porTipo.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 5. Ocupação
// ============================================================

function OcupacaoSection({ data }: { data: FazendaData }) {
  const kpis = calcularKPIs(data);

  // Ocupação por fase
  const porFase = useMemo(() => {
    const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];
    return fases.map((fase) => {
      const torresFase = data.torres.filter((t) => t.fase === fase);
      const andaresFase = data.andares.filter((a) => torresFase.some((t) => t.id === a.torreId));
      const totalSlots = andaresFase.reduce((sum, a) => {
        const perfisAndar = a.perfis || [];
        return sum + perfisAndar.length;
      }, 0);
      const ocupados = andaresFase.reduce((sum, a) => {
        const perfisAndar = a.perfis || [];
        return sum + perfisAndar.filter((p) => p.ativo).length;
      }, 0);
      const plantas = andaresFase.reduce((sum, a) => sum + contarPlantasAndar(a, fase), 0);
      const colhidas = fase === 'maturacao' ? andaresFase.reduce((sum, a) => sum + contarColhidasAndar(a), 0) : 0;
      const cfg = data.fasesConfig[fase] || FASES_CONFIG[fase];
      return {
        fase: cfg.label,
        torres: torresFase.length,
        andares: andaresFase.length,
        totalSlots,
        ocupados,
        taxa: totalSlots > 0 ? Math.round((ocupados / totalSlots) * 100) : 0,
        plantas,
        colhidas,
      };
    });
  }, [data]);

  // Variedades mais plantadas
  const variedadesPlantadas = useMemo(() => {
    const map = new Map<string, number>();
    data.andares.forEach((a) => {
      (a.variedades || []).forEach((v) => {
        map.set(v, (map.get(v) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data.andares]);

  const faseConfig: ChartConfig = {
    taxa: { label: 'Taxa Ocupação (%)', color: COLORS.info },
  };

  const varConfig: ChartConfig = {
    count: { label: 'Andares', color: COLORS.mudas },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Ocupação Geral" value={`${kpis.taxaOcupacao}%`} color="blue" icon={<Target className="w-4 h-4" />} />
        <MiniStat label="Plantas Ativas" value={kpis.totalPlantas} color="emerald" icon={<Sprout className="w-4 h-4" />} />
        <MiniStat label="Prontas Colheita" value={kpis.plantasProntasColheita} color="amber" icon={<Scissors className="w-4 h-4" />} />
        <MiniStat label="Lavagem Pendente" value={kpis.andaresLavagemPendente} color="red" icon={<Droplet className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ocupação por fase */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ocupação por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {porFase.map((f) => (
                <div key={f.fase} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.fase}</span>
                    <span className="text-muted-foreground text-xs">
                      {f.ocupados}/{f.totalSlots} perfis ({f.taxa}%) &middot; {f.torres} torres &middot; {f.plantas} plantas
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${f.taxa}%`,
                        background: f.fase === 'Mudas' ? COLORS.mudas : f.fase === 'Vegetativa' ? COLORS.vegetativa : COLORS.maturacao,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Variedades mais plantadas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variedades Mais Plantadas</CardTitle>
            <CardDescription className="text-xs">Quantidade de andares com cada variedade</CardDescription>
          </CardHeader>
          <CardContent>
            {variedadesPlantadas.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Nenhuma variedade plantada
              </div>
            ) : (
              <ChartContainer config={varConfig} className="h-[280px] w-full">
                <BarChart data={variedadesPlantadas} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={55} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {variedadesPlantadas.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 6. Desperdício
// ============================================================

function DesperdicioSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const transplantios = filterByPeriod(data.transplantios, (t) => t.dataHora, period);

  // Desperdício por variedade
  const porVariedade = useMemo(() => {
    const map = new Map<string, { total: number; desperdicio: number }>();
    transplantios.forEach((t) => {
      const key = t.variedadeNome;
      const entry = map.get(key) || { total: 0, desperdicio: 0 };
      entry.total += t.quantidadeTransplantada + t.quantidadeDesperdicio;
      entry.desperdicio += t.quantidadeDesperdicio;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([nome, vals]) => ({
        nome,
        taxa: vals.total > 0 ? Math.round((vals.desperdicio / vals.total) * 100) : 0,
        desperdicio: vals.desperdicio,
        total: vals.total,
      }))
      .filter((v) => v.total > 0)
      .sort((a, b) => b.taxa - a.taxa);
  }, [transplantios]);

  // Desperdício por motivo
  const porMotivo = useMemo(() => {
    const map = new Map<string, number>();
    transplantios.forEach((t) => {
      if (t.quantidadeDesperdicio > 0) {
        const motivo = t.motivoDesperdicio || 'Não informado';
        map.set(motivo, (map.get(motivo) || 0) + t.quantidadeDesperdicio);
      }
    });
    return Array.from(map.entries())
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [transplantios]);

  // Germinação não germinadas
  const germinacaoLotes = filterByPeriod(data.germinacao, (g) => g.dataPlantio, period);
  const totalNaoGerminadas = germinacaoLotes.reduce((s, l) => s + l.naoGerminadas, 0);
  const totalDesperdicioTransp = transplantios.reduce((s, t) => s + t.quantidadeDesperdicio, 0);
  const totalGeral = totalNaoGerminadas + totalDesperdicioTransp;

  const barConfig: ChartConfig = {
    taxa: { label: 'Taxa Desperdício (%)', color: COLORS.danger },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Desp. Transplantio" value={totalDesperdicioTransp} color="red" icon={<AlertTriangle className="w-4 h-4" />} />
        <MiniStat label="Não Germinadas" value={totalNaoGerminadas} color="amber" icon={<Sprout className="w-4 h-4" />} />
        <MiniStat label="Total Perdas" value={totalGeral} color="red" icon={<TrendingUp className="w-4 h-4" />} />
        <MiniStat label="Motivos Distintos" value={porMotivo.length} color="purple" />
      </div>

      {transplantios.length === 0 && germinacaoLotes.length === 0 ? (
        <EmptyState icon={AlertTriangle} message="Nenhum dado de desperdício no período selecionado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Taxa por variedade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Desperdício por Variedade</CardTitle>
              <CardDescription className="text-xs">Percentual de plantas perdidas no transplantio</CardDescription>
            </CardHeader>
            <CardContent>
              {porVariedade.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  Sem dados de transplantio
                </div>
              ) : (
                <ChartContainer config={barConfig} className="h-[280px] w-full">
                  <BarChart data={porVariedade} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={55} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="taxa" radius={[0, 4, 4, 0]}>
                      {porVariedade.map((entry, i) => (
                        <Cell key={i} fill={entry.taxa > 20 ? COLORS.danger : entry.taxa > 10 ? COLORS.warning : COLORS.success} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Por motivo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Perdas por Motivo</CardTitle>
            </CardHeader>
            <CardContent>
              {porMotivo.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  Nenhum desperdício registrado
                </div>
              ) : (
                <ChartContainer config={{ quantidade: { label: 'Quantidade', color: COLORS.danger } }} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={porMotivo}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="quantidade"
                      nameKey="motivo"
                      label={({ motivo, quantidade }) => `${motivo}: ${quantidade}`}
                      labelLine={false}
                    >
                      {porMotivo.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="motivo" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 7. Yield (g/planta por variedade)
// ============================================================

function YieldSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const colheitasQuery = trpc.registrosColheita.list.useQuery();
  const receitasQuery = trpc.receitas.list.useQuery();
  const colheitas = colheitasQuery.data || [];
  const receitas = receitasQuery.data || [];

  // Build receita yield map
  const receitaYieldMap = useMemo(() => {
    const m = new Map<number, { nome: string; yieldEsperado: number | null; variedadeNome: string }>(); 
    receitas.forEach((r: any) => m.set(r.id, { nome: r.nome, yieldEsperado: r.yieldEsperadoGramas, variedadeNome: r.variedadeNome || '' }));
    return m;
  }, [receitas]);

  // Yield por variedade
  const yieldPorVariedade = useMemo(() => {
    const map = new Map<string, { totalPeso: number; totalPlantas: number; esperado: number | null }>(); 
    colheitas.forEach((c: any) => {
      const nome = c.variedadeNome || 'Desconhecida';
      const entry = map.get(nome) || { totalPeso: 0, totalPlantas: 0, esperado: null };
      entry.totalPeso += c.pesoTotalGramas || 0;
      entry.totalPlantas += c.quantidadePlantas || 0;
      // Try to get expected yield from receita
      if (c.receitaId && receitaYieldMap.has(c.receitaId)) {
        entry.esperado = receitaYieldMap.get(c.receitaId)!.yieldEsperado;
      }
      map.set(nome, entry);
    });
    return Array.from(map.entries())
      .map(([nome, vals]) => ({
        nome,
        gPorPlanta: vals.totalPlantas > 0 ? Math.round((vals.totalPeso / vals.totalPlantas) * 10) / 10 : 0,
        esperado: vals.esperado || 0,
        totalPeso: Math.round(vals.totalPeso),
        totalPlantas: vals.totalPlantas,
      }))
      .filter((v) => v.totalPlantas > 0)
      .sort((a, b) => b.gPorPlanta - a.gPorPlanta);
  }, [colheitas, receitaYieldMap]);

  // Qualidade distribution
  const qualidadeData = useMemo(() => {
    const map = { A: 0, B: 0, C: 0 };
    colheitas.forEach((c: any) => {
      const q = (c.qualidade || 'B') as keyof typeof map;
      if (map[q] !== undefined) map[q]++;
    });
    return [
      { qualidade: 'A (Excelente)', count: map.A },
      { qualidade: 'B (Boa)', count: map.B },
      { qualidade: 'C (Abaixo)', count: map.C },
    ].filter((d) => d.count > 0);
  }, [colheitas]);

  const totalColheitas = colheitas.length;
  const totalPeso = colheitas.reduce((s: number, c: any) => s + (c.pesoTotalGramas || 0), 0);
  const totalPlantas = colheitas.reduce((s: number, c: any) => s + (c.quantidadePlantas || 0), 0);
  const avgYield = totalPlantas > 0 ? Math.round((totalPeso / totalPlantas) * 10) / 10 : 0;

  const yieldConfig: ChartConfig = {
    gPorPlanta: { label: 'g/planta (Real)', color: COLORS.success },
    esperado: { label: 'g/planta (Esperado)', color: COLORS.info },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total Colheitas" value={totalColheitas} color="emerald" icon={<Scissors className="w-4 h-4" />} />
        <MiniStat label="Peso Total" value={`${Math.round(totalPeso / 1000 * 10) / 10}kg`} color="blue" icon={<TrendingUp className="w-4 h-4" />} />
        <MiniStat label="Plantas Colhidas" value={totalPlantas} color="amber" icon={<Leaf className="w-4 h-4" />} />
        <MiniStat label="Yield Médio" value={`${avgYield}g/pl`} color="emerald" icon={<Target className="w-4 h-4" />} />
      </div>

      {yieldPorVariedade.length === 0 ? (
        <EmptyState icon={TrendingUp} message="Nenhum registro de colheita encontrado" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Yield por Variedade (g/planta)</CardTitle>
              <CardDescription className="text-xs">Real vs Esperado (da receita)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={yieldConfig} className="h-[300px] w-full">
                <BarChart data={yieldPorVariedade} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="gPorPlanta" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="esperado" fill={COLORS.info} radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribuição de Qualidade</CardTitle>
            </CardHeader>
            <CardContent>
              {qualidadeData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados</div>
              ) : (
                <ChartContainer config={{ count: { label: 'Colheitas', color: COLORS.success } }} className="h-[300px] w-full">
                  <PieChart>
                    <Pie data={qualidadeData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="count" nameKey="qualidade" label={({ qualidade, count }) => `${qualidade}: ${count}`} labelLine={false}>
                      <Cell fill={COLORS.success} />
                      <Cell fill={COLORS.info} />
                      <Cell fill={COLORS.danger} />
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="qualidade" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 8. Planejado vs Realizado
// ============================================================

function PlanejadoVsRealizadoSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const planosQuery = trpc.planosPlantio.list.useQuery();
  const colheitasQuery = trpc.registrosColheita.list.useQuery();
  const tarefasQuery = trpc.tarefas.list.useQuery();
  const planos = planosQuery.data || [];
  const colheitas = colheitasQuery.data || [];
  const tarefas = tarefasQuery.data || [];

  // KPIs
  const stats = useMemo(() => {
    const totalPlanos = planos.length;
    const colhidos = planos.filter((p: any) => p.status === 'colhido').length;
    const cancelados = planos.filter((p: any) => p.status === 'cancelado').length;
    const emAndamento = planos.filter((p: any) => p.status === 'em_germinacao' || p.status === 'em_producao').length;
    const taxaConclusao = totalPlanos > 0 ? Math.round((colhidos / totalPlanos) * 100) : 0;

    // Atraso médio (dias entre colheita prevista e real)
    const atrasos: number[] = [];
    planos.filter((p: any) => p.status === 'colhido').forEach((p: any) => {
      // Find matching colheita
      const match = colheitas.find((c: any) => c.variedadeNome === p.variedadeNome);
      if (match) {
        const prevista = new Date(p.dataColheitaPrevista);
        const real = new Date((match as any).dataColheita);
        const diff = Math.round((real.getTime() - prevista.getTime()) / (1000 * 60 * 60 * 24));
        atrasos.push(diff);
      }
    });
    const atrasoMedio = atrasos.length > 0 ? Math.round(atrasos.reduce((a, b) => a + b, 0) / atrasos.length) : null;

    // Tarefas stats
    const tarefasConcluidas = tarefas.filter((t: any) => t.status === 'concluida').length;
    const tarefasTotal = tarefas.length;
    const taxaTarefas = tarefasTotal > 0 ? Math.round((tarefasConcluidas / tarefasTotal) * 100) : 0;

    // Desvio de quantidade (plantas planejadas vs colhidas)
    let plantasPlanejadas = 0;
    let plantasColhidas = 0;
    planos.filter((p: any) => p.status === 'colhido').forEach((p: any) => {
      plantasPlanejadas += p.quantidadePlantas;
      const matches = colheitas.filter((c: any) => c.variedadeNome === p.variedadeNome);
      plantasColhidas += matches.reduce((s: number, c: any) => s + (c.quantidadePlantas || 0), 0);
    });
    const desvioQtd = plantasPlanejadas > 0 ? Math.round(((plantasColhidas - plantasPlanejadas) / plantasPlanejadas) * 100) : null;

    return { totalPlanos, colhidos, cancelados, emAndamento, taxaConclusao, atrasoMedio, taxaTarefas, tarefasConcluidas, tarefasTotal, desvioQtd };
  }, [planos, colheitas, tarefas]);

  // Status distribution for chart
  const statusData = useMemo(() => [
    { status: 'Planejado', count: planos.filter((p: any) => p.status === 'planejado').length },
    { status: 'Em Germinação', count: planos.filter((p: any) => p.status === 'em_germinacao').length },
    { status: 'Em Produção', count: planos.filter((p: any) => p.status === 'em_producao').length },
    { status: 'Colhido', count: planos.filter((p: any) => p.status === 'colhido').length },
    { status: 'Cancelado', count: planos.filter((p: any) => p.status === 'cancelado').length },
  ].filter((d) => d.count > 0), [planos]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MiniStat label="Total Planos" value={stats.totalPlanos} color="blue" icon={<Target className="w-4 h-4" />} />
        <MiniStat label="Taxa Conclusão" value={`${stats.taxaConclusao}%`} color="emerald" icon={<CheckCircle2 className="w-4 h-4" />} />
        <MiniStat label="Atraso Médio" value={stats.atrasoMedio !== null ? `${stats.atrasoMedio}d` : '-'} color={stats.atrasoMedio && stats.atrasoMedio > 3 ? 'red' : 'blue'} icon={<Clock className="w-4 h-4" />} />
        <MiniStat label="Tarefas Concluídas" value={`${stats.tarefasConcluidas}/${stats.tarefasTotal}`} color="amber" icon={<CheckCircle2 className="w-4 h-4" />} />
        <MiniStat label="Desvio Qtd" value={stats.desvioQtd !== null ? `${stats.desvioQtd > 0 ? '+' : ''}${stats.desvioQtd}%` : '-'} color={stats.desvioQtd && Math.abs(stats.desvioQtd) > 10 ? 'red' : 'emerald'} icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {planos.length === 0 ? (
        <EmptyState icon={CheckCircle2} message="Nenhum plano de plantio encontrado. Crie planos na página de Planejamento." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribuição de Status dos Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: 'Planos', color: COLORS.info } }} className="h-[280px] w-full">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="count" nameKey="status" label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Planos concluídos</span>
                  <span className="font-semibold">{stats.colhidos}/{stats.totalPlanos}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.taxaConclusao}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Tarefas concluídas</span>
                  <span className="font-semibold">{stats.tarefasConcluidas}/{stats.tarefasTotal}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.taxaTarefas}%` }} />
                </div>
              </div>
              {stats.atrasoMedio !== null && (
                <div className="p-2 rounded-lg bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Atraso médio na colheita: </span>
                  <span className={`font-semibold ${stats.atrasoMedio > 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stats.atrasoMedio > 0 ? `+${stats.atrasoMedio}` : stats.atrasoMedio} dias
                  </span>
                </div>
              )}
              {stats.desvioQtd !== null && (
                <div className="p-2 rounded-lg bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Desvio de quantidade: </span>
                  <span className={`font-semibold ${Math.abs(stats.desvioQtd) > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stats.desvioQtd > 0 ? '+' : ''}{stats.desvioQtd}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 9. Relatórios Exportáveis
// ============================================================

function RelatoriosSection({ data, period }: { data: FazendaData; period: PeriodFilter }) {
  const colheitasQuery = trpc.registrosColheita.list.useQuery();
  const planosQuery = trpc.planosPlantio.list.useQuery();
  const tarefasQuery = trpc.tarefas.list.useQuery();
  const colheitas = colheitasQuery.data || [];
  const planos = planosQuery.data || [];
  const tarefas = tarefasQuery.data || [];

  const exportCSV = useCallback((filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportProducao = useCallback(() => {
    const headers = ['Data', 'Variedade', 'Torre', 'Andar', 'Plantas', 'Peso (g)', 'Qualidade', 'Destino', 'Observações'];
    const rows = colheitas.map((c: any) => [
      c.dataColheita ? new Date(c.dataColheita).toLocaleDateString('pt-BR') : '',
      c.variedadeNome || '',
      c.torreId || '',
      c.andarId || '',
      c.quantidadePlantas || 0,
      c.pesoTotalGramas || 0,
      c.qualidade || '',
      c.destino || '',
      c.observacoes || '',
    ]);
    exportCSV('relatorio-producao', headers, rows);
  }, [colheitas, exportCSV]);

  const exportOperacional = useCallback(() => {
    const headers = ['Título', 'Tipo', 'Prioridade', 'Status', 'Vencimento', 'Concluído Em', 'Concluído Por'];
    const rows = tarefas.map((t: any) => [
      t.titulo || '',
      t.tipo || '',
      t.prioridade || '',
      t.status || '',
      t.dataVencimento ? new Date(t.dataVencimento).toLocaleDateString('pt-BR') : '',
      t.concluidoEm ? new Date(t.concluidoEm).toLocaleDateString('pt-BR') : '',
      t.concluidoPorNome || '',
    ]);
    exportCSV('relatorio-operacional', headers, rows);
  }, [tarefas, exportCSV]);

  const exportCapacidade = useCallback(() => {
    const headers = ['Receita', 'Variedade', 'Plantas', 'Status', 'Início Germinação', 'Colheita Prevista', 'Criado Por'];
    const rows = planos.map((p: any) => [
      p.receitaNome || '',
      p.variedadeNome || '',
      p.quantidadePlantas || 0,
      p.status || '',
      p.dataInicioGerminacao ? new Date(p.dataInicioGerminacao).toLocaleDateString('pt-BR') : '',
      p.dataColheitaPrevista ? new Date(p.dataColheitaPrevista).toLocaleDateString('pt-BR') : '',
      p.criadoPorNome || '',
    ]);
    exportCSV('relatorio-capacidade', headers, rows);
  }, [planos, exportCSV]);

  const reports = [
    {
      title: 'Resumo de Produção',
      description: 'Todas as colheitas com peso, qualidade, destino e observações',
      icon: <Scissors className="w-5 h-5 text-emerald-600" />,
      count: colheitas.length,
      onExport: exportProducao,
      color: 'emerald',
    },
    {
      title: 'Performance Operacional',
      description: 'Tarefas com tipo, prioridade, status e datas de conclusão',
      icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
      count: tarefas.length,
      onExport: exportOperacional,
      color: 'blue',
    },
    {
      title: 'Eficiência de Capacidade',
      description: 'Planos de plantio com datas, status e variedades',
      icon: <Target className="w-5 h-5 text-amber-600" />,
      count: planos.length,
      onExport: exportCapacidade,
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Exporte relatórios em formato CSV para análise externa ou compartilhamento.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                {report.icon}
                <div>
                  <h3 className="font-display font-bold text-sm">{report.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{report.count} registro(s)</span>
                <button
                  onClick={report.onExport}
                  disabled={report.count === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    report.count > 0
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Shared Components
// ============================================================

function MiniStat({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  icon?: React.ReactNode;
}) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100',
    purple: 'bg-purple-50 border-purple-100',
    gray: 'bg-muted border-border',
    orange: 'bg-orange-50 border-orange-100',
  };
  const textMap: Record<string, string> = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    purple: 'text-purple-700',
    gray: 'text-foreground',
    orange: 'text-orange-700',
  };

  return (
    <div className={`p-3 rounded-xl border ${bgMap[color] || bgMap.gray}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className={textMap[color]}>{icon}</span>}
        <span className="text-[10px] text-muted-foreground font-medium truncate">{label}</span>
      </div>
      <p className={`font-display font-bold text-lg ${textMap[color]}`}>
        {value}
        {unit && <span className="text-xs font-normal ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
        <Icon className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
