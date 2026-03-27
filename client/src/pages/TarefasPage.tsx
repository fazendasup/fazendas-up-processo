// ============================================================
// TarefasPage — Checklist Diário de Tarefas Operacionais
// Geração automática a partir de ciclos, manutenções e lavagens
// ============================================================

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { trpc } from '@/lib/trpc';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList, Plus, Loader2, CheckCircle2, Circle, AlertCircle,
  Clock, Zap, ArrowUp, ArrowRight, ArrowDown,
  RefreshCw, Trash2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  ciclo: { label: 'Ciclo', color: 'bg-blue-100 text-blue-700' },
  transplantio: { label: 'Transplantio', color: 'bg-emerald-100 text-emerald-700' },
  colheita: { label: 'Colheita', color: 'bg-amber-100 text-amber-700' },
  lavagem: { label: 'Lavagem', color: 'bg-cyan-100 text-cyan-700' },
  medicao: { label: 'Medição', color: 'bg-purple-100 text-purple-700' },
  manutencao: { label: 'Manutenção', color: 'bg-red-100 text-red-700' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700' },
};

const PRIORIDADE_ICONS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  baixa: { icon: <ArrowDown className="w-3 h-3" />, label: 'Baixa', color: 'text-gray-500' },
  media: { icon: <ArrowRight className="w-3 h-3" />, label: 'Média', color: 'text-blue-500' },
  alta: { icon: <ArrowUp className="w-3 h-3" />, label: 'Alta', color: 'text-orange-500' },
  urgente: { icon: <Zap className="w-3 h-3" />, label: 'Urgente', color: 'text-red-600' },
};

export default function TarefasPage() {
  return (
    <ProtectedRoute>
      <TarefasContent />
    </ProtectedRoute>
  );
}

function TarefasContent() {
  const { isAdmin } = useRole();
  const { data: tarefas, isLoading, refetch } = trpc.tarefas.list.useQuery();
  const gerarAutomaticas = trpc.tarefas.gerarAutomaticas.useMutation({
    onSuccess: (res) => {
      refetch();
      if (res.criadas > 0) {
        toast.success(`${res.criadas} tarefa(s) gerada(s) automaticamente!`);
      } else {
        toast.info('Nenhuma tarefa pendente para gerar hoje.');
      }
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });
  const concluirTarefa = trpc.tarefas.concluir.useMutation({
    onSuccess: () => { refetch(); toast.success('Tarefa concluída!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });
  const createTarefa = trpc.tarefas.create.useMutation({
    onSuccess: () => { refetch(); toast.success('Tarefa criada!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });
  const deleteTarefa = trpc.tarefas.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Tarefa excluída!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pendente');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitulo, setNewTitulo] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newTipo, setNewTipo] = useState('outro');
  const [newPrioridade, setNewPrioridade] = useState('media');
  const [formError, setFormError] = useState('');

  // Filtrar e agrupar tarefas
  const { pendentes, concluidas, stats } = useMemo(() => {
    if (!tarefas) return { pendentes: [], concluidas: [], stats: { total: 0, pendentes: 0, concluidas: 0, urgentes: 0 } };

    let filtered = tarefas;
    if (filterTipo !== 'all') {
      filtered = filtered.filter((t) => t.tipo === filterTipo);
    }

    const pendentes = filtered
      .filter((t) => t.status === 'pendente' || t.status === 'em_andamento')
      .sort((a, b) => {
        const prioOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        return (prioOrder[a.prioridade] ?? 2) - (prioOrder[b.prioridade] ?? 2);
      });

    const concluidas = filtered
      .filter((t) => t.status === 'concluida' || t.status === 'cancelada')
      .sort((a, b) => {
        const da = a.concluidoEm ? new Date(a.concluidoEm).getTime() : 0;
        const db = b.concluidoEm ? new Date(b.concluidoEm).getTime() : 0;
        return db - da;
      });

    return {
      pendentes,
      concluidas,
      stats: {
        total: tarefas.length,
        pendentes: tarefas.filter((t) => t.status === 'pendente' || t.status === 'em_andamento').length,
        concluidas: tarefas.filter((t) => t.status === 'concluida').length,
        urgentes: tarefas.filter((t) => (t.status === 'pendente' || t.status === 'em_andamento') && t.prioridade === 'urgente').length,
      },
    };
  }, [tarefas, filterTipo]);

  const handleCreate = () => {
    setFormError('');
    if (!newTitulo.trim()) { setFormError('Título é obrigatório'); return; }
    createTarefa.mutate({
      titulo: newTitulo.trim(),
      descricao: newDescricao.trim() || null,
      tipo: newTipo,
      prioridade: newPrioridade,
      dataVencimento: new Date(),
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewTitulo('');
        setNewDescricao('');
        setNewTipo('outro');
        setNewPrioridade('media');
      },
    });
  };

  const handleConcluir = (id: number) => {
    concluirTarefa.mutate({ id });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    deleteTarefa.mutate({ id });
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (d: Date | string | null) => {
    if (!d) return false;
    const date = d instanceof Date ? d : new Date(d);
    const hoje = new Date();
    return date.toDateString() === hoje.toDateString();
  };

  const displayTarefas = filterStatus === 'pendente' ? pendentes : concluidas;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Tarefas do Dia
            </h1>
            <p className="text-sm text-muted-foreground">
              Checklist operacional com geração automática de tarefas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => gerarAutomaticas.mutate()}
              disabled={gerarAutomaticas.isPending}
            >
              {gerarAutomaticas.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Gerar Tarefas
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-xl border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="font-display font-bold text-xl">{stats.total}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
            <p className="text-[10px] text-amber-600 uppercase tracking-wider">Pendentes</p>
            <p className="font-display font-bold text-xl text-amber-700">{stats.pendentes}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Concluídas</p>
            <p className="font-display font-bold text-xl text-emerald-700">{stats.concluidas}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
            <p className="text-[10px] text-red-600 uppercase tracking-wider">Urgentes</p>
            <p className="font-display font-bold text-xl text-red-700">{stats.urgentes}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Tipo:</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de tarefas */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando tarefas...</p>
          </div>
        ) : displayTarefas.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterStatus === 'pendente'
                ? 'Nenhuma tarefa pendente. Clique em "Gerar Tarefas" para criar automaticamente.'
                : 'Nenhuma tarefa concluída ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {displayTarefas.map((tarefa) => {
                const tipoInfo = TIPO_LABELS[tarefa.tipo] || TIPO_LABELS.outro;
                const prioInfo = PRIORIDADE_ICONS[tarefa.prioridade] || PRIORIDADE_ICONS.media;
                const isPendente = tarefa.status === 'pendente' || tarefa.status === 'em_andamento';
                const isUrgente = tarefa.prioridade === 'urgente';

                return (
                  <motion.div
                    key={tarefa.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`p-4 bg-card rounded-xl border flex items-start gap-3 transition-all ${
                      isUrgente && isPendente ? 'border-red-300 bg-red-50/30' : ''
                    } ${!isPendente ? 'opacity-70' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => isPendente && handleConcluir(tarefa.id)}
                      disabled={!isPendente || concluirTarefa.isPending}
                      className={`mt-0.5 shrink-0 transition-colors ${
                        isPendente
                          ? 'text-muted-foreground hover:text-emerald-600 cursor-pointer'
                          : 'text-emerald-600 cursor-default'
                      }`}
                    >
                      {isPendente ? (
                        <Circle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </button>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${!isPendente ? 'line-through text-muted-foreground' : ''}`}>
                          {tarefa.titulo}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${prioInfo.color}`}>
                          {prioInfo.icon}
                          {prioInfo.label}
                        </span>
                      </div>
                      {tarefa.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isToday(tarefa.dataVencimento) ? 'Hoje' : formatDate(tarefa.dataVencimento)}
                        </span>
                        {tarefa.concluidoPorNome && (
                          <span>Concluída por: {tarefa.concluidoPorNome}</span>
                        )}
                        {tarefa.concluidoEm && (
                          <span>{formatDate(tarefa.concluidoEm)}</span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDelete(tarefa.id)}
                        disabled={deleteTarefa.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Dialog de Nova Tarefa */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Crie uma tarefa manual para o checklist operacional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Descrição breve da tarefa"
                value={newTitulo}
                onChange={(e) => setNewTitulo(e.target.value)}
                disabled={createTarefa.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={newDescricao}
                onChange={(e) => setNewDescricao(e.target.value)}
                disabled={createTarefa.isPending}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newTipo} onValueChange={setNewTipo} disabled={createTarefa.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={newPrioridade} onValueChange={setNewPrioridade} disabled={createTarefa.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={createTarefa.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createTarefa.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createTarefa.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
              ) : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
