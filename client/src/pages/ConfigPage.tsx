// ============================================================
// ConfigPage — Migrado para tRPC mutations
// ============================================================

import Header from '@/components/Header';
import HidroponiaConfigBancadas from '@/components/HidroponiaConfigBancadas';
import { VariedadesCadastroTable } from '@/components/VariedadesCadastroTable';
import { useProjeto } from '@/contexts/ProjetoContext';
import { useFazenda } from '@/contexts/FazendaContext';
import { useAgendaModal } from '@/contexts/AgendaModalContext';
import { FASES_CONFIG, torreEstaAtivaNoDashboard, type Fase } from '@/lib/types';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import { useTheme } from '@/contexts/ThemeContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { isCaixaSlugDoSeedInicial } from '@/lib/seedCaixas';
import {
  LAYOUT_FASE_ESTUFA_REFERENCIA,
  OPCOES_FASE_TORRE_MICROVERDES,
  labelFaseTorreMicroverdes,
} from '@/lib/microverdesPhases';
import { ProjetoModulosCard } from '@/components/ProjetoModulosCard';
import { Settings, Save, RotateCcw, Plus, Trash2, SlidersHorizontal, Bell, Globe, Database, ShieldCheck, Building2, Power, Edit2, AlertTriangle, Layers } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { proximoNumeroTorreOperacional, sugerirNomeNovaTorre } from '@/lib/sugerirNomeTorre';
import { ESTRUTURA_OVERRIDE_FV_12x6, torreEstruturaOverrideIgual } from '@shared/types';
import {
  DEFAULT_OPERATIONAL_RESET_CLUSTERS,
  type OperationalResetClusters,
} from '@shared/operationalReset';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc';

export default function ConfigPage() {
  const { openAgenda } = useAgendaModal();
  const { activeProjeto } = useProjeto();
  const { theme, setTheme } = useTheme();
  const { data, exportCSV, backupJSON } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [configVersion, setConfigVersion] = useState(0);
  const [showNewTorre, setShowNewTorre] = useState(false);
  /** Se false, esconde caixas do seed admin (Mudas 1, Veg 1–3, Mat 1–5) na lista de reutilização. */
  const [mostrarCaixasSeedNovaTorre, setMostrarCaixasSeedNovaTorre] = useState(false);
  const [editingTorre, setEditingTorre] = useState<any>(null);
  /** true se o usuário escreveu o nome na criação (não sobrescrever ao mudar a fase). */
  const [novoTorreNomeManual, setNovoTorreNomeManual] = useState(false);
  const editTorreSnapshotRef = useRef<{
    caixaSlug: string;
    fase: Fase;
    nome: string;
    num: number;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | number | null>(null);
  const [resetOpDialogOpen, setResetOpDialogOpen] = useState(false);
  const [resetClusters, setResetClusters] = useState<OperationalResetClusters>(() => ({
    ...DEFAULT_OPERATIONAL_RESET_CLUSTERS,
  }));

  function setResetCluster<K extends keyof OperationalResetClusters>(key: K, value: boolean) {
    setResetClusters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'torresGrade' && value) next.limparCultivoGrade = false;
      if (key === 'limparCultivoGrade' && value) next.torresGrade = false;
      if (key === 'removerCadastroCaixasAgua' && value) next.historicoSolucaoCaixa = true;
      return next;
    });
  }

  function applyPresetDesmarcarTudo() {
    setResetClusters(
      Object.fromEntries(
        (Object.keys(DEFAULT_OPERATIONAL_RESET_CLUSTERS) as (keyof OperationalResetClusters)[]).map((k) => [
          k,
          false,
        ]),
      ) as OperationalResetClusters,
    );
  }

  /** Limite máximo agressivo: apaga infraestrutura de torres e cadastro de caixas */
  function applyPresetMaxDestructivo() {
    setResetClusters({
      torresGrade: true,
      limparCultivoGrade: false,
      historicoSolucaoCaixa: true,
      removerCadastroCaixasAgua: true,
      germinacao: true,
      transplantios: true,
      manutencoes: true,
      planosPlantio: true,
      registrosColheita: true,
      tarefas: true,
      estoque: true,
      custosProducao: true,
      inteligenciaAlertas: true,
      visao: true,
      bancadasHidroponia: true,
    });
  }
  const [formData, setFormData] = useState<{
    nome: string;
    fase: Fase;
    numAndares: number;
    /** Slug da caixa existente (mapa no resolver → id numérico na mutation). */
    caixaAguaSlug?: string;
    /** Número operacional único por projeto (ordenção estável; não confundir com o nome). */
    numeroTorre: number;
    modeloEstrutura: 'padrao' | 'fv_12x6';
  }>({ nome: '', fase: 'mudas', numAndares: 10, numeroTorre: 1, modeloEstrutura: 'padrao' });
  const isMicroverdes = activeProjeto?.tipo === "microverdes";
  const microOmitCaixaAgua = Boolean(isMicroverdes && activeProjeto?.usarCaixaAgua === false);
  const maxAndaresTorre = isMicroverdes ? 6 : 40;
  const [regraDesperdicioMax, setRegraDesperdicioMax] = useState(12);
  const [regraCapacidadeMin, setRegraCapacidadeMin] = useState(25);
  const [regraPrazoLavagemDias, setRegraPrazoLavagemDias] = useState(1);
  const [regraFreqMedicaoHoras, setRegraFreqMedicaoHoras] = useState(24);
  const [prefFormatoData, setPrefFormatoData] = useState('pt-BR');
  const [prefFuso, setPrefFuso] = useState('America/Sao_Paulo');
  const [prefOrdenacaoTarefa, setPrefOrdenacaoTarefa] = useState('prioridade');
  const [prefMostrarKpis, setPrefMostrarKpis] = useState(true);
  const [prefNotificacoes, setPrefNotificacoes] = useState(true);
  const [prefTemaEscuro, setPrefTemaEscuro] = useState(theme === 'dark');

  useEffect(() => {
    const storedFuso = localStorage.getItem('pref.fuso');
    if (storedFuso) setPrefFuso(storedFuso);
    const storedEscuro = localStorage.getItem('pref.temaEscuro');
    if (storedEscuro != null) setPrefTemaEscuro(storedEscuro === 'true');
  }, []);

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];
  const utils = trpc.useUtils();

  const caixasOpcoesNovaTorre = useMemo(() => {
    return (data.caixasAgua || [])
      .filter((c) => String(c.fase).trim() === formData.fase)
      .filter((c) => mostrarCaixasSeedNovaTorre || !isCaixaSlugDoSeedInicial(String(c.id)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [data.caixasAgua, formData.fase, mostrarCaixasSeedNovaTorre]);

  /** Editar torre: mostra todas as caixas da fase (incl. seed) para o usuário escolher qualquer uma. */
  const caixasOpcoesEdicao = useMemo(() => {
    if (!editingTorre) return [];
    const f = editingTorre.fase as Fase;
    let list = (data.caixasAgua || [])
      .filter((c) => String(c.fase).trim() === f)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    const cur = String(editingTorre.caixaAguaSlug ?? "");
    if (cur && !list.some((c) => c.id === cur)) {
      const orphan = (data.caixasAgua || []).find((c) => c.id === cur);
      if (orphan) list = [orphan, ...list];
    }
    return list;
  }, [data.caixasAgua, editingTorre]);

  useEffect(() => {
    if (!formData.caixaAguaSlug) return;
    if (caixasOpcoesNovaTorre.some((c) => c.id === formData.caixaAguaSlug)) return;
    setFormData((prev) => ({ ...prev, caixaAguaSlug: undefined }));
  }, [caixasOpcoesNovaTorre, formData.caixaAguaSlug]);

  const createTorre = trpc.torres.create.useMutation({
    onSuccess: async () => {
      await utils.fazenda.loadAll.invalidate();
      await utils.fazenda.loadAll.refetch();
      mutations.debouncedInvalidate();
      setShowNewTorre(false);
      setMostrarCaixasSeedNovaTorre(false);
      setNovoTorreNomeManual(false);
      setFormData({
        nome: '',
        fase: 'mudas',
        numAndares: isMicroverdes ? 6 : 10,
        numeroTorre: proximoNumeroTorreOperacional(data.torres || []),
        modeloEstrutura: 'padrao',
      });
      toast.success('Torre criada com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });
  const updateTorre = trpc.torres.update.useMutation({
    onSuccess: () => {
      mutations.debouncedInvalidate();
      setEditingTorre(null);
      toast.success('Torre atualizada com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });
  const toggleAtiva = trpc.torres.toggleAtiva.useMutation({
    onSuccess: () => {
      mutations.debouncedInvalidate();
      toast.success('Status da torre alterado!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });
  const deleteTorre = trpc.torres.delete.useMutation({
    onSuccess: async () => {
      await utils.fazenda.loadAll.invalidate();
      await utils.fazenda.loadAll.refetch();
      mutations.debouncedInvalidate();
      setShowDeleteConfirm(null);
      toast.success('Torre deletada com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const getTorreDbId = (torreId: string | number) => {
    if (typeof torreId === 'number' && Number.isFinite(torreId)) return torreId;
    if (typeof torreId === 'string') {
      const mapped = resolver.torreSlugToId.get(torreId);
      if (mapped) return mapped;
      const parsed = Number.parseInt(torreId, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const salvarEdicaoTorre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTorre) return;
    const dbId = getTorreDbId(editingTorre.id);
    if (!dbId) {
      toast.error('Torre inválida');
      return;
    }
    const n = Math.min(maxAndaresTorre, Math.max(1, Number(editingTorre.numAndares || editingTorre.andares) || 1));
    const snap = editTorreSnapshotRef.current;
    const caixaSlugNow = String(editingTorre.caixaAguaSlug ?? '');
    if (!microOmitCaixaAgua) {
      if (editingTorre.caixaAguaSlug) {
        const d = resolver.caixaSlugToId.get(String(editingTorre.caixaAguaSlug));
        if (d == null) {
          toast.error("Caixa d'água inválida — atualize a página e tente de novo.");
          return;
        }
      }
    }
    if (snap) {
      const faseMudou = editingTorre.fase !== snap.fase;
      const caixaMudou = (snap.caixaSlug || '') !== (caixaSlugNow || '');
      if (faseMudou || caixaMudou) {
        const partes: string[] = [];
        if (faseMudou) partes.push('a fase da torre');
        if (caixaMudou) {
          partes.push("a caixa d'água (medições e regas passam a usar a caixa selecionada)");
        }
        if (!window.confirm(`Confirma alterar ${partes.join(' e ')}?`)) return;
      }
    }
    const caixaDbId = editingTorre.caixaAguaSlug
      ? resolver.caixaSlugToId.get(String(editingTorre.caixaAguaSlug))
      : undefined;
    updateTorre.mutate({
      id: dbId,
      nome: editingTorre.nome,
      fase: editingTorre.fase,
      numAndares: n,
      numeroTorre: editingTorre.numeroTorre,
      ...(!isMicroverdes && editingTorre.fase !== 'mudas'
        ? { modeloEstrutura: editingTorre.modeloEstrutura ?? 'padrao' }
        : {}),
      ...(!microOmitCaixaAgua && caixaDbId != null ? { caixaAguaId: caixaDbId } : {}),
    });
  };

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
    toast.success(
      `Configurações de ${isMicroverdes ? labelFaseTorreMicroverdes(fase) : FASES_CONFIG[fase].label} salvas!`,
    );
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

  const badgeClass = (fase: Fase) =>
    fase === 'mudas' ? 'badge-mudas' : fase === 'vegetativa' ? 'badge-vegetativa' : 'badge-maturacao';
  const cardClass = (fase: Fase) =>
    fase === 'mudas' ? 'card-mudas' : fase === 'vegetativa' ? 'card-vegetativa' : 'card-maturacao';

  const salvarRegras = () => {
    localStorage.setItem('cfg.desperdicioMax', String(regraDesperdicioMax));
    localStorage.setItem('cfg.capacidadeMin', String(regraCapacidadeMin));
    localStorage.setItem('cfg.prazoLavagemDias', String(regraPrazoLavagemDias));
    localStorage.setItem('cfg.freqMedicaoHoras', String(regraFreqMedicaoHoras));
    toast.success('Regras operacionais salvas');
  };

  const aplicarPreferencias = () => {
    localStorage.setItem('pref.formatoData', prefFormatoData);
    localStorage.setItem('pref.fuso', prefFuso);
    localStorage.setItem('pref.ordenacaoTarefa', prefOrdenacaoTarefa);
    localStorage.setItem('pref.mostrarKpis', String(prefMostrarKpis));
    localStorage.setItem('pref.notificacoes', String(prefNotificacoes));
    localStorage.setItem('pref.temaEscuro', String(prefTemaEscuro));
    if (setTheme) {
      setTheme(prefTemaEscuro ? 'dark' : 'light');
    }
    toast.success('Preferências aplicadas');
  };

  if (activeProjeto?.tipo === 'hidroponia') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <HidroponiaConfigBancadas />
      </div>
    );
  }

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
              Regras do sistema, parâmetros globais e cadastros-base
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
                    {FASES_CONFIG[fase].icon}{' '}
                    {isMicroverdes ? labelFaseTorreMicroverdes(fase) : FASES_CONFIG[fase].label}
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

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Torres
              </h2>
              <p className="text-xs text-muted-foreground">
                Cadastro e ativação de torres do sistema.
                {isMicroverdes && (
                  <span className="block mt-1 text-sky-800/90 dark:text-sky-200/90">
                    Referência fase estufa: <strong>{LAYOUT_FASE_ESTUFA_REFERENCIA.estufas} estufas</strong> e{" "}
                    <strong>{LAYOUT_FASE_ESTUFA_REFERENCIA.torres} torres</strong> (amplie se precisar). Até{" "}
                    <strong>6 andares</strong> por torre; em cada andar, <strong>4 bandejas</strong> (germinação e
                    iluminação). Na iluminação, o <strong>lote</strong> é por bandeja (1 posição = 1 corte nessa
                    bandeja).
                  </span>
                )}
              </p>
            </div>
            <Dialog
              open={showNewTorre}
              onOpenChange={async (open) => {
                setShowNewTorre(open);
                if (open) {
                  setNovoTorreNomeManual(false);
                  setMostrarCaixasSeedNovaTorre(false);
                  setFormData((p) => {
                    const fase = p.fase;
                    const nome = sugerirNomeNovaTorre(
                      fase,
                      data.torres,
                      Boolean(isMicroverdes),
                      data.fasesConfig,
                    );
                    return {
                      nome,
                      fase,
                      numAndares: isMicroverdes ? 6 : 10,
                      caixaAguaSlug: undefined,
                      numeroTorre: proximoNumeroTorreOperacional(data.torres || []),
                      modeloEstrutura: 'padrao',
                    };
                  });
                  await utils.fazenda.loadAll.invalidate();
                  await utils.fazenda.loadAll.fetch();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" />Nova Torre</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Nova Torre</DialogTitle></DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!formData.nome.trim()) return;
                    const caixaDbId = formData.caixaAguaSlug
                      ? resolver.caixaSlugToId.get(formData.caixaAguaSlug)
                      : undefined;
                    if (formData.caixaAguaSlug && caixaDbId == null) {
                      toast.error('Caixa d’água inválida — atualize a página e tente de novo.');
                      return;
                    }
                    createTorre.mutate({
                      nome: formData.nome,
                      fase: formData.fase,
                      numAndares: Math.min(formData.numAndares, maxAndaresTorre),
                      numeroTorre: formData.numeroTorre,
                      modeloEstrutura:
                        !isMicroverdes && formData.fase !== 'mudas' ? formData.modeloEstrutura : 'padrao',
                      ...(caixaDbId != null && !microOmitCaixaAgua ? { caixaAguaId: caixaDbId } : {}),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <div className="flex items-end justify-between gap-2">
                      <Label>Nome da Torre</Label>
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline shrink-0"
                        onClick={() => {
                          setNovoTorreNomeManual(false);
                          setFormData((p) => ({
                            ...p,
                            nome: sugerirNomeNovaTorre(
                              p.fase,
                              data.torres,
                              Boolean(isMicroverdes),
                              data.fasesConfig,
                            ),
                          }));
                        }}
                      >
                        Aplicar sugestão
                      </button>
                    </div>
                    <Input
                      value={formData.nome}
                      onChange={(e) => {
                        setNovoTorreNomeManual(true);
                        setFormData({ ...formData, nome: e.target.value });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label>N.º operacional</Label>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={formData.numeroTorre}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numeroTorre: Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)),
                        })
                      }
                      required
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Número fixo por projeto (único). Ordenação em listas e relatórios — o nome pode mudar sem alterar este n.º.
                    </p>
                  </div>
                  <div>
                    <Label>Fase</Label>
                    <select
                      value={formData.fase}
                      onChange={(e) => {
                        const f = e.target.value as Fase;
                        setFormData((prev) => {
                          const next = {
                            ...prev,
                            fase: f,
                            caixaAguaSlug: undefined as string | undefined,
                            modeloEstrutura: f === 'mudas' ? ('padrao' as const) : prev.modeloEstrutura,
                          };
                          if (!novoTorreNomeManual) {
                            next.nome = sugerirNomeNovaTorre(
                              f,
                              data.torres,
                              Boolean(isMicroverdes),
                              data.fasesConfig,
                            );
                          }
                          return next;
                        });
                      }}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {isMicroverdes
                        ? OPCOES_FASE_TORRE_MICROVERDES.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))
                        : (
                            <>
                              <option value="mudas">🌱 Mudas</option>
                              <option value="vegetativa">🌿 Vegetativa</option>
                              <option value="maturacao">🌾 Maturação</option>
                            </>
                          )}
                    </select>
                  </div>
                  <div>
                    <Label>Número de Andares</Label>
                    <Input
                      type="number"
                      min={1}
                      max={maxAndaresTorre}
                      value={formData.numAndares}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numAndares: Math.min(
                            maxAndaresTorre,
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          ),
                        })
                      }
                    />
                    {isMicroverdes && (
                      <p className="text-[10px] text-muted-foreground mt-1">Máximo {maxAndaresTorre} andares (layout microverdes).</p>
                    )}
                  </div>
                  {!isMicroverdes && formData.fase !== 'mudas' && (
                    <div>
                      <Label>Modelo de grelha (físico)</Label>
                      <select
                        value={formData.modeloEstrutura}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            modeloEstrutura: e.target.value as 'padrao' | 'fv_12x6',
                          })
                        }
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="padrao">Padrão FV (veg 12×9 / mat 6×6)</option>
                        <option value="fv_12x6">12 perfis × 6 furos (veg e mat — torres alteradas)</option>
                      </select>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Use 12×6 para torres com estrutura reformada (ex.: n.º 13 e 14). Ajuste os andares no solo se a contagem de furos no BD não coincidir.
                      </p>
                    </div>
                  )}
                  {!microOmitCaixaAgua && (
                  <div>
                    <Label>Caixa d&apos;água</Label>
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        id="mostrar-caixas-seed"
                        checked={mostrarCaixasSeedNovaTorre}
                        onCheckedChange={(v) => setMostrarCaixasSeedNovaTorre(v === true)}
                      />
                      <label htmlFor="mostrar-caixas-seed" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                        Mostrar caixas do cenário inicial (seed:{" "}
                        {isMicroverdes
                          ? "Germinação 1, Iluminação 1–3 (exemplo do seed)"
                          : "Mudas 1, Vegetativas 1–3, Maturação 1–5"}
                        ). Desligado por defeito para só ver caixas criadas ao adicionar torres.
                      </label>
                    </div>
                    <select
                      value={formData.caixaAguaSlug ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({
                          ...formData,
                          caixaAguaSlug: v === '' ? undefined : v,
                        });
                      }}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Criar caixa nova (recomendado)</option>
                      {caixasOpcoesNovaTorre.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Só entram caixas da <strong>mesma fase</strong> escolhida acima. Ao abrir este formulário, os dados são recarregados do servidor.
                    </p>
                  </div>
                  )}
                  {microOmitCaixaAgua && (
                    <p className="text-xs text-amber-800/90 dark:text-amber-200/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-2">
                      Caixa d&apos;água desativada para este projeto (rega manual). Ative em{" "}
                      <strong>Projetos</strong> → editar projeto → &quot;Caixa d&apos;água nas torres&quot; quando for
                      implementar rega automática.
                    </p>
                  )}
                  <DialogFooter><Button type="submit" disabled={createTorre.isPending}>{createTorre.isPending ? 'Criando...' : 'Criar Torre'}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.torres.map((torre) => (
              <motion.div key={torre.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`p-4 rounded-lg border ${torreEstaAtivaNoDashboard(torre) ? 'bg-card border-border' : 'bg-muted/50 border-muted-foreground/20 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{torre.nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      N.º {typeof torre.numeroTorre === 'number' ? torre.numeroTorre : '—'} · {torre.numAndares || torre.andares || 0} andares
                    </p>
                    {!microOmitCaixaAgua && (() => {
                      const nd = (data.caixasAgua || []).find((c) => c.id === torre.caixaAguaId)?.nome;
                      return nd ? <p className="text-[10px] text-muted-foreground mt-0.5">Caixa: {nd}</p> : null;
                    })()}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${torreEstaAtivaNoDashboard(torre) ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 text-red-700'}`}>{torreEstaAtivaNoDashboard(torre) ? 'Ativa' : 'Inativa'}</div>
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={editingTorre?.id === torre.id}
                    onOpenChange={(open) => {
                      if (open) {
                        const faseForm =
                          isMicroverdes && torre.fase === "maturacao" ? ("vegetativa" as Fase) : torre.fase;
                        const slug = String(torre.caixaAguaId ?? "");
                        setEditingTorre({
                          ...torre,
                          fase: faseForm,
                          caixaAguaSlug: slug,
                          numeroTorre: typeof torre.numeroTorre === 'number' ? torre.numeroTorre : 1,
                          modeloEstrutura: torreEstruturaOverrideIgual(
                            torre.estruturaOverride,
                            ESTRUTURA_OVERRIDE_FV_12x6,
                          )
                            ? 'fv_12x6'
                            : 'padrao',
                        });
                        editTorreSnapshotRef.current = {
                          caixaSlug: slug,
                          fase: faseForm,
                          nome: torre.nome,
                          num: Number(torre.numAndares || torre.andares) || 1,
                        };
                      } else {
                        setEditingTorre(null);
                        editTorreSnapshotRef.current = null;
                      }
                    }}
                  >
                    <DialogTrigger asChild><Button size="sm" variant="outline" className="flex-1 gap-1"><Edit2 className="w-3 h-3" />Editar</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Editar Torre</DialogTitle></DialogHeader>
                      {editingTorre && (
                        <form onSubmit={salvarEdicaoTorre} className="space-y-4">
                          <div><Label>Nome</Label><Input value={editingTorre.nome} onChange={(e) => setEditingTorre({ ...editingTorre, nome: e.target.value })} /></div>
                          <div>
                            <Label>N.º operacional</Label>
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={editingTorre.numeroTorre ?? 1}
                              onChange={(e) =>
                                setEditingTorre({
                                  ...editingTorre,
                                  numeroTorre: Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Fase</Label>
                            <select
                              value={editingTorre.fase}
                              onChange={(e) => {
                                const f = e.target.value as Fase;
                                const opcoes = (data.caixasAgua || []).filter(
                                  (c) => String(c.fase).trim() === f,
                                );
                                const cur = String(editingTorre.caixaAguaSlug ?? "");
                                const stillOk = opcoes.some((c) => c.id === cur);
                                setEditingTorre({
                                  ...editingTorre,
                                  fase: f,
                                  caixaAguaSlug: stillOk ? cur : opcoes[0]?.id || "",
                                });
                              }}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                            >
                              {isMicroverdes
                                ? OPCOES_FASE_TORRE_MICROVERDES.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))
                                : (
                                    <>
                                      <option value="mudas">🌱 Mudas</option>
                                      <option value="vegetativa">🌿 Vegetativa</option>
                                      <option value="maturacao">🌾 Maturação</option>
                                    </>
                                  )}
                            </select>
                          </div>
                          <div>
                            <Label>Número de Andares</Label>
                            <Input
                              type="number"
                              min={1}
                              max={maxAndaresTorre}
                              value={editingTorre.numAndares || editingTorre.andares}
                              onChange={(e) =>
                                setEditingTorre({
                                  ...editingTorre,
                                  numAndares: Math.min(
                                    maxAndaresTorre,
                                    Math.max(1, parseInt(e.target.value, 10) || 1),
                                  ),
                                })
                              }
                            />
                          </div>
                          {!isMicroverdes && editingTorre.fase !== 'mudas' && (
                            <div>
                              <Label>Modelo de grelha</Label>
                              <select
                                value={editingTorre.modeloEstrutura ?? 'padrao'}
                                onChange={(e) =>
                                  setEditingTorre({
                                    ...editingTorre,
                                    modeloEstrutura: e.target.value as 'padrao' | 'fv_12x6',
                                  })
                                }
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                              >
                                <option value="padrao">Padrão FV</option>
                                <option value="fv_12x6">12 perfis × 6 furos</option>
                              </select>
                            </div>
                          )}
                          {!microOmitCaixaAgua && (
                            <div>
                              <Label>Caixa d&apos;água</Label>
                              <select
                                value={editingTorre.caixaAguaSlug ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditingTorre({
                                    ...editingTorre,
                                    caixaAguaSlug: v === "" ? "" : v,
                                  });
                                }}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                              >
                                {caixasOpcoesEdicao.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                              {caixasOpcoesEdicao.length === 0 && (
                                <p className="text-[10px] text-amber-800 dark:text-amber-200/90 mt-1">
                                  Nenhuma caixa d&apos;água cadastrada para esta fase.
                                </p>
                              )}
                            </div>
                          )}
                          <DialogFooter>
                            <Button type="submit" disabled={updateTorre.isPending}>
                              {updateTorre.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => { const dbId = getTorreDbId(torre.id); if (!dbId) return toast.error('Torre inválida'); toggleAtiva.mutate({ id: dbId }); }} disabled={toggleAtiva.isPending}>
                    <Power className="w-3 h-3" />{torreEstaAtivaNoDashboard(torre) ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Dialog open={showDeleteConfirm === torre.id} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
                    <DialogTrigger asChild><Button size="sm" variant="destructive" className="gap-1" onClick={() => setShowDeleteConfirm(torre.id)}><Trash2 className="w-3 h-3" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Deletar Torre?</DialogTitle></DialogHeader>
                      <p className="text-sm text-muted-foreground">Tem certeza que deseja deletar <strong>{torre.nome}</strong>?</p>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => { const dbId = getTorreDbId(torre.id); if (!dbId) return toast.error('Torre inválida'); deleteTorre.mutate({ id: dbId }); }} disabled={deleteTorre.isPending}>{deleteTorre.isPending ? 'Deletando...' : 'Deletar'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Cadastros-base do domínio */}
        <section className="mb-8">
          <VariedadesCadastroTable
            notaTopo={
              isMicroverdes ? (
                <p className="text-[11px] text-sky-900/85 dark:text-sky-100/85 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2">
                  <strong>Torres microverdes:</strong> germinação e iluminação. Duração de cada etapa e colheita ficam na{' '}
                  <strong>receita</strong> (aba Receitas), não nesta tabela de variedades.
                </p>
              ) : undefined
            }
          />
        </section>

        {/* Regras / Preferências / Integrações */}
        <section className="grid gap-3 mb-8">
          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Regras operacionais</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Desperdício máximo (%)</Label>
                <Input type="number" min="0" max="100" value={regraDesperdicioMax} onChange={(e) => setRegraDesperdicioMax(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Capacidade mínima (%)</Label>
                <Input type="number" min="0" max="100" value={regraCapacidadeMin} onChange={(e) => setRegraCapacidadeMin(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Prazo lavagem (dias)</Label>
                <Input type="number" min="0" value={regraPrazoLavagemDias} onChange={(e) => setRegraPrazoLavagemDias(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Freq. medição (h)</Label>
                <Input type="number" min="1" value={regraFreqMedicaoHoras} onChange={(e) => setRegraFreqMedicaoHoras(parseInt(e.target.value) || 1)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="text-xs" onClick={salvarRegras}>Salvar regras</Button>
              <Button size="sm" variant="outline" className="text-xs" type="button" onClick={() => openAgenda()}>
                Abrir agenda do dia
              </Button>
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Preferências do sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Formato de data</Label>
                <select value={prefFormatoData} onChange={(e) => setPrefFormatoData(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="pt-BR">dd/mm/aaaa (pt-BR)</option>
                  <option value="en-US">mm/dd/yyyy (en-US)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Fuso horário</Label>
                <select value={prefFuso} onChange={(e) => setPrefFuso(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/Manaus">America/Manaus</option>
                  <option value="America/Cuiaba">America/Cuiaba</option>
                  <option value="America/Belem">America/Belem</option>
                  <option value="America/Fortaleza">America/Fortaleza</option>
                  <option value="America/Recife">America/Recife</option>
                  <option value="America/Bahia">America/Bahia</option>
                  <option value="America/Rio_Branco">America/Rio_Branco</option>
                  <option value="America/Noronha">America/Noronha</option>
                  <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                  <option value="Europe/Lisbon">Europe/Lisbon</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Ordenação padrão de tarefas</Label>
                <select value={prefOrdenacaoTarefa} onChange={(e) => setPrefOrdenacaoTarefa(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="prioridade">Prioridade</option>
                  <option value="vencimento">Vencimento</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={prefMostrarKpis} onChange={(e) => setPrefMostrarKpis(e.target.checked)} /> Mostrar KPIs no dashboard</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={prefNotificacoes} onChange={(e) => setPrefNotificacoes(e.target.checked)} /> Notificações internas</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={prefTemaEscuro} onChange={(e) => setPrefTemaEscuro(e.target.checked)} /> Tema escuro</label>
            </div>
            <Button size="sm" className="text-xs mt-3" onClick={aplicarPreferencias}>Aplicar preferências</Button>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2"><Bell className="w-4 h-4" /> Integrações e infraestrutura</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={backupJSON}>Backup JSON</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={exportCSV}>Exportar CSV</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.info('Configuração de e-mail/alerta será disponibilizada nesta seção.')}>Configurar e-mail/alertas</Button>
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Módulos do projeto
            </h3>
            <ProjetoModulosCard />
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Governança administrativa</h3>
            <div className="flex flex-wrap gap-2">
              <a href="/administracao"><Button variant="outline" size="sm" className="text-xs">Abrir Administração</Button></a>
              <a href="/usuarios"><Button variant="outline" size="sm" className="text-xs">Usuários e permissões</Button></a>
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
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-600 text-amber-900 dark:text-amber-100"
              onClick={() => {
                setResetClusters({ ...DEFAULT_OPERATIONAL_RESET_CLUSTERS });
                setResetOpDialogOpen(true);
              }}
            >
              Zerar operação (escolher o quê)
            </Button>
            {activeProjeto?.tipo === 'fazenda_vertical' && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={mutations.restoreFvInfrastructureIfEmpty.isPending}
                onClick={() =>
                  mutations.restoreFvInfrastructureIfEmpty.mutate(undefined, {
                    onSuccess: (r) => {
                      if (r.created) toast.success(r.message);
                      else toast.message(r.message);
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {mutations.restoreFvInfrastructureIfEmpty.isPending
                  ? 'A verificar…'
                  : 'Recriar torres/caixas FV (se projeto sem torres)'}
              </Button>
            )}
            <Dialog open={resetOpDialogOpen} onOpenChange={setResetOpDialogOpen}>
              <DialogContent className="!flex max-h-[85vh] min-h-0 flex-col gap-0 overflow-hidden border bg-background p-0 shadow-lg sm:max-w-lg">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Limpar dados operacionais
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-normal pt-1">
                    Marque o que deseja <strong>apagar</strong> neste projeto. Mantém sempre: variedades, receitas de
                    crescimento, ciclos de aplicação, configuração de fases (cores/EC) e usuários.
                  </p>
                </DialogHeader>
                {!resetClusters.torresGrade && !resetClusters.limparCultivoGrade && (
                  <div className="shrink-0 px-6 pb-3">
                    <Alert className="border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-600/50">
                      <AlertTriangle className="text-amber-700 dark:text-amber-400" />
                      <AlertTitle className="text-amber-950 dark:text-amber-100">Plantio no painel não será limpo</AlertTitle>
                      <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
                        Marque <strong>Zerar plantio na grade</strong> (recomendado) ou <strong>Apagar torres…</strong>{' '}
                        para o dashboard ficar vazio de cultivo.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-6">
                  <div className="space-y-4 pb-4 pr-1">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => setResetClusters({ ...DEFAULT_OPERATIONAL_RESET_CLUSTERS })}
                      >
                        Recomendado (plantio + histórico, mantém torres/caixas)
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={applyPresetDesmarcarTudo}>
                        Desmarcar tudo
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Isto marca também APAGAR TORRES e CADASTRO DE CAIXAS. Confirma?',
                            )
                          ) {
                            applyPresetMaxDestructivo();
                          }
                        }}
                      >
                        Marcar tudo (inclui infraestrutura)
                      </Button>
                    </div>

                    <section className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Torres e caixas d&apos;água</p>
                      <label className="flex gap-3 items-start rounded-lg border bg-emerald-500/10 border-emerald-600/30 p-3 cursor-pointer hover:bg-emerald-500/15">
                        <Checkbox
                          checked={resetClusters.limparCultivoGrade}
                          disabled={resetClusters.torresGrade}
                          onCheckedChange={(v) => setResetCluster('limparCultivoGrade', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Zerar plantio na grade (mantém torres e andares)</span>
                          <span className="block text-muted-foreground mt-0.5">
                            Esvazia perfis/furos, aplicações por andar e datas nos andares. É o habitual para &quot;começar
                            ciclo novo&quot; sem perder a estrutura no sistema.
                          </span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={
                            resetClusters.historicoSolucaoCaixa || resetClusters.removerCadastroCaixasAgua
                          }
                          disabled={resetClusters.removerCadastroCaixasAgua}
                          onCheckedChange={(v) => setResetCluster('historicoSolucaoCaixa', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Medições e aplicações na solução</span>
                          <span className="block text-muted-foreground mt-0.5">
                            Apaga histórico de pH/EC e adubações nas caixas; mantém o cadastro das caixas e ligações às
                            torres.
                          </span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border border-destructive/30 bg-destructive/5 p-3 cursor-pointer hover:bg-destructive/10">
                        <Checkbox
                          checked={resetClusters.removerCadastroCaixasAgua}
                          onCheckedChange={(v) => setResetCluster('removerCadastroCaixasAgua', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium text-destructive">Apagar cadastro das caixas d&apos;água</span>
                          <span className="block text-muted-foreground mt-0.5">
                            Remove as caixas no sistema (torres ficam sem caixa até criar/associar outra). Inclui histórico
                            de solução.
                          </span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border border-destructive/30 bg-destructive/5 p-3 cursor-pointer hover:bg-destructive/10">
                        <Checkbox
                          checked={resetClusters.torresGrade}
                          onCheckedChange={(v) => setResetCluster('torresGrade', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium text-destructive">Apagar torres (infraestrutura completa)</span>
                          <span className="block text-muted-foreground mt-0.5">
                            Remove torres, andares, perfis e furos no base de dados. Use só se quiser eliminar mesmo as
                            torres — não serve para só limpar plantio.
                          </span>
                        </span>
                      </label>
                    </section>

                    <Separator />

                    <section className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Cultivo e movimentação</p>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.germinacao}
                          onCheckedChange={(v) => setResetCluster('germinacao', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Germinação (lotes)</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.transplantios}
                          onCheckedChange={(v) => setResetCluster('transplantios', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Histórico de transplântios</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.torresGrade ? true : resetClusters.manutencoes}
                          disabled={resetClusters.torresGrade}
                          onCheckedChange={(v) => {
                            if (!resetClusters.torresGrade) setResetCluster('manutencoes', v === true);
                          }}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Manutenções em torre</span>
                          <span className="block text-muted-foreground mt-0.5">
                            {resetClusters.torresGrade
                              ? 'Incluído ao apagar torres (não pode ser desmarcado separadamente).'
                              : 'Ordens de manutenção sem remover torres.'}
                          </span>
                        </span>
                      </label>
                    </section>

                    <Separator />

                    <section className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Planeamento e colheita</p>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.planosPlantio}
                          onCheckedChange={(v) => setResetCluster('planosPlantio', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Planos de plantio</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.registrosColheita}
                          onCheckedChange={(v) => setResetCluster('registrosColheita', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Registos de colheita</span>
                        </span>
                      </label>
                    </section>

                    <Separator />

                    <section className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Operação e inventário</p>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.tarefas}
                          onCheckedChange={(v) => setResetCluster('tarefas', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Tarefas</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.estoque}
                          onCheckedChange={(v) => setResetCluster('estoque', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Estoque (insumos)</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.custosProducao}
                          onCheckedChange={(v) => setResetCluster('custosProducao', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Custos de produção</span>
                          <span className="block text-muted-foreground mt-0.5">
                            Rubricas por variedade e do projeto (rateio).
                          </span>
                        </span>
                      </label>
                    </section>

                    <Separator />

                    <section className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">Sistemas</p>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.inteligenciaAlertas}
                          onCheckedChange={(v) => setResetCluster('inteligenciaAlertas', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Inteligência e alertas</span>
                          <span className="block text-muted-foreground mt-0.5">Regras, alertas e histórico de eventos.</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.visao}
                          onCheckedChange={(v) => setResetCluster('visao', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Análises de visão computacional</span>
                          <span className="block text-muted-foreground mt-0.5">Imagens e resultados de análise.</span>
                        </span>
                      </label>
                      <label className="flex gap-3 items-start rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={resetClusters.bancadasHidroponia}
                          onCheckedChange={(v) => setResetCluster('bancadasHidroponia', v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">Bancadas hidroponia</span>
                          <span className="block text-muted-foreground mt-0.5">Linhas, caixas de cultivo e registros.</span>
                        </span>
                      </label>
                    </section>
                  </div>
                </div>
                <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 gap-2 flex-row flex-wrap justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setResetOpDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600"
                    disabled={mutations.resetOperationalClusters.isPending}
                    onClick={() => {
                      const payload: OperationalResetClusters = {
                        ...resetClusters,
                        manutencoes: resetClusters.torresGrade ? false : resetClusters.manutencoes,
                      };
                      mutations.resetOperationalClusters.mutate(payload, {
                        onSuccess: (r) => {
                          toast.success(r.message);
                          if (r.plantioNoPainelPodePersistir) {
                            toast.warning(
                              'O plantio visível no painel pode manter-se — marque «Zerar plantio na grade» ou «Apagar torres».',
                              { duration: 9000 },
                            );
                          }
                          setResetOpDialogOpen(false);
                        },
                        onError: (e) => toast.error(e.message),
                      });
                    }}
                  >
                    {mutations.resetOperationalClusters.isPending ? 'A limpar…' : 'Executar limpeza'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
          <p className="text-[11px] text-muted-foreground mt-2 max-w-2xl">
            O botão <strong>Recomendado</strong> no diálogo limpa plantio e histórico sem apagar torres nem caixas. Se apagou
            torres por engano e o projeto FV ficou vazio, use <strong>Recriar torres/caixas FV</strong> (não recupera nomes
            antigos; backup MySQL recupera tudo). O reset total apaga também variedades/receitas.
          </p>
        </div>
      </main>
    </div>
  );
}
