// ============================================================
// TorreDetail v4 — Migrado para tRPC mutations
// ============================================================

import { useParams, Link } from 'wouter';
import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, ESTRUTURA_FASE, gerarPerfisIniciais, gerarFurosIniciais } from '@/lib/types';
import type { MedicaoCaixa, AplicacaoCaixa, AplicacaoAndar, FuroStatus, RegistroTransplantio, PerfilData } from '@/lib/types';
import {
  diasDecorridos, diasRestantes, dataPrevista, labelPrevisao,
  formatarData, formatarDataHora, ecForaRange, phForaRange,
  gerarId, contarPlantasAndar, contarColhidasAndar, capacidadeAndar,
  andarPrecisaLavagem, variedadePrincipalAndar,
  TIPOS_APLICACAO_CAIXA, TIPOS_APLICACAO_ANDAR,
  MOTIVOS_DESPERDICIO,
} from '@/lib/utils-farm';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import PerfilFurosGrid from '@/components/PerfilFurosGrid';
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
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TorreDetail() {
  const { id } = useParams<{ id: string }>();
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [selectedAndar, setSelectedAndar] = useState<string | null>(null);
  const [tipoCaixa, setTipoCaixa] = useState<string>('');
  const [tipoAndar, setTipoAndar] = useState<string>('');
  const [modoFuros, setModoFuros] = useState<'visualizacao' | 'transplantio' | 'colheita'>('visualizacao');
  const [showTransplantio, setShowTransplantio] = useState(false);
  const [showColheita, setShowColheita] = useState(false);
  const [motivoDesperdicio, setMotivoDesperdicio] = useState<string>('');
  const [variedadeTransplantio, setVariedadeTransplantio] = useState<string>('');
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

  const torre = data.torres.find((t) => t.id === id);
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

  const fConfig = data.fasesConfig?.[torre.fase] || FASES_CONFIG[torre.fase];
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const andares = data.andares
    .filter((a) => a.torreId === torre.id)
    .sort((a, b) => b.numero - a.numero);
  const andarSelecionado = andares.find((a) => a.id === selectedAndar);

  const isMudas = torre.fase === 'mudas';
  const isMaturacao = torre.fase === 'maturacao';

  const badgeClass = torre.fase === 'mudas' ? 'badge-mudas' : torre.fase === 'vegetativa' ? 'badge-vegetativa' : 'badge-maturacao';

  const ultimaMedicao = caixa?.medicoes?.length ? caixa.medicoes[caixa.medicoes.length - 1] : null;

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const totalPlantasTorre = andares.reduce((sum, a) => sum + contarPlantasAndar(a, torre.fase), 0);
  const totalColhidasTorre = isMaturacao ? andares.reduce((sum, a) => sum + contarColhidasAndar(a), 0) : 0;

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

    mutations.updateAndar.mutate({
      id: andarDbId,
      dataEntrada: dataEntrada ? new Date(dataEntrada) : null,
    });
    toast.success(`Data de entrada do Andar ${andarSelecionado.numero} atualizada!`);
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

    // Update perfil variedade
    mutations.updatePerfil.mutate({
      andarId: andarDbId,
      perfilIndex,
      variedadeId: varDbId,
    });

    // Batch update furos of this perfil that are not vazio
    const perfilFuros = (andarSelecionado.furos || []).filter(
      (f) => f.perfilIndex === perfilIndex && f.status !== 'vazio'
    );
    if (perfilFuros.length > 0) {
      mutations.batchUpdateFuros.mutate({
        andarId: andarDbId,
        updates: perfilFuros.map((f) => ({
          perfilIndex,
          furoIndex: f.furoIndex,
          variedadeId: varDbId,
        })),
      });
    }

    toast.success(`Variedade do Perfil ${perfilIndex + 1} atualizada!`);
  };

  const handleAndarVariedadeTodos = (variedadeId: string) => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    const varDbId = resolver.varSlugToId.get(variedadeId) || null;

    // Batch: set all perfis variedade
    mutations.setAllPerfis.mutate({ andarId: andarDbId, variedadeId: varDbId });

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
    toast.success(`Todos os perfis definidos como ${variedade?.nome || variedadeId}!`);
  };

  const handleAndarTodo = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    if (isMudas) {
      const perfis = andarSelecionado.perfis || gerarPerfisIniciais(torre.fase);
      const allAtivo = perfis.every((p) => p.ativo);
      // Batch: set all perfis ativo/inativo in one request
      mutations.setAllPerfis.mutate({ andarId: andarDbId, ativo: !allAtivo });
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

  const handleMarcarLavado = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    if (!andarDbId) return;

    mutations.updateAndar.mutate({ id: andarDbId, lavado: true });
    toast.success('Perfis marcados como lavados!');
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

  const handleRegistrarTransplantio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qtdTransplantada = parseInt(fd.get('qtdTransplantada') as string) || 0;
    const qtdDesperdicio = parseInt(fd.get('qtdDesperdicio') as string) || 0;

    if (!variedadeTransplantio) { toast.error('Selecione a variedade'); return; }

    const variedade = data.variedades.find((v) => v.id === variedadeTransplantio);
    const varDbId = resolver.varSlugToId.get(variedadeTransplantio);
    const torreDbId = resolver.torreSlugToId.get(torre.id);
    const andarDbId = andarSelecionado ? resolver.andarFrontIdToDbId.get(andarSelecionado.id) : undefined;

    if (!varDbId || !torreDbId) { toast.error('Erro ao resolver IDs'); return; }

    mutations.createTransplantio.mutate({
      dataHora: new Date(),
      faseOrigem: torre.fase === 'mudas' ? 'germinacao' : torre.fase === 'vegetativa' ? 'mudas' : 'vegetativa',
      faseDestino: torre.fase,
      variedadeId: varDbId,
      variedadeNome: variedade?.nome || '',
      quantidadeTransplantada: qtdTransplantada,
      quantidadeDesperdicio: qtdDesperdicio,
      motivoDesperdicio: motivoDesperdicio || undefined,
      torreDestinoId: torreDbId,
      andarDestinoId: andarDbId,
    });

    setShowTransplantio(false);
    setMotivoDesperdicio('');
    setVariedadeTransplantio('');
    toast.success('Transplantio registrado!');
  };

  // ---- Colheita: query + mutation ----
  const andarDbIdForColheita = andarSelecionado ? resolver.andarFrontIdToDbId.get(andarSelecionado.id) : undefined;
  const { data: registrosColheita, refetch: refetchColheita } = trpc.registrosColheita.listByAndar.useQuery(
    { andarId: andarDbIdForColheita! },
    { enabled: !!andarDbIdForColheita }
  );
  const createColheita = trpc.registrosColheita.create.useMutation({
    onSuccess: () => { refetchColheita(); toast.success('Colheita registrada!'); },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const handleRegistrarColheita = () => {
    if (!andarSelecionado) return;
    const andarDbId = resolver.andarFrontIdToDbId.get(andarSelecionado.id);
    const torreDbId = resolver.torreSlugToId.get(torre.id);
    if (!andarDbId || !torreDbId) { toast.error('Erro ao resolver IDs'); return; }
    const colhidas = contarColhidasAndar(andarSelecionado);
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
    : isMaturacao
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
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{torre.nome}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tower + Andares */}
          <div className="lg:col-span-1 space-y-4">
            {/* Torre info */}
            <div className="bg-card rounded-xl shadow-sm border p-4">
              <h2 className="font-display font-bold text-lg">{torre.nome}</h2>
              <p className="text-xs text-muted-foreground mb-3">
                {torre.andares} andares &middot; {fConfig.label}
                {isMudas
                  ? ` · ${ESTRUTURA_FASE.mudas.perfis} perfis abertos`
                  : ` · ${ESTRUTURA_FASE[torre.fase].perfis}×${ESTRUTURA_FASE[torre.fase].furosPorPerfil} furos`}
              </p>
              <div className={`grid ${isMaturacao ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-center`}>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <p className="font-display font-bold text-lg text-emerald-700">{totalPlantasTorre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isMudas ? 'Perfis Ativos' : 'Plantas Ativas'}
                  </p>
                </div>
                {isMaturacao && (
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
                  const varId = variedadePrincipalAndar(andar);
                  const plantadas = contarPlantasAndar(andar, torre.fase);
                  const rest = andar.dataEntrada ? diasRestantes(andar.dataEntrada, torre.fase, varId, data.variedades) : null;
                  const precisaLavar = andarPrecisaLavagem(andar);
                  const isSelected = andar.id === selectedAndar;
                  const maxSlots = capacidadeAndar(torre.fase);

                  const perfisAtivos = (andar.perfis || []).filter((p) => p.ativo && p.variedadeId);
                  const varNomesSet = new Set<string>();
                  perfisAtivos.forEach((p) => {
                    const v = data.variedades.find((vr) => vr.id === p.variedadeId);
                    if (v?.nome) varNomesSet.add(v.nome);
                  });
                  const varNomes = Array.from(varNomesSet);

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
                          <span className={`w-2 h-2 rounded-full ${
                            precisaLavar ? 'bg-red-500 animate-pulse' :
                            !andar.dataEntrada ? 'bg-gray-300' :
                            rest !== null && rest <= 0 ? 'bg-red-500' :
                            rest !== null && rest <= 3 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`} />
                          <span className="font-semibold">A{andar.numero}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {plantadas > 0 && (
                            <span className="text-[10px] text-emerald-600 font-medium">{plantadas}/{maxSlots}</span>
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
                        <span className={`text-sm font-bold ${ecForaRange(ultimaMedicao.ec, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600'}`}>
                          EC {ultimaMedicao.ec}
                        </span>
                        <span className={`text-sm font-bold ${phForaRange(ultimaMedicao.ph, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600'}`}>
                          pH {ultimaMedicao.ph}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatarDataHora(ultimaMedicao.dataHora)}</p>
                    </div>
                  )}
                </div>

                <div className="p-4">
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
                                    EC <span className={ecForaRange((item as MedicaoCaixa).ec, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600'}>{(item as MedicaoCaixa).ec}</span>
                                    {' · '}
                                    pH <span className={phForaRange((item as MedicaoCaixa).ph, torre.fase, data.fasesConfig) !== 'ok' ? 'text-red-600' : 'text-emerald-600'}>{(item as MedicaoCaixa).ph}</span>
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
                      <Leaf className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-display font-bold text-sm">Andar {andarSelecionado.numero}</h3>
                    </div>
                    {andarSelecionado.dataEntrada && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {diasDecorridos(andarSelecionado.dataEntrada)}d decorridos
                        {(() => {
                          const varId = variedadePrincipalAndar(andarSelecionado);
                          const prev = dataPrevista(andarSelecionado.dataEntrada, torre.fase, varId, data.variedades);
                          return prev ? ` · ${labelPrevisao(torre.fase)}: ${formatarData(prev)}` : '';
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" className="text-xs gap-1.5 h-9 px-3" onClick={() => setShowTransplantio(true)}>
                      <Sprout className="w-4 h-4" /> Transplantio
                    </Button>
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
                        <p className="text-xs font-semibold text-red-700">Lavagem de Perfis Pendente!</p>
                        <p className="text-[10px] text-red-600">Colheita total em {formatarData(andarSelecionado.dataColheitaTotal || null)}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="text-sm gap-1.5 h-9 px-3 text-emerald-600 border-emerald-300" onClick={handleMarcarLavado}>
                      <CheckCircle2 className="w-3 h-3" /> Marcar Lavado
                    </Button>
                  </div>
                )}

                <div className="p-4">
                  {/* Data de entrada */}
                  <form onSubmit={handleUpdateAndar} className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Data de Entrada</Label>
                        <Input
                          name="dataEntrada"
                          type="date"
                          defaultValue={andarSelecionado.dataEntrada ? new Date(andarSelecionado.dataEntrada).toISOString().split('T')[0] : ''}
                          className="h-10 text-sm"
                          key={andarSelecionado.id + '-date'}
                        />
                      </div>
                      <Button type="submit" className="h-10 text-sm px-4">Salvar Data</Button>
                    </div>
                    {andarSelecionado.dataEntrada && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="p-1.5 rounded bg-background">
                          <p className="text-[10px] text-muted-foreground">Dias Decorridos</p>
                          <p className="font-display font-bold text-base">{diasDecorridos(andarSelecionado.dataEntrada)}</p>
                        </div>
                        <div className="p-1.5 rounded bg-background">
                          <p className="text-[10px] text-muted-foreground">{labelPrevisao(torre.fase)} em</p>
                          {(() => {
                            const varId = variedadePrincipalAndar(andarSelecionado);
                            const rest = diasRestantes(andarSelecionado.dataEntrada, torre.fase, varId, data.variedades);
                            return (
                              <p className={`font-display font-bold text-base ${
                                rest === null ? 'text-muted-foreground' :
                                rest <= 0 ? 'text-red-600' :
                                rest <= 3 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {rest !== null ? `${rest}d` : 'Defina variedade'}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Modo selector */}
                  <div className="flex gap-2 mb-3">
                    {modosDisponiveis.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModoFuros(m)}
                        className={`flex-1 py-2.5 sm:py-2 rounded-lg text-sm sm:text-xs font-semibold border transition-colors min-h-[40px] ${
                          modoFuros === m
                            ? m === 'transplantio' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : m === 'colheita' ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                        }`}
                      >
                        {modoLabels[m]}
                      </button>
                    ))}
                  </div>

                  {/* Botão de Registrar Colheita (quando modo colheita) */}
                  {modoFuros === 'colheita' && isMaturacao && andarSelecionado && contarColhidasAndar(andarSelecionado) > 0 && (
                    <div className="mb-3">
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 gap-1.5"
                        onClick={() => setShowColheita(true)}
                      >
                        <Scissors className="w-4 h-4" />
                        Registrar Colheita ({contarColhidasAndar(andarSelecionado)} plantas)
                      </Button>
                    </div>
                  )}

                  {/* Grid de perfis/furos */}
                  <PerfilFurosGrid
                    furos={andarSelecionado.furos || []}
                    perfis={andarSelecionado.perfis || gerarPerfisIniciais(torre.fase)}
                    fase={torre.fase}
                    modo={modoFuros}
                    variedades={data.variedades}
                    onFuroToggle={handleFuroToggle}
                    onPerfilToggle={handlePerfilToggle}
                    onPerfilVariedadeChange={handlePerfilVariedadeChange}
                    onAndarTodo={handleAndarTodo}
                    onAndarVariedadeTodos={handleAndarVariedadeTodos}
                  />

                  {/* Aplicações no andar */}
                  <div className="mt-4 pt-4 border-t">
                    <Tabs defaultValue="aplicar">
                      <TabsList className="w-full mb-3">
                        <TabsTrigger value="aplicar" className="flex-1 text-xs">Aplicação</TabsTrigger>
                        <TabsTrigger value="hist" className="flex-1 text-xs">Histórico</TabsTrigger>
                      </TabsList>

                      <TabsContent value="aplicar">
                        <form onSubmit={handleAddAplicacaoAndar} className="space-y-3">
                          <div><Label className="text-xs">Tipo</Label>
                            <Select value={tipoAndar} onValueChange={setTipoAndar}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger><SelectContent>{TIPOS_APLICACAO_ANDAR.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select>
                          </div>
                          <div><Label className="text-xs">Produto</Label><Input name="produto" placeholder="Ex: Solução nutritiva A" className="h-9 text-sm" required /></div>
                          <div><Label className="text-xs">Quantidade</Label><Input name="quantidade" placeholder="Ex: 10ml" className="h-9 text-sm" /></div>
                          <div><Label className="text-xs">Data/Hora</Label><Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required /></div>
                          <Button type="submit" size="sm" className="w-full">Registrar Aplicação</Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="hist">
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {andarSelecionado.aplicacoes.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma aplicação registrada.</p>
                          ) : (
                            andarSelecionado.aplicacoes
                              .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                              .map((apl) => (
                                <div key={apl.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                                  <div>
                                    <p className="font-medium">{apl.produto} ({apl.quantidade})</p>
                                    <p className="text-[10px] text-muted-foreground">{TIPOS_APLICACAO_ANDAR.find((t) => t.value === apl.tipo)?.label} · {formatarDataHora(apl.dataHora)}</p>
                                  </div>
                                  <button onClick={() => handleDeleteAplicacaoAndar(apl.id)} className="text-muted-foreground hover:text-destructive p-2 min-w-[36px] min-h-[36px] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              ))
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
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
                      <p className="text-sm font-semibold text-emerald-700">
                        {contarColhidasAndar(andarSelecionado)} planta(s) colhida(s)
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
            {andarSelecionado && isMaturacao && registrosColheita && registrosColheita.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-3 border-b">
                  <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-600" />
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
                    Mover {moverTipo === 'andar' ? 'Andar Inteiro' : 'Perfil Individual'}
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
                        Perfil Individual
                      </button>
                    </div>
                  </div>

                  {/* Origem */}
                  {andarSelecionado && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="text-sm font-semibold">{torre.nome} — Andar {andarSelecionado.numero}</p>
                    </div>
                  )}

                  {/* Perfil de origem (se mover perfil individual) */}
                  {moverTipo === 'perfil' && andarSelecionado && (() => {
                    const perfisAtivos = (andarSelecionado.perfis || []).filter(p => p.ativo || (andarSelecionado.furos || []).some(f => f.perfilIndex === p.perfilIndex && f.status !== 'vazio'));
                    return perfisAtivos.length > 0 ? (
                      <div>
                        <Label className="text-xs">Perfil de Origem</Label>
                        <Select value={String(moverPerfilIndex)} onValueChange={(v) => setMoverPerfilIndex(Number(v))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {perfisAtivos.map(p => {
                              const varNome = p.variedadeId ? data.variedades.find(v => v.id === p.variedadeId)?.nome : null;
                              return (
                                <SelectItem key={p.perfilIndex} value={String(p.perfilIndex)}>
                                  Perfil {p.perfilIndex + 1}{varNome ? ` (${varNome})` : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">Nenhum perfil ativo neste andar para mover.</div>
                    );
                  })()}

                  {/* Torre de destino (mesma fase) */}
                  <div>
                    <Label className="text-xs">Torre de Destino ({fConfig.label})</Label>
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
                    const andaresDestino = data.andares
                      .filter(a => a.torreId === moverDestinoTorre)
                      .filter(a => !(a.torreId === torre.id && a.id === andarSelecionado?.id))
                      .sort((a, b) => b.numero - a.numero);
                    return (
                      <div>
                        <Label className="text-xs">Andar de Destino</Label>
                        <Select value={moverDestinoAndar} onValueChange={(v) => { setMoverDestinoAndar(v); setMoverDestinoPerfilIndex(''); }}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o andar..." /></SelectTrigger>
                          <SelectContent>
                            {andaresDestino.map(a => {
                              const plantadas = contarPlantasAndar(a, torre.fase);
                              const maxSlots = capacidadeAndar(torre.fase);
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
                    const estrutura = isMudas ? { perfis: 12 } : torre.fase === 'vegetativa' ? { perfis: 12 } : { perfis: 6 };
                    const perfisDestino = Array.from({ length: estrutura.perfis }, (_, i) => {
                      const p = (andarDest.perfis || []).find(pp => pp.perfilIndex === i);
                      const ocupado = p?.ativo || (andarDest.furos || []).some(f => f.perfilIndex === i && f.status !== 'vazio');
                      return { index: i, ocupado };
                    });
                    return (
                      <div>
                        <Label className="text-xs">Perfil de Destino</Label>
                        <Select value={moverDestinoPerfilIndex} onValueChange={setMoverDestinoPerfilIndex}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                          <SelectContent>
                            {perfisDestino.map(p => (
                              <SelectItem key={p.index} value={String(p.index)}>
                                Perfil {p.index + 1} {p.ocupado ? '(ocupado)' : '(livre)'}
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
                                toast.success('Perfil movido com sucesso!');
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
                        : `Mover ${moverTipo === 'andar' ? 'Andar' : 'Perfil'}`}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            {/* Transplantio dialog */}
            <Dialog open={showTransplantio} onOpenChange={setShowTransplantio}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display">Registrar Transplantio</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarTransplantio} className="space-y-4">
                  <div>
                    <Label className="text-xs">Variedade</Label>
                    <Select value={variedadeTransplantio} onValueChange={setVariedadeTransplantio}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{data.variedades.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Transplantadas</Label><Input name="qtdTransplantada" type="number" min="0" placeholder="0" className="h-9 text-sm" /></div>
                    <div>
                      <Label className="text-xs">
                        {torre.fase === 'mudas' ? 'Não germinadas' : 'Desperdício'}
                      </Label>
                      <Input name="qtdDesperdicio" type="number" min="0" placeholder="0" className="h-9 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">
                      {torre.fase === 'mudas' ? 'Motivo' : 'Motivo do Desperdício'}
                    </Label>
                    <Select value={motivoDesperdicio} onValueChange={setMotivoDesperdicio}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{MOTIVOS_DESPERDICIO.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">Registrar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

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
