// ============================================================
// TorreDetail v4 — Migrado para tRPC mutations
// ============================================================

import { useParams, Link } from 'wouter';
import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { useProjeto } from '@/contexts/ProjetoContext';
import {
  faseTorreMicroverdesIluminacao,
  labelFaseTorreMicroverdes,
  labelPosicaoProducao,
  nomeTorreExibicaoMicroverdes,
  resumoEstruturaFisicaMicroverdes,
  termoUnidadeProducao,
} from '@/lib/microverdesPhases';
import { FASES_CONFIG, gerarPerfisIniciais, gerarFurosIniciais } from '@/lib/types';
import { estruturaFaseParaProjeto } from '@shared/types';
import type { MedicaoCaixa, AplicacaoCaixa, AplicacaoAndar, FuroStatus, RegistroTransplantio, PerfilData } from '@/lib/types';
import {
  diasDecorridos, diasRestantes, dataPrevista, labelPrevisao,
  cicloPrazoOptsFromFazenda,
  formatarData, formatarDataHora, ecForaRange, phForaRange, ultimaMedicaoPorData,
  gerarId, contarPlantasAndar, contarColhidasAndar, capacidadeAndar,
  andarPrecisaLavagem, variedadePrincipalAndar, andaresDaTorreDeclarados,
  TIPOS_APLICACAO_CAIXA, TIPOS_APLICACAO_ANDAR,
  cultivoBandejaEfetivo,
} from '@/lib/utils-farm';
import type { CultivoBandejaStatus } from '@/lib/utils-farm';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import PerfilFurosGrid from '@/components/PerfilFurosGrid';
import { TransplantioDistribuidoModal } from '@/components/TransplantioDistribuidoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Droplets, AlertTriangle, Clock, Leaf,
  Trash2, Sprout, Scissors, Droplet, CheckCircle2, Wrench, ArrowRightLeft,
  HelpCircle, Undo2, Copy, CheckSquare, Square, Info,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TorreDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useFazenda();
  const { activeProjeto } = useProjeto();
  const isMicroverdes = activeProjeto?.tipo === 'microverdes';
  const projetoTipo = data.projetoTipo ?? activeProjeto?.tipo ?? null;
  const unidOperacao = termoUnidadeProducao(projetoTipo);
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [selectedAndar, setSelectedAndar] = useState<string | null>(null);
  const [tipoCaixa, setTipoCaixa] = useState<string>('');
  const [tipoAndar, setTipoAndar] = useState<string>('');
  const [modoFuros, setModoFuros] = useState<'visualizacao' | 'transplantio' | 'colheita'>('visualizacao');
  const [showTransplantioSmart, setShowTransplantioSmart] = useState(false);
  const [showColheita, setShowColheita] = useState(false);
  const [colheitaPeso, setColheitaPeso] = useState<string>('');
  const [colheitaQualidade, setColheitaQualidade] = useState<string>('A');
  const [colheitaDestino, setColheitaDestino] = useState<string>('');
  const [colheitaObs, setColheitaObs] = useState<string>('');
  const [showMover, setShowMover] = useState(false);
  const [moverTipo, setMoverTipo] = useState<'perfil' | 'andar'>('andar');
  const [moverPerfilIndex, setMoverPerfilIndex] = useState<number>(0);
  const [moverDestinoTorre, setMoverDestinoTorre] = useState<string>('');
  const [moverDestinoAndar, setMoverDestinoAndar] = useState<string>('');
  const [moverDestinoPerfilIndex, setMoverDestinoPerfilIndex] = useState<string>('');

  // ---- Bulk edit (seleção múltipla) ----
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPerfis, setSelectedPerfis] = useState<Set<number>>(new Set());
  const [lastClickedPerfil, setLastClickedPerfil] = useState<number | null>(null);
  const [bulkVariedade, setBulkVariedade] = useState<string>('');
  const [bulkDataEntrada, setBulkDataEntrada] = useState<string>('');
  const [undoPayload, setUndoPayload] = useState<null | {
    andarDbId: number;
    perfis: Array<{ perfilIndex: number; ativo?: boolean; variedadeId?: number | null; dataEntrada?: Date | null }>;
    furos: Array<{ perfilIndex: number; furoIndex: number; status?: string; variedadeId?: number | null }>;
    label: string;
  }>(null);

  // ---- Colheita: query + mutation (must be before early return to respect React hooks rules) ----
  const colheitaAndarDbId = (() => {
    const torreObj = data.torres.find((t) => t.id === id);
    if (!torreObj) return undefined;
    const andaresAll = andaresDaTorreDeclarados(data.andares, torreObj);
    const selAndar = andaresAll.find((a) => a.id === selectedAndar);
    return selAndar ? resolver.andarFrontIdToDbId.get(selAndar.id) : undefined;
  })();
  const { data: registrosColheita, refetch: refetchColheita } = trpc.registrosColheita.listByAndar.useQuery(
    { andarId: colheitaAndarDbId! },
    { enabled: !!colheitaAndarDbId }
  );
  const createColheita = trpc.registrosColheita.create.useMutation({
    onSuccess: () => { refetchColheita(); toast.success('Colheita registrada!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const torre = data.torres.find((t) => t.id === id);

  /** Deep-link desde alertas do dashboard: `/torre/:id?andar=:andarId` */
  useEffect(() => {
    if (!torre || torre.ativa === false) return;
    const andaresList = andaresDaTorreDeclarados(data.andares, torre);
    const params = new URLSearchParams(window.location.search);
    const aid = params.get('andar');
    if (!aid) return;
    if (andaresList.some((a) => a.id === aid)) setSelectedAndar(aid);
  }, [torre?.id, torre?.ativa, id, data.andares]);
  if (!torre) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Torre não encontrada.</p>
          <Link href="/"><Button variant="outline" className="mt-4">Voltar ao Dashboard</Button></Link>
        </div>
      </div>
    );
  }
  if (torre.ativa === false) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Esta torre está desativada e não aceita operações.</p>
          <Link href="/"><Button variant="outline" className="mt-4">Voltar ao Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const fConfig = data.fasesConfig?.[torre.fase] || FASES_CONFIG[torre.fase];
  const faseLabelExibicao = isMicroverdes ? labelFaseTorreMicroverdes(torre.fase) : fConfig.label;
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const andares = andaresDaTorreDeclarados(data.andares, torre).sort((a, b) => b.numero - a.numero);
  const andarSelecionado = andares.find((a) => a.id === selectedAndar);
  const variedadesAtivasNoAndar = new Set(
    (andarSelecionado?.perfis || [])
      .filter((p) => p.ativo && !!p.variedadeId)
      .map((p) => p.variedadeId as string)
  );
  const usandoVariedadeIndividual = variedadesAtivasNoAndar.size > 1;

  const isMudas = torre.fase === 'mudas';
  const isMaturacao = torre.fase === 'maturacao';
  /** Microverdes: colheita nas torres de iluminação (`vegetativa` ou legado `maturacao`). FV: só `maturacao`. */
  const torreComModoColheita = isMicroverdes
    ? faseTorreMicroverdesIluminacao(torre.fase)
    : isMaturacao;

  const badgeClass =
    torre.fase === 'mudas'
      ? 'badge-mudas'
      : torre.fase === 'vegetativa' || (isMicroverdes && torre.fase === 'maturacao')
        ? 'badge-vegetativa'
        : 'badge-maturacao';
  const nomeTorreUi = isMicroverdes ? nomeTorreExibicaoMicroverdes(torre) : torre.nome;

  const ultimaMedicao = caixa?.medicoes?.length ? ultimaMedicaoPorData(caixa.medicoes) : null;

  const torresMesmaCaixa =
    caixa && caixa.torreIds.length > 1
      ? (caixa.torreIds
          .filter((tid) => tid !== torre.id)
          .map((tid) => data.torres.find((t) => t.id === tid))
          .filter(Boolean) as { id: string; nome: string }[])
      : [];

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const totalPlantasTorre = andares.reduce((sum, a) => sum + contarPlantasAndar(a, torre.fase, projetoTipo), 0);
  const totalColhidasTorre = torreComModoColheita
    ? andares.reduce((sum, a) => sum + contarColhidasAndar(a, torre.fase, projetoTipo), 0)
    : 0;

  const manutencoesTorre = data.manutencoes.filter((m) => m.torreId === torre.id && m.status !== 'concluida');

  // ---- Handlers (tRPC mutations) ----

  const handleAddMedicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ec = parseFloat(fd.get('ec') as string);
    const ph = parseFloat(fd.get('ph') as string);
    const dataHora = fd.get('dataHora') as string;
    if (isNaN(ec) || isNaN(ph) || !dataHora) { toast.error('Preencha todos os campos'); return; }

    const caixaDbId = caixa ? resolver.caixaSlugToId.get(caixa.id) : undefined;
    if (!caixaDbId) { toast.error('Caixa d\'água não encontrada'); return; }

    mutations.addMedicaoCaixa.mutate({
      caixaAguaId: caixaDbId,
      ec,
      ph,
      dataHora: new Date(dataHora),
    });
    e.currentTarget.reset();
    toast.success('Medição registrada!');
    if (ecForaRange(ec, torre.fase, data.fasesConfig) !== 'ok') toast.warning(`EC fora do ideal (${fConfig.ecMin}-${fConfig.ecMax})`);
    if (phForaRange(ph, torre.fase, data.fasesConfig) !== 'ok') toast.warning(`pH fora do ideal (${fConfig.phMin}-${fConfig.phMax})`);
  };

  const handleAddAplicacaoCaixa = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const produto = fd.get('produto') as string;
    const quantidade = fd.get('quantidade') as string;
    const dataHora = fd.get('dataHora') as string;
    if (!tipoCaixa || !produto || !dataHora) { toast.error('Preencha todos os campos'); return; }

    const caixaDbId = caixa ? resolver.caixaSlugToId.get(caixa.id) : undefined;
    if (!caixaDbId) { toast.error('Caixa d\'água não encontrada'); return; }

    mutations.addAplicacaoCaixa.mutate({
      caixaAguaId: caixaDbId,
      tipo: tipoCaixa,
      produto,
      quantidade,
      dataHora: new Date(dataHora),
    });
    e.currentTarget.reset();
    setTipoCaixa('');
    toast.success('Aplicação registrada na caixa d\'água!');
  };

  const handleUpdateAndar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!andarSelecionado) return;
    const fd = new FormData(e.currentTarget);
    const dataEntrada = fd.get('dataEntrada') as string;

    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    const dateVal = dataEntrada ? new Date(dataEntrada) : null;

    // Atualizar data do andar (legacy)
    mutations.updateAndar.mutate({
      id: andarDbId,
      dataEntrada: dateVal,
    });

    // Propagar data para todos os perfis ativos que não têm data própria diferente
    mutations.setAllPerfis.mutate({
      andarId: andarDbId,
      dataEntrada: dateVal,
    });

    toast.success(
      isMicroverdes
        ? `Data de entrada do andar ${andarSelecionado.numero} aplicada a todas as ${unidOperacao.plural}.`
        : `Data de entrada do Andar ${andarSelecionado.numero} atualizada para todos os perfis!`,
    );
  };

  // Handler para atualizar data de um perfil individual
  const handleUpdatePerfilData = (perfilIndex: number, dataEntrada: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    mutations.updatePerfil.mutate({
      andarId: andarDbId,
      perfilIndex,
      dataEntrada: dataEntrada ? new Date(dataEntrada) : null,
    });
    toast.success(
      isMicroverdes
        ? `Data da posição ${labelPosicaoProducao(projetoTipo, perfilIndex)} atualizada!`
        : `Data do Perfil ${perfilIndex + 1} atualizada!`,
    );
  };

  // ---- Furos handlers ----

  const handleFuroToggle = (perfilIndex: number, furoIndex: number, variedadeId?: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    const newStatus: FuroStatus = modoFuros === 'transplantio' ? 'plantado' : 'colhido';
    const currentFuro = (andarSelecionado.furos || []).find(
      (f) => f.perfilIndex === perfilIndex && f.furoIndex === furoIndex
    );

    const varDbId = variedadeId ? (resolver.varSlugToId.get(variedadeId) || null) : null;

    if (currentFuro?.status === newStatus) {
      mutations.updateFuro.mutate({
        andarId: andarDbId,
        perfilIndex,
        furoIndex,
        status: 'vazio',
        variedadeId: null,
      });
    } else {
      mutations.updateFuro.mutate({
        andarId: andarDbId,
        perfilIndex,
        furoIndex,
        status: newStatus,
        variedadeId: varDbId || (currentFuro?.variedadeId ? (resolver.varSlugToId.get(currentFuro.variedadeId) || null) : null),
      });
    }
  };

  const handlePerfilToggle = (perfilIndex: number, variedadeId?: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    if (isMudas) {
      const currentPerfil = (andarSelecionado.perfis || []).find((p) => p.perfilIndex === perfilIndex);
      mutations.updatePerfil.mutate({
        andarId: andarDbId,
        perfilIndex,
        ativo: !(currentPerfil?.ativo ?? false),
      });
      return;
    }

    if (isMicroverdes && !isMudas) {
      const currentPerfil = (andarSelecionado.perfis || []).find((p) => p.perfilIndex === perfilIndex);
      const furosPerfil = (andarSelecionado.furos || []).filter((f) => f.perfilIndex === perfilIndex);
      const cur = cultivoBandejaEfetivo(currentPerfil, furosPerfil, 'microverdes', torre.fase);
      const varDbIdFromClick = variedadeId ? (resolver.varSlugToId.get(variedadeId) || null) : null;
      const varDbIdFromPerfil = currentPerfil?.variedadeId
        ? (resolver.varSlugToId.get(currentPerfil.variedadeId) || null)
        : null;

      let next: CultivoBandejaStatus;
      if (modoFuros === 'transplantio') {
        if (cur === 'vazio' || cur === 'colhido') {
          if (!varDbIdFromClick && !varDbIdFromPerfil) {
            toast.error('Selecione uma variedade (bandeja ou campo acima) para plantar.');
            return;
          }
          next = 'plantado';
        } else {
          next = 'vazio';
        }
      } else {
        if (cur === 'plantado') next = 'colhido';
        else if (cur === 'colhido') next = 'vazio';
        else return;
      }

      const vId = next === 'vazio' ? null : (varDbIdFromClick ?? varDbIdFromPerfil);
      const dataPl =
        next === 'vazio'
          ? null
          : next === 'colhido'
            ? currentPerfil?.dataEntrada
              ? new Date(currentPerfil.dataEntrada)
              : null
            : currentPerfil?.dataEntrada
              ? new Date(currentPerfil.dataEntrada)
              : new Date();

      mutations.updatePerfil.mutate({
        andarId: andarDbId,
        perfilIndex,
        cultivoStatus: next,
        ativo: next !== 'vazio',
        variedadeId: vId,
        dataEntrada: dataPl,
      } as any);
      return;
    }

    // Vegetativa/Maturação: batch toggle all furos of this perfil
    const newStatus: FuroStatus = modoFuros === 'transplantio' ? 'plantado' : 'colhido';
    const perfilFuros = (andarSelecionado.furos || []).filter((f) => f.perfilIndex === perfilIndex);
    const allTarget = perfilFuros.every((f) => f.status === newStatus);

    const varDbId = variedadeId ? (resolver.varSlugToId.get(variedadeId) || null) : null;

    const updates = perfilFuros.map((f) => ({
      perfilIndex,
      furoIndex: f.furoIndex,
      status: allTarget ? 'vazio' : newStatus,
      variedadeId: allTarget ? null : (varDbId || (f.variedadeId ? (resolver.varSlugToId.get(f.variedadeId) || null) : null)),
    }));

    mutations.batchUpdateFuros.mutate({ andarId: andarDbId, updates });
  };

  const handlePerfilVariedadeChange = (perfilIndex: number, variedadeId: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    const varDbId = resolver.varSlugToId.get(variedadeId) || null;

    // Update perfil variedade (em mudas, ativar automaticamente ao atribuir variedade)
    if (isMicroverdes && !isMudas) {
      mutations.updatePerfil.mutate({
        andarId: andarDbId,
        perfilIndex,
        variedadeId: varDbId,
        ativo: true,
        cultivoStatus: 'plantado',
        dataEntrada: new Date(),
      } as any);
      toast.success(
        `Variedade na posição ${labelPosicaoProducao(projetoTipo, perfilIndex)} atualizada!`,
      );
      return;
    }

    mutations.updatePerfil.mutate({
      andarId: andarDbId,
      perfilIndex,
      variedadeId: varDbId,
      ...(varDbId ? { ativo: true } : {}),
    });

    // Em vegetativa/maturação: definir variedade individual planta automaticamente todos os furos do perfil.
    const perfilFuros = (andarSelecionado.furos || []).filter((f) => f.perfilIndex === perfilIndex);
    if (perfilFuros.length > 0) {
      mutations.batchUpdateFuros.mutate({
        andarId: andarDbId,
        updates: perfilFuros.map((f) => ({
          perfilIndex,
          furoIndex: f.furoIndex,
          status: 'plantado',
          variedadeId: varDbId,
        })),
      });
    }

    toast.success(
      isMicroverdes
        ? `Variedade na posição ${labelPosicaoProducao(projetoTipo, perfilIndex)} atualizada!`
        : `Variedade do Perfil ${perfilIndex + 1} atualizada!`,
    );
  };

  const handleAndarVariedadeTodos = (variedadeId: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    const varDbId = resolver.varSlugToId.get(variedadeId) || null;

    if (isMicroverdes && !isMudas) {
      mutations.setAllPerfis.mutate({
        andarId: andarDbId,
        variedadeId: varDbId,
        ativo: true,
        cultivoStatus: 'plantado',
        dataEntrada: new Date(),
      } as any);
      const variedade = data.variedades.find((v) => v.id === variedadeId);
      toast.success(`Todas as ${unidOperacao.plural} com ${variedade?.nome || variedadeId} (em cultivo).`);
      return;
    }

    // Batch: set all perfis variedade (em mudas, ativar automaticamente ao atribuir variedade)
    mutations.setAllPerfis.mutate({ andarId: andarDbId, variedadeId: varDbId, ...(isMudas && varDbId ? { ativo: true } : {}) });

    // Batch: set all non-vazio furos variedade
    const nonVazioFuros = (andarSelecionado.furos || []).filter((f) => f.status !== 'vazio');
    if (nonVazioFuros.length > 0) {
      mutations.batchUpdateFuros.mutate({
        andarId: andarDbId,
        updates: nonVazioFuros.map((f) => ({
          perfilIndex: f.perfilIndex,
          furoIndex: f.furoIndex,
          variedadeId: varDbId,
        })),
      });
    }

    const variedade = data.variedades.find((v) => v.id === variedadeId);
    toast.success(
      isMicroverdes
        ? `Todas as ${unidOperacao.plural} definidas como ${variedade?.nome || variedadeId}!`
        : `Todos os perfis definidos como ${variedade?.nome || variedadeId}!`,
    );
  };

  const handleAndarTodo = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    if (isMudas) {
      const perfis = andarSelecionado.perfis || gerarPerfisIniciais(torre.fase, projetoTipo);
      const allAtivo = perfis.every((p) => p.ativo);
      // Batch: set all perfis ativo/inativo in one request
      mutations.setAllPerfis.mutate({ andarId: andarDbId, ativo: !allAtivo });
      return;
    }

    if (isMicroverdes && !isMudas) {
      const perfisL = andarSelecionado.perfis || gerarPerfisIniciais(torre.fase, projetoTipo);
      const furosA = andarSelecionado.furos || [];
      if (modoFuros === 'transplantio') {
        const allPlantado = perfisL.every(
          (p) => cultivoBandejaEfetivo(p, furosA.filter((f) => f.perfilIndex === p.perfilIndex), 'microverdes', torre.fase) === 'plantado',
        );
        if (allPlantado) {
          mutations.batchUpdatePerfis.mutate({
            andarId: andarDbId,
            updates: perfisL.map((p) => ({
              perfilIndex: p.perfilIndex,
              cultivoStatus: 'vazio',
              ativo: false,
              variedadeId: null,
              dataEntrada: null,
            })),
          } as any);
        } else {
          const semVar = perfisL.filter((p) => !p.variedadeId);
          if (semVar.length > 0) {
            toast.error('Defina variedade em todas as bandejas para plantar o andar todo.');
            return;
          }
          mutations.batchUpdatePerfis.mutate({
            andarId: andarDbId,
            updates: perfisL.map((p) => {
              const vid = p.variedadeId ? (resolver.varSlugToId.get(p.variedadeId) || null) : null;
              return {
                perfilIndex: p.perfilIndex,
                cultivoStatus: 'plantado' as const,
                ativo: true,
                variedadeId: vid,
                dataEntrada: new Date(),
              };
            }),
          } as any);
        }
      } else {
        const allColhido = perfisL.every(
          (p) => cultivoBandejaEfetivo(p, furosA.filter((f) => f.perfilIndex === p.perfilIndex), 'microverdes', torre.fase) === 'colhido',
        );
        if (allColhido) {
          mutations.batchUpdatePerfis.mutate({
            andarId: andarDbId,
            updates: perfisL.map((p) => ({
              perfilIndex: p.perfilIndex,
              cultivoStatus: 'vazio',
              ativo: false,
              variedadeId: null,
              dataEntrada: null,
            })),
          } as any);
        } else {
          const emCultivo = perfisL.filter(
            (p) => cultivoBandejaEfetivo(p, furosA.filter((f) => f.perfilIndex === p.perfilIndex), 'microverdes', torre.fase) === 'plantado',
          );
          if (emCultivo.length === 0) {
            toast.error('Não há bandejas em cultivo para colher.');
            return;
          }
          mutations.batchUpdatePerfis.mutate({
            andarId: andarDbId,
            updates: emCultivo.map((p) => {
              const vid = p.variedadeId ? (resolver.varSlugToId.get(p.variedadeId) || null) : null;
              return {
                perfilIndex: p.perfilIndex,
                cultivoStatus: 'colhido' as const,
                ativo: true,
                variedadeId: vid,
              };
            }),
          } as any);
          mutations.updateAndar.mutate({
            id: andarDbId,
            dataColheitaTotal: new Date(),
            lavado: false,
          });
        }
      }
      toast.success(modoFuros === 'transplantio' ? 'Andar todo plantado!' : 'Andar todo colhido!');
      return;
    }

    // Vegetativa/Maturação — batch all furos in one request
    const newStatus: FuroStatus = modoFuros === 'transplantio' ? 'plantado' : 'colhido';
    const allFuros = andarSelecionado.furos || [];
    const allTarget = allFuros.every((f) => f.status === newStatus);

    if (allTarget) {
      // Reset all to vazio
      mutations.setAllFuros.mutate({ andarId: andarDbId, status: 'vazio', variedadeId: null });
    } else {
      // Set all to target status, preserving variedade from perfil
      const updates = allFuros.map((f) => {
        const perfil = (andarSelecionado.perfis || []).find((p) => p.perfilIndex === f.perfilIndex);
        const varDbId = perfil?.variedadeId ? (resolver.varSlugToId.get(perfil.variedadeId) || null) : (f.variedadeId ? (resolver.varSlugToId.get(f.variedadeId) || null) : null);
        return {
          perfilIndex: f.perfilIndex,
          furoIndex: f.furoIndex,
          status: newStatus,
          variedadeId: varDbId,
        };
      });
      mutations.batchUpdateFuros.mutate({ andarId: andarDbId, updates });
    }

    // If colheita total
    if (!allTarget && modoFuros === 'colheita') {
      mutations.updateAndar.mutate({
        id: andarDbId,
        dataColheitaTotal: new Date(),
        lavado: false,
      });
    }

    toast.success(modoFuros === 'transplantio' ? 'Andar todo plantado!' : 'Andar todo colhido!');
  };

  // ============================================================
  // Bulk actions helpers (seleção múltipla)
  // ============================================================

  const getSelectedIndices = (): number[] => Array.from(selectedPerfis).sort((a, b) => a - b);

  const handleSelectPerfil = (perfilIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPerfis((prev) => {
      const next = new Set(prev);
      const isShift = (e as any).shiftKey && lastClickedPerfil !== null;
      const isToggle = (e as any).metaKey || (e as any).ctrlKey;
      if (isShift && lastClickedPerfil !== null) {
        const a = Math.min(lastClickedPerfil, perfilIndex);
        const b = Math.max(lastClickedPerfil, perfilIndex);
        for (let i = a; i <= b; i++) next.add(i);
      } else if (isToggle) {
        if (next.has(perfilIndex)) next.delete(perfilIndex);
        else next.add(perfilIndex);
      } else {
        next.clear();
        next.add(perfilIndex);
      }
      return next;
    });
    setLastClickedPerfil(perfilIndex);
  };

  const snapshotUndoForPerfis = (andarFront: any, indices: number[], label: string) => {
    const andarDbId = resolver.andarFrontIdToDbId.get(andarFront.id);
    if (!andarDbId) return;
    const prevPerfis = (andarFront.perfis || [])
      .filter((p: any) => indices.includes(p.perfilIndex))
      .map((p: any) => ({
        perfilIndex: p.perfilIndex,
        ativo: p.ativo,
        variedadeId: p.variedadeId ? (resolver.varSlugToId.get(p.variedadeId) ?? null) : null,
        dataEntrada: p.dataEntrada ? new Date(p.dataEntrada) : null,
        cultivoStatus: p.cultivoStatus ?? null,
      }));
    const prevFuros = (andarFront.furos || [])
      .filter((f: any) => indices.includes(f.perfilIndex))
      .map((f: any) => ({
        perfilIndex: f.perfilIndex,
        furoIndex: f.furoIndex,
        status: f.status,
        variedadeId: f.variedadeId ? (resolver.varSlugToId.get(f.variedadeId) ?? null) : null,
      }));
    setUndoPayload({ andarDbId, perfis: prevPerfis, furos: prevFuros, label });
  };

  const handleUndo = async () => {
    if (!undoPayload) return;
    await mutations.batchUpdatePerfis.mutateAsync({ andarId: undoPayload.andarDbId, updates: undoPayload.perfis as any });
    if (undoPayload.furos.length > 0) {
      await mutations.batchUpdateFuros.mutateAsync({ andarId: undoPayload.andarDbId, updates: undoPayload.furos as any });
    }
    toast.success(`Desfeito: ${undoPayload.label}`);
    setUndoPayload(null);
  };

  const validarBulkAntes = (opts: { vaiAtivar?: boolean; variedadeIdDb?: number | null; dataEntrada?: Date | null }) => {
    if (!andarSelecionado) return { ok: false as const, reason: 'Selecione um andar' };

    if (andarPrecisaLavagem(andarSelecionado) && (opts.vaiAtivar || opts.variedadeIdDb)) {
      const ok = window.confirm(
        isMicroverdes
          ? 'Este andar está com lavagem pendente. Deseja preencher/ativar bandejas mesmo assim?'
          : 'Este andar está com lavagem pendente. Tem certeza que deseja preencher/ativar perfis mesmo assim?',
      );
      if (!ok) return { ok: false as const, reason: 'Lavagem pendente' };
    }

    if (opts.vaiAtivar && !opts.variedadeIdDb) {
      return {
        ok: false as const,
        reason: isMicroverdes ? 'Não é possível ativar bandejas sem variedade.' : 'Não é possível ativar perfis sem variedade.',
      };
    }

    const andarHasDate = !!andarSelecionado.dataEntrada;
    if (opts.vaiAtivar && !opts.dataEntrada && !andarHasDate) {
      const ok = window.confirm(
        isMicroverdes
          ? 'Você está ativando bandejas sem data de entrada. Isso pode bagunçar previsões/alertas. Continuar mesmo assim?'
          : 'Você está ativando perfis sem data de entrada. Isso pode bagunçar previsões/alertas. Continuar mesmo assim?',
      );
      if (!ok) return { ok: false as const, reason: 'Sem data' };
    }

    if (opts.dataEntrada) {
      const d = new Date(opts.dataEntrada);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() > hoje.getTime()) return { ok: false as const, reason: 'Data de entrada no futuro.' };
    }

    return { ok: true as const };
  };

  const applyBulkToSelection = async (
    patch: { ativo?: boolean; variedadeId?: number | null; dataEntrada?: Date | null },
    label: string
  ) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;
    const indices = getSelectedIndices();
    if (indices.length === 0) {
      toast.error(isMicroverdes ? 'Selecione bandejas primeiro' : 'Selecione perfis primeiro');
      return;
    }

    const valid = validarBulkAntes({
      vaiAtivar: patch.ativo === true,
      variedadeIdDb: patch.variedadeId ?? null,
      dataEntrada: patch.dataEntrada ?? null,
    });
    if (!valid.ok) { toast.error(valid.reason); return; }

    snapshotUndoForPerfis(andarSelecionado, indices, label);
    await mutations.batchUpdatePerfis.mutateAsync({
      andarId: andarDbId,
      updates: indices.map((perfilIndex) => ({ perfilIndex, ...patch })),
    } as any);
    toast.success(label);
  };

  const clearSelectedPerfis = async () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;
    const indices = getSelectedIndices();
    if (indices.length === 0) {
      toast.error(isMicroverdes ? 'Selecione bandejas primeiro' : 'Selecione perfis primeiro');
      return;
    }

    snapshotUndoForPerfis(andarSelecionado, indices, isMicroverdes ? 'Esvaziar bandejas' : 'Esvaziar perfis');
    await mutations.batchUpdatePerfis.mutateAsync({
      andarId: andarDbId,
      updates: indices.map((perfilIndex) =>
        isMicroverdes && !isMudas
          ? { perfilIndex, ativo: false, variedadeId: null, dataEntrada: null, cultivoStatus: 'vazio' as const }
          : { perfilIndex, ativo: false, variedadeId: null, dataEntrada: null },
      ),
    } as any);

    if ((andarSelecionado.furos || []).length > 0) {
      const updates: any[] = [];
      for (const f of andarSelecionado.furos || []) {
        if (!indices.includes(f.perfilIndex)) continue;
        updates.push({ perfilIndex: f.perfilIndex, furoIndex: f.furoIndex, status: 'vazio', variedadeId: null });
      }
      if (updates.length > 0) await mutations.batchUpdateFuros.mutateAsync({ andarId: andarDbId, updates } as any);
    }
    toast.success(isMicroverdes ? 'Bandejas esvaziadas' : 'Perfis esvaziados');
  };

  const copyFromAndar = async (sourceFrontAndarId: string) => {
    if (!andarSelecionado) return;
    const src = data.andares.find((a) => a.id === sourceFrontAndarId);
    if (!src) return;
    const destDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!destDbId) return;

    const ok = window.confirm(
      isMicroverdes
        ? `Copiar bandejas (e lotes) do andar ${src.numero} para o andar ${andarSelecionado.numero}? Isso sobrescreve o andar atual.`
        : `Copiar perfis/furos do Andar ${src.numero} para o Andar ${andarSelecionado.numero}? Isso sobrescreve o andar atual.`,
    );
    if (!ok) return;

    const estrutura = estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null);
    const indices = Array.from({ length: estrutura.perfis }, (_, i) => i);
    snapshotUndoForPerfis(andarSelecionado, indices, `Copiar do andar ${src.numero}`);

    const perfisUpdates = (src.perfis || []).map((p: any) => ({
      perfilIndex: p.perfilIndex,
      ativo: p.ativo,
      variedadeId: p.variedadeId ? (resolver.varSlugToId.get(p.variedadeId) ?? null) : null,
      dataEntrada: p.dataEntrada ? new Date(p.dataEntrada) : null,
      ...(isMicroverdes && !isMudas && p.cultivoStatus
        ? { cultivoStatus: p.cultivoStatus as 'vazio' | 'plantado' | 'colhido' }
        : {}),
    }));
    await mutations.batchUpdatePerfis.mutateAsync({ andarId: destDbId, updates: perfisUpdates } as any);

    const furosUpdates = (src.furos || []).map((f: any) => ({
      perfilIndex: f.perfilIndex,
      furoIndex: f.furoIndex,
      status: f.status,
      variedadeId: f.variedadeId ? (resolver.varSlugToId.get(f.variedadeId) ?? null) : null,
    }));
    if (furosUpdates.length > 0) {
      await mutations.batchUpdateFuros.mutateAsync({ andarId: destDbId, updates: furosUpdates } as any);
    }

    toast.success(`Copiado do andar ${src.numero}`);
  };

  const handleMarcarLavado = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    mutations.updateAndar.mutate({ id: andarDbId, lavado: true });
    toast.success(isMicroverdes ? 'Bandejas marcadas como lavadas!' : 'Perfis marcados como lavados!');
  };

  const handleAddAplicacaoAndar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!andarSelecionado) return;
    const fd = new FormData(e.currentTarget);
    const produto = fd.get('produto') as string;
    const quantidade = fd.get('quantidade') as string;
    const dataHora = fd.get('dataHora') as string;
    if (!tipoAndar || !produto || !dataHora) { toast.error('Preencha todos os campos'); return; }

    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    mutations.addAplicacaoAndar.mutate({
      andarId: andarDbId,
      tipo: tipoAndar,
      produto,
      quantidade,
      dataHora: new Date(dataHora),
    });
    e.currentTarget.reset();
    setTipoAndar('');
    toast.success('Aplicação registrada no andar!');
  };

  const handleClearAndar = () => {
    if (!andarSelecionado) return;
    if (!window.confirm('Limpar dados deste andar? (variedades, data de entrada, furos/perfis e aplicações)')) return;

    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    mutations.clearAndar.mutate({ id: andarDbId });
    toast.success('Andar limpo!');
  };

  const handleDeleteMedicao = (medicaoId: string) => {
    const dbId = resolver.medicaoFrontIdToDbId.get(medicaoId);
    if (!dbId) return;
    mutations.deleteMedicaoCaixa.mutate({ id: dbId });
    toast.success('Medição removida!');
  };

  const handleDeleteAplicacaoCaixa = (aplicacaoId: string) => {
    const dbId = resolver.aplicacaoCaixaFrontIdToDbId.get(aplicacaoId);
    if (!dbId) return;
    mutations.deleteAplicacaoCaixa.mutate({ id: dbId });
    toast.success('Aplicação removida!');
  };

  const handleDeleteAplicacaoAndar = (aplicacaoId: string) => {
    if (!andarSelecionado) return;
    const dbId = resolver.aplicacaoAndarFrontIdToDbId.get(aplicacaoId);
    if (!dbId) return;
    mutations.deleteAplicacaoAndar.mutate({ id: dbId });
    toast.success('Aplicação removida!');
  };

  const handleRegistrarColheita = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    const torreDbId = resolver.torreSlugToId.get(torre.id);
    if (!andarDbId || !torreDbId) { toast.error('Erro ao resolver IDs'); return; }
    const colhidas = contarColhidasAndar(andarSelecionado, torre.fase, projetoTipo);
    if (colhidas === 0) { toast.error('Nenhuma planta marcada como colhida neste andar'); return; }
    const varId = variedadePrincipalAndar(andarSelecionado);
    const varDbId = varId ? (resolver.varSlugToId.get(varId) || null) : null;
    const varNome = varId ? (data.variedades.find(v => v.id === varId)?.nome || null) : null;
    createColheita.mutate({
      torreId: torreDbId,
      andarId: andarDbId,
      variedadeId: varDbId,
      variedadeNome: varNome,
      dataColheita: new Date(),
      quantidadePlantas: colhidas,
      pesoTotalGramas: colheitaPeso ? Number(colheitaPeso) : null,
      qualidade: colheitaQualidade || undefined,
      destino: colheitaDestino || null,
      observacoes: colheitaObs || null,
    }, {
      onSuccess: () => {
        setShowColheita(false);
        setColheitaPeso('');
        setColheitaQualidade('A');
        setColheitaDestino('');
        setColheitaObs('');
      },
    });
  };

  // Modos disponíveis conforme a fase
  const modosDisponiveis = isMudas
    ? ['visualizacao', 'transplantio'] as const
    : torreComModoColheita
    ? ['visualizacao', 'transplantio', 'colheita'] as const
    : ['visualizacao', 'transplantio'] as const;

  const modoLabels: Record<string, string> = {
    visualizacao: 'Visualizar',
    transplantio: 'Plantar',
    colheita: 'Colher',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
                      <Link href="/"><Button variant="ghost" className="gap-1.5 text-muted-foreground h-10 text-sm"><ArrowLeft className="w-4 h-4" />Dashboard</Button></Link>
          <span className="text-muted-foreground">/</span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{nomeTorreUi}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tower + Andares */}
          <div className="lg:col-span-1 space-y-4">
            {/* Torre info */}
            <div className="bg-card rounded-xl shadow-sm border p-4">
              <h2 className="font-display font-bold text-lg">{nomeTorreUi}</h2>
              <p className="text-xs text-muted-foreground mb-3">
                N.º {typeof torre.numeroTorre === 'number' ? torre.numeroTorre : '—'} &middot; {torre.andares} andares &middot; {faseLabelExibicao}
                {isMicroverdes
                  ? ` · ${resumoEstruturaFisicaMicroverdes(torre.fase)}`
                  : isMudas
                    ? ` · ${estruturaFaseParaProjeto(projetoTipo, 'mudas').perfis} perfis abertos`
                    : isMicroverdes && !isMudas
                      ? ` · ${estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null).perfis} bandejas (iluminação)`
                      : ` · ${estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null).perfis}×${estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null).furosPorPerfil} furos`}
              </p>
              <div className={`grid ${torreComModoColheita ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-center`}>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <p className="font-display font-bold text-lg text-emerald-700 dark:text-emerald-300">{totalPlantasTorre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isMudas ? (isMicroverdes ? 'Bandejas ativas' : 'Perfis ativos') : 'Plantas ativas'}
                  </p>
                </div>
                {torreComModoColheita && (
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <p className="font-display font-bold text-lg text-amber-700">{totalColhidasTorre}</p>
                    <p className="text-[10px] text-muted-foreground">Colhidas</p>
                  </div>
                )}
              </div>
              {manutencoesTorre.length > 0 && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700 font-semibold">{manutencoesTorre.length} manutenção(ões) pendente(s)</span>
                </div>
              )}
            </div>

            {/* Andares list */}
            <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="p-3 border-b">
                <h3 className="font-display font-semibold text-sm">Andares</h3>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {andares.map((andar) => {
                  const plantadas = contarPlantasAndar(andar, torre.fase, projetoTipo);
                  const precisaLavar = andarPrecisaLavagem(andar);
                  const isSelected = andar.id === selectedAndar;
                  const maxSlots = capacidadeAndar(torre.fase, projetoTipo, torre.estruturaOverride ?? null);

                  const perfisAtivos = (andar.perfis || []).filter((p) => p.ativo && p.variedadeId);
                  const varNomesSet = new Set<string>();
                  perfisAtivos.forEach((p) => {
                    const v = data.variedades.find((vr) => vr.id === p.variedadeId);
                    if (v?.nome) varNomesSet.add(v.nome);
                  });
                  const varNomes = Array.from(varNomesSet);

                  // Calcular status por perfil
                  const perfisAtivosAll = (andar.perfis || []).filter((p) => p.ativo);
                  let perfisProntos = 0;
                  let perfisQuase = 0;
                  let perfisComData = 0;
                  perfisAtivosAll.forEach((p) => {
                    const dateStr = p.dataEntrada || andar.dataEntrada;
                    if (!dateStr) return;
                    perfisComData++;
                    const r = diasRestantes(
                      dateStr,
                      torre.fase,
                      p.variedadeId || undefined,
                      data.variedades,
                      cicloPrazoOptsFromFazenda(data),
                    );
                    if (r !== null && r <= 0) perfisProntos++;
                    else if (r !== null && r <= 3) perfisQuase++;
                  });

                  // Dot color baseado no status por perfil
                  let dotColor = 'bg-gray-300';
                  if (precisaLavar) dotColor = 'bg-red-500 animate-pulse';
                  else if (perfisProntos > 0 && perfisProntos === perfisAtivosAll.length) dotColor = 'bg-red-500';
                  else if (perfisProntos > 0) dotColor = 'bg-orange-500'; // parcial
                  else if (perfisQuase > 0) dotColor = 'bg-amber-500';
                  else if (perfisComData > 0) dotColor = 'bg-emerald-500';

                  return (
                      <button
                      key={andar.id}
                      type="button"
                      onClick={() => setSelectedAndar(andar.id === selectedAndar ? null : andar.id)}
                      className={`w-full text-left px-3 py-3 sm:py-2.5 border-b last:border-b-0 transition-all text-xs min-h-[44px] ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="font-semibold">A{andar.numero}</span>
                          {perfisProntos > 0 && perfisAtivosAll.length > 0 && (
                            <span className="text-[10px] text-red-600 font-semibold">
                              {perfisProntos}/{perfisAtivosAll.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {plantadas > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{plantadas}/{maxSlots}</span>
                          )}
                          {precisaLavar && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-semibold">LAVAR</span>
                          )}
                          {varNomes.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                              {varNomes.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Detail panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* Caixa d'água */}
            {caixa && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="font-display font-bold text-sm">{caixa.nome}</h3>
                      <p className="text-[10px] text-muted-foreground">EC ideal: {fConfig.ecMin}-{fConfig.ecMax} | pH ideal: {fConfig.phMin}-{fConfig.phMax}</p>
                    </div>
                  </div>
                  {ultimaMedicao && (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${ecForaRange(ultimaMedicao.ec, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          EC {ultimaMedicao.ec}
                        </span>
                        <span className={`text-sm font-bold ${phForaRange(ultimaMedicao.ph, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          pH {ultimaMedicao.ph}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatarDataHora(ultimaMedicao.dataHora)}</p>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {torresMesmaCaixa.length > 0 && (
                    <Alert className="mb-3 border-blue-200 bg-blue-50/80 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-50">
                      <Info className="text-blue-600 dark:text-blue-300" />
                      <AlertTitle>Caixa compartilhada</AlertTitle>
                      <AlertDescription className="text-blue-900/90 dark:text-blue-100/90">
                        <p>
                          Esta caixa abastece também{' '}
                          {torresMesmaCaixa.map((t, i) => (
                            <span key={t.id}>
                              {i > 0 && (i < torresMesmaCaixa.length - 1 ? ', ' : ' e ')}
                              <Link href={`/torre/${t.id}`} className="font-semibold underline underline-offset-2 hover:no-underline">
                                {t.nome}
                              </Link>
                            </span>
                          ))}
                          . Uma medição ou aplicação aqui vale para todas — não é necessário repetir em cada torre.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Tabs defaultValue="medir">
                    <TabsList className="w-full mb-3">
                      <TabsTrigger value="medir" className="flex-1 text-xs">Medição</TabsTrigger>
                      <TabsTrigger value="aplicar" className="flex-1 text-xs">Aplicação</TabsTrigger>
                      <TabsTrigger value="historico" className="flex-1 text-xs">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="medir">
                      <form onSubmit={handleAddMedicao} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">EC</Label><Input name="ec" type="number" step="0.01" placeholder="Ex: 1.1" className="h-9 text-sm" required /></div>
                          <div><Label className="text-xs">pH</Label><Input name="ph" type="number" step="0.01" placeholder="Ex: 5.9" className="h-9 text-sm" required /></div>
                        </div>
                        <div><Label className="text-xs">Data/Hora</Label><Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required /></div>
                        <Button type="submit" size="sm" className="w-full">Registrar Medição</Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="aplicar">
                      <form onSubmit={handleAddAplicacaoCaixa} className="space-y-3">
                        <div><Label className="text-xs">Tipo</Label>
                          <Select value={tipoCaixa} onValueChange={setTipoCaixa}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{TIPOS_APLICACAO_CAIXA.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select>
                        </div>
                        <div><Label className="text-xs">Produto</Label><Input name="produto" placeholder="Ex: Ácido fosfórico" className="h-9 text-sm" required /></div>
                        <div><Label className="text-xs">Quantidade</Label><Input name="quantidade" placeholder="Ex: 5ml" className="h-9 text-sm" /></div>
                        <div><Label className="text-xs">Data/Hora</Label><Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required /></div>
                        <Button type="submit" size="sm" className="w-full">Registrar Aplicação</Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="historico">
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {caixa.medicoes.length === 0 && caixa.aplicacoes.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro ainda.</p>
                        )}
                        {[...caixa.medicoes.map((m) => ({ ...m, _type: 'medicao' as const })),
                          ...caixa.aplicacoes.map((a) => ({ ...a, _type: 'aplicacao' as const }))]
                          .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                          .slice(0, 20)
                          .map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                              {item._type === 'medicao' ? (
                                <div>
                                  <p className="font-medium">
                                    EC <span className={ecForaRange((item as MedicaoCaixa).ec, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}>{(item as MedicaoCaixa).ec}</span>
                                    {' · '}
                                    pH <span className={phForaRange((item as MedicaoCaixa).ph, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}>{(item as MedicaoCaixa).ph}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">Medição · {formatarDataHora(item.dataHora)}</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium">{(item as AplicacaoCaixa).produto} ({(item as AplicacaoCaixa).quantidade})</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {TIPOS_APLICACAO_CAIXA.find((t) => t.value === (item as AplicacaoCaixa).tipo)?.label} · {formatarDataHora(item.dataHora)}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={() => item._type === 'medicao' ? handleDeleteMedicao(item.id) : handleDeleteAplicacaoCaixa(item.id)}
                                className="text-muted-foreground hover:text-destructive p-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Andar selecionado — Painel UNIFICADO */}
            {andarSelecionado && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="font-display font-bold text-sm">Andar {andarSelecionado.numero}</h3>
                    </div>
                    {andarSelecionado.dataEntrada && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {diasDecorridos(andarSelecionado.dataEntrada, cicloPrazoOptsFromFazenda(data))}d decorridos
                        {(() => {
                          const varId = variedadePrincipalAndar(andarSelecionado);
                          const prev = dataPrevista(
                            andarSelecionado.dataEntrada,
                            torre.fase,
                            varId,
                            data.variedades,
                            cicloPrazoOptsFromFazenda(data),
                          );
                          return prev ? ` · ${labelPrevisao(torre.fase, projetoTipo)}: ${formatarData(prev)}` : '';
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                  {torre.fase !== 'maturacao' && (
                    <Button
                      className="text-xs gap-1.5 h-9 px-3 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setShowTransplantioSmart(true)}
                    >
                      <Sprout className="w-4 h-4" /> Transplantar
                    </Button>
                  )}
                    <Button variant="outline" className="text-xs gap-1.5 h-9 px-3" onClick={() => { setShowMover(true); setMoverTipo('andar'); setMoverDestinoTorre(''); setMoverDestinoAndar(''); setMoverDestinoPerfilIndex(''); }}>
                      <ArrowRightLeft className="w-4 h-4" /> Mover
                    </Button>
                    <Button variant="ghost" className="text-xs text-destructive h-9 px-3" onClick={handleClearAndar}>
                      <Trash2 className="w-4 h-4 mr-1" /> Limpar
                    </Button>
                  </div>
                </div>

                {/* Alerta lavagem */}
                {andarPrecisaLavagem(andarSelecionado) && (
                  <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-red-600 animate-pulse" />
                      <div>
                        <p className="text-xs font-semibold text-red-700">
                          {isMicroverdes ? 'Lavagem de bandejas pendente!' : 'Lavagem de Perfis Pendente!'}
                        </p>
                        <p className="text-[10px] text-red-600">Colheita total em {formatarData(andarSelecionado.dataColheitaTotal || null)}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="text-sm gap-1.5 h-9 px-3 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50" onClick={handleMarcarLavado}>
                      <CheckCircle2 className="w-3 h-3" /> Marcar Lavado
                    </Button>
                  </div>
                )}

                {/* Banner de alerta: perfis prontos para ação */}
                {(() => {
                  const perfisAtivos = (andarSelecionado.perfis || []).filter((p) => p.ativo);
                  const prontos = perfisAtivos.filter((p) => {
                    const dateStr = p.dataEntrada || andarSelecionado.dataEntrada;
                    if (!dateStr) return false;
                    const rest = diasRestantes(
                      dateStr,
                      torre.fase,
                      p.variedadeId || undefined,
                      data.variedades,
                      cicloPrazoOptsFromFazenda(data),
                    );
                    return rest !== null && rest <= 0;
                  });
                  if (prontos.length === 0) return null;
                  const acao =
                    isMicroverdes && torre.fase !== 'mudas' ? 'colheita' : torre.fase === 'maturacao' ? 'colheita' : 'transplantar';
                  const nomes = prontos.map((p) => labelPosicaoProducao(projetoTipo, p.perfilIndex)).join(', ');
                  return (
                    <div className="mx-4 mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-700">
                            {isMicroverdes
                              ? `${prontos.length} bandeja(s) pronta(s) para ${acao}!`
                              : `${prontos.length} perfil(is) pronto(s) para ${acao}!`}
                          </p>
                          <p className="text-xs text-red-600 mt-0.5">
                            {isMicroverdes ? 'Posições: ' : 'Perfis: '}{nomes}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4">
                  {/* Data de entrada (aplica a todos os perfis) */}
                  <form onSubmit={handleUpdateAndar} className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">
                          {isMicroverdes ? 'Data de entrada (todas as bandejas)' : 'Data de Entrada (todos os perfis)'}
                        </Label>
                        <Input
                          name="dataEntrada"
                          type="date"
                          defaultValue={andarSelecionado.dataEntrada ? new Date(andarSelecionado.dataEntrada).toISOString().split('T')[0] : ''}
                          className="h-10 text-sm"
                          key={`${andarSelecionado.id}-date-${andarSelecionado.dataEntrada || 'empty'}`}
                          disabled={usandoVariedadeIndividual}
                        />
                      </div>
                      <Button type="submit" className="h-10 text-sm px-4" disabled={usandoVariedadeIndividual}>Salvar Data</Button>
                    </div>
                    {usandoVariedadeIndividual && (
                      <p className="text-xs text-amber-700 mt-2">
                        {isMicroverdes
                          ? 'Data “para todos” desabilitada: há variedade por bandeja. Defina a data em cada posição (B1…B4).'
                          : 'Data para todos desabilitada: este andar está com variedade individual por perfil. Defina a data em cada perfil.'}
                      </p>
                    )}

                    {/* Resumo por perfil: mostra status de cada perfil com data */}
                    {(() => {
                      const perfisAtivos = (andarSelecionado.perfis || []).filter((p) => p.ativo);
                      if (perfisAtivos.length === 0) return null;

                      // Calcular status por perfil
                      const perfilStatuses = perfisAtivos.map((p) => {
                        const dateStr = p.dataEntrada || andarSelecionado.dataEntrada;
                        if (!dateStr) return { perfilIndex: p.perfilIndex, rest: null, varId: p.variedadeId, dateStr: null };
                        const rest = diasRestantes(
                          dateStr,
                          torre.fase,
                          p.variedadeId || undefined,
                          data.variedades,
                          cicloPrazoOptsFromFazenda(data),
                        );
                        return { perfilIndex: p.perfilIndex, rest, varId: p.variedadeId, dateStr };
                      });

                      const prontos = perfilStatuses.filter((s) => s.rest !== null && s.rest <= 0).length;
                      const quaseProntos = perfilStatuses.filter((s) => s.rest !== null && s.rest > 0 && s.rest <= 3).length;
                      const emProcesso = perfilStatuses.filter((s) => s.rest !== null && s.rest > 3).length;
                      const semData = perfilStatuses.filter((s) => s.rest === null).length;
                      const total = perfilStatuses.length;

                      return (
                        <div className="mt-3 space-y-3">
                          {/* Barra de resumo */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {prontos > 0 && (
                              <div className="p-1.5 rounded bg-red-50 border border-red-200 text-center">
                                <p className="text-[10px] text-red-600 font-medium">{labelPrevisao(torre.fase, projetoTipo)}</p>
                                <p className="font-display font-bold text-base text-red-700">{prontos}/{total}</p>
                              </div>
                            )}
                            {quaseProntos > 0 && (
                              <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-center">
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Quase Prontos</p>
                                <p className="font-display font-bold text-base text-amber-700">{quaseProntos}/{total}</p>
                              </div>
                            )}
                            {emProcesso > 0 && (
                              <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-center">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Em Processo</p>
                                <p className="font-display font-bold text-base text-emerald-700 dark:text-emerald-300">{emProcesso}/{total}</p>
                              </div>
                            )}
                            {semData > 0 && (
                              <div className="p-1.5 rounded bg-background text-center">
                                <p className="text-[10px] text-muted-foreground">Sem Data</p>
                                <p className="font-display font-bold text-base text-muted-foreground">{semData}/{total}</p>
                              </div>
                            )}
                          </div>

                          {/* Datas individuais por perfil — sempre visível */}
                          {perfilStatuses.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">
                                {isMicroverdes ? 'Datas por bandeja:' : 'Datas por Perfil:'}
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {perfilStatuses.map((ps) => {
                                  const perfil = (andarSelecionado.perfis || []).find((p) => p.perfilIndex === ps.perfilIndex);
                                  const variedade = ps.varId ? data.variedades.find((v) => v.id === ps.varId) : undefined;
                                  const perfilDate = perfil?.dataEntrada || andarSelecionado.dataEntrada || '';
                                  const dateValue = perfilDate ? new Date(perfilDate).toISOString().split('T')[0] : '';
                                  return (
                                    <div key={ps.perfilIndex} className={`p-2 rounded-lg border-2 ${
                                      ps.rest !== null && ps.rest <= 0 ? 'border-red-400 bg-red-50 ring-1 ring-red-200 dark:border-red-700 dark:bg-red-950/35 dark:ring-red-900/60' :
                                      ps.rest !== null && ps.rest <= 3 ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/35' :
                                      ps.rest !== null ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/70 dark:bg-emerald-950/40' :
                                      'border-border bg-muted/30'
                                    }`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1">
                                          <span className={`font-bold text-xs ${
                                            ps.rest !== null && ps.rest <= 0 ? 'text-red-700 dark:text-red-300' :
                                            ps.rest !== null && ps.rest <= 3 ? 'text-amber-700 dark:text-amber-300' : ''
                                          }`}>{labelPosicaoProducao(projetoTipo, ps.perfilIndex)}</span>
                                          {variedade && (
                                            <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{variedade.nome}</span>
                                          )}
                                        </div>
                                        {ps.rest !== null && (
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                            ps.rest <= 0 ? 'bg-red-200 text-red-800 animate-pulse' :
                                            ps.rest <= 3 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800 dark:text-emerald-200'
                                          }`}>
                                            {ps.rest <= 0 ? `${labelPrevisao(torre.fase, projetoTipo)}!` : `${ps.rest}d`}
                                          </span>
                                        )}
                                      </div>
                                      <Input
                                        type="date"
                                        className="h-7 text-[11px]"
                                        defaultValue={dateValue}
                                        key={`${andarSelecionado.id}-p${ps.perfilIndex}-date-${dateValue}`}
                                        onChange={(e) => handleUpdatePerfilData(ps.perfilIndex, e.target.value)}
                                        onBlur={(e) => {
                                          const newVal = e.target.value;
                                          if (newVal && newVal !== dateValue) {
                                            handleUpdatePerfilData(ps.perfilIndex, newVal);
                                          }
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </form>

                  {/* Barra de ações em massa (seleção múltipla) */}
                  {andarSelecionado && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant={selectionMode ? 'default' : 'outline'}
                            className="h-9 text-xs gap-2"
                            onClick={() => {
                              setSelectionMode((v) => !v);
                              setSelectedPerfis(new Set());
                              setLastClickedPerfil(null);
                            }}
                          >
                            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            Seleção em massa
                          </Button>
                          {selectionMode && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 text-xs"
                              onClick={() => {
                                const estrutura = estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null);
                                setSelectedPerfis(new Set(Array.from({ length: estrutura.perfis }, (_, i) => i)));
                              }}
                            >
                              {isMicroverdes ? 'Selecionar todas' : 'Selecionar todos'}
                            </Button>
                          )}
                          {undoPayload && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 text-xs gap-2"
                              onClick={handleUndo}
                            >
                              <Undo2 className="w-4 h-4" />
                              Desfazer
                            </Button>
                          )}
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground">
                              <HelpCircle className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p className="font-semibold">Como selecionar</p>
                            <p className="mt-1">
                              {isMicroverdes
                                ? <>Clique para 1 bandeja, <b>Shift</b> para intervalo, <b>Ctrl</b> para múltiplas.</>
                                : <>Clique para 1 perfil, <b>Shift</b> para intervalo, <b>Ctrl</b> para múltiplos.</>}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {selectionMode && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Variedade</Label>
                              <Select value={bulkVariedade} onValueChange={setBulkVariedade}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Escolher variedade..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.variedades.map((v) => (
                                    <SelectItem key={v.id} value={v.id} className="text-sm py-2">
                                      {v.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Data de entrada</Label>
                              <Input
                                type="date"
                                value={bulkDataEntrada}
                                onChange={(e) => setBulkDataEntrada(e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 items-end">
                              <Button
                                type="button"
                                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={async () => {
                                  const varDbId = bulkVariedade ? (resolver.varSlugToId.get(bulkVariedade) ?? null) : null;
                                  const dt = bulkDataEntrada ? new Date(bulkDataEntrada) : null;
                                  await applyBulkToSelection({ ativo: true, variedadeId: varDbId, dataEntrada: dt }, 'Perfis ativados');
                                }}
                              >
                                Ativar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 text-xs"
                                onClick={async () => {
                                  const varDbId = bulkVariedade ? (resolver.varSlugToId.get(bulkVariedade) ?? null) : null;
                                  const dt = bulkDataEntrada ? new Date(bulkDataEntrada) : null;
                                  await applyBulkToSelection(
                                    {
                                      ...(varDbId !== null ? { variedadeId: varDbId } : {}),
                                      ...(bulkDataEntrada ? { dataEntrada: dt } : {}),
                                    },
                                    'Perfis atualizados'
                                  );
                                }}
                              >
                                Trocar/Definir
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 text-xs text-destructive"
                                onClick={clearSelectedPerfis}
                              >
                                Esvaziar
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 text-xs gap-2"
                              onClick={() => {
                                const idx = andares.findIndex((a) => a.id === andarSelecionado.id);
                                const prev = andares[idx + 1]; // lista desc
                                if (!prev) { toast.error('Não há andar anterior para copiar'); return; }
                                copyFromAndar(prev.id);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar do andar anterior
                            </Button>
                            <Select onValueChange={(val) => copyFromAndar(val)}>
                              <SelectTrigger className="h-9 text-xs w-[220px]">
                                <SelectValue placeholder="Copiar de outro andar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {andares.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    Andar {a.numero}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Modo selector */}
                  <div className="flex gap-2 mb-3">
                    {modosDisponiveis.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModoFuros(m)}
                        className={`flex-1 py-2.5 sm:py-2 rounded-lg text-sm sm:text-xs font-semibold border transition-colors min-h-[40px] ${
                          modoFuros === m
                            ? m === 'transplantio' ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:bg-emerald-950/55 dark:border-emerald-700'
                            : m === 'colheita' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/55 dark:text-amber-300 dark:border-amber-700'
                            : 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                        }`}
                      >
                        {modoLabels[m]}
                      </button>
                    ))}
                  </div>

                  {/* Botão de Registrar Colheita (quando modo colheita) */}
                  {modoFuros === 'colheita' && torreComModoColheita && andarSelecionado && contarColhidasAndar(andarSelecionado, torre.fase, projetoTipo) > 0 && (
                    <div className="mb-3">
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 gap-1.5"
                        onClick={() => setShowColheita(true)}
                      >
                        <Scissors className="w-4 h-4" />
                        Registrar Colheita ({contarColhidasAndar(andarSelecionado, torre.fase, projetoTipo)} bandejas)
                      </Button>
                    </div>
                  )}

                  {/* Grid de perfis/furos */}
                  <PerfilFurosGrid
                    furos={andarSelecionado.furos || []}
                    perfis={andarSelecionado.perfis || gerarPerfisIniciais(torre.fase, projetoTipo)}
                    fase={torre.fase}
                    projetoTipo={projetoTipo}
                    estruturaOverride={torre.estruturaOverride ?? null}
                    modo={modoFuros}
                    variedades={data.variedades}
                    cicloOpts={cicloPrazoOptsFromFazenda(data)}
                    andarDataEntrada={andarSelecionado.dataEntrada}
                    selectionMode={selectionMode}
                    selectedPerfis={selectedPerfis}
                    onSelectPerfil={handleSelectPerfil}
                    onFuroToggle={handleFuroToggle}
                    onPerfilToggle={handlePerfilToggle}
                    onPerfilVariedadeChange={handlePerfilVariedadeChange}
                    onPerfilDataChange={handleUpdatePerfilData}
                    onAndarTodo={handleAndarTodo}
                    onAndarVariedadeTodos={handleAndarVariedadeTodos}
                  />


                </div>
              </motion.div>
            )}

            {/* Colheita dialog */}
            <Dialog open={showColheita} onOpenChange={setShowColheita}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display">Registrar Colheita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {andarSelecionado && (
                    <div className="p-3 bg-emerald-50 rounded-lg text-center">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {contarColhidasAndar(andarSelecionado, torre.fase, projetoTipo)} bandeja(s) colhida(s)
                      </p>
                      <p className="text-xs text-muted-foreground">Andar {andarSelecionado.numero}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Peso Total (gramas)</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 250" value={colheitaPeso} onChange={(e) => setColheitaPeso(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Qualidade</Label>
                    <Select value={colheitaQualidade} onValueChange={setColheitaQualidade}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A - Excelente</SelectItem>
                        <SelectItem value="B">B - Boa</SelectItem>
                        <SelectItem value="C">C - Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Destino</Label>
                    <Select value={colheitaDestino} onValueChange={setColheitaDestino}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venda_direta">Venda Direta</SelectItem>
                        <SelectItem value="restaurante">Restaurante</SelectItem>
                        <SelectItem value="mercado">Mercado</SelectItem>
                        <SelectItem value="consumo_interno">Consumo Interno</SelectItem>
                        <SelectItem value="doacao">Doação</SelectItem>
                        <SelectItem value="descarte">Descarte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Observações</Label>
                    <Input placeholder="Notas sobre esta colheita..." value={colheitaObs} onChange={(e) => setColheitaObs(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleRegistrarColheita} disabled={createColheita.isPending} className="w-full bg-amber-600 hover:bg-amber-700">
                      {createColheita.isPending ? 'Registrando...' : 'Registrar Colheita'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            {/* Histórico de colheitas do andar */}
            {andarSelecionado && torreComModoColheita && registrosColheita && registrosColheita.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-3 border-b">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Histórico de Colheitas — A{andarSelecionado.numero}
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {registrosColheita.map((reg: any) => (
                    <div key={reg.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 text-xs">
                      <div>
                        <p className="font-medium">
                          {reg.quantidadePlantas} plantas
                          {reg.pesoTotalGramas ? ` · ${reg.pesoTotalGramas}g` : ''}
                          {reg.qualidade ? ` · Qualidade ${reg.qualidade}` : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(reg.dataColheita).toLocaleDateString('pt-BR')}
                          {reg.destino ? ` · ${reg.destino.replace('_', ' ')}` : ''}
                          {reg.executadoPorNome ? ` · por ${reg.executadoPorNome}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Movimentação dialog */}
            <Dialog open={showMover} onOpenChange={setShowMover}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5" />
                    Mover {moverTipo === 'andar' ? 'Andar Inteiro' : isMicroverdes ? 'Uma bandeja' : 'Perfil Individual'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Tipo de movimentação */}
                  <div>
                    <Label className="text-xs">Tipo de Movimentação</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => { setMoverTipo('andar'); setMoverDestinoPerfilIndex(''); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          moverTipo === 'andar' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        Andar Inteiro
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoverTipo('perfil')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          moverTipo === 'perfil' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isMicroverdes ? 'Uma bandeja' : 'Perfil Individual'}
                      </button>
                    </div>
                  </div>

                  {/* Origem */}
                  {andarSelecionado && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="text-sm font-semibold">{nomeTorreUi} — Andar {andarSelecionado.numero}</p>
                    </div>
                  )}

                  {/* Perfil de origem (se mover perfil individual) */}
                  {moverTipo === 'perfil' && andarSelecionado && (() => {
                    const perfisAtivos = (andarSelecionado.perfis || []).filter(p => p.ativo || (andarSelecionado.furos || []).some(f => f.perfilIndex === p.perfilIndex && f.status !== 'vazio'));
                    return perfisAtivos.length > 0 ? (
                      <div>
                        <Label className="text-xs">{isMicroverdes ? 'Bandeja de origem' : 'Perfil de Origem'}</Label>
                        <Select value={String(moverPerfilIndex)} onValueChange={(v) => setMoverPerfilIndex(Number(v))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {perfisAtivos.map(p => {
                              const varNome = p.variedadeId ? data.variedades.find(v => v.id === p.variedadeId)?.nome : null;
                              return (
                                <SelectItem key={p.perfilIndex} value={String(p.perfilIndex)}>
                                  {labelPosicaoProducao(projetoTipo, p.perfilIndex)}{varNome ? ` (${varNome})` : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                        {isMicroverdes
                          ? 'Nenhuma bandeja ativa neste andar para mover.'
                          : 'Nenhum perfil ativo neste andar para mover.'}
                      </div>
                    );
                  })()}

                  {/* Torre de destino (mesma fase) */}
                  <div>
                    <Label className="text-xs">Torre de Destino ({faseLabelExibicao})</Label>
                    <Select value={moverDestinoTorre} onValueChange={(v) => { setMoverDestinoTorre(v); setMoverDestinoAndar(''); setMoverDestinoPerfilIndex(''); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione a torre..." /></SelectTrigger>
                      <SelectContent>
                        {data.torres.filter(t => t.fase === torre.fase).map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Andar de destino */}
                  {moverDestinoTorre && (() => {
                    const torreDestino = data.torres.find(t => t.id === moverDestinoTorre);
                    if (!torreDestino) return null;
                    const andaresDestino = andaresDaTorreDeclarados(data.andares, torreDestino)
                      .filter(a => !(a.torreId === torre.id && a.id === andarSelecionado?.id))
                      .sort((a, b) => b.numero - a.numero);
                    return (
                      <div>
                        <Label className="text-xs">Andar de Destino</Label>
                        <Select value={moverDestinoAndar} onValueChange={(v) => { setMoverDestinoAndar(v); setMoverDestinoPerfilIndex(''); }}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o andar..." /></SelectTrigger>
                          <SelectContent>
                            {andaresDestino.map(a => {
                              const plantadas = contarPlantasAndar(a, torre.fase, projetoTipo);
                              const maxSlots = capacidadeAndar(torre.fase, projetoTipo, torre.estruturaOverride ?? null);
                              return (
                                <SelectItem key={a.id} value={a.id}>
                                  Andar {a.numero} ({plantadas}/{maxSlots} ocupados)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Perfil de destino (se mover perfil individual) */}
                  {moverTipo === 'perfil' && moverDestinoAndar && (() => {
                    const andarDest = data.andares.find(a => a.id === moverDestinoAndar);
                    if (!andarDest) return null;
                    const estrutura = estruturaFaseParaProjeto(projetoTipo, torre.fase, torre.estruturaOverride ?? null);
                    const perfisDestino = Array.from({ length: estrutura.perfis }, (_, i) => {
                      const p = (andarDest.perfis || []).find(pp => pp.perfilIndex === i);
                      const ocupado = p?.ativo || (andarDest.furos || []).some(f => f.perfilIndex === i && f.status !== 'vazio');
                      return { index: i, ocupado };
                    });
                    return (
                      <div>
                        <Label className="text-xs">{isMicroverdes ? 'Bandeja de destino' : 'Perfil de Destino'}</Label>
                        <Select value={moverDestinoPerfilIndex} onValueChange={setMoverDestinoPerfilIndex}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={isMicroverdes ? 'Selecione a bandeja…' : 'Selecione o perfil...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {perfisDestino.map(p => (
                              <SelectItem key={p.index} value={String(p.index)}>
                                {labelPosicaoProducao(projetoTipo, p.index)} {p.ocupado ? '(ocupada)' : '(livre)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  <DialogFooter>
                    <Button
                      className="w-full gap-1.5"
                      disabled={
                        !moverDestinoAndar ||
                        (moverTipo === 'perfil' && moverDestinoPerfilIndex === '') ||
                        mutations.moverPerfil.isPending ||
                        mutations.moverAndar.isPending
                      }
                      onClick={() => {
                        if (!andarSelecionado || !moverDestinoAndar) return;
                        const origemDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
                        const destinoDbId = resolver.andarFrontIdToDbId.get(moverDestinoAndar);
                        if (!origemDbId || !destinoDbId) { toast.error('Erro ao resolver IDs dos andares'); return; }

                        if (moverTipo === 'andar') {
                          mutations.moverAndar.mutate(
                            { origemAndarId: origemDbId, destinoAndarId: destinoDbId },
                            {
                              onSuccess: () => {
                                setShowMover(false);
                                toast.success('Andar movido com sucesso!');
                              },
                              onError: (err: any) => toast.error(`Erro: ${err.message}`),
                            }
                          );
                        } else {
                          mutations.moverPerfil.mutate(
                            {
                              origemAndarId: origemDbId,
                              perfilIndex: moverPerfilIndex,
                              destinoAndarId: destinoDbId,
                              destinoPerfilIndex: Number(moverDestinoPerfilIndex),
                            },
                            {
                              onSuccess: () => {
                                setShowMover(false);
                                toast.success(isMicroverdes ? 'Bandeja movida com sucesso!' : 'Perfil movido com sucesso!');
                              },
                              onError: (err: any) => toast.error(`Erro: ${err.message}`),
                            }
                          );
                        }
                      }}
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      {mutations.moverPerfil.isPending || mutations.moverAndar.isPending
                        ? 'Movendo...'
                        : `Mover ${moverTipo === 'andar' ? 'Andar' : isMicroverdes ? 'bandeja' : 'Perfil'}`}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            {/* Transplantio inteligente (distribuído) */}
            <TransplantioDistribuidoModal
              open={showTransplantioSmart}
              onOpenChange={setShowTransplantioSmart}
              origemAndar={andarSelecionado || null}
              origemTorre={torre || null}
              torres={data.torres}
              andares={data.andares}
              origemAndarDbId={andarSelecionado ? (resolver.andarFrontIdToDbId.get(andarSelecionado.id) ?? null) : null}
              resolver={resolver as any}
              projetoTipo={projetoTipo}
              variedades={data.variedades}
            />

            {/* No andar selected */}
            {!andarSelecionado && (
              <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center">
                <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Selecione um andar na lista à esquerda para ver detalhes e registrar dados.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
