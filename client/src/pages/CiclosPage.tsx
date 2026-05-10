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
  CalendarClock, Plus, Trash2, AlertTriangle, CheckCircle2, Power, Edit, Copy,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

/** Evita bug UTC (dia anterior): "YYYY-MM-DD" vira data local, não meia-noite UTC. */
function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatYmdLocal(dt: Date): string {
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function formatYmdPtBr(ymd: string): string {
  const d = parseYmdLocal(ymd);
  return d.toLocaleDateString('pt-BR');
}

function hojeYmdLocal(): string {
  const t = new Date();
  return formatYmdLocal(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
}

/** Converte ISO gravado no servidor para YYYY-MM-DD do calendário local (sem deslocar o dia). */
function isoToYmdLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatYmdLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

function dateAtLocalNoonFromYmd(ymd: string): Date {
  const d = parseYmdLocal(ymd);
  if (Number.isNaN(d.getTime())) return new Date(NaN);
  d.setHours(12, 0, 0, 0);
  return d;
}

export default function CiclosPage() {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeCiclo, setNomeCiclo] = useState('');
  const [produto, setProduto] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  /** Intervalo (personalizada) — string para o input number controlado */
  const [intervaloDiasStr, setIntervaloDiasStr] = useState('');

  // Controlled form state
  const [frequencia, setFrequencia] = useState<string>('');
  const [alvo, setAlvo] = useState<string>('ambos');
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [fasesSelecionadas, setFasesSelecionadas] = useState<Fase[]>(['mudas', 'vegetativa', 'maturacao']);
  const [dataInicio, setDataInicio] = useState<string>(hojeYmdLocal());
  const [datesEspecificas, setDatesEspecificas] = useState<string[]>([hojeYmdLocal()]);
  const [dosagensEspecificas, setDosagensEspecificas] = useState<string[]>(['']);
  const [dosagem, setDosagem] = useState<string>('');
  const [modoData, setModoData] = useState<'frequencia' | 'especifica'>('frequencia');
  /** Edição: última aplicação (YYYY-MM-DD); vazio = não alterar o campo no servidor */
  const [ultimaExecucaoYmd, setUltimaExecucaoYmd] = useState('');
  /** Snapshot da carga inicial de edição para detectar mudança de agendamento. */
  const [initialDataInicioYmd, setInitialDataInicioYmd] = useState(hojeYmdLocal());
  const [initialUltimaExecucaoYmd, setInitialUltimaExecucaoYmd] = useState('');
  const [dataInicioTouched, setDataInicioTouched] = useState(false);
  const [ultimaExecucaoTouched, setUltimaExecucaoTouched] = useState(false);
  const [executarDialogOpen, setExecutarDialogOpen] = useState(false);
  const [executarCicloId, setExecutarCicloId] = useState<string | null>(null);
  const [dataExecucaoFeito, setDataExecucaoFeito] = useState(hojeYmdLocal());

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
    setNomeCiclo('');
    setFrequencia('');
    setAlvo('ambos');
    setDiasSelecionados([]);
    setFasesSelecionadas(['mudas', 'vegetativa', 'maturacao']);
    setDataInicio(hojeYmdLocal());
    setDatesEspecificas([hojeYmdLocal()]);
    setDosagensEspecificas(['']);
    setDosagem('');
    setModoData('frequencia');
    setIntervaloDiasStr('');
    setProduto('');
    setTipo('');
    setEditingId(null);
    setUltimaExecucaoYmd('');
    setInitialDataInicioYmd(hojeYmdLocal());
    setInitialUltimaExecucaoYmd('');
    setDataInicioTouched(false);
    setUltimaExecucaoTouched(false);
  };

  const handleEditCiclo = (id: string) => {
    const ciclo = data.ciclos.find((c) => c.id === id);
    if (!ciclo) return;
    setEditingId(ciclo.id);
    setNomeCiclo(ciclo.nome);
    setProduto(ciclo.produto);
    setTipo(ciclo.tipo || '');
    setDosagem(ciclo.dosagem || '');
    setFrequencia(ciclo.frequencia);
    setAlvo(ciclo.alvo);
    setDiasSelecionados(ciclo.diasSemana || []);
    setFasesSelecionadas([...ciclo.fasesAplicaveis]);
    setIntervaloDiasStr(
      ciclo.intervaloDias != null && ciclo.intervaloDias > 0 ? String(ciclo.intervaloDias) : ''
    );
    const ultimaExecucaoEdit = ciclo.ultimaExecucao ? isoToYmdLocal(ciclo.ultimaExecucao) : '';
    setUltimaExecucaoYmd(ultimaExecucaoEdit);
    /* Prévia de datas: âncora na última execução, se houver, senão hoje */
    const dataInicioEdit = ciclo.ultimaExecucao ? isoToYmdLocal(ciclo.ultimaExecucao) : hojeYmdLocal();
    setDataInicio(dataInicioEdit);
    setInitialDataInicioYmd(dataInicioEdit);
    setInitialUltimaExecucaoYmd(ultimaExecucaoEdit);
    setDataInicioTouched(false);
    setUltimaExecucaoTouched(false);
    setModoData('frequencia');
    setShowForm(true);
  };

  /** Novo ciclo pré-preenchido a partir de um existente (ex.: mudar só o nome). */
  const handleDuplicateCiclo = (id: string) => {
    const ciclo = data.ciclos.find((c) => c.id === id);
    if (!ciclo) return;
    setEditingId(null);
    setNomeCiclo(`${ciclo.nome} (cópia)`);
    setProduto(ciclo.produto);
    setTipo(ciclo.tipo || '');
    setDosagem(ciclo.dosagem || '');
    setFrequencia(ciclo.frequencia);
    setAlvo(ciclo.alvo);
    setDiasSelecionados([...(ciclo.diasSemana || [])]);
    setFasesSelecionadas([...ciclo.fasesAplicaveis]);
    setIntervaloDiasStr(
      ciclo.intervaloDias != null && ciclo.intervaloDias > 0 ? String(ciclo.intervaloDias) : ''
    );
    setUltimaExecucaoYmd('');
    setDataInicio(hojeYmdLocal());
    setInitialDataInicioYmd(hojeYmdLocal());
    setInitialUltimaExecucaoYmd('');
    setDataInicioTouched(false);
    setUltimaExecucaoTouched(false);
    setModoData('frequencia');
    setShowForm(true);
    toast.message('Cópia do ciclo', { description: 'Ajuste o nome e salve como novo registro.' });
  };

  // Calcular próximas datas (sempre calendário local — evita 1 dia a menos em pt-BR)
  const calcularProximasDatas = (inicio: string, freq: string, diasSem?: number[], intervalo?: number): string[] => {
    const datas: string[] = [];
    let data = parseYmdLocal(inicio);
    if (Number.isNaN(data.getTime())) return [];

    for (let i = 0; i < 5; i++) {
      datas.push(formatYmdLocal(data));

      if (freq === 'diaria') {
        data.setDate(data.getDate() + 1);
      } else if (freq === 'semanal' && diasSem && diasSem.length > 0) {
        let encontrou = false;
        for (let j = 1; j <= 7; j++) {
          data.setDate(data.getDate() + 1);
          if (diasSem.includes(data.getDay())) {
            encontrou = true;
            break;
          }
        }
        if (!encontrou) data.setDate(data.getDate() - 7);
      } else if (freq === 'quinzenal') {
        data.setDate(data.getDate() + 14);
      } else if (freq === 'mensal') {
        data.setMonth(data.getMonth() + 1);
      } else if (freq === 'personalizada' && intervalo && intervalo > 0) {
        data.setDate(data.getDate() + intervalo);
      }
    }
    return datas;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nome = nomeCiclo.trim();
    const intervaloDias = parseInt(intervaloDiasStr, 10) || undefined;

    if (!nome || !produto || fasesSelecionadas.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (modoData === 'frequencia' && !frequencia) {
      toast.error('Selecione uma frequência');
      return;
    }

    if (modoData === 'especifica' && datesEspecificas.length === 0) {
      toast.error('Adicione pelo menos uma data');
      return;
    }

    if (editingId) {
      const dbId = resolver.cicloFrontIdToDbId.get(editingId);
      if (!dbId) { toast.error('Ciclo não encontrado'); return; }
      let ultimaExecucao: Date | null | undefined;
      if (ultimaExecucaoYmd.trim()) {
        ultimaExecucao = dateAtLocalNoonFromYmd(ultimaExecucaoYmd.trim());
        if (Number.isNaN(ultimaExecucao.getTime())) {
          toast.error('Data da última aplicação inválida');
          return;
        }
      } else if (
        initialUltimaExecucaoYmd &&
        (ultimaExecucaoTouched || dataInicio !== initialDataInicioYmd || dataInicioTouched)
      ) {
        // Se mudou a data de início e não informou nova última execução,
        // reabre o ciclo para ele voltar a aparecer como pendente em Hoje.
        ultimaExecucao = null;
      }
      mutations.updateCiclo.mutate({
        id: dbId,
        nome,
        frequencia: modoData === 'frequencia' ? frequencia : 'personalizada',
        diasSemana: frequencia === 'semanal' ? diasSelecionados : undefined,
        intervaloDias: frequencia === 'personalizada' ? intervaloDias : undefined,
        produto,
        tipo,
        dosagem: dosagem.trim() || null,
        fasesAplicaveis: fasesSelecionadas,
        alvo,
        ...(ultimaExecucao !== undefined ? { ultimaExecucao } : {}),
      });
    } else {
      mutations.createCiclo.mutate({
        nome,
        frequencia: modoData === 'frequencia' ? frequencia : 'personalizada',
        diasSemana: frequencia === 'semanal' ? diasSelecionados : undefined,
        intervaloDias: frequencia === 'personalizada' ? intervaloDias : undefined,
        produto,
        tipo,
        dosagem: dosagem.trim() || undefined,
        fasesAplicaveis: fasesSelecionadas,
        alvo,
      }, {
        onSuccess: () => {
          const datas = modoData === 'frequencia' 
            ? calcularProximasDatas(dataInicio, frequencia, diasSelecionados, intervaloDias).length
            : datesEspecificas.length;
          toast.success(`Ciclo criado com ${datas} aplicação(ões)!`);
        },
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

  const abrirDialogExecutar = (id: string) => {
    setExecutarCicloId(id);
    setDataExecucaoFeito(hojeYmdLocal());
    setExecutarDialogOpen(true);
  };

  const confirmarExecucaoFeita = () => {
    if (!executarCicloId) return;
    const dbId = resolver.cicloFrontIdToDbId.get(executarCicloId);
    if (!dbId) {
      toast.error('Ciclo não encontrado');
      return;
    }
    const ultimaExecucao = dateAtLocalNoonFromYmd(dataExecucaoFeito);
    if (Number.isNaN(ultimaExecucao.getTime())) {
      toast.error('Data inválida');
      return;
    }
    mutations.marcarCicloExecutado.mutate(
      { id: dbId, ultimaExecucao },
      {
        onSuccess: () => {
          toast.success('Aplicação registrada!');
          setExecutarDialogOpen(false);
          setExecutarCicloId(null);
        },
      }
    );
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingId ? 'Editar Ciclo' : 'Novo Ciclo de Aplicação'}
                </DialogTitle>
              </DialogHeader>
              <form
                key={editingId ?? 'novo'}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs">Nome do Ciclo *</Label>
                  <Input
                    name="nome"
                    placeholder="Ex: Sanitização Semanal"
                    className="h-9 text-sm"
                    required
                    value={nomeCiclo}
                    onChange={(e) => setNomeCiclo(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Produto *</Label>
                    <Input
                      name="produto"
                      placeholder="Ex: Sanitizante X"
                      className="h-9 text-sm"
                      required
                      value={produto}
                      onChange={(e) => setProduto(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Input
                      name="tipo"
                      placeholder="Ex: Sanitização"
                      className="h-9 text-sm"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                    />
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

                {editingId && (
                  <div>
                    <Label className="text-xs">Última aplicação registrada (opcional)</Label>
                    <Input
                      type="date"
                      value={ultimaExecucaoYmd}
                      onChange={(e) => {
                        setUltimaExecucaoYmd(e.target.value);
                        setUltimaExecucaoTouched(true);
                      }}
                      className="h-9 text-sm mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Informe uma data passada se a aplicação já tiver sido feita e você estiver só alinhando o registro.
                    </p>
                  </div>
                )}

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

                <div className="border-t pt-4">
                  <Label className="text-xs font-semibold mb-3 block">Modo de Agendamento</Label>
                  <div className="flex gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setModoData('frequencia')}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        modoData === 'frequencia'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      📅 Frequência + Data Início
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoData('especifica')}
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        modoData === 'especifica'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      }`}
                    >
                      📍 Datas Específicas
                    </button>
                  </div>

                  {modoData === 'frequencia' ? (
                    <>
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
                        <div className="mt-3">
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
                        <div className="mt-3">
                          <Label className="text-xs">Intervalo em Dias</Label>
                          <Input
                            name="intervaloDias"
                            type="number"
                            min={1}
                            placeholder="Ex: 3"
                            className="h-9 text-sm"
                            value={intervaloDiasStr}
                            onChange={(e) => setIntervaloDiasStr(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="mt-3">
                        <Label className="text-xs">Data de Início *</Label>
                        <Input
                          type="date"
                          value={dataInicio}
                          onChange={(e) => {
                            setDataInicio(e.target.value);
                            setDataInicioTouched(true);
                          }}
                          className="h-9 text-sm"
                        />
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs">Dosagem</Label>
                        <Input
                          type="text"
                          placeholder="Ex: 10ml/L, 5g/100L"
                          value={dosagem}
                          onChange={(e) => setDosagem(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>

                      {frequencia && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-900 font-semibold mb-2">Próximas 5 aplicações:</p>
                          <div className="space-y-1">
                            {calcularProximasDatas(dataInicio, frequencia, diasSelecionados).map((data, idx) => (
                              <div key={idx} className="text-xs text-blue-800">
                                📅 {formatYmdPtBr(data)} {dosagem && `| 💧 ${dosagem}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {datesEspecificas.map((date, idx) => (
                          <div key={idx} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs">Data</Label>
                              <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                  const updated = [...datesEspecificas];
                                  updated[idx] = e.target.value;
                                  setDatesEspecificas(updated);
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Dosagem</Label>
                              <Input
                                type="text"
                                placeholder="Ex: 10ml/L"
                                value={dosagensEspecificas[idx] || ''}
                                onChange={(e) => {
                                  const updated = [...dosagensEspecificas];
                                  updated[idx] = e.target.value;
                                  setDosagensEspecificas(updated);
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                if (datesEspecificas.length > 1) {
                                  setDatesEspecificas(datesEspecificas.filter((_, i) => i !== idx));
                                  setDosagensEspecificas(dosagensEspecificas.filter((_, i) => i !== idx));
                                }
                              }}
                              disabled={datesEspecificas.length === 1}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => {
                          const lastDate = parseYmdLocal(datesEspecificas[datesEspecificas.length - 1]);
                          lastDate.setDate(lastDate.getDate() + 1);
                          setDatesEspecificas([...datesEspecificas, formatYmdLocal(lastDate)]);
                          setDosagensEspecificas([...dosagensEspecificas, '']);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Data
                      </Button>

                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-900 font-semibold mb-2">Datas selecionadas:</p>
                        <div className="space-y-1">
                          {datesEspecificas.map((data, idx) => (
                            <div key={idx} className="text-xs text-blue-800">
                              📅 {formatYmdPtBr(data)} {dosagensEspecificas[idx] && `| 💧 ${dosagensEspecificas[idx]}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
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
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
                  onExecutar={abrirDialogExecutar}
                  onEdit={handleEditCiclo}
                  onDuplicate={handleDuplicateCiclo}
                />
              ))}
            </div>
          </motion.section>
        )}

        <Dialog open={executarDialogOpen} onOpenChange={(open) => { setExecutarDialogOpen(open); if (!open) setExecutarCicloId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-base">Registrar aplicação</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Em qual dia a aplicação foi feita? Você pode escolher uma data passada se já tiver realizado o processo antes.
            </p>
            <div>
              <Label className="text-xs">Data da aplicação</Label>
              <Input
                type="date"
                value={dataExecucaoFeito}
                onChange={(e) => setDataExecucaoFeito(e.target.value)}
                className="h-9 text-sm mt-1"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setExecutarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={confirmarExecucaoFeita}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  onExecutar={abrirDialogExecutar}
                  onEdit={handleEditCiclo}
                  onDuplicate={handleDuplicateCiclo}
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
  onEdit,
  onDuplicate,
}: {
  ciclo: CicloAplicacao;
  pendente: boolean;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onExecutar: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
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
          {ciclo.dosagem && <span>Dosagem: {ciclo.dosagem}</span>}
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
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-950/50" onClick={() => onExecutar(ciclo.id)}>
            <CheckCircle2 className="w-3 h-3" />
            Feito
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(ciclo.id)} title="Editar">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
        {onDuplicate && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(ciclo.id)} title="Copiar para novo ciclo">
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggle(ciclo.id)} title={ciclo.ativo ? 'Desativar' : 'Ativar'}>
          <Power className={`w-3.5 h-3.5 ${ciclo.ativo ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(ciclo.id)} title="Excluir">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
