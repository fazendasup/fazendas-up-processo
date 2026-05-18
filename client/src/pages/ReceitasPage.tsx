// ============================================================
// ReceitasPage — Biblioteca de Receitas de Crescimento (Admin)
// Cada receita define parâmetros ideais por fase para uma variedade
// ============================================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFazenda } from '@/contexts/FazendaContext';
import { VARIEDADES_PADRAO } from '@/lib/types';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BookOpen, Plus, Loader2, Pencil, Trash2, AlertCircle, Copy,
  Thermometer, Droplets, Sun, Scale, Leaf,
  ChevronDown, ChevronUp, RotateCcw, Tags,
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
  /** pH único para todas as fases */
  ph: number | null;
  temperaturaMedia: number | null;
  umidadeMedia: number | null;
  horasLuzMudas: number | null;
  horasLuzVegetativa: number | null;
  horasLuzMaturacao: number | null;
  yieldEsperadoGramas: number | null;
  observacoes: string;
};

function mediaFromMinMax(min: number | null | undefined, max: number | null | undefined): number | null {
  if (min != null && max != null) return Math.round(((min + max) / 2) * 10) / 10;
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

function phFromLegacyPh(phPorFase: Record<string, unknown> | null | undefined): number | null {
  if (!phPorFase || typeof phPorFase !== 'object') return null;
  const n = (x: unknown) => (typeof x === 'number' && !Number.isNaN(x) ? x : null);
  return n(phPorFase.mudas) ?? n(phPorFase.vegetativa) ?? n(phPorFase.maturacao);
}

/** Rótulo pt-BR para o valor persistido em `metodoColheita`. */
function labelMetodoColheita(v: string): string {
  switch (v) {
    case "corte":
      return "Corte";
    case "arranque":
      return "Arrancão";
    case "colheita_parcial":
      return "Colheita Parcial";
    default:
      return v;
  }
}

/** Resumo curto para o cabeçalho do card (faixa ou valor único). */
function resumoHorasLuzHeader(receita: { horasLuzPorFase?: unknown; horasLuz?: number | null }): string | null {
  const h = receita.horasLuzPorFase as Record<string, number> | null | undefined;
  const leg = receita.horasLuz ?? undefined;
  const vals = [h?.mudas, h?.vegetativa, h?.maturacao, leg].filter(
    (x): x is number => typeof x === 'number' && !Number.isNaN(x)
  );
  if (vals.length === 0) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) return `${min}h/dia`;
  return `${min}–${max}h`;
}

const emptyForm: ReceitaForm = {
  nome: '', variedadeId: null, metodoColheita: 'corte',
  diasGerminacao: null, diasMudas: null, diasVegetativa: null, diasMaturacao: null,
  ecMudas: null, ecVegetativa: null, ecMaturacao: null,
  ph: null,
  temperaturaMedia: null,
  umidadeMedia: null,
  horasLuzMudas: null,
  horasLuzVegetativa: null,
  horasLuzMaturacao: null,
  yieldEsperadoGramas: null,
  observacoes: '',
};

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalVal(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const num = parseInt(raw) || 0;
      if (num > 0) onCommit(num);
    }, 600);
  };

  return <Input type="number" min={min} value={localVal} onChange={handleChange} className={className} />;
}

function VariedadesTabContent() {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showAddVar, setShowAddVar] = useState(false);

  const handleAddVariedade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = (fd.get('nome') as string)?.trim();
    if (!nome) {
      toast.error('Informe o nome da variedade');
      return;
    }
    mutations.createVariedade.mutate({ nome });
    setShowAddVar(false);
    toast.success(`Variedade "${nome}" adicionada!`);
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
    data.variedades.forEach((v) => {
      const dbId = resolver.varSlugToId.get(v.id);
      if (dbId) mutations.deleteVariedade.mutate({ id: dbId });
    });
    VARIEDADES_PADRAO.forEach((v) => {
      mutations.createVariedade.mutate({ nome: v.nome });
    });
    toast.success('Variedades restauradas!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Variedades
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastro da espécie/cultivar. Prazos por fase (germinação, mudas, vegetativa, maturação) ficam na{' '}
            <strong>receita</strong> associada a esta variedade.
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
                Nova variedade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display">Nova variedade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVariedade} className="space-y-4">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input name="nome" placeholder="Ex: Alface Mimosa" className="h-9 text-sm" required />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Depois crie ou edite uma <strong>receita</strong> ligada a esta variedade para definir dias por fase,
                  EC, pH e demais parâmetros.
                </p>
                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Variedade</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Prazos no app</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.variedades.map((v) => (
                <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{v.nome}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    Definidos na receita (aba Receitas). Sem receita ativa, usam-se valores padrão até cadastrar.
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
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
    </div>
  );
}

export default function ReceitasPage() {
  const [location, setLocation] = useLocation();
  const [tab, setTab] = useState(() => (location.startsWith('/cadastros') ? 'variedades' : 'receitas'));

  useEffect(() => {
    setTab(location.startsWith('/cadastros') ? 'variedades' : 'receitas');
  }, [location]);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-6 max-w-5xl">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2 flex-wrap">
              <BookOpen className="w-6 h-6" />
              Receitas e cadastros
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Receitas de crescimento (incluindo dias por fase, EC, pH, luz) e cadastro de variedades — num só sítio.
            </p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              if (v === 'variedades') setLocation('/cadastros');
              else setLocation('/receitas');
            }}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 sm:inline-flex sm:w-auto h-auto sm:h-9 p-1 gap-1">
              <TabsTrigger value="receitas" className="gap-1.5">
                <BookOpen className="w-4 h-4" />
                Receitas
              </TabsTrigger>
              <TabsTrigger value="variedades" className="gap-1.5">
                <Tags className="w-4 h-4" />
                Variedades
              </TabsTrigger>
            </TabsList>
            <TabsContent value="receitas" className="mt-6">
              <ReceitasTabContent />
            </TabsContent>
            <TabsContent value="variedades" className="mt-6">
              <VariedadesTabContent />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ReceitasTabContent() {
  const utils = trpc.useUtils();
  // Buscar variedades diretamente do DB (id numérico)
  const { data: variedadesDb } = trpc.variedades.list.useQuery();
  const { data: receitas, isLoading, isError, error, refetch } = trpc.receitas.list.useQuery();
  const afterReceitaMutation = async () => {
    await Promise.all([
      utils.receitas.list.invalidate(),
      utils.fazenda.loadAll.invalidate(),
    ]);
    await utils.fazenda.loadAll.refetch();
    await refetch();
  };
  const createReceita = trpc.receitas.create.useMutation({
    onSuccess: async () => {
      await afterReceitaMutation();
      toast.success('Receita criada!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
  const updateReceita = trpc.receitas.update.useMutation({
    onSuccess: async () => {
      await afterReceitaMutation();
      toast.success('Receita atualizada!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
  const deleteReceita = trpc.receitas.delete.useMutation({
    onSuccess: async () => {
      await afterReceitaMutation();
      toast.success('Receita excluída!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
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
    const hlp = (receita.horasLuzPorFase as any) || {};
    const horasLeg = receita.horasLuz ?? null;
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
      ph:
        receita.ph != null
          ? receita.ph
          : phFromLegacyPh(phPorFase),
      temperaturaMedia:
        receita.temperaturaMedia != null
          ? receita.temperaturaMedia
          : mediaFromMinMax(receita.temperaturaMin, receita.temperaturaMax),
      umidadeMedia:
        receita.umidadeMedia != null
          ? receita.umidadeMedia
          : mediaFromMinMax(receita.umidadeMin, receita.umidadeMax),
      horasLuzMudas: hlp.mudas ?? horasLeg,
      horasLuzVegetativa: hlp.vegetativa ?? horasLeg,
      horasLuzMaturacao: hlp.maturacao ?? horasLeg,
      yieldEsperadoGramas: receita.yieldEsperadoGramas,
      observacoes: receita.observacoes || '',
    });
    setFormError('');
    setShowDialog(true);
  };

  /** Novo cadastro com os mesmos dados da receita (ex.: trocar só a variedade). */
  const openDuplicateFrom = (receita: any) => {
    setEditingId(null);
    const ecPorFase = receita.ecPorFase as any || {};
    const phPorFase = receita.phPorFase as any || {};
    const hlp = (receita.horasLuzPorFase as any) || {};
    const horasLeg = receita.horasLuz ?? null;
    setForm({
      nome: `${receita.nome} (cópia)`,
      variedadeId: receita.variedadeId,
      metodoColheita: receita.metodoColheita || 'corte',
      diasGerminacao: receita.diasGerminacao,
      diasMudas: receita.diasMudas,
      diasVegetativa: receita.diasVegetativa,
      diasMaturacao: receita.diasMaturacao,
      ecMudas: ecPorFase.mudas ?? null,
      ecVegetativa: ecPorFase.vegetativa ?? null,
      ecMaturacao: ecPorFase.maturacao ?? null,
      ph:
        receita.ph != null
          ? receita.ph
          : phFromLegacyPh(phPorFase),
      temperaturaMedia:
        receita.temperaturaMedia != null
          ? receita.temperaturaMedia
          : mediaFromMinMax(receita.temperaturaMin, receita.temperaturaMax),
      umidadeMedia:
        receita.umidadeMedia != null
          ? receita.umidadeMedia
          : mediaFromMinMax(receita.umidadeMin, receita.umidadeMax),
      horasLuzMudas: hlp.mudas ?? horasLeg,
      horasLuzVegetativa: hlp.vegetativa ?? horasLeg,
      horasLuzMaturacao: hlp.maturacao ?? horasLeg,
      yieldEsperadoGramas: receita.yieldEsperadoGramas,
      observacoes: receita.observacoes || '',
    });
    setFormError('');
    setShowDialog(true);
    toast.message('Receita copiada', { description: 'Altere o nome e/ou a variedade e salve como nova receita.' });
  };

  const handleSave = () => {
    setFormError('');
    if (!form.nome.trim()) { setFormError('Nome da receita é obrigatório'); return; }
    if (!form.variedadeId) { setFormError('Selecione uma variedade'); return; }

    /** Só campos novos + obrigatórios — não envia null em legado (phPorFase, min/máx, horasLuz, densidade) para não apagar dados antigos. */
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
      ph: form.ph,
      temperaturaMedia: form.temperaturaMedia,
      umidadeMedia: form.umidadeMedia,
      horasLuzPorFase: {
        mudas: form.horasLuzMudas,
        vegetativa: form.horasLuzVegetativa,
        maturacao: form.horasLuzMaturacao,
      },
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
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-2">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Receitas de crescimento
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              EC por fase; pH, temperatura e umidade médios; horas de luz em mudas, vegetativa e maturação (germinação no
              escuro)
            </p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 shrink-0" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova receita
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

        {isError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            <p className="font-medium">Não foi possível carregar as receitas.</p>
            <p className="text-xs mt-1 opacity-90">
              {error?.message || 'Erro desconhecido'} — reinicie o servidor após atualizar o banco. Se as colunas novas
              ainda não existiam, o servidor tenta criá-las ao subir.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Tentar de novo
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando receitas...</p>
          </div>
        ) : !isError && filteredReceitas.length === 0 ? (
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
                          <Leaf className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{receita.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {varNome}
                            {receita.metodoColheita && ` · ${labelMetodoColheita(receita.metodoColheita)}`}
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
                          {resumoHorasLuzHeader(receita) && (
                            <span className="flex items-center gap-1">
                              <Sun className="w-3 h-3" />
                              {resumoHorasLuzHeader(receita)}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEdit(receita); }}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openDuplicateFrom(receita); }}
                          title="Copiar para nova receita"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(receita.id, receita.nome); }}
                          disabled={deleteReceita.isPending}
                          title="Excluir"
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
                                <PhaseChip label="Vegetativa" value={receita.diasVegetativa} unit="d" color="emerald" />
                                <PhaseChip label="Maturação" value={receita.diasMaturacao} unit="d" color="emerald" />
                              </div>
                            </div>

                            {/* EC/pH por fase */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">EC por Fase</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <PhaseChip label="Mudas" value={ecPorFase.mudas} unit="mS/cm" color="emerald" />
                                  <PhaseChip label="Vegetativa" value={ecPorFase.vegetativa} unit="mS/cm" color="emerald" />
                                  <PhaseChip label="Maturação" value={ecPorFase.maturacao} unit="mS/cm" color="emerald" />
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">pH (todas as fases)</p>
                                <div className="rounded-lg p-3 bg-emerald-50/90 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-100 text-center">
                                  <p className="text-[10px] text-muted-foreground">Valor único</p>
                                  <p className="font-bold text-lg">
                                    {receita.ph != null
                                      ? receita.ph
                                      : phFromLegacyPh(phPorFase as any) ?? '—'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Ambiente */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Condições Ambientais</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <EnvChip icon={<Thermometer className="w-3 h-3" />} label="Temp. média" value={
                                  (() => {
                                    const m =
                                      receita.temperaturaMedia != null
                                        ? receita.temperaturaMedia
                                        : mediaFromMinMax(receita.temperaturaMin, receita.temperaturaMax);
                                    return m != null ? `${m}°C` : null;
                                  })()
                                } />
                                <EnvChip icon={<Droplets className="w-3 h-3" />} label="Umidade média" value={
                                  (() => {
                                    const m =
                                      receita.umidadeMedia != null
                                        ? receita.umidadeMedia
                                        : mediaFromMinMax(receita.umidadeMin, receita.umidadeMax);
                                    return m != null ? `${m}%` : null;
                                  })()
                                } />
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                                <Sun className="w-3 h-3" />
                                Horas de luz por fase
                              </p>
                              <p className="text-[10px] text-muted-foreground mb-2">Germinação no escuro — sem luz artificial.</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {(() => {
                                  const h = (receita.horasLuzPorFase as Record<string, number> | null) || {};
                                  const leg = receita.horasLuz;
                                  return (
                                    <>
                                      <PhaseChip label="Mudas" value={h.mudas ?? leg ?? null} unit="h" color="emerald" />
                                      <PhaseChip label="Vegetativa" value={h.vegetativa ?? leg ?? null} unit="h" color="emerald" />
                                      <PhaseChip label="Maturação" value={h.maturacao ?? leg ?? null} unit="h" color="emerald" />
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Yield e observações */}
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {receita.yieldEsperadoGramas != null && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:text-emerald-300 font-medium">
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
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Receita' : 'Nova Receita de Crescimento'}</DialogTitle>
            <DialogDescription>
              pH e clima como médias globais; iluminação pode variar por fase.
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
                    <SelectItem value="arranque">Arrancão</SelectItem>
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

            {/* pH único */}
            <div>
              <p className="text-sm font-semibold mb-2">pH (mesmo valor para todas as fases)</p>
              <div className="max-w-[200px]">{numField('pH', form.ph, 'ph')}</div>
            </div>

            {/* Ambiente: médias */}
            <div>
              <p className="text-sm font-semibold mb-2">Condições ambientais (médias)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {numField('Temperatura média', form.temperaturaMedia, 'temperaturaMedia', '°C')}
                {numField('Umidade média', form.umidadeMedia, 'umidadeMedia', '%', '1')}
              </div>
            </div>

            {/* Luz por fase (sem germinação — escuro) */}
            <div>
              <p className="text-sm font-semibold mb-1">Horas de luz por fase</p>
              <p className="text-xs text-muted-foreground mb-2">Germinação permanece no escuro; informe só mudas, vegetativa e maturação.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {numField('Mudas', form.horasLuzMudas, 'horasLuzMudas', 'h/dia', '1')}
                {numField('Vegetativa', form.horasLuzVegetativa, 'horasLuzVegetativa', 'h/dia', '1')}
                {numField('Maturação', form.horasLuzMaturacao, 'horasLuzMaturacao', 'h/dia', '1')}
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
    </>
  );
}

// ---- Sub-components ----

function PhaseChip({ label, value, unit, color }: { label: string; value: number | null; unit?: string; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100',
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
