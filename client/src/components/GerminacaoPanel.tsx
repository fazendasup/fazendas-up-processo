// Painel de lotes de germinação — usado na página unificada de Plantio

import { useFazenda } from '@/contexts/FazendaContext';
import type { LoteGerminacao } from '@/lib/types';
import { formatarDataHora, diasDecorridos } from '@/lib/utils-farm';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
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

export default function GerminacaoPanel() {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showForm, setShowForm] = useState(false);
  const [variedadeId, setVariedadeId] = useState<string>('');

  const lotesAvulsos = data.germinacao.filter((g) => g.fonte !== 'plano');

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

    const varDbId = resolver.varSlugToId.get(variedadeId);
    if (!varDbId) {
      toast.error('Erro ao resolver variedade');
      return;
    }

    mutations.createGerminacao.mutate({
      variedadeId: varDbId,
      variedadeNome: variedade.nome,
      quantidade,
      dataPlantio: new Date(dataHora),
      dataHora: new Date(dataHora),
      diasParaTransplantio: diasTransplantio,
      observacoes: observacoes || undefined,
    });

    setShowForm(false);
    setVariedadeId('');
    toast.success('Lote de germinação registrado!');
  };

  const handleUpdateLote = (loteId: string, updates: Partial<LoteGerminacao>) => {
    const dbId = resolver.germinacaoFrontIdToDbId.get(loteId);
    if (!dbId) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.germinadas !== undefined) dbUpdates.germinadas = updates.germinadas;
    if (updates.naoGerminadas !== undefined) dbUpdates.naoGerminadas = updates.naoGerminadas;
    if (updates.transplantadas !== undefined) dbUpdates.transplantadas = updates.transplantadas;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.observacoes !== undefined) dbUpdates.observacoes = updates.observacoes;

    mutations.updateGerminacao.mutate({ id: dbId, ...dbUpdates } as any);
  };

  const handleMarcarPronto = (loteId: string) => {
    const lote = data.germinacao.find((g) => g.id === loteId);
    if (!lote) return;
    const dbId = resolver.germinacaoFrontIdToDbId.get(loteId);
    if (!dbId) return;

    mutations.updateGerminacao.mutate({
      id: dbId,
      status: 'pronto',
      germinadas: lote.germinadas || lote.quantidade,
      naoGerminadas: lote.naoGerminadas || 0,
    });
    toast.success('Lote marcado como pronto para transplantio!');
  };

  const handleMarcarTransplantado = (loteId: string) => {
    const dbId = resolver.germinacaoFrontIdToDbId.get(loteId);
    if (!dbId) return;
    mutations.updateGerminacao.mutate({ id: dbId, status: 'transplantado' });
    toast.success('Lote marcado como transplantado!');
  };

  const handleDeleteLote = (loteId: string) => {
    if (!window.confirm('Excluir este lote?')) return;
    const dbId = resolver.germinacaoFrontIdToDbId.get(loteId);
    if (!dbId) return;
    mutations.deleteGerminacao.mutate({ id: dbId });
    toast.success('Lote excluído!');
  };

  const lotesGerminando = lotesAvulsos.filter((g) => g.status === 'germinando');
  const lotesProntos = lotesAvulsos.filter((g) => g.status === 'pronto');
  const lotesTransplantados = lotesAvulsos.filter((g) => g.status === 'transplantado');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Lotes avulsos
          </h2>
          <p className="text-sm text-muted-foreground">
            Só use para registros sem receita/plano. O fluxo principal é criar um plano em Plantio (receita + datas).
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Novo lote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Registrar plantio</DialogTitle>
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
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantidade de sementes *</Label>
                  <Input name="quantidade" type="number" min="1" placeholder="Ex: 72" className="h-9 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Dias para transplantio</Label>
                  <Input name="diasTransplantio" type="number" min="1" defaultValue="1" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Data/hora do plantio *</Label>
                <Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Input name="observacoes" placeholder="Ex: Sementes lote #42" className="h-9 text-sm" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  Registrar plantio
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lotesGerminando.length > 0 && (
        <section>
          <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Germinando ({lotesGerminando.length})
          </h3>
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

      {lotesProntos.length > 0 && (
        <section>
          <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Prontos para transplantio ({lotesProntos.length})
          </h3>
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

      <section>
        <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          Histórico ({lotesTransplantados.length})
        </h3>
        {lotesTransplantados.length === 0 && lotesAvulsos.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <Sprout className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum lote registrado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Use &quot;Novo lote&quot; acima.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lotesTransplantados.slice(0, 20).map((lote) => (
              <LoteCard key={lote.id} lote={lote} onDelete={handleDeleteLote} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/70'
          : lote.status === 'pronto'
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/70'
            : lote.status === 'transplantado'
              ? 'bg-muted/50 border-muted'
              : 'bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-sm">{lote.variedadeNome}</h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/80 dark:text-emerald-200">
              {lote.quantidade} sementes
            </span>
            {isAtrasado && (
              <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full animate-pulse">
                PRONTO P/ TRANSPLANTIO
              </span>
            )}
            {lote.status === 'pronto' && (
              <span className="text-[10px] font-semibold bg-emerald-200 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full">
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
            <span>
              {dias} dia{dias !== 1 ? 's' : ''} decorrido{dias !== 1 ? 's' : ''}
            </span>
            {lote.status === 'germinando' && (
              <span className={prontoEm <= 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                {prontoEm > 0 ? `Transplantio em ${prontoEm}d` : 'Pronto para transplantio!'}
              </span>
            )}
          </div>

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
              className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-950/50"
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
