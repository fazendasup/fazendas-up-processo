// ============================================================
// ConfigPage — Configurações dos parâmetros ideais por fase
// Agronomic Dashboard: edição de EC/pH alvo e dias de ciclo
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, type Fase, type FaseConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ConfigPage() {
  const { data, updateData, resetData, backupJSON } = useFazenda();

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];

  const handleSaveConfig = (fase: Fase, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const ecMin = parseFloat(fd.get('ecMin') as string);
    const ecMax = parseFloat(fd.get('ecMax') as string);
    const phMin = parseFloat(fd.get('phMin') as string);
    const phMax = parseFloat(fd.get('phMax') as string);
    const diasCiclo = parseInt(fd.get('diasCiclo') as string);

    if (isNaN(ecMin) || isNaN(ecMax) || isNaN(phMin) || isNaN(phMax) || isNaN(diasCiclo)) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    updateData((prev) => ({
      ...prev,
      fasesConfig: {
        ...prev.fasesConfig,
        [fase]: {
          ...prev.fasesConfig[fase],
          ecMin,
          ecMax,
          phMin,
          phMax,
          diasCiclo,
        },
      },
    }));

    toast.success(`Configurações de ${FASES_CONFIG[fase].label} salvas!`);
  };

  const handleResetConfig = () => {
    if (!window.confirm('Restaurar configurações padrão?')) return;
    updateData((prev) => ({
      ...prev,
      fasesConfig: { ...FASES_CONFIG },
    }));
    toast.success('Configurações restauradas!');
  };

  const badgeClass = (fase: Fase) =>
    fase === 'mudas'
      ? 'badge-mudas'
      : fase === 'vegetativa'
      ? 'badge-vegetativa'
      : 'badge-maturacao';

  const cardClass = (fase: Fase) =>
    fase === 'mudas'
      ? 'card-mudas'
      : fase === 'vegetativa'
      ? 'card-vegetativa'
      : 'card-maturacao';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Ajuste os parâmetros ideais para cada fase de cultivo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleResetConfig}>
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {fases.map((fase, i) => {
            const config = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
            return (
              <motion.div
                key={fase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-card rounded-xl shadow-sm border overflow-hidden ${cardClass(fase)}`}
              >
                <div className="p-4 border-b flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass(fase)}`}>
                    {FASES_CONFIG[fase].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Parâmetros ideais para a fase {FASES_CONFIG[fase].label.toLowerCase()}
                  </span>
                </div>

                <form onSubmit={(e) => handleSaveConfig(fase, e)} className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div>
                      <Label className="text-xs">EC Mín</Label>
                      <Input
                        name="ecMin"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        defaultValue={config.ecMin}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">EC Máx</Label>
                      <Input
                        name="ecMax"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        defaultValue={config.ecMax}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">pH Mín</Label>
                      <Input
                        name="phMin"
                        type="number"
                        step="0.1"
                        min="0"
                        max="14"
                        defaultValue={config.phMin}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">pH Máx</Label>
                      <Input
                        name="phMax"
                        type="number"
                        step="0.1"
                        min="0"
                        max="14"
                        defaultValue={config.phMax}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dias Ciclo</Label>
                      <Input
                        name="diasCiclo"
                        type="number"
                        min="1"
                        max="365"
                        defaultValue={config.diasCiclo}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    Salvar {FASES_CONFIG[fase].label}
                  </Button>
                </form>
              </motion.div>
            );
          })}
        </div>

        {/* Info section */}
        <div className="mt-8 p-4 bg-muted/50 rounded-xl border">
          <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sobre os Parâmetros
          </h3>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p><strong>EC (Condutividade Elétrica):</strong> Mede a concentração de nutrientes na solução. Valores em mS/cm.</p>
            <p><strong>pH:</strong> Mede a acidez/alcalinidade da solução. Escala de 0 a 14 (ideal entre 5.5 e 6.5 para hidroponia).</p>
            <p><strong>Dias Ciclo:</strong> Tempo estimado em cada fase até transplante (mudas/vegetativa) ou colheita (maturação).</p>
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
