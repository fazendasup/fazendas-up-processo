// ============================================================
// ManutencaoPage — Registro de manutenção por torre/andar
// Tipos: vazamento injetor/coletor, lâmpadas, outros
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import type { Manutencao, ManutencaoStatus } from '@/lib/types';
import { MANUTENCAO_TIPOS } from '@/lib/types';
import { gerarId, formatarData, formatarDataHora } from '@/lib/utils-farm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wrench,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManutencaoPage() {
  const { data, updateData } = useFazenda();
  const [showForm, setShowForm] = useState(false);
  const [torreId, setTorreId] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [showConcluir, setShowConcluir] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const descricao = fd.get('descricao') as string;
    const andarNumero = parseInt(fd.get('andarNumero') as string) || undefined;
    const prazo = fd.get('prazo') as string;
    const lampadaIndex = parseInt(fd.get('lampadaIndex') as string);

    if (!torreId || !tipo || !descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const manutencao: Manutencao = {
      id: gerarId(),
      torreId,
      andarNumero,
      tipo: tipo as Manutencao['tipo'],
      descricao,
      dataAbertura: new Date().toISOString(),
      prazo: prazo ? new Date(prazo).toISOString() : undefined,
      status: 'aberta',
      lampadaIndex: tipo === 'lampada_queimada' && !isNaN(lampadaIndex) ? lampadaIndex : undefined,
    };

    updateData((prev) => ({
      ...prev,
      manutencoes: [...prev.manutencoes, manutencao],
    }));

    setShowForm(false);
    setTorreId('');
    setTipo('');
    toast.success('Manutenção registrada!');
  };

  const handleIniciar = (id: string) => {
    updateData((prev) => ({
      ...prev,
      manutencoes: prev.manutencoes.map((m) =>
        m.id === id ? { ...m, status: 'em_andamento' as ManutencaoStatus } : m
      ),
    }));
    toast.success('Manutenção iniciada!');
  };

  const handleConcluir = (id: string, solucao: string) => {
    updateData((prev) => ({
      ...prev,
      manutencoes: prev.manutencoes.map((m) =>
        m.id === id
          ? { ...m, status: 'concluida' as ManutencaoStatus, dataConclusao: new Date().toISOString(), solucao }
          : m
      ),
    }));
    setShowConcluir(null);
    toast.success('Manutenção concluída!');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Excluir esta manutenção?')) return;
    updateData((prev) => ({
      ...prev,
      manutencoes: prev.manutencoes.filter((m) => m.id !== id),
    }));
    toast.success('Manutenção excluída!');
  };

  const hoje = new Date();
  const abertas = data.manutencoes.filter((m) => m.status === 'aberta');
  const emAndamento = data.manutencoes.filter((m) => m.status === 'em_andamento');
  const concluidas = data.manutencoes.filter((m) => m.status === 'concluida');
  const vencidas = data.manutencoes.filter(
    (m) => m.status !== 'concluida' && m.prazo && new Date(m.prazo) < hoje
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Wrench className="w-6 h-6 text-blue-600" />
              Manutenção
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro e acompanhamento de manutenções por torre e andar
            </p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nova Manutenção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Registrar Manutenção</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs">Torre *</Label>
                  <Select value={torreId} onValueChange={setTorreId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione a torre..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.torres.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Andar (opcional)</Label>
                    <Input name="andarNumero" type="number" min="1" max="12" placeholder="Ex: 5" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MANUTENCAO_TIPOS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {tipo === 'lampada_queimada' && (
                  <div>
                    <Label className="text-xs">Lâmpada (1-5)</Label>
                    <Input name="lampadaIndex" type="number" min="1" max="5" placeholder="Ex: 3" className="h-9 text-sm" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Descrição *</Label>
                  <Input name="descricao" placeholder="Descreva o problema..." className="h-9 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Prazo para Solução</Label>
                  <Input name="prazo" type="date" className="h-9 text-sm" />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">Registrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vencidas */}
        {vencidas.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-semibold text-red-700">
              {vencidas.length} manutenção(ões) com prazo vencido!
            </span>
          </div>
        )}

        {/* Abertas */}
        {abertas.length > 0 && (
          <Section title="Abertas" count={abertas.length} icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}>
            {abertas.map((m) => (
              <ManutencaoCard
                key={m.id}
                m={m}
                torres={data.torres}
                onIniciar={handleIniciar}
                onConcluir={(id) => setShowConcluir(id)}
                onDelete={handleDelete}
              />
            ))}
          </Section>
        )}

        {/* Em andamento */}
        {emAndamento.length > 0 && (
          <Section title="Em Andamento" count={emAndamento.length} icon={<Play className="w-4 h-4 text-blue-600" />}>
            {emAndamento.map((m) => (
              <ManutencaoCard
                key={m.id}
                m={m}
                torres={data.torres}
                onConcluir={(id) => setShowConcluir(id)}
                onDelete={handleDelete}
              />
            ))}
          </Section>
        )}

        {/* Concluídas */}
        <Section title="Concluídas" count={concluidas.length} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
          {concluidas.length === 0 && data.manutencoes.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
            </div>
          ) : (
            concluidas.slice(0, 20).map((m) => (
              <ManutencaoCard key={m.id} m={m} torres={data.torres} onDelete={handleDelete} />
            ))
          )}
        </Section>

        {/* Dialog de conclusão */}
        <Dialog open={!!showConcluir} onOpenChange={() => setShowConcluir(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Concluir Manutenção</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleConcluir(showConcluir!, fd.get('solucao') as string);
              }}
              className="space-y-4"
            >
              <div>
                <Label className="text-xs">Solução Aplicada</Label>
                <Textarea name="solucao" placeholder="Descreva o que foi feito..." className="text-sm" rows={3} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Concluir
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
        {icon}
        {title} ({count})
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ManutencaoCard({
  m,
  torres,
  onIniciar,
  onConcluir,
  onDelete,
}: {
  m: Manutencao;
  torres: { id: string; nome: string }[];
  onIniciar?: (id: string) => void;
  onConcluir?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const torre = torres.find((t) => t.id === m.torreId);
  const tipoLabel = MANUTENCAO_TIPOS.find((t) => t.value === m.tipo)?.label || m.tipo;
  const hoje = new Date();
  const vencida = m.status !== 'concluida' && m.prazo && new Date(m.prazo) < hoje;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border transition-all ${
        vencida
          ? 'bg-red-50 border-red-200'
          : m.status === 'em_andamento'
          ? 'bg-blue-50 border-blue-200'
          : m.status === 'concluida'
          ? 'bg-muted/50 border-muted'
          : 'bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold">{torre?.nome || '-'}</span>
            {m.andarNumero && <span className="text-[10px] text-muted-foreground">Andar {m.andarNumero}</span>}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {tipoLabel}
            </span>
            {m.lampadaIndex !== undefined && (
              <span className="text-[10px] text-muted-foreground">Lâmpada {m.lampadaIndex}</span>
            )}
            {vencida && (
              <span className="text-[10px] font-semibold bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full animate-pulse">
                PRAZO VENCIDO
              </span>
            )}
          </div>
          <p className="text-xs text-foreground">{m.descricao}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1">
            <span>Aberta: {formatarData(m.dataAbertura)}</span>
            {m.prazo && <span>Prazo: {formatarData(m.prazo)}</span>}
            {m.dataConclusao && <span>Concluída: {formatarData(m.dataConclusao)}</span>}
          </div>
          {m.solucao && (
            <p className="text-[10px] text-emerald-700 mt-1 italic">Solução: {m.solucao}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {m.status === 'aberta' && onIniciar && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-blue-600" onClick={() => onIniciar(m.id)}>
              <Play className="w-3 h-3" /> Iniciar
            </Button>
          )}
          {m.status !== 'concluida' && onConcluir && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 text-emerald-600" onClick={() => onConcluir(m.id)}>
              <CheckCircle2 className="w-3 h-3" /> Concluir
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(m.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
