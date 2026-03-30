// ============================================================
// ConfigPage — Migrado para tRPC mutations
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, VARIEDADES_PADRAO, type Fase, type VariedadeConfig } from '@/lib/types';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Save, RotateCcw, Plus, Trash2, Leaf, Building2, Power, Edit2, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc';

// Local-state input that debounces writes to server
function DebouncedNumberInput({
  value: serverValue,
  onCommit,
  className,
  min,
}: {
  value: number;
  onCommit: (val: number) => void;
  className?: string;
  min?: string;
}) {
  const [localVal, setLocalVal] = useState(String(serverValue));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server when it changes (e.g. after refetch)
  useEffect(() => {
    setLocalVal(String(serverValue));
  }, [serverValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalVal(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const num = parseInt(raw) || 0;
      if (num > 0) onCommit(num);
    }, 600);
  };

  return (
    <Input
      type="number"
      min={min}
      value={localVal}
      onChange={handleChange}
      className={className}
    />
  );
}

export default function ConfigPage() {
  const { data, exportCSV, backupJSON, refetch } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showAddVar, setShowAddVar] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);
  const [showNewTorre, setShowNewTorre] = useState(false);
  const [editingTorre, setEditingTorre] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    fase: 'mudas' as Fase,
    numAndares: 10,
  });
  // Debounce timers for inline variedade edits
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Mutations for torres
  const createTorre = trpc.torres.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowNewTorre(false);
      setFormData({ nome: '', fase: 'mudas', numAndares: 10 });
      toast.success('Torre criada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const updateTorre = trpc.torres.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTorre(null);
      toast.success('Torre atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const toggleAtiva = trpc.torres.toggleAtiva.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Status da torre alterado!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const deleteTorre = trpc.torres.delete.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeleteConfirm(null);
      toast.success('Torre deletada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];

  const handleSaveConfig = (fase: Fase, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ecMin = parseFloat(fd.get('ecMin') as string);
    const ecMax = parseFloat(fd.get('ecMax') as string);
    const phMin = parseFloat(fd.get('phMin') as string);
    const phMax = parseFloat(fd.get('phMax') as string);

    if (isNaN(ecMin) || isNaN(ecMax) || isNaN(phMin) || isNaN(phMax)) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    const cfg = FASES_CONFIG[fase];
    mutations.upsertFaseConfig.mutate({
      fase,
      label: cfg.label,
      ecMin,
      ecMax,
      phMin,
      phMax,
      cor: cfg.cor,
      corLight: cfg.corLight,
      icon: cfg.icon,
    });
    setConfigVersion((v) => v + 1);
    toast.success(`Configurações de ${FASES_CONFIG[fase].label} salvas!`);
  };

  const handleResetConfig = () => {
    if (!window.confirm('Restaurar configurações padrão?')) return;
    fases.forEach((fase) => {
      const cfg = FASES_CONFIG[fase];
      mutations.upsertFaseConfig.mutate({
        fase,
        label: cfg.label,
        ecMin: cfg.ecMin,
        ecMax: cfg.ecMax,
        phMin: cfg.phMin,
        phMax: cfg.phMax,
        cor: cfg.cor,
        corLight: cfg.corLight,
        icon: cfg.icon,
      });
    });
    setConfigVersion((v) => v + 1);
    toast.success('Configurações restauradas!');
  };

  // ---- Variedades ----

  const handleAddVariedade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = fd.get('nome') as string;
    const diasMudas = parseInt(fd.get('diasMudas') as string);
    const diasVegetativa = parseInt(fd.get('diasVegetativa') as string);
    const diasMaturacao = parseInt(fd.get('diasMaturacao') as string);

    if (!nome || isNaN(diasMudas) || isNaN(diasVegetativa) || isNaN(diasMaturacao)) {
      toast.error('Preencha todos os campos');
      return;
    }

    mutations.createVariedade.mutate({
      nome,
      diasMudas,
      diasVegetativa,
      diasMaturacao,
    });
    setShowAddVar(false);
    toast.success(`Variedade "${nome}" adicionada!`);
  };

  const handleUpdateVariedade = (varId: string, field: keyof VariedadeConfig, value: string | number) => {
    const dbId = resolver.varSlugToId.get(varId);
    if (!dbId) return;

    // Debounce inline edits
    const key = `${varId}-${field}`;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      mutations.updateVariedade.mutate({ id: dbId, [field]: value });
    }, 500);
  };

  const handleDeleteVariedade = (varId: string) => {
    if (!window.confirm('Excluir esta variedade?')) return;
    const dbId = resolver.varSlugToId.get(varId);
    if (!dbId) return;
    mutations.deleteVariedade.mutate({ id: dbId });
    toast.success('Variedade excluída!');
  };

  const handleResetVariedades = () => {
    if (!window.confirm('Restaurar variedades padrão? Variedades personalizadas serão removidas.')) return;
    // Delete all existing, then create defaults
    data.variedades.forEach((v) => {
      const dbId = resolver.varSlugToId.get(v.id);
      if (dbId) mutations.deleteVariedade.mutate({ id: dbId });
    });
    VARIEDADES_PADRAO.forEach((v) => {
      mutations.createVariedade.mutate({
        nome: v.nome,
        diasMudas: v.diasMudas,
        diasVegetativa: v.diasVegetativa,
        diasMaturacao: v.diasMaturacao,
      });
    });
    toast.success('Variedades restauradas!');
  };

  const badgeClass = (fase: Fase) =>
    fase === 'mudas' ? 'badge-mudas' : fase === 'vegetativa' ? 'badge-vegetativa' : 'badge-maturacao';
  const cardClass = (fase: Fase) =>
    fase === 'mudas' ? 'card-mudas' : fase === 'vegetativa' ? 'card-vegetativa' : 'card-maturacao';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Parâmetros EC/pH por fase e ciclos por variedade
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleResetConfig}>
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </Button>
        </div>

        {/* Fases Config — apenas EC/pH */}
        <div className="space-y-4 mb-8">
          {fases.map((fase, i) => {
            const config = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
            return (
              <motion.div
                key={`${fase}-${configVersion}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-xl shadow-sm border overflow-hidden ${cardClass(fase)}`}
              >
                <div className="p-3 border-b flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass(fase)}`}>
                    {FASES_CONFIG[fase].icon} {FASES_CONFIG[fase].label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Parâmetros de referência EC/pH</span>
                </div>
                <form onSubmit={(e) => handleSaveConfig(fase, e)} className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">EC Mín</Label>
                      <Input name="ecMin" type="number" step="0.1" min="0" max="10" defaultValue={config.ecMin} className="h-9 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">EC Máx</Label>
                      <Input name="ecMax" type="number" step="0.1" min="0" max="10" defaultValue={config.ecMax} className="h-9 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">pH Mín</Label>
                      <Input name="phMin" type="number" step="0.1" min="0" max="14" defaultValue={config.phMin} className="h-9 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">pH Máx</Label>
                      <Input name="phMax" type="number" step="0.1" min="0" max="14" defaultValue={config.phMax} className="h-9 text-sm" required />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="gap-1.5 text-xs">
                    <Save className="w-3.5 h-3.5" />
                    Salvar
                  </Button>
                </form>
              </motion.div>
            );
          })}
        </div>

        {/* Torres — Gerenciamento */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Gerenciamento de Torres
              </h2>
              <p className="text-xs text-muted-foreground">
                Criar, editar, ativar/desativar torres
              </p>
            </div>
            <Dialog open={showNewTorre} onOpenChange={setShowNewTorre}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Nova Torre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Torre</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!formData.nome.trim()) return;
                  createTorre.mutate({
                    nome: formData.nome,
                    fase: formData.fase,
                    numAndares: formData.numAndares,
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Torre</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Torre Mudas 1"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="fase">Fase</Label>
                    <select
                      id="fase"
                      value={formData.fase}
                      onChange={(e) => setFormData({ ...formData, fase: e.target.value as Fase })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="mudas">🌱 Mudas</option>
                      <option value="vegetativa">🌿 Vegetativa</option>
                      <option value="maturacao">🌾 Maturação</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="numAndares">Número de Andares</Label>
                    <Input
                      id="numAndares"
                      type="number"
                      min="1"
                      value={formData.numAndares}
                      onChange={(e) => setFormData({ ...formData, numAndares: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTorre.isPending}>
                      {createTorre.isPending ? 'Criando...' : 'Criar Torre'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Torres grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.torres.map((torre) => (
              <motion.div
                key={torre.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-lg border ${
                  torre.ativa !== false
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-muted-foreground/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{torre.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {(torre.numAndares || torre.andares) || 0} andares
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    torre.ativa !== false
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {torre.ativa !== false ? 'Ativa' : 'Inativa'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog open={editingTorre?.id === torre.id} onOpenChange={(open) => {
                    if (open) setEditingTorre({ ...torre });
                    else setEditingTorre(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1 gap-1">
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Torre</DialogTitle>
                      </DialogHeader>
                      {editingTorre && (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          updateTorre.mutate({
                            id: editingTorre.id,
                            nome: editingTorre.nome,
                            fase: editingTorre.fase,
                            numAndares: editingTorre.numAndares,
                          });
                        }} className="space-y-4">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              value={editingTorre.nome}
                              onChange={(e) => setEditingTorre({ ...editingTorre, nome: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Fase</Label>
                            <select
                              value={editingTorre.fase}
                              onChange={(e) => setEditingTorre({ ...editingTorre, fase: e.target.value })}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                            >
                              <option value="mudas">🌱 Mudas</option>
                              <option value="vegetativa">🌿 Vegetativa</option>
                              <option value="maturacao">🌾 Maturação</option>
                            </select>
                          </div>
                          <div>
                            <Label>Número de Andares</Label>
                            <Input
                              type="number"
                              min="1"
                              value={editingTorre.numAndares || editingTorre.andares}
                              onChange={(e) => setEditingTorre({ ...editingTorre, numAndares: parseInt(e.target.value) || 10 })}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={updateTorre.isPending}>
                              {updateTorre.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => toggleAtiva.mutate({ id: typeof torre.id === 'string' ? parseInt(torre.id) : torre.id })}
                    disabled={toggleAtiva.isPending}
                  >
                    <Power className="w-3 h-3" />
                    {torre.ativa !== false ? 'Desativar' : 'Ativar'}
                  </Button>

                  <Dialog open={showDeleteConfirm === torre.id} onOpenChange={(open) => {
                    if (!open) setShowDeleteConfirm(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => setShowDeleteConfirm(torre.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          Deletar Torre?
                        </DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Tem certeza que deseja deletar <strong>{torre.nome}</strong>?
                        Esta ação não pode ser desfeita.
                      </p>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteTorre.mutate({ id: typeof torre.id === 'string' ? parseInt(torre.id) : torre.id })}
                          disabled={deleteTorre.isPending}
                        >
                          {deleteTorre.isPending ? 'Deletando...' : 'Deletar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Variedades — ciclo por planta */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Variedades e Ciclos
              </h2>
              <p className="text-xs text-muted-foreground">
                Cada variedade tem seu próprio ciclo de dias por fase (Mudas → Vegetativa → Maturação)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleResetVariedades}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Restaurar
              </Button>
              <Dialog open={showAddVar} onOpenChange={setShowAddVar}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Nova Variedade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-display">Nova Variedade</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddVariedade} className="space-y-4">
                    <div>
                      <Label className="text-xs">Nome</Label>
                      <Input name="nome" placeholder="Ex: Alface Mimosa" className="h-9 text-sm" required />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Dias Mudas</Label>
                        <Input name="diasMudas" type="number" min="1" placeholder="14" className="h-9 text-sm" required />
                      </div>
                      <div>
                        <Label className="text-xs">Dias Vegetativa</Label>
                        <Input name="diasVegetativa" type="number" min="1" placeholder="21" className="h-9 text-sm" required />
                      </div>
                      <div>
                        <Label className="text-xs">Dias Maturação</Label>
                        <Input name="diasMaturacao" type="number" min="1" placeholder="28" className="h-9 text-sm" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full">Adicionar</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Variedades table */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold">Variedade</th>
                    <th className="text-center p-3 font-semibold">
                      <span className="badge-mudas px-1.5 py-0.5 rounded-full text-[10px]">Mudas (dias)</span>
                    </th>
                    <th className="text-center p-3 font-semibold">
                      <span className="badge-vegetativa px-1.5 py-0.5 rounded-full text-[10px]">Vegetativa (dias)</span>
                    </th>
                    <th className="text-center p-3 font-semibold">
                      <span className="badge-maturacao px-1.5 py-0.5 rounded-full text-[10px]">Maturação (dias)</span>
                    </th>
                    <th className="text-center p-3 font-semibold">Total</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.variedades.map((v) => (
                    <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{v.nome}</td>
                      <td className="p-3 text-center">
                        <DebouncedNumberInput
                          value={v.diasMudas}
                          onCommit={(val) => handleUpdateVariedade(v.id, 'diasMudas', val)}
                          min="1"
                          className="h-7 w-16 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <DebouncedNumberInput
                          value={v.diasVegetativa}
                          onCommit={(val) => handleUpdateVariedade(v.id, 'diasVegetativa', val)}
                          min="1"
                          className="h-7 w-16 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <DebouncedNumberInput
                          value={v.diasMaturacao}
                          onCommit={(val) => handleUpdateVariedade(v.id, 'diasMaturacao', val)}
                          min="1"
                          className="h-7 w-16 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center font-semibold text-muted-foreground">
                        {v.diasMudas + v.diasVegetativa + v.diasMaturacao}d
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteVariedade(v.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Info section */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl border">
          <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sobre os Parâmetros
          </h3>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p><strong>EC (Condutividade Elétrica):</strong> Concentração de nutrientes na solução (mS/cm). Valores ideais variam por fase.</p>
            <p><strong>pH:</strong> Acidez/alcalinidade da solução. Ideal entre 5.5-6.5 para hidroponia.</p>
            <p><strong>Dias por Variedade:</strong> Cada variedade tem seu próprio ciclo de dias em cada fase. Defina na tabela de variedades acima.</p>
          </div>
        </div>

        {/* Data management */}
        <div className="mt-6 p-4 bg-card rounded-xl border">
          <h3 className="font-display font-semibold text-sm mb-3">Gestão de Dados</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={backupJSON}>
              Fazer Backup (JSON)
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => {
              if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados e recriará a estrutura padrão. Deseja continuar?')) {
                mutations.reset.mutate();
                toast.success('Dados resetados! Recarregando...');
                setTimeout(() => mutations.seed.mutate(), 1000);
              }
            }}>
              Resetar Todos os Dados
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
