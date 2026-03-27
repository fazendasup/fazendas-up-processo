// ============================================================
// Planejamento de Plantio — Calendário + Novo Plano + Lista
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { trpc } from '@/lib/trpc';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sprout,
  ArrowRightLeft,
  Scissors,
  Leaf,
  Trash2,
  Play,
  XCircle,
  CheckCircle2,
  ListFilter,
} from 'lucide-react';
import { useState, useMemo } from 'react';

type PlanoStatus = 'planejado' | 'em_germinacao' | 'em_producao' | 'colhido' | 'cancelado';

const STATUS_CONFIG: Record<PlanoStatus, { label: string; color: string; bgColor: string }> = {
  planejado: { label: 'Planejado', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  em_germinacao: { label: 'Em Germinação', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  em_producao: { label: 'Em Produção', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  colhido: { label: 'Colhido', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  cancelado: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
};

const NEXT_STATUS: Record<string, 'em_germinacao' | 'em_producao' | 'colhido' | 'cancelado'> = {
  planejado: 'em_germinacao',
  em_germinacao: 'em_producao',
  em_producao: 'colhido',
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '-';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function PlanejamentoPage() {
  const { data } = useFazenda();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();

  const planosQuery = trpc.planosPlantio.list.useQuery();
  const receitasQuery = trpc.receitas.list.useQuery();
  const planos = planosQuery.data || [];
  const receitas = receitasQuery.data || [];

  const createMutation = trpc.planosPlantio.create.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      toast.success('Plano de plantio criado!');
      setShowNewPlan(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const avancarMutation = trpc.planosPlantio.avancarStatus.useMutation({
    onSuccess: (data) => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      toast.success(`Status avançado para: ${STATUS_CONFIG[data.status as PlanoStatus]?.label}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.planosPlantio.delete.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      toast.success('Plano excluído');
    },
    onError: (err) => toast.error(err.message),
  });

  // State
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedReceitaId, setSelectedReceitaId] = useState<string>('');
  const [quantidade, setQuantidade] = useState('');
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [torreDestinoId, setTorreDestinoId] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const selectedReceita = useMemo(() => {
    if (!selectedReceitaId) return null;
    return receitas.find((r: any) => r.id === Number(selectedReceitaId)) || null;
  }, [selectedReceitaId, receitas]);

  // Calculated dates
  const calculatedDates = useMemo(() => {
    if (!selectedReceita || !dataInicio) return null;
    const r = selectedReceita as any;
    const germinacao = dataInicio;
    const mudas = addDays(germinacao, r.diasGerminacao || 5);
    const veg = addDays(mudas, r.diasMudas || 14);
    const mat = addDays(veg, r.diasVegetativa || 21);
    const colheita = addDays(mat, r.diasMaturacao || 28);
    const totalDias = Math.round((colheita.getTime() - germinacao.getTime()) / (1000 * 60 * 60 * 24));
    return { germinacao, mudas, veg, mat, colheita, totalDias };
  }, [selectedReceita, dataInicio]);

  // Variedade lookup
  const variedadeMap = useMemo(() => {
    const m = new Map<number, string>();
    (data as any)?.variedades?.forEach?.((v: any) => m.set(v.id || 0, v.nome || v.id));
    return m;
  }, [data]);

  // Torre lookup (DB IDs)
  const torresDB = useMemo(() => {
    // We need DB ids, use raw receitas to get torre info
    return data.torres.map((t) => ({ slug: t.id, nome: t.nome, fase: t.fase }));
  }, [data.torres]);

  function resetForm() {
    setStep(1);
    setSelectedReceitaId('');
    setQuantidade('');
    setDataInicio(new Date());
    setTorreDestinoId('');
    setObservacoes('');
  }

  function handleCreate() {
    if (!selectedReceita || !calculatedDates || !quantidade) return;
    const r = selectedReceita as any;
    // Find DB variedade name
    const varNome = r.variedadeNome || variedadeMap.get(r.variedadeId) || 'Variedade';
    createMutation.mutate({
      receitaId: r.id,
      receitaNome: r.nome,
      variedadeId: r.variedadeId,
      variedadeNome: varNome,
      quantidadePlantas: Number(quantidade),
      dataInicioGerminacao: calculatedDates.germinacao,
      dataTransplantioMudas: calculatedDates.mudas,
      dataTransplantioVeg: calculatedDates.veg,
      dataTransplantioMat: calculatedDates.mat,
      dataColheitaPrevista: calculatedDates.colheita,
      torreDestinoId: torreDestinoId ? Number(torreDestinoId) : null,
      observacoes: observacoes || null,
    });
  }

  // Calendar events
  const calendarEvents = useMemo(() => {
    const events: { date: Date; type: string; label: string; color: string }[] = [];
    planos.forEach((p: any) => {
      if (p.status === 'cancelado') return;
      events.push({ date: new Date(p.dataInicioGerminacao), type: 'germinacao', label: `🌱 ${p.variedadeNome}`, color: 'bg-emerald-500' });
      events.push({ date: new Date(p.dataTransplantioMudas), type: 'transplantio', label: `🔄 ${p.variedadeNome} → Mudas`, color: 'bg-blue-500' });
      events.push({ date: new Date(p.dataTransplantioVeg), type: 'transplantio', label: `🔄 ${p.variedadeNome} → Veg`, color: 'bg-blue-500' });
      events.push({ date: new Date(p.dataTransplantioMat), type: 'transplantio', label: `🔄 ${p.variedadeNome} → Mat`, color: 'bg-blue-500' });
      events.push({ date: new Date(p.dataColheitaPrevista), type: 'colheita', label: `✂️ ${p.variedadeNome}`, color: 'bg-amber-500' });
    });
    return events;
  }, [planos]);

  // Filter planos
  const filteredPlanos = useMemo(() => {
    if (statusFilter === 'all') return planos;
    return planos.filter((p: any) => p.status === statusFilter);
  }, [planos, statusFilter]);

  // Selected day events
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return calendarEvents.filter((e) => isSameDay(e.date, selectedDay));
  }, [selectedDay, calendarEvents]);

  // Days with events for calendar highlighting
  const daysWithEvents = useMemo(() => {
    const days = new Set<string>();
    calendarEvents.forEach((e) => {
      days.add(e.date.toISOString().slice(0, 10));
    });
    return days;
  }, [calendarEvents]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Planejamento de Plantio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Planeje a produção com antecedência, defina datas e destinos
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowNewPlan(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Plano
            </Button>
          )}
        </div>

        <Tabs defaultValue="calendario">
          <TabsList>
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-1.5">
              <ListFilter className="w-3.5 h-3.5" />
              Lista de Planos
            </TabsTrigger>
          </TabsList>

          {/* ---- Calendário ---- */}
          <TabsContent value="calendario" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDay || undefined}
                    onSelect={(d) => setSelectedDay(d || null)}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    modifiers={{
                      hasEvent: (date) => daysWithEvents.has(date.toISOString().slice(0, 10)),
                    }}
                    modifiersClassNames={{
                      hasEvent: 'bg-primary/10 font-bold text-primary',
                    }}
                    className="w-full"
                  />
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Germinação</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Transplantio</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Colheita</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {selectedDay ? `Eventos — ${formatDate(selectedDay)}` : 'Selecione um dia'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDay && selectedDayEvents.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum evento neste dia.</p>
                  )}
                  {selectedDayEvents.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                      <span className={`w-2 h-2 rounded-full ${e.color}`} />
                      <span className="text-xs">{e.label}</span>
                    </div>
                  ))}
                  {!selectedDay && (
                    <p className="text-xs text-muted-foreground">Clique em um dia no calendário para ver os eventos planejados.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={<Sprout className="w-4 h-4 text-emerald-600" />} label="Planejados" value={planos.filter((p: any) => p.status === 'planejado').length} color="emerald" />
              <SummaryCard icon={<Leaf className="w-4 h-4 text-green-600" />} label="Em Produção" value={planos.filter((p: any) => p.status === 'em_germinacao' || p.status === 'em_producao').length} color="green" />
              <SummaryCard icon={<Scissors className="w-4 h-4 text-amber-600" />} label="Colhidos" value={planos.filter((p: any) => p.status === 'colhido').length} color="amber" />
              <SummaryCard icon={<XCircle className="w-4 h-4 text-red-600" />} label="Cancelados" value={planos.filter((p: any) => p.status === 'cancelado').length} color="red" />
            </div>
          </TabsContent>

          {/* ---- Lista de Planos ---- */}
          <TabsContent value="lista" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="em_germinacao">Em Germinação</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="colhido">Colhido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{filteredPlanos.length} plano(s)</span>
            </div>

            {filteredPlanos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum plano de plantio encontrado.</p>
                  {isAdmin && (
                    <Button variant="outline" className="mt-3" onClick={() => { resetForm(); setShowNewPlan(true); }}>
                      <Plus className="w-4 h-4 mr-1" /> Criar primeiro plano
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPlanos.map((plano: any) => {
                  const status = plano.status as PlanoStatus;
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.planejado;
                  const nextStatus = NEXT_STATUS[status];
                  const isOverdue = status !== 'colhido' && status !== 'cancelado' && new Date(plano.dataColheitaPrevista) < new Date();
                  return (
                    <Card key={plano.id} className={`${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-display font-bold text-sm truncate">{plano.receitaNome}</h3>
                              <Badge variant="outline" className={`text-[10px] ${cfg.bgColor} ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                              {isOverdue && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {plano.variedadeNome} &middot; {plano.quantidadePlantas} plantas
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                              <span>🌱 Germ: {formatDate(plano.dataInicioGerminacao)}</span>
                              <span>🔄 Mudas: {formatDate(plano.dataTransplantioMudas)}</span>
                              <span>🔄 Veg: {formatDate(plano.dataTransplantioVeg)}</span>
                              <span>🔄 Mat: {formatDate(plano.dataTransplantioMat)}</span>
                              <span>✂️ Colheita: {formatDate(plano.dataColheitaPrevista)}</span>
                            </div>
                            {plano.observacoes && (
                              <p className="text-[10px] text-muted-foreground mt-1 italic">{plano.observacoes}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {nextStatus && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1"
                                  onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: nextStatus })}
                                  disabled={avancarMutation.isPending}
                                >
                                  <Play className="w-3 h-3" />
                                  Avançar
                                </Button>
                              )}
                              {status !== 'colhido' && status !== 'cancelado' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 text-red-600"
                                  onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: 'cancelado' })}
                                  disabled={avancarMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3" />
                                  Cancelar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-destructive"
                                onClick={() => {
                                  if (confirm('Excluir este plano?')) deleteMutation.mutate({ id: plano.id });
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ---- Dialog: Novo Plano (3 passos) ---- */}
        <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Plano de Plantio — Passo {step}/3</DialogTitle>
            </DialogHeader>

            {/* Step 1: Selecionar receita */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Receita de Crescimento</Label>
                  <Select value={selectedReceitaId} onValueChange={setSelectedReceitaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma receita" />
                    </SelectTrigger>
                    <SelectContent>
                      {receitas.filter((r: any) => r.ativa !== false).map((r: any) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nome} ({r.metodoColheita === 'corte_unico' ? 'Corte Único' : r.metodoColheita === 'multi_corte' ? 'Multi-Corte' : 'Contínua'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedReceita && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-xs space-y-1">
                      <p><strong>Variedade:</strong> {(selectedReceita as any).variedadeNome || variedadeMap.get((selectedReceita as any).variedadeId) || '-'}</p>
                      <p><strong>Ciclo total:</strong> {((selectedReceita as any).diasGerminacao || 5) + ((selectedReceita as any).diasMudas || 14) + ((selectedReceita as any).diasVegetativa || 21) + ((selectedReceita as any).diasMaturacao || 28)} dias</p>
                      <p><strong>Yield esperado:</strong> {(selectedReceita as any).yieldEsperadoGramas ? `${(selectedReceita as any).yieldEsperadoGramas}g/planta` : '-'}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Quantidade e data */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Quantidade de Plantas</Label>
                  <Input
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Ex: 200"
                    min={1}
                  />
                </div>
                <div>
                  <Label>Data de Início (Germinação)</Label>
                  <Input
                    type="date"
                    value={dataInicio.toISOString().slice(0, 10)}
                    onChange={(e) => setDataInicio(new Date(e.target.value + 'T12:00:00'))}
                  />
                </div>
                {calculatedDates && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold mb-2">Cronograma Calculado ({calculatedDates.totalDias} dias)</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Germinação: {formatDate(calculatedDates.germinacao)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Transplantio Mudas: {formatDate(calculatedDates.mudas)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Transplantio Vegetativa: {formatDate(calculatedDates.veg)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Transplantio Maturação: {formatDate(calculatedDates.mat)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Colheita Prevista: {formatDate(calculatedDates.colheita)}</span>
                        </div>
                      </div>
                      {/* Visual timeline bar */}
                      <div className="mt-3 flex h-3 rounded-full overflow-hidden">
                        <div className="bg-emerald-400" style={{ flex: (selectedReceita as any)?.diasGerminacao || 5 }} title="Germinação" />
                        <div className="bg-green-400" style={{ flex: (selectedReceita as any)?.diasMudas || 14 }} title="Mudas" />
                        <div className="bg-blue-400" style={{ flex: (selectedReceita as any)?.diasVegetativa || 21 }} title="Vegetativa" />
                        <div className="bg-amber-400" style={{ flex: (selectedReceita as any)?.diasMaturacao || 28 }} title="Maturação" />
                      </div>
                      <div className="flex text-[9px] text-muted-foreground mt-0.5">
                        <span style={{ flex: (selectedReceita as any)?.diasGerminacao || 5 }}>Germ</span>
                        <span style={{ flex: (selectedReceita as any)?.diasMudas || 14 }}>Mudas</span>
                        <span style={{ flex: (selectedReceita as any)?.diasVegetativa || 21 }}>Veg</span>
                        <span style={{ flex: (selectedReceita as any)?.diasMaturacao || 28 }}>Mat</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Destino e observações */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Torre de Destino (opcional)</Label>
                  <Select value={torreDestinoId} onValueChange={setTorreDestinoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sugestão automática" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (melhor disponível)</SelectItem>
                      {torresDB.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>
                          {t.nome} ({t.fase})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    O sistema priorizará andares lavados com perfis disponíveis.
                  </p>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Notas sobre este plano..."
                    rows={3}
                  />
                </div>
                {/* Summary */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-xs space-y-1">
                    <p><strong>Receita:</strong> {(selectedReceita as any)?.nome}</p>
                    <p><strong>Quantidade:</strong> {quantidade} plantas</p>
                    <p><strong>Início:</strong> {formatDate(dataInicio)}</p>
                    <p><strong>Colheita prevista:</strong> {calculatedDates ? formatDate(calculatedDates.colheita) : '-'}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                )}
              </div>
              <div>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && !selectedReceitaId || step === 2 && (!quantidade || Number(quantidade) < 1)}
                  >
                    Próximo <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {createMutation.isPending ? 'Criando...' : 'Criar Plano'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// ---- Sub-components ----

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50',
    green: 'bg-green-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
  };
  return (
    <div className={`p-3 rounded-xl border ${bgMap[color] || 'bg-muted/50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
    </div>
  );
}
