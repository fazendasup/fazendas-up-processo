// ============================================================
// TorreDetail v2 — Painel detalhado de torre
// Inclui: perfis/furos 6x6, colheita, lavagem, transplantio,
// desperdício, ciclo por variedade
// ============================================================

import { useParams, Link } from 'wouter';
import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG } from '@/lib/types';
import type { MedicaoCaixa, AplicacaoCaixa, AplicacaoAndar, Furo, FuroStatus, RegistroTransplantio } from '@/lib/types';
import {
  diasDecorridos, diasRestantes, dataPrevista, labelPrevisao,
  formatarData, formatarDataHora, ecForaRange, phForaRange,
  gerarId, diasCicloVariedade, contarPlantasAndar, contarColhidasAndar,
  andarPrecisaLavagem, TIPOS_APLICACAO_CAIXA, TIPOS_APLICACAO_ANDAR,
  MOTIVOS_DESPERDICIO,
} from '@/lib/utils-farm';
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
  ArrowLeft, Droplets, Plus, AlertTriangle, Clock, Beaker, Leaf,
  Trash2, Sprout, Scissors, Droplet, CheckCircle2, Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TorreDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, updateData } = useFazenda();
  const [selectedAndar, setSelectedAndar] = useState<string | null>(null);
  const [tipoCaixa, setTipoCaixa] = useState<string>('');
  const [tipoAndar, setTipoAndar] = useState<string>('');
  const [modoFuros, setModoFuros] = useState<'visualizacao' | 'transplantio' | 'colheita'>('visualizacao');
  const [variedadeSelect, setVariedadeSelect] = useState<string>('');
  const [showTransplantio, setShowTransplantio] = useState(false);
  const [motivoDesperdicio, setMotivoDesperdicio] = useState<string>('');

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

  const badgeClass = torre.fase === 'mudas' ? 'badge-mudas' : torre.fase === 'vegetativa' ? 'badge-vegetativa' : 'badge-maturacao';

  const ultimaMedicao = caixa?.medicoes?.length ? caixa.medicoes[caixa.medicoes.length - 1] : null;

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  // Total de plantas na torre
  const totalPlantasTorre = andares.reduce((sum, a) => sum + contarPlantasAndar(a), 0);
  const totalColhidasTorre = andares.reduce((sum, a) => sum + contarColhidasAndar(a), 0);

  // Manutenções abertas desta torre
  const manutencoesTorre = data.manutencoes.filter((m) => m.torreId === torre.id && m.status !== 'concluida');

  // ---- Handlers ----

  const handleAddMedicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ec = parseFloat(fd.get('ec') as string);
    const ph = parseFloat(fd.get('ph') as string);
    const dataHora = fd.get('dataHora') as string;
    if (isNaN(ec) || isNaN(ph) || !dataHora) { toast.error('Preencha todos os campos'); return; }
    const medicao: MedicaoCaixa = { id: gerarId(), ec, ph, dataHora: new Date(dataHora).toISOString() };
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) => c.id === caixa?.id ? { ...c, medicoes: [...c.medicoes, medicao] } : c),
    }));
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
    const aplicacao: AplicacaoCaixa = { id: gerarId(), tipo: tipoCaixa as AplicacaoCaixa['tipo'], produto, quantidade, dataHora: new Date(dataHora).toISOString() };
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) => c.id === caixa?.id ? { ...c, aplicacoes: [...c.aplicacoes, aplicacao] } : c),
    }));
    e.currentTarget.reset();
    setTipoCaixa('');
    toast.success('Aplicação registrada na caixa d\'água!');
  };

  const handleUpdateAndar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!andarSelecionado) return;
    const fd = new FormData(e.currentTarget);
    const variedadesStr = (fd.get('variedades') as string).split(',').map((v) => v.trim()).filter(Boolean);
    const dataEntrada = fd.get('dataEntrada') as string;

    // Mapear nomes para IDs
    const variedadeIds = variedadesStr.map((nome) => {
      const v = data.variedades.find((vr) => vr.nome.toLowerCase() === nome.toLowerCase());
      return v?.id || '';
    }).filter(Boolean);

    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? { ...a, variedades: variedadesStr, variedadeIds, dataEntrada: dataEntrada ? new Date(dataEntrada).toISOString() : a.dataEntrada }
          : a
      ),
    }));
    toast.success(`Andar ${andarSelecionado.numero} atualizado!`);
  };

  const handleFuroToggle = (perfilIndex: number, furoIndex: number) => {
    if (!andarSelecionado) return;
    const newStatus: FuroStatus = modoFuros === 'transplantio'
      ? 'plantado'
      : 'colhido';

    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => {
        if (a.id !== andarSelecionado.id) return a;
        const furos = (a.furos || []).map((f) => {
          if (f.perfilIndex === perfilIndex && f.furoIndex === furoIndex) {
            // Toggle: se já está no status alvo, volta para vazio
            if (f.status === newStatus) return { ...f, status: 'vazio' as FuroStatus, variedadeId: undefined };
            return { ...f, status: newStatus, variedadeId: variedadeSelect || undefined };
          }
          return f;
        });
        return { ...a, furos };
      }),
    }));
  };

  const handlePerfilToggle = (perfilIndex: number) => {
    if (!andarSelecionado) return;
    const newStatus: FuroStatus = modoFuros === 'transplantio' ? 'plantado' : 'colhido';
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => {
        if (a.id !== andarSelecionado.id) return a;
        const perfilFuros = a.furos.filter((f) => f.perfilIndex === perfilIndex);
        const allTarget = perfilFuros.every((f) => f.status === newStatus);
        const furos = a.furos.map((f) => {
          if (f.perfilIndex !== perfilIndex) return f;
          if (allTarget) return { ...f, status: 'vazio' as FuroStatus, variedadeId: undefined };
          return { ...f, status: newStatus, variedadeId: variedadeSelect || undefined };
        });
        return { ...a, furos };
      }),
    }));
  };

  const handleAndarTodo = () => {
    if (!andarSelecionado) return;
    const newStatus: FuroStatus = modoFuros === 'transplantio' ? 'plantado' : 'colhido';
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => {
        if (a.id !== andarSelecionado.id) return a;
        const allTarget = a.furos.every((f) => f.status === newStatus);
        const furos = a.furos.map((f) => {
          if (allTarget) return { ...f, status: 'vazio' as FuroStatus, variedadeId: undefined };
          return { ...f, status: newStatus, variedadeId: variedadeSelect || undefined };
        });
        // Se colheita total, marcar para lavagem
        const isColheitaTotal = !allTarget && modoFuros === 'colheita';
        return {
          ...a,
          furos,
          ...(isColheitaTotal ? { dataColheitaTotal: new Date().toISOString(), lavado: false } : {}),
        };
      }),
    }));
    toast.success(modoFuros === 'transplantio' ? 'Andar todo plantado!' : 'Andar todo colhido!');
  };

  const handleMarcarLavado = () => {
    if (!andarSelecionado) return;
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id ? { ...a, lavado: true } : a
      ),
    }));
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
    const aplicacao: AplicacaoAndar = { id: gerarId(), tipo: tipoAndar as AplicacaoAndar['tipo'], produto, quantidade, dataHora: new Date(dataHora).toISOString() };
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => a.id === andarSelecionado.id ? { ...a, aplicacoes: [...a.aplicacoes, aplicacao] } : a),
    }));
    e.currentTarget.reset();
    setTipoAndar('');
    toast.success('Aplicação registrada no andar!');
  };

  const handleClearAndar = () => {
    if (!andarSelecionado) return;
    if (!window.confirm('Limpar dados deste andar? (variedades, data de entrada, furos e aplicações)')) return;
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? { ...a, variedades: [], variedadeIds: [], dataEntrada: null, aplicacoes: [], furos: a.furos.map((f) => ({ ...f, status: 'vazio' as FuroStatus, variedadeId: undefined })), lavado: true, dataColheitaTotal: undefined }
          : a
      ),
    }));
    toast.success('Andar limpo!');
  };

  const handleDeleteMedicao = (medicaoId: string) => {
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) => c.id === caixa?.id ? { ...c, medicoes: c.medicoes.filter((m) => m.id !== medicaoId) } : c),
    }));
    toast.success('Medição removida!');
  };

  const handleDeleteAplicacaoCaixa = (aplicacaoId: string) => {
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) => c.id === caixa?.id ? { ...c, aplicacoes: c.aplicacoes.filter((a) => a.id !== aplicacaoId) } : c),
    }));
    toast.success('Aplicação removida!');
  };

  const handleDeleteAplicacaoAndar = (aplicacaoId: string) => {
    if (!andarSelecionado) return;
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => a.id === andarSelecionado.id ? { ...a, aplicacoes: a.aplicacoes.filter((ap) => ap.id !== aplicacaoId) } : a),
    }));
    toast.success('Aplicação removida!');
  };

  const handleRegistrarTransplantio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qtdTransplantada = parseInt(fd.get('qtdTransplantada') as string) || 0;
    const qtdDesperdicio = parseInt(fd.get('qtdDesperdicio') as string) || 0;

    if (!variedadeSelect) { toast.error('Selecione a variedade'); return; }

    const variedade = data.variedades.find((v) => v.id === variedadeSelect);
    const registro: RegistroTransplantio = {
      id: gerarId(),
      dataHora: new Date().toISOString(),
      faseOrigem: torre.fase === 'mudas' ? 'germinacao' : torre.fase === 'vegetativa' ? 'mudas' : 'vegetativa',
      faseDestino: torre.fase,
      variedadeId: variedadeSelect,
      variedadeNome: variedade?.nome || '',
      quantidadeTransplantada: qtdTransplantada,
      quantidadeDesperdicio: qtdDesperdicio,
      motivoDesperdicio: motivoDesperdicio || undefined,
      torreDestinoId: torre.id,
      andarDestinoId: andarSelecionado?.id,
    };

    updateData((prev) => ({
      ...prev,
      transplantios: [...prev.transplantios, registro],
    }));

    setShowTransplantio(false);
    setMotivoDesperdicio('');
    toast.success('Transplantio registrado!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/"><Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><ArrowLeft className="w-4 h-4" />Dashboard</Button></Link>
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
                {torre.andares} andares &middot; {fConfig.label} &middot; Ciclo {fConfig.diasCiclo}d (padrão)
              </p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <p className="font-display font-bold text-lg text-emerald-700">{totalPlantasTorre}</p>
                  <p className="text-[10px] text-muted-foreground">Plantas Ativas</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <p className="font-display font-bold text-lg text-amber-700">{totalColhidasTorre}</p>
                  <p className="text-[10px] text-muted-foreground">Colhidas</p>
                </div>
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
                  const varId = andar.variedadeIds?.[0];
                  const plantadas = contarPlantasAndar(andar);
                  const rest = andar.dataEntrada ? diasRestantes(andar.dataEntrada, torre.fase, varId, data.variedades, data.fasesConfig) : null;
                  const precisaLavar = andarPrecisaLavagem(andar);
                  const isSelected = andar.id === selectedAndar;

                  return (
                    <button
                      key={andar.id}
                      type="button"
                      onClick={() => setSelectedAndar(andar.id === selectedAndar ? null : andar.id)}
                      className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-all text-xs ${
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
                            <span className="text-[10px] text-emerald-600 font-medium">{plantadas}/36</span>
                          )}
                          {precisaLavar && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-semibold">LAVAR</span>
                          )}
                          {andar.variedades.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                              {andar.variedades.join(', ')}
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
                              <div>
                                {item._type === 'medicao' ? (
                                  <span className="flex items-center gap-1"><Beaker className="w-3 h-3 text-blue-500" />EC: {(item as MedicaoCaixa).ec} | pH: {(item as MedicaoCaixa).ph}</span>
                                ) : (
                                  <span className="flex items-center gap-1"><Plus className="w-3 h-3 text-emerald-500" />{(item as AplicacaoCaixa).produto} ({(item as AplicacaoCaixa).quantidade})</span>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatarDataHora(item.dataHora)}</p>
                              </div>
                              <button onClick={() => { if (item._type === 'medicao') handleDeleteMedicao(item.id); else handleDeleteAplicacaoCaixa(item.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Andar detail */}
            {andarSelecionado && (
              <motion.div key={andarSelecionado.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-display font-bold text-sm">Andar {andarSelecionado.numero}</h3>
                      {andarSelecionado.dataEntrada && (
                        <p className="text-[10px] text-muted-foreground">
                          {diasDecorridos(andarSelecionado.dataEntrada)}d &middot;
                          {labelPrevisao(torre.fase)}: {formatarData(dataPrevista(andarSelecionado.dataEntrada, torre.fase, andarSelecionado.variedadeIds?.[0], data.variedades, data.fasesConfig))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowTransplantio(true)}>
                      <Sprout className="w-3 h-3" /> Transplantio
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleClearAndar}>
                      <Trash2 className="w-3 h-3 mr-1" /> Limpar
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
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300" onClick={handleMarcarLavado}>
                      <CheckCircle2 className="w-3 h-3" /> Marcar Lavado
                    </Button>
                  </div>
                )}

                <div className="p-4">
                  <Tabs defaultValue="furos">
                    <TabsList className="w-full mb-3">
                      <TabsTrigger value="furos" className="flex-1 text-xs">Perfis/Furos</TabsTrigger>
                      <TabsTrigger value="dados" className="flex-1 text-xs">Dados</TabsTrigger>
                      <TabsTrigger value="aplicar" className="flex-1 text-xs">Aplicação</TabsTrigger>
                      <TabsTrigger value="hist" className="flex-1 text-xs">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="furos">
                      {/* Modo selector */}
                      <div className="flex gap-2 mb-3">
                        {(['visualizacao', 'transplantio', 'colheita'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModoFuros(m)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              modoFuros === m
                                ? m === 'transplantio' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : m === 'colheita' ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                            }`}
                          >
                            {m === 'visualizacao' ? 'Visualizar' : m === 'transplantio' ? 'Plantar' : 'Colher'}
                          </button>
                        ))}
                      </div>

                      {/* Variedade select for transplantio */}
                      {modoFuros !== 'visualizacao' && (
                        <div className="mb-3">
                          <Label className="text-xs">Variedade</Label>
                          <Select value={variedadeSelect} onValueChange={setVariedadeSelect}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione variedade..." />
                            </SelectTrigger>
                            <SelectContent>
                              {data.variedades.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.nome} ({torre.fase === 'mudas' ? v.diasMudas : torre.fase === 'vegetativa' ? v.diasVegetativa : v.diasMaturacao}d)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <PerfilFurosGrid
                        furos={andarSelecionado.furos || []}
                        modo={modoFuros}
                        onFuroToggle={handleFuroToggle}
                        onPerfilToggle={handlePerfilToggle}
                        onAndarTodo={handleAndarTodo}
                        variedadeNome={data.variedades.find((v) => v.id === variedadeSelect)?.nome}
                      />
                    </TabsContent>

                    <TabsContent value="dados">
                      <form onSubmit={handleUpdateAndar} className="space-y-3">
                        <div>
                          <Label className="text-xs">Variedades (separar por vírgula)</Label>
                          <Input name="variedades" defaultValue={andarSelecionado.variedades.join(', ')} placeholder="Ex: Alface Crespa, Rúcula" className="h-9 text-sm" list="variedades-list" />
                          <datalist id="variedades-list">{data.variedades.map((v) => (<option key={v.id} value={v.nome} />))}</datalist>
                        </div>
                        <div>
                          <Label className="text-xs">Data de Entrada</Label>
                          <Input name="dataEntrada" type="date" defaultValue={andarSelecionado.dataEntrada ? new Date(andarSelecionado.dataEntrada).toISOString().split('T')[0] : ''} className="h-9 text-sm" />
                        </div>
                        {andarSelecionado.dataEntrada && (
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/50">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Dias Decorridos</p>
                              <p className="font-display font-bold text-lg">{diasDecorridos(andarSelecionado.dataEntrada)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">{labelPrevisao(torre.fase)} em</p>
                              <p className={`font-display font-bold text-lg ${
                                (diasRestantes(andarSelecionado.dataEntrada, torre.fase, andarSelecionado.variedadeIds?.[0], data.variedades, data.fasesConfig) ?? 999) <= 0 ? 'text-red-600' :
                                (diasRestantes(andarSelecionado.dataEntrada, torre.fase, andarSelecionado.variedadeIds?.[0], data.variedades, data.fasesConfig) ?? 999) <= 3 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {diasRestantes(andarSelecionado.dataEntrada, torre.fase, andarSelecionado.variedadeIds?.[0], data.variedades, data.fasesConfig)}d
                              </p>
                            </div>
                          </div>
                        )}
                        <Button type="submit" size="sm" className="w-full">Salvar Dados do Andar</Button>
                      </form>
                    </TabsContent>

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
                                  <p className="text-[10px] text-muted-foreground">{TIPOS_APLICACAO_ANDAR.find((t) => t.value === apl.tipo)?.label} &middot; {formatarDataHora(apl.dataHora)}</p>
                                </div>
                                <button onClick={() => handleDeleteAplicacaoAndar(apl.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Transplantio dialog */}
            <Dialog open={showTransplantio} onOpenChange={setShowTransplantio}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-display">Registrar Transplantio</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarTransplantio} className="space-y-4">
                  <div>
                    <Label className="text-xs">Variedade</Label>
                    <Select value={variedadeSelect} onValueChange={setVariedadeSelect}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{data.variedades.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Transplantadas</Label><Input name="qtdTransplantada" type="number" min="0" placeholder="0" className="h-9 text-sm" /></div>
                    <div><Label className="text-xs">Desperdício</Label><Input name="qtdDesperdicio" type="number" min="0" placeholder="0" className="h-9 text-sm" /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Motivo do Desperdício</Label>
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
