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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sprout,
  Scissors,
  Leaf,
  Trash2,
  Play,
  XCircle,
  CheckCircle2,
  ListFilter,
  Repeat,
  CalendarClock,
  Pencil,
  Layers,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import GerminacaoPanel from '@/components/GerminacaoPanel';
import PlanejamentoColheitaContinua from '@/components/PlanejamentoColheitaContinua';
import PlantioCalendarioOperacional, { type PlanoRow } from '@/components/PlantioCalendarioOperacional';
import { variedadePulaVegetativa } from '@shared/variedadesFase';
import { marcosCicloDesdeColheita } from '@shared/cicloReceita';
import {
  startOfLocalDayTime,
  ymdLocalKey,
  isPlanoOperacional,
  isPlanoAtrasado,
  isPlanoMarcoHoje,
  exibirContagemGerminacaoNoTransplantioVegOuMat,
  resumoOperacaoPlano,
} from '@/lib/planosPlantioOperacao';

type PlanoStatus = 'planejado' | 'em_germinacao' | 'em_producao' | 'colhido' | 'cancelado';

const STATUS_CONFIG: Record<PlanoStatus, { label: string; color: string; bgColor: string }> = {
  planejado: {
    label: 'Planejado',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/45 dark:border-blue-800/70',
  },
  em_germinacao: {
    label: 'Em Germinação',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/45 dark:border-emerald-800/70',
  },
  em_producao: {
    label: 'Em Produção',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/45 dark:border-amber-800/70',
  },
  colhido: {
    label: 'Colhido',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 border-green-200 dark:bg-green-950/45 dark:border-green-800/70',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/45 dark:border-red-800/70',
  },
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

function toDateInputValue(d: Date | string | null): string {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

type AgendaFilter = 'prioridade' | 'atrasados' | 'hoje' | 'operacionais' | 'todos';

function agendaFilterFromStorage(): AgendaFilter {
  try {
    const v = localStorage.getItem('planejamento_lista_agenda');
    if (v === 'prioridade' || v === 'atrasados' || v === 'hoje' || v === 'operacionais' || v === 'todos') return v;
  } catch {
    /* ignore */
  }
  return 'operacionais';
}

export default function PlanejamentoPage() {
  const { data } = useFazenda();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();

  const planosQuery = trpc.planosPlantio.list.useQuery();
  const receitasQuery = trpc.receitas.list.useQuery();
  const variedadesDbQuery = trpc.variedades.list.useQuery();
  const planos = planosQuery.data || [];
  const receitas = receitasQuery.data || [];
  const variedadesDb = variedadesDbQuery.data || [];

  const createMutation = trpc.planosPlantio.create.useMutation({
    onSuccess: (data) => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      const n = (data as { count?: number }).count ?? 1;
      toast.success(n > 1 ? `${n} planos de plantio criados (série recorrente).` : 'Plano de plantio criado!');
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

  const deleteAllMutation = trpc.planosPlantio.deleteAll.useMutation({
    onSuccess: (res) => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      const n = (res as { removed?: number }).removed ?? 0;
      toast.success(n === 0 ? 'Nenhum plano para remover.' : `${n} plano(s) removido(s). Pode cadastrar um novo calendário.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.planosPlantio.update.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      toast.success('Plano atualizado');
      setEditingPlano(null);
      setShowEditPlan(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const registrarContagemMutation = trpc.planosPlantio.registrarContagemGerminacao.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const marcarGerminacaoProntaMutation = trpc.planosPlantio.marcarGerminacaoPronta.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const salvarTaxaEMarcarPronta = async (input: { id: number; germinadas: number; naoGerminadas: number }) => {
    await registrarContagemMutation.mutateAsync(input);
    await marcarGerminacaoProntaMutation.mutateAsync({ id: input.id });
    toast.success('Taxa guardada e bandeja marcada como pronta para mudas');
  };

  const deslocarVariedadeMutation = trpc.planosPlantio.deslocarDatasPorVariedade.useMutation({
    onSuccess: (res) => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
      const n = (res as { atualizados?: number }).atualizados ?? 0;
      toast.success(n ? `Cronograma atualizado em ${n} plano(s).` : 'Nenhum plano ativo para esta variedade.');
      setBulkVariedade(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // State
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingPlano, setEditingPlano] = useState<any | null>(null);
  const [step, setStep] = useState(1);
  const [selectedReceitaId, setSelectedReceitaId] = useState<string>('');
  const [quantidade, setQuantidade] = useState('');
  const [dataColheitaAlvo, setDataColheitaAlvo] = useState<Date>(() => addDays(new Date(), 28));
  const [observacoes, setObservacoes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>(agendaFilterFromStorage);
  const [bulkVariedade, setBulkVariedade] = useState<{
    variedadeId: number;
    variedadeNome: string;
    afetados: number;
  } | null>(null);
  const [bulkDeslocarDias, setBulkDeslocarDias] = useState('7');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    return t;
  });
  const [activeTab, setActiveTab] = useState('lista');
  const [listaModoSimples, setListaModoSimples] = useState(() => {
    try {
      return localStorage.getItem('planejamento_lista_modo') !== 'completo';
    } catch {
      return true;
    }
  });
  const [recorrencia, setRecorrencia] = useState<
    'nenhuma' | 'semanal' | 'quinzenal' | 'mensal' | 'personalizado'
  >('nenhuma');
  const [repeticoes, setRepeticoes] = useState('4');
  const [intervaloPersonalizadoDias, setIntervaloPersonalizadoDias] = useState('10');
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editDataMudas, setEditDataMudas] = useState('');
  const [editDataVeg, setEditDataVeg] = useState('');
  const [editDataMat, setEditDataMat] = useState('');
  const [editDataColheita, setEditDataColheita] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  useEffect(() => {
    try {
      localStorage.setItem('planejamento_lista_modo', listaModoSimples ? 'simples' : 'completo');
    } catch {
      /* ignore */
    }
  }, [listaModoSimples]);

  useEffect(() => {
    try {
      localStorage.setItem('planejamento_lista_agenda', agendaFilter);
    } catch {
      /* ignore */
    }
  }, [agendaFilter]);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'lista' || tab === 'calendario' || tab === 'colheita2') {
      setActiveTab(tab);
    }
  }, []);

  const selectedReceita = useMemo(() => {
    if (!selectedReceitaId) return null;
    return receitas.find((r: any) => r.id === Number(selectedReceitaId)) || null;
  }, [selectedReceitaId, receitas]);

  const cicloResumoReceita = useMemo(() => {
    const r = selectedReceita as any;
    if (!r) return null;
    const vdb = variedadesDb.find((x) => x.id === r.variedadeId);
    const pulaVeg = variedadePulaVegetativa(vdb?.slug, vdb?.nome);
    const g = r.diasGerminacao || 5;
    const dm = r.diasMudas || 14;
    const dv = pulaVeg ? 0 : (r.diasVegetativa || 21);
    const dmat = r.diasMaturacao || 28;
    return { total: g + dm + dv + dmat, pulaVeg, dvReal: r.diasVegetativa || 21 };
  }, [selectedReceita, variedadesDb]);

  // Calculado a partir do dia de colheita desejado (retrocede germinação e transplantes)
  const calculatedDates = useMemo(() => {
    if (!selectedReceita || !dataColheitaAlvo) return null;
    const r = selectedReceita as any;
    const vdb = variedadesDb.find((x) => x.id === r.variedadeId);
    const pulaVeg = variedadePulaVegetativa(vdb?.slug, vdb?.nome);
    const dias = {
      diasGerminacao: r.diasGerminacao || 5,
      diasMudas: r.diasMudas || 14,
      diasVegetativa: r.diasVegetativa || 21,
      diasMaturacao: r.diasMaturacao || 28,
    };
    const m = marcosCicloDesdeColheita(dataColheitaAlvo, dias, pulaVeg);
    const totalDias = Math.round((m.colheita.getTime() - m.germinacao.getTime()) / (1000 * 60 * 60 * 24));
    return { germinacao: m.germinacao, mudas: m.mudas, veg: m.veg, mat: m.mat, colheita: m.colheita, totalDias, pulaVeg };
  }, [selectedReceita, dataColheitaAlvo, variedadesDb]);

  // Variedade lookup
  const variedadeMap = useMemo(() => {
    const m = new Map<number, string>();
    (data as any)?.variedades?.forEach?.((v: any) => m.set(v.id || 0, v.nome || v.id));
    return m;
  }, [data]);

  function resetForm() {
    setStep(1);
    setSelectedReceitaId('');
    setQuantidade('');
    setDataColheitaAlvo(addDays(new Date(), 28));
    setObservacoes('');
    setRecorrencia('nenhuma');
    setRepeticoes('4');
    setIntervaloPersonalizadoDias('10');
  }

  function handleCreate() {
    if (!selectedReceita || !calculatedDates || !quantidade) return;
    const r = selectedReceita as any;
    // Find DB variedade name
    const varNome = r.variedadeNome || variedadeMap.get(r.variedadeId) || 'Variedade';
    const reps = Math.max(1, Math.min(52, parseInt(repeticoes, 10) || 1));
    const diasCustom = Math.max(1, Math.min(365, parseInt(intervaloPersonalizadoDias, 10) || 1));
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
      torreDestinoId: null,
      observacoes: observacoes || null,
      recorrencia,
      repeticoes: recorrencia === 'nenhuma' ? 1 : reps,
      ...(recorrencia === 'personalizado' ? { intervaloDiasPersonalizado: diasCustom } : {}),
    });
  }

  function openEditPlan(plano: any) {
    setEditingPlano(plano);
    setEditQuantidade(String(plano.quantidadePlantas ?? ''));
    setEditDataInicio(toDateInputValue(plano.dataInicioGerminacao));
    setEditDataMudas(toDateInputValue(plano.dataTransplantioMudas));
    setEditDataVeg(toDateInputValue(plano.dataTransplantioVeg));
    setEditDataMat(toDateInputValue(plano.dataTransplantioMat));
    setEditDataColheita(toDateInputValue(plano.dataColheitaPrevista));
    setEditObservacoes(plano.observacoes ?? '');
    setShowEditPlan(true);
  }

  function handleUpdate() {
    if (!editingPlano) return;
    if (
      !editQuantidade ||
      !editDataInicio ||
      !editDataMudas ||
      !editDataVeg ||
      !editDataMat ||
      !editDataColheita ||
      Number(editQuantidade) < 1
    ) {
      toast.error('Preencha quantidade e todas as datas');
      return;
    }
    updateMutation.mutate({
      id: editingPlano.id,
      quantidadePlantas: Number(editQuantidade),
      dataInicioGerminacao: parseDateInput(editDataInicio),
      dataTransplantioMudas: parseDateInput(editDataMudas),
      dataTransplantioVeg: parseDateInput(editDataVeg),
      dataTransplantioMat: parseDateInput(editDataMat),
      dataColheitaPrevista: parseDateInput(editDataColheita),
      observacoes: editObservacoes.trim() ? editObservacoes : null,
    });
  }

  const filteredPlanos = useMemo(() => {
    const now = new Date();
    const hojeStart = startOfLocalDayTime(now);
    const hojeYmd = ymdLocalKey(now);

    let list: any[] = planos;
    if (statusFilter !== 'all') {
      list = list.filter((p: any) => p.status === statusFilter);
    }

    if (agendaFilter === 'prioridade') {
      list = list.filter(
        (p: any) => isPlanoAtrasado(p, hojeStart) || isPlanoMarcoHoje(p, hojeYmd),
      );
    } else if (agendaFilter === 'atrasados') {
      list = list.filter((p: any) => isPlanoAtrasado(p, hojeStart));
    } else if (agendaFilter === 'hoje') {
      list = list.filter((p: any) => isPlanoMarcoHoje(p, hojeYmd));
    } else if (agendaFilter === 'operacionais') {
      list = list.filter((p: any) => isPlanoOperacional(p));
    }

    const sorted = [...list].sort((a: any, b: any) => {
      const aA = isPlanoAtrasado(a, hojeStart);
      const bA = isPlanoAtrasado(b, hojeStart);
      const aH = !aA && isPlanoMarcoHoje(a, hojeYmd);
      const bH = !bA && isPlanoMarcoHoje(b, hojeYmd);
      const ra = aA ? 0 : aH ? 1 : 2;
      const rb = bA ? 0 : bH ? 1 : 2;
      if (ra !== rb) return ra - rb;
      const ca = new Date(a.dataColheitaPrevista).getTime();
      const cb = new Date(b.dataColheitaPrevista).getTime();
      if (ra === 0) return ca - cb;
      return ca - cb;
    });

    return sorted;
  }, [planos, statusFilter, agendaFilter]);

  function countPlanosAtivosVariedade(variedadeId: number): number {
    return planos.filter(
      (p: any) =>
        p.variedadeId === variedadeId && p.status !== 'colhido' && p.status !== 'cancelado',
    ).length;
  }

  function openBulkVariedade(plano: any) {
    const variedadeId = plano.variedadeId as number;
    setBulkVariedade({
      variedadeId,
      variedadeNome: plano.variedadeNome || `Variedade #${variedadeId}`,
      afetados: countPlanosAtivosVariedade(variedadeId),
    });
    setBulkDeslocarDias('7');
  }

  function submitBulkDeslocar() {
    if (!bulkVariedade) return;
    const dias = parseInt(bulkDeslocarDias, 10);
    if (Number.isNaN(dias) || dias === 0) {
      toast.error('Informe quantos dias deslocar (positivo = adiar, negativo = antecipar).');
      return;
    }
    if (
      !confirm(
        `Deslocar ${dias > 0 ? '+' : ''}${dias} dia(s) em todos os planos ativos de "${bulkVariedade.variedadeNome}" (${bulkVariedade.afetados} plano(s))?`,
      )
    ) {
      return;
    }
    deslocarVariedadeMutation.mutate({ variedadeId: bulkVariedade.variedadeId, dias });
  }

  function limparTodosPlanos() {
    const n = planos.length;
    if (n === 0) return;
    if (
      !confirm(
        `Remover os ${n} plano(s) de plantio deste projeto?\n\nEsta acção não pode ser desfeita. Depois pode criar um novo plano em «Novo Plano».`,
      )
    ) {
      return;
    }
    deleteAllMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Plantio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calendário e colheita contínua nas outras abas. Na lista, o filtro por defeito é{' '}
              <strong className="font-medium text-foreground/80">Todos em andamento</strong> (inclui planos futuros —
              edite ou exclua em «Mais opções» / «Editar»). Use <strong className="font-medium text-foreground/80">Só urgência</strong> para
              focar em atrasados ou marcos hoje. A lista abre em modo{' '}
              <strong className="font-medium text-foreground/80">Simples</strong> (menos acções visíveis) ou{' '}
              <strong className="font-medium text-foreground/80">Completo</strong> para o fluxo detalhado.
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {planos.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                  disabled={deleteAllMutation.isPending}
                  onClick={limparTodosPlanos}
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar todos os planos
                </Button>
              )}
              <Button onClick={() => { resetForm(); setShowNewPlan(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Plano
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-1.5">
              <ListFilter className="w-3.5 h-3.5" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="colheita2" className="gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Colheita contínua
            </TabsTrigger>
          </TabsList>

          {/* ---- Calendário ---- */}
          <TabsContent value="calendario" className="space-y-4">
            <PlantioCalendarioOperacional
              planos={planos as PlanoRow[]}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              calendarMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
            />

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard icon={<Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} label="Planejados" value={planos.filter((p: any) => p.status === 'planejado').length} color="emerald" />
              <SummaryCard icon={<Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />} label="Em Produção" value={planos.filter((p: any) => p.status === 'em_germinacao' || p.status === 'em_producao').length} color="green" />
              <SummaryCard icon={<Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />} label="Colhidos" value={planos.filter((p: any) => p.status === 'colhido').length} color="amber" />
              <SummaryCard icon={<XCircle className="w-4 h-4 text-red-600" />} label="Cancelados" value={planos.filter((p: any) => p.status === 'cancelado').length} color="red" />
            </div>
          </TabsContent>

          {/* ---- Meta colheita contínua (intervalo configurável) ---- */}
          <TabsContent value="colheita2" className="space-y-4">
            <PlanejamentoColheitaContinua />
          </TabsContent>

          {/* ---- Lista de Planos ---- */}
          <TabsContent value="lista" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Select value={agendaFilter} onValueChange={(v) => setAgendaFilter(v as AgendaFilter)}>
                <SelectTrigger className="w-full sm:w-[min(100%,260px)]">
                  <SelectValue placeholder="Foco da lista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacionais">Todos em andamento (padrão — inclui futuros)</SelectItem>
                  <SelectItem value="prioridade">Só urgência: atrasados ou marcos hoje</SelectItem>
                  <SelectItem value="atrasados">Só atrasados (colheita passou)</SelectItem>
                  <SelectItem value="hoje">Só marcos no dia de hoje</SelectItem>
                  <SelectItem value="todos">Todos os planos (inclui colhidos)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
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
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <span className="text-xs text-muted-foreground">
                  {filteredPlanos.length} plano(s) · ordenado: atraso → hoje → demais
                </span>
                <div
                  className="inline-flex rounded-lg border bg-muted/30 p-0.5"
                  role="group"
                  aria-label="Modo de visualização da lista"
                >
                  <button
                    type="button"
                    onClick={() => setListaModoSimples(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      listaModoSimples
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Simples
                  </button>
                  <button
                    type="button"
                    onClick={() => setListaModoSimples(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      !listaModoSimples
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Completo
                  </button>
                </div>
              </div>
            </div>

            {filteredPlanos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum plano neste filtro.</p>
                  {planos.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                      Existem <strong>{planos.length}</strong> plano(s) cadastrados; nenhum corresponde aos filtros atuais.
                      Para ver futuros e editar/excluir, use em geral <strong>Todos os status</strong> +{' '}
                      <strong>Todos em andamento</strong> (ou <strong>Todos os planos</strong> para incluir colhidos).
                    </p>
                  )}
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
                  const faseG = plano.germinacaoFase || 'pendente';
                  const naoPodeIrProducao =
                    status === 'em_germinacao' &&
                    nextStatus === 'em_producao' &&
                    faseG !== 'pronto_mudas';
                  const hojeStartLive = startOfLocalDayTime(new Date());
                  const hojeYmdLive = ymdLocalKey(new Date());
                  const isOverdue = isPlanoAtrasado(plano, hojeStartLive);
                  const marcoHoje = isPlanoMarcoHoje(plano, hojeYmdLive);
                  return (
                    <Card key={plano.id} className={`${isOverdue ? 'border-red-300 bg-red-50/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-display font-bold text-sm truncate">{plano.receitaNome}</h3>
                              <Badge variant="outline" className={`text-[10px] ${cfg.bgColor} ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[10px] gap-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  Atrasado
                                </Badge>
                              )}
                              {marcoHoje && (
                                <Badge className="text-[10px] bg-sky-600 hover:bg-sky-600">Marco hoje</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {plano.variedadeNome} &middot; {plano.quantidadePlantas} plantas
                            </p>
                            {listaModoSimples && resumoOperacaoPlano(plano, hojeYmdLive) && (
                              <p className="text-xs text-foreground/90 mt-2 leading-snug">
                                {resumoOperacaoPlano(plano, hojeYmdLive)}
                              </p>
                            )}
                            {listaModoSimples ? (
                              <details className="mt-2 rounded-md border border-transparent hover:border-border/60 open:border-border open:bg-muted/20 px-2 py-1">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer select-none list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  Ver cronograma (datas)
                                </summary>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                                  <span>🌱 Germ: {formatDate(plano.dataInicioGerminacao)}</span>
                                  <span>🔄 Mudas: {formatDate(plano.dataTransplantioMudas)}</span>
                                  <span>🔄 Veg: {formatDate(plano.dataTransplantioVeg)}</span>
                                  <span>🔄 Mat: {formatDate(plano.dataTransplantioMat)}</span>
                                  <span>✂️ Colheita: {formatDate(plano.dataColheitaPrevista)}</span>
                                </div>
                              </details>
                            ) : (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                                <span>🌱 Germ: {formatDate(plano.dataInicioGerminacao)}</span>
                                <span>🔄 Mudas: {formatDate(plano.dataTransplantioMudas)}</span>
                                <span>🔄 Veg: {formatDate(plano.dataTransplantioVeg)}</span>
                                <span>🔄 Mat: {formatDate(plano.dataTransplantioMat)}</span>
                                <span>✂️ Colheita: {formatDate(plano.dataColheitaPrevista)}</span>
                              </div>
                            )}
                            {plano.observacoes && (
                              <p className="text-[10px] text-muted-foreground mt-1 italic">{plano.observacoes}</p>
                            )}
                            {status === 'em_germinacao' && (
                              <PlanoGerminacaoBlock
                                plano={plano}
                                hojeYmd={hojeYmdLive}
                                listaModoSimples={listaModoSimples}
                                onSalvarTaxaEMarcarPronta={salvarTaxaEMarcarPronta}
                                registrarContagemMutation={registrarContagemMutation}
                                marcarGerminacaoProntaMutation={marcarGerminacaoProntaMutation}
                              />
                            )}
                          </div>
                          {isAdmin && (
                            listaModoSimples ? (
                              <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 min-w-[10rem]">
                                {status === 'planejado' && nextStatus === 'em_germinacao' && (
                                  <Button
                                    size="sm"
                                    className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                    onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: 'em_germinacao' })}
                                    disabled={avancarMutation.isPending}
                                  >
                                    <Sprout className="w-3 h-3" />
                                    Iniciar germinação
                                  </Button>
                                )}
                                {status === 'em_germinacao' && faseG === 'pronto_mudas' && nextStatus === 'em_producao' && (
                                  <Button
                                    size="sm"
                                    className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                                    onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: 'em_producao' })}
                                    disabled={avancarMutation.isPending || naoPodeIrProducao}
                                    title={
                                      naoPodeIrProducao
                                        ? 'Marque a germinação como pronta para mudas antes de avançar para produção'
                                        : undefined
                                    }
                                  >
                                    <Play className="w-3 h-3" />
                                    Passar para produção
                                  </Button>
                                )}
                                {status === 'em_producao' && nextStatus === 'colhido' && (
                                  <Button
                                    size="sm"
                                    className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
                                    onClick={() => {
                                      if (!window.confirm('Marcar este plano como colhido?')) return;
                                      avancarMutation.mutate({ id: plano.id, novoStatus: 'colhido' });
                                    }}
                                    disabled={avancarMutation.isPending}
                                  >
                                    <Scissors className="w-3 h-3" />
                                    Marcar colhido
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="text-xs gap-1 w-full sm:w-auto">
                                      Mais opções
                                      <ChevronDown className="w-3 h-3 opacity-70" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {isPlanoOperacional(plano) && (
                                      <DropdownMenuItem onClick={() => openBulkVariedade(plano)}>
                                        <Layers className="w-3.5 h-3.5 mr-2" />
                                        Toda a variedade
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => openEditPlan(plano)}>
                                      <Pencil className="w-3.5 h-3.5 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    {nextStatus && (
                                      <DropdownMenuItem
                                        disabled={avancarMutation.isPending || naoPodeIrProducao}
                                        onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: nextStatus })}
                                      >
                                        <Play className="w-3.5 h-3.5 mr-2" />
                                        Avançar estado
                                      </DropdownMenuItem>
                                    )}
                                    {status !== 'colhido' && status !== 'cancelado' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600"
                                          onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: 'cancelado' })}
                                          disabled={avancarMutation.isPending}
                                        >
                                          <XCircle className="w-3.5 h-3.5 mr-2" />
                                          Cancelar plano
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        if (confirm('Excluir este plano?')) deleteMutation.mutate({ id: plano.id });
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                                {isPlanoOperacional(plano) && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs gap-1"
                                    title="Deslocar datas de todos os planos ativos desta variedade"
                                    onClick={() => openBulkVariedade(plano)}
                                  >
                                    <Layers className="w-3 h-3" />
                                    Toda a variedade
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1"
                                  onClick={() => openEditPlan(plano)}
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </Button>
                                {nextStatus && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs gap-1"
                                    onClick={() => avancarMutation.mutate({ id: plano.id, novoStatus: nextStatus })}
                                    disabled={avancarMutation.isPending || naoPodeIrProducao}
                                    title={
                                      naoPodeIrProducao
                                        ? 'Marque a germinação como pronta para mudas antes de avançar para produção'
                                        : undefined
                                    }
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
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="mt-10 pt-8 border-t">
              <GerminacaoPanel />
            </div>
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
                      <p><strong>Ciclo total:</strong> {cicloResumoReceita?.total ?? '—'} dias{cicloResumoReceita?.pulaVeg ? ' (sem fase vegetativa)' : ''}</p>
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
                  <Label>Data prevista de colheita</Label>
                  <Input
                    type="date"
                    value={dataColheitaAlvo.toISOString().slice(0, 10)}
                    onChange={(e) => setDataColheitaAlvo(new Date(`${e.target.value}T12:00:00`))}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    O sistema calcula quando germinar e cada transplantio para bater nesta data (por receita).
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border p-3 bg-card">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Repeat className="w-3.5 h-3.5" />
                    Recorrência
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Repetir</Label>
                      <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as typeof recorrencia)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhuma">Sem recorrência (um único plano)</SelectItem>
                          <SelectItem value="semanal">A cada 1 semana</SelectItem>
                          <SelectItem value="quinzenal">A cada 2 semanas</SelectItem>
                          <SelectItem value="mensal">A cada 4 semanas (~mês)</SelectItem>
                          <SelectItem value="personalizado">Personalizado…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {recorrencia === 'personalizado' && (
                      <div>
                        <Label className="text-xs">Intervalo entre ciclos</Label>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">A cada</span>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={intervaloPersonalizadoDias}
                            onChange={(e) => setIntervaloPersonalizadoDias(e.target.value)}
                            className="h-9 w-20"
                            aria-label="Dias entre cada ciclo"
                          />
                          <span className="text-sm text-muted-foreground">
                            dias entre colheitas (equivale ao deslocamento do início da germinação)
                          </span>
                        </div>
                      </div>
                    )}
                    {recorrencia !== 'nenhuma' && (
                      <div>
                        <Label className="text-xs">Número de ciclos</Label>
                        <Input
                          type="number"
                          min={2}
                          max={52}
                          value={repeticoes}
                          onChange={(e) => setRepeticoes(e.target.value)}
                          className="h-9 max-w-[8rem]"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Cada ciclo repete a mesma receita e quantidade; a colheita de cada ciclo fica espaçada
                          pelo intervalo.
                        </p>
                      </div>
                    )}
                  </div>
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
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span>Transplantio Mudas: {formatDate(calculatedDates.mudas)}</span>
                        </div>
                        {!calculatedDates.pulaVeg && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-600" />
                            <span>Transplantio Vegetativa: {formatDate(calculatedDates.veg)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-700" />
                          <span>
                            Transplantio Maturação{calculatedDates.pulaVeg ? ' (direto após mudas)' : ''}: {formatDate(calculatedDates.mat)}
                          </span>
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
                        {!calculatedDates.pulaVeg && (
                          <div className="bg-emerald-600" style={{ flex: (selectedReceita as any)?.diasVegetativa || 21 }} title="Vegetativa" />
                        )}
                        <div className="bg-green-700" style={{ flex: (selectedReceita as any)?.diasMaturacao || 28 }} title="Maturação" />
                      </div>
                      <div className="flex text-[9px] text-muted-foreground mt-0.5">
                        <span style={{ flex: (selectedReceita as any)?.diasGerminacao || 5 }}>Germ</span>
                        <span style={{ flex: (selectedReceita as any)?.diasMudas || 14 }}>Mudas</span>
                        {!calculatedDates.pulaVeg && (
                          <span style={{ flex: (selectedReceita as any)?.diasVegetativa || 21 }}>Veg</span>
                        )}
                        <span style={{ flex: (selectedReceita as any)?.diasMaturacao || 28 }}>Mat</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Observações */}
            {step === 3 && (
              <div className="space-y-4">
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
                    <p><strong>Colheita alvo:</strong> {formatDate(dataColheitaAlvo)}</p>
                    <p>
                      <strong>Início da germinação:</strong>{' '}
                      {calculatedDates ? formatDate(calculatedDates.germinacao) : '-'}
                    </p>
                    {recorrencia !== 'nenhuma' && (
                      <p>
                        <strong>Série:</strong> {repeticoes} ciclos (
                        {recorrencia === 'semanal'
                          ? 'semanal'
                          : recorrencia === 'quinzenal'
                            ? 'quinzenal'
                            : recorrencia === 'mensal'
                              ? '≈ mensal'
                              : `a cada ${Math.max(1, Math.min(365, parseInt(intervaloPersonalizadoDias, 10) || 1))} dia(s)`}
                        )
                      </p>
                    )}
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
                    disabled={
                      (step === 1 && !selectedReceitaId) ||
                      (step === 2 &&
                        (!quantidade ||
                          Number(quantidade) < 1 ||
                          (recorrencia === 'personalizado' &&
                            (!intervaloPersonalizadoDias ||
                              Number(intervaloPersonalizadoDias) < 1 ||
                              Number(intervaloPersonalizadoDias) > 365))))
                    }
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

        {/* ---- Dialog: Editar Plano ---- */}
        <Dialog
          open={showEditPlan}
          onOpenChange={(open) => {
            setShowEditPlan(open);
            if (!open) setEditingPlano(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Plano de Plantio</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Receita</Label>
                  <Input value={editingPlano?.receitaNome || '-'} disabled />
                </div>
                <div>
                  <Label>Quantidade de Plantas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editQuantidade}
                    onChange={(e) => setEditQuantidade(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Início Germinação</Label>
                  <Input
                    type="date"
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Transplante Mudas</Label>
                  <Input
                    type="date"
                    value={editDataMudas}
                    onChange={(e) => setEditDataMudas(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Transplante Vegetativa</Label>
                  <Input
                    type="date"
                    value={editDataVeg}
                    onChange={(e) => setEditDataVeg(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Transplante Maturação</Label>
                  <Input
                    type="date"
                    value={editDataMat}
                    onChange={(e) => setEditDataMat(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Colheita Prevista</Label>
                  <Input
                    type="date"
                    value={editDataColheita}
                    onChange={(e) => setEditDataColheita(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    placeholder="Observações do plano..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditPlan(false);
                  setEditingPlano(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Dialog: deslocar cronograma de toda a variedade ---- */}
        <Dialog
          open={!!bulkVariedade}
          onOpenChange={(open) => {
            if (!open) setBulkVariedade(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Cronograma da variedade
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Ajusta <strong>todas as datas</strong> (germinação, mudas, veg, mat, colheita) de{' '}
              <strong>todos os planos ativos</strong> da variedade{' '}
              <strong>{bulkVariedade?.variedadeNome}</strong> — não altera planos colhidos ou cancelados.
            </p>
            <p className="text-xs text-muted-foreground">
              Planos ativos encontrados: <strong>{bulkVariedade?.afetados ?? 0}</strong>
            </p>
            <div>
              <Label>Deslocar (dias)</Label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={-365}
                  max={365}
                  className="w-28"
                  value={bulkDeslocarDias}
                  onChange={(e) => setBulkDeslocarDias(e.target.value)}
                  aria-label="Dias para deslocar o cronograma"
                />
                <span className="text-xs text-muted-foreground">
                  Positivo = adiar · negativo = antecipar (ex.: <code className="text-[10px]">-3</code>)
                </span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setBulkVariedade(null)}>
                Fechar
              </Button>
              <Button
                onClick={submitBulkDeslocar}
                disabled={deslocarVariedadeMutation.isPending || !bulkVariedade?.afetados}
              >
                {deslocarVariedadeMutation.isPending ? 'Aplicando...' : 'Aplicar a todos'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// ---- Sub-components ----

function PlanoGerminacaoBlock({
  plano,
  hojeYmd,
  listaModoSimples,
  onSalvarTaxaEMarcarPronta,
  registrarContagemMutation,
  marcarGerminacaoProntaMutation,
}: {
  plano: {
    id: number;
    quantidadePlantas: number;
    germinadas?: number | null;
    naoGerminadas?: number | null;
    germinacaoFase?: string | null;
    status: string;
    dataTransplantioVeg: Date | string;
    dataTransplantioMat: Date | string;
  };
  hojeYmd: string;
  listaModoSimples: boolean;
  onSalvarTaxaEMarcarPronta: (input: { id: number; germinadas: number; naoGerminadas: number }) => Promise<void>;
  registrarContagemMutation: {
    mutate: (
      input: { id: number; germinadas: number; naoGerminadas: number },
      opts?: { onSuccess?: () => void },
    ) => void;
    mutateAsync: (input: { id: number; germinadas: number; naoGerminadas: number }) => Promise<unknown>;
    isPending: boolean;
  };
  marcarGerminacaoProntaMutation: {
    mutate: (input: { id: number }, opts?: { onSuccess?: () => void }) => void;
    mutateAsync: (input: { id: number }) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const qty = plano.quantidadePlantas;
  const [germinadas, setGerminadas] = useState(() => Number(plano.germinadas ?? 0));
  const [naoGerminadas, setNaoGerminadas] = useState(() =>
    Number(plano.naoGerminadas ?? qty - (plano.germinadas ?? 0)),
  );

  useEffect(() => {
    setGerminadas(Number(plano.germinadas ?? 0));
    setNaoGerminadas(Number(plano.naoGerminadas ?? qty - (plano.germinadas ?? 0)));
  }, [plano.id, plano.germinadas, plano.naoGerminadas, qty]);

  const fase = plano.germinacaoFase || 'pendente';
  const faseLabel =
    fase === 'pendente' ? 'Bandeja: pendente' :
    fase === 'germinando' ? 'Bandeja: germinando' :
    'Bandeja: pronta para mudas';

  const mostrarContagem = exibirContagemGerminacaoNoTransplantioVegOuMat(plano, hojeYmd);
  const dataRefContagem = plano.dataTransplantioVeg;

  return (
    <div className="rounded-lg border border-dashed border-emerald-200/60 bg-emerald-50/20 px-3 py-2.5 space-y-2 dark:border-emerald-700/55 dark:bg-emerald-950/35">
      <p className="text-[10px] font-medium text-emerald-800/90 dark:text-emerald-200/95">{faseLabel}</p>
      {!mostrarContagem && (
        <p className="text-[10px] text-muted-foreground leading-snug">
          A contagem da bandeja (taxa de germinação) aparece <strong>só no dia</strong> do transplantio mudas → vegetativa
          (marco em {formatDate(dataRefContagem)}).
        </p>
      )}
      {mostrarContagem && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-emerald-900/90 dark:text-emerald-200/95">
            Taxa de germinação — transplantio mudas → vegetativa
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Germinadas</Label>
              <Input
                type="number"
                min={0}
                max={qty}
                value={germinadas}
                onChange={(e) => {
                  const v = Math.min(qty, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setGerminadas(v);
                  setNaoGerminadas(qty - v);
                }}
                className="h-8 w-20 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Não germ.</Label>
              <Input
                type="number"
                min={0}
                max={qty}
                value={naoGerminadas}
                onChange={(e) => {
                  const v = Math.min(qty, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setNaoGerminadas(v);
                  setGerminadas(qty - v);
                }}
                className="h-8 w-20 text-xs"
              />
            </div>
            {listaModoSimples && fase !== 'pronto_mudas' ? (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                disabled={registrarContagemMutation.isPending || marcarGerminacaoProntaMutation.isPending}
                onClick={async () => {
                  try {
                    await onSalvarTaxaEMarcarPronta({ id: plano.id, germinadas, naoGerminadas });
                  } catch {
                    /* toast em onError das mutations */
                  }
                }}
              >
                Guardar taxa e marcar pronta
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                disabled={registrarContagemMutation.isPending}
                onClick={() =>
                  registrarContagemMutation.mutate(
                    { id: plano.id, germinadas, naoGerminadas },
                    { onSuccess: () => toast.success('Contagem de germinação salva') },
                  )
                }
              >
                Salvar contagem
              </Button>
            )}
          </div>
        </div>
      )}
      {fase !== 'pronto_mudas' && (!listaModoSimples || !mostrarContagem) && (
        <div className="pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            disabled={marcarGerminacaoProntaMutation.isPending}
            onClick={() =>
              marcarGerminacaoProntaMutation.mutate(
                { id: plano.id },
                { onSuccess: () => toast.success('Germinação marcada como pronta para mudas') },
              )
            }
          >
            <CheckCircle2 className="w-3 h-3" />
            Pronta p/ mudas
          </Button>
        </div>
      )}
    </div>
  );
}

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
