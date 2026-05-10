// ============================================================
// Centro de Inteligência — Alertas e Recomendações Acionáveis
// ============================================================

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useProjeto } from '@/contexts/ProjetoContext';
import { labelFaseTorreMicroverdes } from '@/lib/microverdesPhases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  RefreshCcw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  XCircle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  Zap,
  Shield,
  TrendingDown,
  Wrench,
  Layers,
  Droplet,
  Timer,
  Scissors,
  BarChart3,
  Search,
} from 'lucide-react';

// Mapeamento de tipos para ícones e cores
const TIPO_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  risco_atraso: { icon: Timer, label: 'Risco de Atraso', color: 'text-amber-600 dark:text-amber-400' },
  torre_subutilizada: { icon: Layers, label: 'Torre Subutilizada', color: 'text-blue-600' },
  lote_fora_padrao: { icon: AlertTriangle, label: 'Lote Fora do Padrão', color: 'text-orange-600' },
  manutencao_critica: { icon: Wrench, label: 'Manutenção Crítica', color: 'text-red-600' },
  manutencao_vencida: { icon: Wrench, label: 'Manutenção Vencida', color: 'text-red-600' },
  capacidade_disponivel: { icon: Zap, label: 'Capacidade Disponível', color: 'text-emerald-600 dark:text-emerald-400' },
  desvio_ec_ph: { icon: Droplet, label: 'Desvio EC/pH', color: 'text-purple-600' },
  medicao_atrasada: { icon: Droplet, label: 'Medição Atrasada', color: 'text-purple-600' },
  atraso_rotina: { icon: Clock, label: 'Atraso de Rotina', color: 'text-amber-600 dark:text-amber-400' },
  desperdicio_alto: { icon: TrendingDown, label: 'Desperdício Alto', color: 'text-red-600' },
  yield_abaixo: { icon: Scissors, label: 'Yield Abaixo', color: 'text-orange-600' },
  manutencao_recorrente: { icon: Wrench, label: 'Manutenção Recorrente', color: 'text-red-600' },
  colheita_atrasada: { icon: AlertTriangle, label: 'Colheita Atrasada', color: 'text-red-600' },
  inconsistencia_plano: { icon: AlertCircle, label: 'Inconsistência Plano', color: 'text-amber-600 dark:text-amber-400' },
  sequencia_incompleta: { icon: ClipboardList, label: 'Sequência Incompleta', color: 'text-blue-600' },
  concentracao_risco: { icon: Shield, label: 'Concentração de Risco', color: 'text-red-600' },
};

const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critica: {
    label: 'Crítica',
    color: 'text-red-800 dark:text-red-200',
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-500/30 dark:border-red-500/45',
  },
  alta: {
    label: 'Alta',
    color: 'text-amber-800 dark:text-amber-200',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-500/30 dark:border-amber-500/45',
  },
  media: {
    label: 'Média',
    color: 'text-blue-800 dark:text-blue-200',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-500/30 dark:border-blue-500/45',
  },
  baixa: {
    label: 'Baixa',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50 dark:bg-muted/30',
    border: 'border-border',
  },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgente: {
    label: 'Urgente',
    color: 'text-red-800 dark:text-red-200',
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-500/30 dark:border-red-500/45',
  },
  alta: {
    label: 'Alta',
    color: 'text-orange-800 dark:text-orange-200',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    border: 'border-orange-500/30 dark:border-orange-500/45',
  },
  media: {
    label: 'Média',
    color: 'text-blue-800 dark:text-blue-200',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-500/30 dark:border-blue-500/45',
  },
  baixa: {
    label: 'Baixa',
    color: 'text-muted-foreground',
    bg: 'bg-muted/50 dark:bg-muted/30',
    border: 'border-border',
  },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  novo: { label: 'Novo', icon: AlertCircle, color: 'text-blue-600' },
  lido: { label: 'Lido', icon: Eye, color: 'text-gray-600' },
  em_andamento: { label: 'Em Andamento', icon: Play, color: 'text-amber-600 dark:text-amber-400' },
  resolvido: { label: 'Resolvido', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  ignorado: { label: 'Ignorado', icon: XCircle, color: 'text-gray-400' },
};

export default function Inteligencia() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { activeProjeto } = useProjeto();
  const isMicroverdes = activeProjeto?.tipo === 'microverdes';
  const utils = trpc.useUtils();

  // Filtros
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  const [filtroFase, setFiltroFase] = useState<string>('todas');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  // Dialogs
  const [ignorarDialog, setIgnorarDialog] = useState<{ id: number; titulo: string } | null>(null);
  const [ignorarMotivo, setIgnorarMotivo] = useState('');
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [modoVisualizacao, setModoVisualizacao] = useState<'painel' | 'lista'>('painel');

  // Queries
  const { data: alertas = [], isLoading } = trpc.inteligencia.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: resumo } = trpc.inteligencia.resumo.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: detalhe } = trpc.inteligencia.getById.useQuery(
    { id: detalheId! },
    { enabled: !!detalheId }
  );

  // Mutations
  const recalcular = trpc.inteligencia.recalcular.useMutation({
    onSuccess: (data) => {
      toast.success(`Motor executado: ${data.criados} novos, ${data.atualizados} atualizados, ${data.resolvidos} resolvidos`);
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
    onError: () => toast.error('Erro ao recalcular alertas'),
  });

  const marcarLido = trpc.inteligencia.marcarLido.useMutation({
    onSuccess: () => {
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
  });

  const marcarEmAndamento = trpc.inteligencia.marcarEmAndamento.useMutation({
    onSuccess: () => {
      toast.success('Alerta marcado como em andamento');
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
  });

  const resolver = trpc.inteligencia.resolver.useMutation({
    onSuccess: () => {
      toast.success('Alerta resolvido');
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
  });

  const ignorar = trpc.inteligencia.ignorar.useMutation({
    onSuccess: () => {
      toast.success('Alerta ignorado');
      setIgnorarDialog(null);
      setIgnorarMotivo('');
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
  });

  const criarTarefa = trpc.inteligencia.criarTarefa.useMutation({
    onSuccess: (data) => {
      toast.success(`Tarefa #${data.tarefaId} criada`);
      utils.inteligencia.list.invalidate();
    },
  });

  const limparResolvidos = trpc.inteligencia.limparResolvidos.useMutation({
    onSuccess: () => {
      toast.success('Alertas resolvidos removidos');
      utils.inteligencia.list.invalidate();
      utils.inteligencia.resumo.invalidate();
    },
  });

  // Filtrar alertas
  const alertasFiltrados = useMemo(() => {
    const prioOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    const sevOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
    return alertas
      .filter((a) => {
      if (filtroSeveridade !== 'todas' && a.severidade !== filtroSeveridade) return false;
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
      if (filtroFase !== 'todas' && a.fase !== filtroFase) return false;
      if (filtroPrioridade !== 'todas' && a.prioridade !== filtroPrioridade) return false;
      if (filtroStatus === 'ativos' && (a.status === 'resolvido' || a.status === 'ignorado')) return false;
      if (filtroStatus !== 'ativos' && filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
      if (busca) {
        const term = busca.toLowerCase();
        return (
          a.titulo.toLowerCase().includes(term) ||
          a.descricao.toLowerCase().includes(term) ||
          (a.entidadeNome || '').toLowerCase().includes(term)
        );
      }
      return true;
      })
      .sort((a, b) => {
        // Priorização: urgentes primeiro; depois severidade; depois data.
        const pa = prioOrder[a.prioridade] ?? 2;
        const pb = prioOrder[b.prioridade] ?? 2;
        if (pa !== pb) return pa - pb;
        const sa = sevOrder[a.severidade] ?? 2;
        const sb = sevOrder[b.severidade] ?? 2;
        if (sa !== sb) return sa - sb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [alertas, filtroSeveridade, filtroTipo, filtroStatus, filtroFase, filtroPrioridade, busca]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Tipos únicos presentes nos alertas
  const tiposPresentes = useMemo(() => {
    return Array.from(new Set(alertas.map((a) => a.tipo)));
  }, [alertas]);

  const painel = useMemo(() => {
    const ativos = alertasFiltrados.filter((a) => a.status !== 'resolvido' && a.status !== 'ignorado');
    const urgentes = ativos.filter((a) => a.prioridade === 'urgente' || a.severidade === 'critica');
    const emAndamento = ativos.filter((a) => a.status === 'em_andamento');
    const novos = ativos.filter((a) => a.status === 'novo');
    const ganhosRapidos = ativos.filter((a) => a.gerarTarefa || a.status === 'lido').slice(0, 6);

    const riscoScore = ativos.reduce((acc, a) => {
      const pesoSev = a.severidade === 'critica' ? 4 : a.severidade === 'alta' ? 3 : a.severidade === 'media' ? 2 : 1;
      const pesoPrio = a.prioridade === 'urgente' ? 1.5 : a.prioridade === 'alta' ? 1.2 : 1;
      return acc + pesoSev * pesoPrio;
    }, 0);

    const faseMap = new Map<string, number>();
    ativos.forEach((a) => {
      const f = a.fase || 'geral';
      faseMap.set(f, (faseMap.get(f) || 0) + 1);
    });
    const riscoPorFase = Array.from(faseMap.entries())
      .map(([fase, total]) => ({ fase, total }))
      .sort((a, b) => b.total - a.total);

    const tipoMap = new Map<string, number>();
    ativos.forEach((a) => tipoMap.set(a.tipo, (tipoMap.get(a.tipo) || 0) + 1));
    const topCausas = Array.from(tipoMap.entries())
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const cobertura = ativos.length > 0 ? Math.round((emAndamento.length / ativos.length) * 100) : 0;
    const riscoConcentrado = riscoPorFase[0];

    return {
      ativos,
      urgentes,
      emAndamento,
      novos,
      ganhosRapidos,
      riscoScore: Math.round(riscoScore),
      riscoPorFase,
      topCausas,
      cobertura,
      riscoConcentrado,
    };
  }, [alertasFiltrados]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Centro de Inteligência
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alertas e recomendações automáticas baseadas em regras operacionais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => recalcular.mutate()}
              disabled={recalcular.isPending}
              className="gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${recalcular.isPending ? 'animate-spin' : ''}`} />
              {recalcular.isPending ? 'Analisando...' : 'Recalcular Alertas'}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => limparResolvidos.mutate()}
                disabled={limparResolvidos.isPending}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Resolvidos
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        {resumo && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/15 dark:border-red-500/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-medium text-red-700 dark:text-red-300">Urgentes</span>
              </div>
              <p className="font-display font-bold text-xl text-red-800 dark:text-red-200">{(resumo as any).urgentes ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/15 dark:border-red-500/40">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-medium text-red-700 dark:text-red-300">Críticos</span>
              </div>
              <p className="font-display font-bold text-xl text-red-800 dark:text-red-200">{resumo.criticos}</p>
            </div>
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 dark:border-amber-500/40">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">Altos</span>
              </div>
              <p className="font-display font-bold text-xl text-amber-900 dark:text-amber-100">{resumo.altos}</p>
            </div>
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15 dark:border-blue-500/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-medium text-blue-800 dark:text-blue-200">Médios</span>
              </div>
              <p className="font-display font-bold text-xl text-blue-900 dark:text-blue-100">{resumo.medios}</p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/40 dark:bg-muted/25 hidden sm:block">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">Baixos</span>
              </div>
              <p className="font-display font-bold text-xl text-foreground">{resumo.baixos}</p>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 dark:border-emerald-500/40 hidden sm:block">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-200">Total Ativos</span>
              </div>
              <p className="font-display font-bold text-xl text-emerald-900 dark:text-emerald-100">{resumo.total}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-xl border">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar alertas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="lido">Lidos</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="ignorado">Ignorados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Severidade</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tipo</SelectItem>
              {tiposPresentes.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPO_CONFIG[tipo]?.label || tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroFase} onValueChange={setFiltroFase}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Fase</SelectItem>
              <SelectItem value="mudas">
                {isMicroverdes ? labelFaseTorreMicroverdes('mudas') : 'Mudas'}
              </SelectItem>
              <SelectItem value="vegetativa">
                {isMicroverdes ? labelFaseTorreMicroverdes('vegetativa') : 'Vegetativa'}
              </SelectItem>
              <SelectItem value="maturacao">
                {isMicroverdes ? labelFaseTorreMicroverdes('maturacao') : 'Maturação'}
              </SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Prioridade</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant={modoVisualizacao === 'painel' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setModoVisualizacao('painel')}
            >
              Painel
            </Button>
            <Button
              size="sm"
              variant={modoVisualizacao === 'lista' ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setModoVisualizacao('lista')}
            >
              Lista
            </Button>
          </div>
        </div>

        {/* Lista de Alertas */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando alertas...</div>
        ) : alertasFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum alerta encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {alertas.length === 0
                ? 'Clique em "Recalcular Alertas" para executar a análise'
                : 'Ajuste os filtros para ver outros alertas'}
            </p>
          </div>
        ) : modoVisualizacao === 'painel' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/15 dark:border-red-500/40">
                <p className="text-[10px] uppercase font-semibold text-red-800 dark:text-red-200">Risco Atual</p>
                <p className="font-display text-2xl font-bold text-red-800 dark:text-red-200">{painel.riscoScore}</p>
                <p className="text-[10px] text-red-800/80 dark:text-red-200/80">Score agregado de severidade x prioridade</p>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 dark:border-amber-500/40">
                <p className="text-[10px] uppercase font-semibold text-amber-900 dark:text-amber-100">Ações Imediatas</p>
                <p className="font-display text-2xl font-bold text-amber-900 dark:text-amber-100">{painel.urgentes.length}</p>
                <p className="text-[10px] text-amber-900/80 dark:text-amber-100/80">Críticos/urgentes sem resolução</p>
              </div>
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15 dark:border-blue-500/40">
                <p className="text-[10px] uppercase font-semibold text-blue-900 dark:text-blue-100">Cobertura de Tratativa</p>
                <p className="font-display text-2xl font-bold text-blue-900 dark:text-blue-100">{painel.cobertura}%</p>
                <p className="text-[10px] text-blue-900/80 dark:text-blue-100/80">Alertas ativos em andamento</p>
              </div>
              <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/15 dark:border-purple-500/40">
                <p className="text-[10px] uppercase font-semibold text-purple-900 dark:text-purple-100">Risco Concentrado</p>
                <p className="font-display text-lg font-bold text-purple-900 dark:text-purple-100 capitalize">{painel.riscoConcentrado?.fase || 'n/a'}</p>
                <p className="text-[10px] text-purple-900/80 dark:text-purple-100/80">{painel.riscoConcentrado?.total || 0} alertas na fase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card">
                <div className="p-3 border-b">
                  <p className="text-sm font-bold">Top Causas (gerencial)</p>
                </div>
                <div className="p-3 space-y-2">
                  {painel.topCausas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem causas relevantes no filtro atual.</p>
                  ) : painel.topCausas.map((item) => (
                    <div key={item.tipo} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{TIPO_CONFIG[item.tipo]?.label || item.tipo}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted">{item.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card">
                <div className="p-3 border-b">
                  <p className="text-sm font-bold">Risco por Fase</p>
                </div>
                <div className="p-3 space-y-2">
                  {painel.riscoPorFase.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem distribuição por fase.</p>
                  ) : painel.riscoPorFase.map((f) => (
                    <div key={f.fase} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium">{f.fase}</span>
                        <span>{f.total}</span>
                      </div>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.max(8, (f.total / (painel.ativos.length || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card">
                <div className="p-3 border-b">
                  <p className="text-sm font-bold">Plano de Tratativa</p>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs"><strong>1.</strong> Atacar urgentes: {painel.urgentes.length}</p>
                  <p className="text-xs"><strong>2.</strong> Converter novos em andamento: {painel.novos.length}</p>
                  <p className="text-xs"><strong>3.</strong> Quick wins: {painel.ganhosRapidos.length} itens</p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {painel.urgentes.slice(0, 3).map((a) => (
                      <Button key={a.id} size="sm" className="h-6 text-[10px]" onClick={() => marcarEmAndamento.mutate({ id: a.id })}>
                        Assumir #{a.id}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-500/15 dark:border-red-500/40">
              <div className="p-3 border-b border-red-500/25 dark:border-red-500/35 flex items-center justify-between">
                <p className="text-sm font-bold text-red-800 dark:text-red-200">Ações Imediatas (executivo)</p>
                <span className="text-xs font-semibold text-red-800 dark:text-red-200">{painel.urgentes.length}</span>
              </div>
              <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                {painel.urgentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhum alerta urgente.</p>
                ) : painel.urgentes.map((alerta) => (
                  <div key={alerta.id} className="p-2.5 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold line-clamp-2">{alerta.titulo}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {alerta.entidadeNome || 'Geral'} • {TIPO_CONFIG[alerta.tipo]?.label || alerta.tipo}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-800 dark:text-red-200 dark:bg-red-500/25">
                        {alerta.prioridade}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => resolver.mutate({ id: alerta.id })}>
                        Resolver
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => marcarEmAndamento.mutate({ id: alerta.id })}>
                        Iniciar
                      </Button>
                      {alerta.gerarTarefa && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => criarTarefa.mutate({ id: alerta.id })}>
                          Tarefa
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {alertasFiltrados.length} alerta(s) encontrado(s)
            </p>
            <AnimatePresence>
              {alertasFiltrados.map((alerta) => {
                const tipoConf = TIPO_CONFIG[alerta.tipo] || { icon: Info, label: alerta.tipo, color: 'text-gray-600' };
                const sevConf = SEVERIDADE_CONFIG[alerta.severidade] || SEVERIDADE_CONFIG.baixa;
                const prioConf = PRIORIDADE_CONFIG[alerta.prioridade] || PRIORIDADE_CONFIG.media;
                const statusConf = STATUS_CONFIG[alerta.status] || STATUS_CONFIG.novo;
                const TipoIcon = tipoConf.icon;
                const StatusIcon = statusConf.icon;
                const isExpanded = expandedIds.has(alerta.id);
                const isActive = alerta.status !== 'resolvido' && alerta.status !== 'ignorado';

                return (
                  <motion.div
                    key={alerta.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`rounded-xl border ${sevConf.border} ${sevConf.bg} ${
                      !isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Card Header */}
                    <div
                      className="p-3 cursor-pointer flex items-start gap-3"
                      onClick={() => {
                        toggleExpand(alerta.id);
                        if (alerta.status === 'novo') marcarLido.mutate({ id: alerta.id });
                      }}
                    >
                      <div className={`mt-0.5 ${tipoConf.color}`}>
                        <TipoIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-sm">{alerta.titulo}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevConf.color} ${sevConf.bg} border ${sevConf.border}`}>
                            {sevConf.label}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioConf.color} ${prioConf.bg} border ${prioConf.border}`}>
                            {prioConf.label}
                          </span>
                          <span className={`text-[10px] flex items-center gap-1 ${statusConf.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </span>
                          {alerta.nivelConfianca && (
                            <span className="text-[10px] text-muted-foreground">
                              Confiança: {alerta.nivelConfianca}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alerta.descricao}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          {alerta.entidadeNome && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {alerta.entidadeNome}
                            </span>
                          )}
                          {alerta.fase && (
                            <span className="capitalize">{alerta.fase}</span>
                          )}
                          <span>{new Date(alerta.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-dashed border-current/10">
                        {/* Ação sugerida */}
                        {alerta.sugestaoAcao ? (
                          <div className="mt-3 p-2.5 bg-white/60 rounded-lg border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Ação Recomendada
                            </p>
                            <p className="text-xs">{String(alerta.sugestaoAcao)}</p>
                          </div>
                        ) : null}

                        {/* Dados snapshot */}
                        {alerta.dadosSnapshot ? (
                          <div className="mt-2 p-2.5 bg-white/60 rounded-lg border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              Dados da Análise
                            </p>
                            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">
                              {JSON.stringify(alerta.dadosSnapshot, null, 2)}
                            </pre>
                          </div>
                        ) : null}

                        {/* Ações rápidas */}
                        {isActive && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {alerta.gerarTarefa && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  criarTarefa.mutate({ id: alerta.id });
                                }}
                                disabled={criarTarefa.isPending || !!alerta.tarefaGeradaId}
                              >
                                <ClipboardList className="w-3 h-3" />
                                {alerta.tarefaGeradaId ? `Tarefa #${alerta.tarefaGeradaId}` : 'Criar Tarefa'}
                              </Button>
                            )}
                            {alerta.status !== 'em_andamento' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  marcarEmAndamento.mutate({ id: alerta.id });
                                }}
                              >
                                <Play className="w-3 h-3" />
                                Em Andamento
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolver.mutate({ id: alerta.id });
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Resolver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIgnorarDialog({ id: alerta.id, titulo: alerta.titulo });
                              }}
                            >
                              <XCircle className="w-3 h-3" />
                              Ignorar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetalheId(alerta.id);
                              }}
                            >
                              <BarChart3 className="w-3 h-3" />
                              Histórico
                            </Button>
                          </div>
                        )}

                        {/* Info de ignorado */}
                        {alerta.status === 'ignorado' && alerta.ignoradoMotivo && (
                          <div className="mt-2 p-2 bg-gray-100 rounded-lg text-xs">
                            <span className="font-semibold">Motivo:</span> {alerta.ignoradoMotivo}
                            {alerta.ignoradoPorNome && (
                              <span className="text-muted-foreground"> — {alerta.ignoradoPorNome}</span>
                            )}
                          </div>
                        )}

                        {/* Info de resolvido */}
                        {alerta.status === 'resolvido' && alerta.resolvidoPorNome && (
                          <div className="mt-2 p-2 bg-emerald-100 rounded-lg text-xs">
                            <span className="font-semibold">Resolvido por:</span> {alerta.resolvidoPorNome}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Legenda gerencial */}
        <section className="mt-2 p-4 rounded-xl border bg-muted/40">
          <h3 className="font-display font-semibold text-sm mb-2">Como ler este painel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p><strong>Risco Atual:</strong> score agregado de severidade e prioridade dos alertas ativos.</p>
            <p><strong>Ações Imediatas:</strong> volume de itens críticos/urgentes que exigem resposta agora.</p>
            <p><strong>Cobertura de Tratativa:</strong> percentual dos alertas ativos já assumidos pela equipe.</p>
            <p><strong>Risco Concentrado:</strong> fase com maior concentração de alertas no momento.</p>
            <p><strong>Top Causas:</strong> principais origens de risco para orientar decisão e priorização.</p>
            <p><strong>Plano de Tratativa:</strong> sequência sugerida para atacar risco alto e gerar ganho rápido.</p>
            <p><strong>Status:</strong> Novo = não tratado; Em andamento = equipe atuando; Resolvido = encerrado.</p>
            <p><strong>Prioridade:</strong> Urgente/Alta/Média/Baixa indicam janela de resposta e impacto potencial.</p>
          </div>
        </section>
      </main>

      {/* Dialog: Ignorar com justificativa */}
      <Dialog open={!!ignorarDialog} onOpenChange={() => setIgnorarDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar Alerta</DialogTitle>
            <DialogDescription>
              {ignorarDialog?.titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Justificativa (obrigatória)</label>
            <Textarea
              value={ignorarMotivo}
              onChange={(e) => setIgnorarMotivo(e.target.value)}
              placeholder="Explique por que este alerta está sendo ignorado..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnorarDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!ignorarMotivo.trim()) {
                  toast.error('Justificativa obrigatória');
                  return;
                }
                ignorar.mutate({ id: ignorarDialog!.id, motivo: ignorarMotivo });
              }}
              disabled={ignorar.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico de eventos */}
      <Dialog open={!!detalheId} onOpenChange={() => setDetalheId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico do Alerta</DialogTitle>
            {detalhe && (
              <DialogDescription>{detalhe.titulo}</DialogDescription>
            )}
          </DialogHeader>
          {detalhe?.eventos && detalhe.eventos.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {detalhe.eventos
                .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                .map((evento) => (
                  <div key={evento.id} className="p-2.5 bg-muted/50 rounded-lg border text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize">{evento.eventoTipo.replace('_', ' ')}</span>
                      <span className="text-muted-foreground">
                        {new Date(evento.createdAt!).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {evento.usuarioNome && (
                      <p className="text-muted-foreground mt-0.5">Por: {evento.usuarioNome}</p>
                    )}
                    {evento.observacao && (
                      <p className="mt-1">{evento.observacao}</p>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
