// ============================================================
// GerminacaoPage — Fase pré-mudas: plantio de sementes
// Registra variedade, quantidade, data/hora, acompanha germinação
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import type { LoteGerminacao } from '@/lib/types';
import { gerarId, formatarDataHora, diasDecorridos } from '@/lib/utils-farm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Sprout,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function GerminacaoPage() {
  const { data, updateData } = useFazenda();
  const [showForm, setShowForm] = useState(false);
  const [variedadeId, setVariedadeId] = useState<string>('');

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const quantidade = parseInt(fd.get('quantidade') as string);
    const dataHora = fd.get('dataHora') as string;
    const diasTransplantio = parseInt(fd.get('diasTransplantio') as string) || 1;
    const observacoes = fd.get('observacoes') as string;

    if (!variedadeId || isNaN(quantidade) || !dataHora) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const variedade = data.variedades.find((v) => v.id === variedadeId);
    if (!variedade) {
      toast.error('Variedade não encontrada');
      return;
    }

    const lote: LoteGerminacao = {
      id: gerarId(),
      variedadeId,
      variedadeNome: variedade.nome,
      quantidade,
      dataPlantio: new Date(dataHora).toISOString(),
      dataHora: new Date(dataHora).toISOString(),
      diasParaTransplantio: diasTransplantio,
      germinadas: 0,
      naoGerminadas: 0,
      transplantadas: 0,
      status: 'germinando',
      observacoes: observacoes || undefined,
    };

    updateData((prev) => ({
      ...prev,
      germinacao: [...prev.germinacao, lote],
    }));

    setShowForm(false);
    setVariedadeId('');
    toast.success('Lote de germinação registrado!');
  };

  const handleUpdateLote = (loteId: string, updates: Partial<LoteGerminacao>) => {
    updateData((prev) => ({
      ...prev,
      germinacao: prev.germinacao.map((g) =>
        g.id === loteId ? { ...g, ...updates } : g
      ),
    }));
  };

  const handleMarcarPronto = (loteId: string) => {
    const lote = data.germinacao.find((g) => g.id === loteId);
    if (!lote) return;
    handleUpdateLote(loteId, {
      status: 'pronto',
      germinadas: lote.germinadas || lote.quantidade,
      naoGerminadas: lote.naoGerminadas || 0,
    });
    toast.success('Lote marcado como pronto para transplantio!');
  };

  const handleMarcarTransplantado = (loteId: string) => {
    handleUpdateLote(loteId, { status: 'transplantado' });
    toast.success('Lote marcado como transplantado!');
  };

  const handleDeleteLote = (loteId: string) => {
    if (!window.confirm('Excluir este lote?')) return;
    updateData((prev) => ({
      ...prev,
      germinacao: prev.germinacao.filter((g) => g.id !== loteId),
    }));
    toast.success('Lote excluído!');
  };

  const lotesGerminando = data.germinacao.filter((g) => g.status === 'germinando');
  const lotesProntos = data.germinacao.filter((g) => g.status === 'pronto');
  const lotesTransplantados = data.germinacao.filter((g) => g.status === 'transplantado');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-600" />
              Germinação
            </h1>
            <p className="text-sm text-muted-foreground">
              Fase pré-mudas: registro de plantio de sementes e acompanhamento da germinação
            </p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Novo Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Registrar Plantio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs">Variedade *</Label>
                  <Select value={variedadeId} onValueChange={setVariedadeId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione a variedade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.variedades.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantidade de Sementes *</Label>
                    <Input name="quantidade" type="number" min="1" placeholder="Ex: 72" className="h-9 text-sm" required />
                  </div>
                  <div>
                    <Label className="text-xs">Dias para Transplantio</Label>
                    <Input name="diasTransplantio" type="number" min="1" defaultValue="1" className="h-9 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Data/Hora do Plantio *</Label>
                  <Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Input name="observacoes" placeholder="Ex: Sementes lote #42" className="h-9 text-sm" />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">Registrar Plantio</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Germinando */}
        {lotesGerminando.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Germinando ({lotesGerminando.length})
            </h2>
            <div className="space-y-2">
              {lotesGerminando.map((lote) => (
                <LoteCard
                  key={lote.id}
                  lote={lote}
                  onUpdate={handleUpdateLote}
                  onMarcarPronto={handleMarcarPronto}
                  onDelete={handleDeleteLote}
                />
              ))}
            </div>
          </section>
        )}

        {/* Prontos para transplantio */}
        {lotesProntos.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Prontos para Transplantio ({lotesProntos.length})
            </h2>
            <div className="space-y-2">
              {lotesProntos.map((lote) => (
                <LoteCard
                  key={lote.id}
                  lote={lote}
                  onUpdate={handleUpdateLote}
                  onMarcarTransplantado={handleMarcarTransplantado}
                  onDelete={handleDeleteLote}
                />
              ))}
            </div>
          </section>
        )}

        {/* Transplantados (histórico) */}
        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            Histórico ({lotesTransplantados.length})
          </h2>
          {lotesTransplantados.length === 0 && data.germinacao.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border">
              <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum lote registrado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Lote" para registrar um plantio.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lotesTransplantados.slice(0, 20).map((lote) => (
                <LoteCard key={lote.id} lote={lote} onDelete={handleDeleteLote} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ---- Componente de Lote ----

function LoteCard({
  lote,
  onUpdate,
  onMarcarPronto,
  onMarcarTransplantado,
  onDelete,
}: {
  lote: LoteGerminacao;
  onUpdate?: (id: string, updates: Partial<LoteGerminacao>) => void;
  onMarcarPronto?: (id: string) => void;
  onMarcarTransplantado?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const dias = diasDecorridos(lote.dataPlantio);
  const prontoEm = lote.diasParaTransplantio - dias;
  const isAtrasado = prontoEm <= 0 && lote.status === 'germinando';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border transition-all ${
        isAtrasado
          ? 'bg-amber-50 border-amber-200'
          : lote.status === 'pronto'
          ? 'bg-emerald-50 border-emerald-200'
          : lote.status === 'transplantado'
          ? 'bg-muted/50 border-muted'
          : 'bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-sm">{lote.variedadeNome}</h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {lote.quantidade} sementes
            </span>
            {isAtrasado && (
              <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full animate-pulse">
                PRONTO P/ TRANSPLANTIO
              </span>
            )}
            {lote.status === 'pronto' && (
              <span className="text-[10px] font-semibold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">
                AGUARDANDO TRANSPLANTIO
              </span>
            )}
            {lote.status === 'transplantado' && (
              <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                TRANSPLANTADO
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            <span>Plantado: {formatarDataHora(lote.dataHora)}</span>
            <span>{dias} dia{dias !== 1 ? 's' : ''} decorrido{dias !== 1 ? 's' : ''}</span>
            {lote.status === 'germinando' && (
              <span className={prontoEm <= 0 ? 'text-amber-600 font-semibold' : ''}>
                {prontoEm > 0 ? `Transplantio em ${prontoEm}d` : 'Pronto para transplantio!'}
              </span>
            )}
          </div>

          {/* Contadores editáveis para germinando/pronto */}
          {(lote.status === 'germinando' || lote.status === 'pronto') && onUpdate && (
            <div className="flex gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Germinadas:</Label>
                <Input
                  type="number"
                  min="0"
                  max={lote.quantidade}
                  value={lote.germinadas}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onUpdate(lote.id, {
                      germinadas: val,
                      naoGerminadas: lote.quantidade - val,
                    });
                  }}
                  className="h-7 w-16 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Não germ.:</Label>
                <span className="text-xs font-semibold text-destructive">{lote.naoGerminadas}</span>
              </div>
            </div>
          )}

          {lote.observacoes && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">{lote.observacoes}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {lote.status === 'germinando' && onMarcarPronto && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              onClick={() => onMarcarPronto(lote.id)}
            >
              <CheckCircle2 className="w-3 h-3" />
              Pronto
            </Button>
          )}
          {lote.status === 'pronto' && onMarcarTransplantado && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={() => onMarcarTransplantado(lote.id)}
            >
              <ArrowRight className="w-3 h-3" />
              Transplantado
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(lote.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
