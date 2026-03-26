// ============================================================
// ConfigPage v3 — Sem diasCiclo por fase (apenas por variedade)
// Fases: apenas EC/pH ranges
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, VARIEDADES_PADRAO, type Fase, type VariedadeConfig } from '@/lib/types';
import { gerarId } from '@/lib/utils-farm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Save, RotateCcw, Plus, Trash2, Leaf } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ConfigPage() {
  const { data, updateData, resetData, backupJSON } = useFazenda();
  const [showAddVar, setShowAddVar] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

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

    updateData((prev) => ({
      ...prev,
      fasesConfig: {
        ...prev.fasesConfig,
        [fase]: {
          ...prev.fasesConfig[fase],
          ecMin, ecMax, phMin, phMax,
        },
      },
    }));
    setConfigVersion((v) => v + 1);
    toast.success(`Configurações de ${FASES_CONFIG[fase].label} salvas!`);
  };

  const handleResetConfig = () => {
    if (!window.confirm('Restaurar configurações padrão?')) return;
    updateData((prev) => ({
      ...prev,
      fasesConfig: { ...FASES_CONFIG },
    }));
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

    const id = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + gerarId().slice(-4);
    const novaVar: VariedadeConfig = { id, nome, diasMudas, diasVegetativa, diasMaturacao };

    updateData((prev) => ({
      ...prev,
      variedades: [...prev.variedades, novaVar],
    }));
    setShowAddVar(false);
    toast.success(`Variedade "${nome}" adicionada!`);
  };

  const handleUpdateVariedade = (varId: string, field: keyof VariedadeConfig, value: string | number) => {
    updateData((prev) => ({
      ...prev,
      variedades: prev.variedades.map((v) =>
        v.id === varId ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handleDeleteVariedade = (varId: string) => {
    if (!window.confirm('Excluir esta variedade?')) return;
    updateData((prev) => ({
      ...prev,
      variedades: prev.variedades.filter((v) => v.id !== varId),
    }));
    toast.success('Variedade excluída!');
  };

  const handleResetVariedades = () => {
    if (!window.confirm('Restaurar variedades padrão? Variedades personalizadas serão removidas.')) return;
    updateData((prev) => ({
      ...prev,
      variedades: [...VARIEDADES_PADRAO],
    }));
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
                        <Input
                          type="number"
                          min="1"
                          value={v.diasMudas}
                          onChange={(e) => handleUpdateVariedade(v.id, 'diasMudas', parseInt(e.target.value) || 0)}
                          className="h-7 w-16 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={v.diasVegetativa}
                          onChange={(e) => handleUpdateVariedade(v.id, 'diasVegetativa', parseInt(e.target.value) || 0)}
                          className="h-7 w-16 text-xs text-center mx-auto"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={v.diasMaturacao}
                          onChange={(e) => handleUpdateVariedade(v.id, 'diasMaturacao', parseInt(e.target.value) || 0)}
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
            <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => {
              if (window.confirm('ATENÇÃO: Isso apagará TODOS os dados. Deseja continuar?')) {
                resetData();
                setConfigVersion((v) => v + 1);
                toast.success('Dados resetados!');
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
