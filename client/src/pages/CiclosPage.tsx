// ============================================================
// CiclosPage — Migrado para tRPC mutations
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import type { CicloAplicacao, Fase } from '@/lib/types';
import { FASES_CONFIG } from '@/lib/types';
import { cicloPendenteHoje, formatarDataHora, DIAS_SEMANA } from '@/lib/utils-farm';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  CalendarClock, Plus, Trash2, AlertTriangle, CheckCircle2, Power,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CiclosPage() {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Controlled form state
  const [frequencia, setFrequencia] = useState<string>('');
  const [alvo, setAlvo] = useState<string>('ambos');
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [fasesSelecionadas, setFasesSelecionadas] = useState<Fase[]>(['mudas', 'vegetativa', 'maturacao']);

  const toggleDia = (dia: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const toggleFase = (fase: Fase) => {
    setFasesSelecionadas((prev) =>
      prev.includes(fase) ? prev.filter((f) => f !== fase) : [...prev, fase]
    );
  };

  const resetForm = () => {
    setFrequencia('');
    setAlvo('ambos');
    setDiasSelecionados([]);
    setFasesSelecionadas(['mudas', 'vegetativa', 'maturacao']);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const nome = fd.get('nome') as string;
    const produto = fd.get('produto') as string;
    const tipo = fd.get('tipo') as string;
    const intervaloDias = parseInt(fd.get('intervaloDias') as string) || undefined;

    if (!nome || !frequencia || !produto || fasesSelecionadas.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingId) {
      const dbId = resolver.cicloFrontIdToDbId.get(editingId);
      if (!dbId) { toast.error('Ciclo não encontrado'); return; }
      mutations.updateCiclo.mutate({
        id: dbId,
        nome,
        frequencia,
        diasSemana: frequencia === 'semanal' ? diasSelecionados : undefined,
        intervaloDias: frequencia === 'personalizada' ? intervaloDias : undefined,
        produto,
        tipo,
        fasesAplicaveis: fasesSelecionadas,
        alvo,
      });
    } else {
      mutations.createCiclo.mutate({
        nome,
        frequencia,
        diasSemana: frequencia === 'semanal' ? diasSelecionados : undefined,
        intervaloDias: frequencia === 'personalizada' ? intervaloDias : undefined,
        produto,
        tipo,
        fasesAplicaveis: fasesSelecionadas,
        alvo,
      });
    }

    setShowForm(false);
    resetForm();
    toast.success(editingId ? 'Ciclo atualizado!' : 'Ciclo cadastrado!');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Excluir este ciclo?')) return;
    const dbId = resolver.cicloFrontIdToDbId.get(id);
    if (!dbId) return;
    mutations.deleteCiclo.mutate({ id: dbId });
    toast.success('Ciclo excluído!');
  };

  const handleToggle = (id: string) => {
    const ciclo = data.ciclos.find((c) => c.id === id);
    if (!ciclo) return;
    const dbId = resolver.cicloFrontIdToDbId.get(id);
    if (!dbId) return;
    mutations.updateCiclo.mutate({ id: dbId, ativo: !ciclo.ativo });
  };

  const handleMarcarExecutado = (id: string) => {
    const dbId = resolver.cicloFrontIdToDbId.get(id);
    if (!dbId) return;
    mutations.updateCiclo.mutate({ id: dbId, ultimaExecucao: new Date() });
    toast.success('Ciclo marcado como executado!');
  };

  const ciclosPendentes = data.ciclos.filter((c) => cicloPendenteHoje(c));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Ciclos de Aplicação</h1>
            <p className="text-sm text-muted-foreground">
              Configure ciclos recorrentes para caixas d'água e andares
            </p>
          </div>
          <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Novo Ciclo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingId ? 'Editar Ciclo' : 'Novo Ciclo de Aplicação'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs">Nome do Ciclo *</Label>
                  <Input name="nome" placeholder="Ex: Sanitização Semanal" className="h-9 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Frequência *</Label>
                  <Select value={frequencia} onValueChange={setFrequencia}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione a frequência..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="personalizada">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {frequencia === 'semanal' && (
                  <div>
                    <Label className="text-xs mb-2 block">Dias da Semana</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DIAS_SEMANA.map((dia) => (
                        <button
                          key={dia.value}
                          type="button"
                          onClick={() => toggleDia(dia.value)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            diasSelecionados.includes(dia.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                          }`}
                        >
                          {dia.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequencia === 'personalizada' && (
                  <div>
                    <Label className="text-xs">Intervalo em Dias</Label>
                    <Input name="intervaloDias" type="number" min="1" placeholder="Ex: 3" className="h-9 text-sm" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Produto *</Label>
                    <Input name="produto" placeholder="Ex: Sanitizante X" className="h-9 text-sm" required />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Input name="tipo" placeholder="Ex: Sanitização" className="h-9 text-sm" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Aplicar em</Label>
                  <Select value={alvo} onValueChange={setAlvo}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Ambos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambos">Caixas e Andares</SelectItem>
                      <SelectItem value="caixa">Apenas Caixas d'Água</SelectItem>
                      <SelectItem value="andar">Apenas Andares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Fases Aplicáveis *</Label>
                  <div className="flex gap-3">
                    {(['mudas', 'vegetativa', 'maturacao'] as Fase[]).map((fase) => (
                      <button
                        key={fase}
                        type="button"
                        onClick={() => toggleFase(fase)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          fasesSelecionadas.includes(fase)
                            ? fase === 'mudas'
                              ? 'badge-mudas'
                              : fase === 'vegetativa'
                              ? 'badge-vegetativa'
                              : 'badge-maturacao'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {FASES_CONFIG[fase].label}
                      </button>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    {editingId ? 'Salvar Alterações' : 'Cadastrar Ciclo'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pendentes hoje */}
        {ciclosPendentes.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-display font-bold text-base">
                Pendentes Hoje ({ciclosPendentes.length})
              </h2>
            </div>
            <div className="space-y-2">
              {ciclosPendentes.map((ciclo) => (
                <CicloItem
                  key={ciclo.id}
                  ciclo={ciclo}
                  pendente
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onExecutar={handleMarcarExecutado}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Todos os ciclos */}
        <section>
          <h2 className="font-display font-bold text-base mb-3">
            Todos os Ciclos ({data.ciclos.length})
          </h2>
          {data.ciclos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <CalendarClock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum ciclo cadastrado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Ciclo" para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.ciclos.map((ciclo) => (
                <CicloItem
                  key={ciclo.id}
                  ciclo={ciclo}
                  pendente={cicloPendenteHoje(ciclo)}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onExecutar={handleMarcarExecutado}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CicloItem({
  ciclo,
  pendente,
  onDelete,
  onToggle,
  onExecutar,
}: {
  ciclo: CicloAplicacao;
  pendente: boolean;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onExecutar: (id: string) => void;
}) {
  const frequenciaLabel = () => {
    switch (ciclo.frequencia) {
      case 'diaria': return 'Diária';
      case 'semanal': return `Semanal (${ciclo.diasSemana?.map((d) => DIAS_SEMANA[d].label).join(', ')})`;
      case 'quinzenal': return 'Quinzenal';
      case 'mensal': return 'Mensal';
      case 'personalizada': return `A cada ${ciclo.intervaloDias} dias`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        pendente && ciclo.ativo
          ? 'bg-amber-50 border-amber-200'
          : !ciclo.ativo
          ? 'bg-muted/50 border-muted opacity-60'
          : 'bg-card'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-sm">{ciclo.nome}</h3>
          {pendente && ciclo.ativo && (
            <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full animate-pulse">
              PENDENTE HOJE
            </span>
          )}
          {!ciclo.ativo && (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              INATIVO
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{frequenciaLabel()}</span>
          <span className="font-medium">{ciclo.produto}</span>
          <span>
            {ciclo.fasesAplicaveis.map((f) => FASES_CONFIG[f].label).join(', ')}
          </span>
          {ciclo.ultimaExecucao && (
            <span>Última execução: {formatarDataHora(ciclo.ultimaExecucao)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {pendente && ciclo.ativo && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => onExecutar(ciclo.id)}>
            <CheckCircle2 className="w-3 h-3" />
            Feito
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggle(ciclo.id)} title={ciclo.ativo ? 'Desativar' : 'Ativar'}>
          <Power className={`w-3.5 h-3.5 ${ciclo.ativo ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(ciclo.id)} title="Excluir">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
