// ============================================================
// ReceitasPage — Biblioteca de Receitas de Crescimento (Admin)
// Cada receita define parâmetros ideais por fase para uma variedade
// ============================================================

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { trpc } from '@/lib/trpc';
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
  BookOpen, Plus, Loader2, Pencil, Trash2, AlertCircle,
  Thermometer, Droplets, Sun, Target, Scale, Leaf,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type ReceitaForm = {
  nome: string;
  variedadeId: number | null;
  metodoColheita: string;
  diasGerminacao: number | null;
  diasMudas: number | null;
  diasVegetativa: number | null;
  diasMaturacao: number | null;
  ecMudas: number | null;
  ecVegetativa: number | null;
  ecMaturacao: number | null;
  phMudas: number | null;
  phVegetativa: number | null;
  phMaturacao: number | null;
  temperaturaMin: number | null;
  temperaturaMax: number | null;
  umidadeMin: number | null;
  umidadeMax: number | null;
  horasLuz: number | null;
  densidadePorPerfil: number | null;
  yieldEsperadoGramas: number | null;
  observacoes: string;
};

const emptyForm: ReceitaForm = {
  nome: '', variedadeId: null, metodoColheita: 'corte',
  diasGerminacao: null, diasMudas: null, diasVegetativa: null, diasMaturacao: null,
  ecMudas: null, ecVegetativa: null, ecMaturacao: null,
  phMudas: null, phVegetativa: null, phMaturacao: null,
  temperaturaMin: null, temperaturaMax: null,
  umidadeMin: null, umidadeMax: null,
  horasLuz: null, densidadePorPerfil: null, yieldEsperadoGramas: null,
  observacoes: '',
};

export default function ReceitasPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ReceitasContent />
    </ProtectedRoute>
  );
}

function ReceitasContent() {
  // Buscar variedades diretamente do DB (id numérico)
  const { data: variedadesDb } = trpc.variedades.list.useQuery();
  const { data: receitas, isLoading, refetch } = trpc.receitas.list.useQuery();
  const createReceita = trpc.receitas.create.useMutation({
    onSuccess: () => { refetch(); toast.success('Receita criada!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });
  const updateReceita = trpc.receitas.update.useMutation({
    onSuccess: () => { refetch(); toast.success('Receita atualizada!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });
  const deleteReceita = trpc.receitas.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Receita excluída!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReceitaForm>({ ...emptyForm });
  const [formError, setFormError] = useState('');
  const [filterVariedade, setFilterVariedade] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Mapa de variedade DB id -> nome
  const varNameMap = useMemo(() => {
    const m = new Map<number, string>();
    (variedadesDb || []).forEach((v) => m.set(v.id, v.nome));
    return m;
  }, [variedadesDb]);

  // Filtrar receitas
  const filteredReceitas = useMemo(() => {
    if (!receitas) return [];
    if (filterVariedade === 'all') return receitas;
    return receitas.filter((r) => String(r.variedadeId) === filterVariedade);
  }, [receitas, filterVariedade]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError('');
    setShowDialog(true);
  };

  const openEdit = (receita: any) => {
    setEditingId(receita.id);
    const ecPorFase = receita.ecPorFase as any || {};
    const phPorFase = receita.phPorFase as any || {};
    setForm({
      nome: receita.nome,
      variedadeId: receita.variedadeId,
      metodoColheita: receita.metodoColheita || 'corte',
      diasGerminacao: receita.diasGerminacao,
      diasMudas: receita.diasMudas,
      diasVegetativa: receita.diasVegetativa,
      diasMaturacao: receita.diasMaturacao,
      ecMudas: ecPorFase.mudas ?? null,
      ecVegetativa: ecPorFase.vegetativa ?? null,
      ecMaturacao: ecPorFase.maturacao ?? null,
      phMudas: phPorFase.mudas ?? null,
      phVegetativa: phPorFase.vegetativa ?? null,
      phMaturacao: phPorFase.maturacao ?? null,
      temperaturaMin: receita.temperaturaMin,
      temperaturaMax: receita.temperaturaMax,
      umidadeMin: receita.umidadeMin,
      umidadeMax: receita.umidadeMax,
      horasLuz: receita.horasLuz,
      densidadePorPerfil: receita.densidadePorPerfil,
      yieldEsperadoGramas: receita.yieldEsperadoGramas,
      observacoes: receita.observacoes || '',
    });
    setFormError('');
    setShowDialog(true);
  };

  const handleSave = () => {
    setFormError('');
    if (!form.nome.trim()) { setFormError('Nome da receita é obrigatório'); return; }
    if (!form.variedadeId) { setFormError('Selecione uma variedade'); return; }

    const payload = {
      nome: form.nome.trim(),
      variedadeId: form.variedadeId!,
      metodoColheita: form.metodoColheita,
      diasGerminacao: form.diasGerminacao ?? undefined,
      diasMudas: form.diasMudas ?? undefined,
      diasVegetativa: form.diasVegetativa ?? undefined,
      diasMaturacao: form.diasMaturacao ?? undefined,
      ecPorFase: {
        mudas: form.ecMudas,
        vegetativa: form.ecVegetativa,
        maturacao: form.ecMaturacao,
      },
      phPorFase: {
        mudas: form.phMudas,
        vegetativa: form.phVegetativa,
        maturacao: form.phMaturacao,
      },
      temperaturaMin: form.temperaturaMin,
      temperaturaMax: form.temperaturaMax,
      umidadeMin: form.umidadeMin,
      umidadeMax: form.umidadeMax,
      horasLuz: form.horasLuz,
      densidadePorPerfil: form.densidadePorPerfil,
      yieldEsperadoGramas: form.yieldEsperadoGramas,
      observacoes: form.observacoes || null,
    };

    if (editingId) {
      updateReceita.mutate({ id: editingId, ...payload }, {
        onSuccess: () => setShowDialog(false),
      });
    } else {
      createReceita.mutate(payload, {
        onSuccess: () => setShowDialog(false),
      });
    }
  };

  const handleDelete = (id: number, nome: string) => {
    if (!window.confirm(`Excluir a receita "${nome}"? Esta ação não pode ser desfeita.`)) return;
    deleteReceita.mutate({ id });
  };

  const isPending = createReceita.isPending || updateReceita.isPending;

  const numField = (label: string, value: number | null, key: keyof ReceitaForm, unit?: string, step?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}{unit ? ` (${unit})` : ''}</Label>
      <Input
        type="number"
        step={step || '0.1'}
        placeholder="-"
        value={value ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value ? Number(e.target.value) : null }))}
        disabled={isPending}
        className="h-9"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Receitas de Crescimento
            </h1>
            <p className="text-sm text-muted-foreground">
              Biblioteca de receitas com parâmetros ideais por fase para cada variedade
            </p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova Receita
          </Button>
        </div>

        {/* Filtro por variedade */}
        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm whitespace-nowrap">Filtrar por variedade:</Label>
          <Select value={filterVariedade} onValueChange={setFilterVariedade}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(variedadesDb || []).map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando receitas...</p>
          </div>
        ) : filteredReceitas.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Receita" para criar a primeira.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredReceitas.map((receita) => {
                const ecPorFase = receita.ecPorFase as any || {};
                const phPorFase = receita.phPorFase as any || {};
                const isExpanded = expandedId === receita.id;
                const varNome = varNameMap.get(receita.variedadeId) || `Var #${receita.variedadeId}`;

                return (
                  <motion.div
                    key={receita.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="bg-card rounded-xl border overflow-hidden"
                  >
                    {/* Header do card */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : receita.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <Leaf className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{receita.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {varNome}
                            {receita.metodoColheita && ` · ${receita.metodoColheita}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                          {receita.yieldEsperadoGramas && (
                            <span className="flex items-center gap-1">
                              <Scale className="w-3 h-3" />
                              {receita.yieldEsperadoGramas}g
                            </span>
                          )}
                          {receita.horasLuz && (
                            <span className="flex items-center gap-1">
                              <Sun className="w-3 h-3" />
                              {receita.horasLuz}h
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEdit(receita); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(receita.id, receita.nome); }}
                          disabled={deleteReceita.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t space-y-4">
                            {/* Dias por fase */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Dias por Fase</p>
                              <div className="grid grid-cols-4 gap-2">
                                <PhaseChip label="Germinação" value={receita.diasGerminacao} unit="d" color="emerald" />
                                <PhaseChip label="Mudas" value={receita.diasMudas} unit="d" color="emerald" />
                                <PhaseChip label="Vegetativa" value={receita.diasVegetativa} unit="d" color="blue" />
                                <PhaseChip label="Maturação" value={receita.diasMaturacao} unit="d" color="amber" />
                              </div>
                            </div>

                            {/* EC/pH por fase */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">EC por Fase</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <PhaseChip label="Mudas" value={ecPorFase.mudas} unit="mS/cm" color="emerald" />
                                  <PhaseChip label="Vegetativa" value={ecPorFase.vegetativa} unit="mS/cm" color="blue" />
                                  <PhaseChip label="Maturação" value={ecPorFase.maturacao} unit="mS/cm" color="amber" />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">pH por Fase</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <PhaseChip label="Mudas" value={phPorFase.mudas} color="emerald" />
                                  <PhaseChip label="Vegetativa" value={phPorFase.vegetativa} color="blue" />
                                  <PhaseChip label="Maturação" value={phPorFase.maturacao} color="amber" />
                                </div>
                              </div>
                            </div>

                            {/* Ambiente */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Condições Ambientais</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <EnvChip icon={<Thermometer className="w-3 h-3" />} label="Temp" value={
                                  receita.temperaturaMin != null || receita.temperaturaMax != null
                                    ? `${receita.temperaturaMin ?? '?'}–${receita.temperaturaMax ?? '?'}°C`
                                    : null
                                } />
                                <EnvChip icon={<Droplets className="w-3 h-3" />} label="Umidade" value={
                                  receita.umidadeMin != null || receita.umidadeMax != null
                                    ? `${receita.umidadeMin ?? '?'}–${receita.umidadeMax ?? '?'}%`
                                    : null
                                } />
                                <EnvChip icon={<Sun className="w-3 h-3" />} label="Luz" value={
                                  receita.horasLuz != null ? `${receita.horasLuz}h/dia` : null
                                } />
                                <EnvChip icon={<Target className="w-3 h-3" />} label="Densidade" value={
                                  receita.densidadePorPerfil != null ? `${receita.densidadePorPerfil}/perfil` : null
                                } />
                              </div>
                            </div>

                            {/* Yield e observações */}
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {receita.yieldEsperadoGramas != null && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                  <Scale className="w-3 h-3" />
                                  Yield esperado: {receita.yieldEsperadoGramas}g/planta
                                </span>
                              )}
                              {receita.criadoPorNome && (
                                <span className="text-muted-foreground">Criada por: {receita.criadoPorNome}</span>
                              )}
                            </div>

                            {receita.observacoes && (
                              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{receita.observacoes}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Dialog de Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Receita' : 'Nova Receita de Crescimento'}</DialogTitle>
            <DialogDescription>
              Defina os parâmetros ideais de cultivo para cada fase da planta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Básico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome da Receita *</Label>
                <Input
                  placeholder="Ex: Alface Crespa - Padrão"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label>Variedade *</Label>
                <Select
                  value={form.variedadeId ? String(form.variedadeId) : ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, variedadeId: Number(v) }))}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(variedadesDb || []).map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Método de Colheita</Label>
                <Select
                  value={form.metodoColheita}
                  onValueChange={(v) => setForm((f) => ({ ...f, metodoColheita: v }))}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corte">Corte</SelectItem>
                    <SelectItem value="arranque">Arranque</SelectItem>
                    <SelectItem value="colheita_parcial">Colheita Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {numField('Yield Esperado', form.yieldEsperadoGramas, 'yieldEsperadoGramas', 'g/planta', '1')}
            </div>

            {/* Dias por fase */}
            <div>
              <p className="text-sm font-semibold mb-2">Dias por Fase</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {numField('Germinação', form.diasGerminacao, 'diasGerminacao', 'dias', '1')}
                {numField('Mudas', form.diasMudas, 'diasMudas', 'dias', '1')}
                {numField('Vegetativa', form.diasVegetativa, 'diasVegetativa', 'dias', '1')}
                {numField('Maturação', form.diasMaturacao, 'diasMaturacao', 'dias', '1')}
              </div>
            </div>

            {/* EC por fase */}
            <div>
              <p className="text-sm font-semibold mb-2">EC por Fase (mS/cm)</p>
              <div className="grid grid-cols-3 gap-3">
                {numField('Mudas', form.ecMudas, 'ecMudas')}
                {numField('Vegetativa', form.ecVegetativa, 'ecVegetativa')}
                {numField('Maturação', form.ecMaturacao, 'ecMaturacao')}
              </div>
            </div>

            {/* pH por fase */}
            <div>
              <p className="text-sm font-semibold mb-2">pH por Fase</p>
              <div className="grid grid-cols-3 gap-3">
                {numField('Mudas', form.phMudas, 'phMudas')}
                {numField('Vegetativa', form.phVegetativa, 'phVegetativa')}
                {numField('Maturação', form.phMaturacao, 'phMaturacao')}
              </div>
            </div>

            {/* Ambiente */}
            <div>
              <p className="text-sm font-semibold mb-2">Condições Ambientais</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {numField('Temp. Mín', form.temperaturaMin, 'temperaturaMin', '°C')}
                {numField('Temp. Máx', form.temperaturaMax, 'temperaturaMax', '°C')}
                {numField('Umidade Mín', form.umidadeMin, 'umidadeMin', '%', '1')}
                {numField('Umidade Máx', form.umidadeMax, 'umidadeMax', '%', '1')}
                {numField('Horas de Luz', form.horasLuz, 'horasLuz', 'h/dia', '1')}
                {numField('Densidade', form.densidadePorPerfil, 'densidadePorPerfil', '/perfil', '1')}
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas adicionais sobre esta receita..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                disabled={isPending}
                rows={3}
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : editingId ? 'Salvar Alterações' : 'Criar Receita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sub-components ----

function PhaseChip({ label, value, unit, color }: { label: string; value: number | null; unit?: string; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-lg p-2 text-center ${bgMap[color] || 'bg-muted'}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-bold text-sm">{value != null ? `${value}${unit || ''}` : '—'}</p>
    </div>
  );
}

function EnvChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}
