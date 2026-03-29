// ============================================================
// Centro de Inteligência — Alertas e Recomendações Acionáveis
// ============================================================

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
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
  risco_atraso: { icon: Timer, label: 'Risco de Atraso', color: 'text-amber-600' },
  torre_subutilizada: { icon: Layers, label: 'Torre Subutilizada', color: 'text-blue-600' },
  lote_fora_padrao: { icon: AlertTriangle, label: 'Lote Fora do Padrão', color: 'text-orange-600' },
  manutencao_critica: { icon: Wrench, label: 'Manutenção Crítica', color: 'text-red-600' },
  capacidade_disponivel: { icon: Zap, label: 'Capacidade Disponível', color: 'text-emerald-600' },
  desvio_ec_ph: { icon: Droplet, label: 'Desvio EC/pH', color: 'text-purple-600' },
  atraso_rotina: { icon: Clock, label: 'Atraso de Rotina', color: 'text-amber-600' },
  desperdicio_alto: { icon: TrendingDown, label: 'Desperdício Alto', color: 'text-red-600' },
  yield_abaixo: { icon: Scissors, label: 'Yield Abaixo', color: 'text-orange-600' },
  manutencao_recorrente: { icon: Wrench, label: 'Manutenção Recorrente', color: 'text-red-600' },
  inconsistencia_plano: { icon: AlertCircle, label: 'Inconsistência Plano', color: 'text-amber-600' },
  sequencia_incompleta: { icon: ClipboardList, label: 'Sequência Incompleta', color: 'text-blue-600' },
  concentracao_risco: { icon: Shield, label: 'Concentração de Risco', color: 'text-red-600' },
};

const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critica: { label: 'Crítica', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  alta: { label: 'Alta', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  media: { label: 'Média', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  baixa: { label: 'Baixa', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  novo: { label: 'Novo', icon: AlertCircle, color: 'text-blue-600' },
  lido: { label: 'Lido', icon: Eye, color: 'text-gray-600' },
  em_andamento: { label: 'Em Andamento', icon: Play, color: 'text-amber-600' },
  resolvido: { label: 'Resolvido', icon: CheckCircle2, color: 'text-emerald-600' },
  ignorado: { label: 'Ignorado', icon: XCircle, color: 'text-gray-400' },
};

export default function Inteligencia() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();

  // Filtros
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  const [filtroFase, setFiltroFase] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  // Dialogs
  const [ignorarDialog, setIgnorarDialog] = useState<{ id: number; titulo: string } | null>(null);
  const [ignorarMotivo, setIgnorarMotivo] = useState('');
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
    return alertas.filter((a) => {
      if (filtroSeveridade !== 'todas' && a.severidade !== filtroSeveridade) return false;
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
      if (filtroFase !== 'todas' && a.fase !== filtroFase) return false;
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
    });
  }, [alertas, filtroSeveridade, filtroTipo, filtroStatus, filtroFase, busca]);

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
            <div className="p-3 rounded-xl border bg-red-50 border-red-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-[10px] text-red-600 font-medium">Críticos</span>
              </div>
              <p className="font-display font-bold text-xl text-red-700">{resumo.criticos}</p>
            </div>
            <div className="p-3 rounded-xl border bg-amber-50 border-amber-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] text-amber-600 font-medium">Altos</span>
              </div>
              <p className="font-display font-bold text-xl text-amber-700">{resumo.altos}</p>
            </div>
            <div className="p-3 rounded-xl border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] text-blue-600 font-medium">Médios</span>
              </div>
              <p className="font-display font-bold text-xl text-blue-700">{resumo.medios}</p>
            </div>
            <div className="p-3 rounded-xl border bg-gray-50 border-gray-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] text-gray-500 font-medium">Baixos</span>
              </div>
              <p className="font-display font-bold text-xl text-gray-600">{resumo.baixos}</p>
            </div>
            <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] text-emerald-600 font-medium">Total Ativos</span>
              </div>
              <p className="font-display font-bold text-xl text-emerald-700">{resumo.total}</p>
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
              <SelectItem value="mudas">Mudas</SelectItem>
              <SelectItem value="vegetativa">Vegetativa</SelectItem>
              <SelectItem value="maturacao">Maturação</SelectItem>
              <SelectItem value="geral">Geral</SelectItem>
            </SelectContent>
          </Select>
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
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {alertasFiltrados.length} alerta(s) encontrado(s)
            </p>
            <AnimatePresence>
              {alertasFiltrados.map((alerta) => {
                const tipoConf = TIPO_CONFIG[alerta.tipo] || { icon: Info, label: alerta.tipo, color: 'text-gray-600' };
                const sevConf = SEVERIDADE_CONFIG[alerta.severidade] || SEVERIDADE_CONFIG.baixa;
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
                              className="h-7 text-xs gap-1.5 text-emerald-600"
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
