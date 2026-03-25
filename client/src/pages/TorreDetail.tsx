// ============================================================
// TorreDetail — Painel detalhado de uma torre
// Inclui caixa d'água, andares clicáveis, formulários de input
// Select components use controlled state for proper form handling
// ============================================================

import { useParams, Link } from 'wouter';
import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG } from '@/lib/types';
import type { MedicaoCaixa, AplicacaoCaixa, AplicacaoAndar } from '@/lib/types';
import {
  diasDecorridos,
  diasRestantes,
  dataPrevista,
  labelPrevisao,
  formatarData,
  formatarDataHora,
  ecForaRange,
  phForaRange,
  gerarId,
  TIPOS_APLICACAO_CAIXA,
  TIPOS_APLICACAO_ANDAR,
  VARIEDADES_COMUNS,
} from '@/lib/utils-farm';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Droplets,
  Plus,
  AlertTriangle,
  Clock,
  Beaker,
  Leaf,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TorreDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, updateData } = useFazenda();
  const [selectedAndar, setSelectedAndar] = useState<string | null>(null);

  // Controlled state for Select components
  const [tipoCaixa, setTipoCaixa] = useState<string>('');
  const [tipoAndar, setTipoAndar] = useState<string>('');

  const torre = data.torres.find((t) => t.id === id);
  if (!torre) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Torre não encontrada.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = FASES_CONFIG[torre.fase];
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const andares = data.andares
    .filter((a) => a.torreId === torre.id)
    .sort((a, b) => b.numero - a.numero);
  const andarSelecionado = andares.find((a) => a.id === selectedAndar);

  const badgeClass =
    torre.fase === 'mudas'
      ? 'badge-mudas'
      : torre.fase === 'vegetativa'
      ? 'badge-vegetativa'
      : 'badge-maturacao';

  const ultimaMedicao = caixa?.medicoes?.length
    ? caixa.medicoes[caixa.medicoes.length - 1]
    : null;

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  // ---- Handlers ----

  const handleAddMedicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const ec = parseFloat(fd.get('ec') as string);
    const ph = parseFloat(fd.get('ph') as string);
    const dataHora = fd.get('dataHora') as string;

    if (isNaN(ec) || isNaN(ph) || !dataHora) {
      toast.error('Preencha todos os campos');
      return;
    }

    const medicao: MedicaoCaixa = {
      id: gerarId(),
      ec,
      ph,
      dataHora: new Date(dataHora).toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) =>
        c.id === caixa?.id
          ? { ...c, medicoes: [...c.medicoes, medicao] }
          : c
      ),
    }));

    form.reset();
    toast.success('Medição registrada!');

    const ecStatus = ecForaRange(ec, torre.fase);
    const phStatus = phForaRange(ph, torre.fase);
    if (ecStatus !== 'ok') {
      toast.warning(`EC ${ecStatus === 'alto' ? 'acima' : 'abaixo'} do ideal (${config.ecMin}-${config.ecMax})`);
    }
    if (phStatus !== 'ok') {
      toast.warning(`pH ${phStatus === 'alto' ? 'acima' : 'abaixo'} do ideal (${config.phMin}-${config.phMax})`);
    }
  };

  const handleAddAplicacaoCaixa = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const produto = fd.get('produto') as string;
    const quantidade = fd.get('quantidade') as string;
    const dataHora = fd.get('dataHora') as string;

    if (!tipoCaixa || !produto || !dataHora) {
      toast.error('Preencha todos os campos');
      return;
    }

    const aplicacao: AplicacaoCaixa = {
      id: gerarId(),
      tipo: tipoCaixa as AplicacaoCaixa['tipo'],
      produto,
      quantidade,
      dataHora: new Date(dataHora).toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) =>
        c.id === caixa?.id
          ? { ...c, aplicacoes: [...c.aplicacoes, aplicacao] }
          : c
      ),
    }));

    form.reset();
    setTipoCaixa('');
    toast.success('Aplicação registrada na caixa d\'água!');
  };

  const handleUpdateAndar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!andarSelecionado) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const variedades = (fd.get('variedades') as string).split(',').map((v) => v.trim()).filter(Boolean);
    const dataEntrada = fd.get('dataEntrada') as string;

    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? {
              ...a,
              variedades,
              dataEntrada: dataEntrada ? new Date(dataEntrada).toISOString() : a.dataEntrada,
            }
          : a
      ),
    }));

    toast.success(`Andar ${andarSelecionado.numero} atualizado!`);
  };

  const handleAddAplicacaoAndar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!andarSelecionado) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const produto = fd.get('produto') as string;
    const quantidade = fd.get('quantidade') as string;
    const dataHora = fd.get('dataHora') as string;

    if (!tipoAndar || !produto || !dataHora) {
      toast.error('Preencha todos os campos');
      return;
    }

    const aplicacao: AplicacaoAndar = {
      id: gerarId(),
      tipo: tipoAndar as AplicacaoAndar['tipo'],
      produto,
      quantidade,
      dataHora: new Date(dataHora).toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? { ...a, aplicacoes: [...a.aplicacoes, aplicacao] }
          : a
      ),
    }));

    form.reset();
    setTipoAndar('');
    toast.success('Aplicação registrada no andar!');
  };

  const handleClearAndar = () => {
    if (!andarSelecionado) return;
    if (!window.confirm('Limpar dados deste andar? (variedades, data de entrada e aplicações)')) return;
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? { ...a, variedades: [], dataEntrada: null, aplicacoes: [] }
          : a
      ),
    }));
    toast.success('Andar limpo!');
  };

  const handleDeleteMedicao = (medicaoId: string) => {
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) =>
        c.id === caixa?.id
          ? { ...c, medicoes: c.medicoes.filter((m) => m.id !== medicaoId) }
          : c
      ),
    }));
    toast.success('Medição removida!');
  };

  const handleDeleteAplicacaoCaixa = (aplicacaoId: string) => {
    updateData((prev) => ({
      ...prev,
      caixasAgua: prev.caixasAgua.map((c) =>
        c.id === caixa?.id
          ? { ...c, aplicacoes: c.aplicacoes.filter((a) => a.id !== aplicacaoId) }
          : c
      ),
    }));
    toast.success('Aplicação removida!');
  };

  const handleDeleteAplicacaoAndar = (aplicacaoId: string) => {
    if (!andarSelecionado) return;
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) =>
        a.id === andarSelecionado.id
          ? { ...a, aplicacoes: a.aplicacoes.filter((ap) => ap.id !== aplicacaoId) }
          : a
      ),
    }));
    toast.success('Aplicação removida!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {torre.nome}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tower visualization + Andares */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl shadow-sm border overflow-hidden"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg">{torre.nome}</h2>
                  <p className="text-xs text-muted-foreground">
                    {torre.andares} andares &middot; {config.label} &middot; Ciclo {config.diasCiclo} dias
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                  {config.label}
                </span>
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Clique em um andar para editar
                </p>
                <div className="space-y-1.5">
                  {andares.map((andar) => {
                    const ocupado = !!andar.dataEntrada;
                    const dias = diasDecorridos(andar.dataEntrada);
                    const rest = diasRestantes(andar.dataEntrada, torre.fase);
                    const isSelected = selectedAndar === andar.id;
                    const isVencido = rest !== null && rest <= 0;
                    const isProximo = rest !== null && rest > 0 && rest <= 3;

                    let statusColor = 'bg-muted text-muted-foreground';
                    if (ocupado) {
                      if (isVencido) statusColor = 'bg-red-100 text-red-700 border-red-300';
                      else if (isProximo) statusColor = 'bg-amber-100 text-amber-700 border-amber-300';
                      else statusColor = torre.fase === 'mudas' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : torre.fase === 'vegetativa' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-orange-50 text-orange-700 border-orange-200';
                    }

                    return (
                      <button
                        key={andar.id}
                        onClick={() => setSelectedAndar(andar.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${statusColor} ${
                          isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:shadow-sm'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-md bg-white/60 flex items-center justify-center font-display font-bold text-xs shrink-0">
                          {andar.numero}
                        </span>
                        <div className="flex-1 min-w-0">
                          {ocupado ? (
                            <>
                              <p className="font-medium text-xs truncate">
                                {andar.variedades.length > 0 ? andar.variedades.join(', ') : 'Sem variedade definida'}
                              </p>
                              <p className="text-[10px] opacity-70">
                                {dias} dias &middot; {labelPrevisao(torre.fase)}: {rest !== null ? (rest > 0 ? `${rest}d restantes` : 'Pronto!') : '-'}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs opacity-60">Vazio</p>
                          )}
                        </div>
                        {isVencido && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                        {isProximo && !isVencido && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                        {andar.aplicacoes.length > 0 && (
                          <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded-full shrink-0">
                            {andar.aplicacoes.length} apl.
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Caixa d'água */}
            {caixa && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-xl shadow-sm border overflow-hidden"
              >
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-display font-bold text-sm">{caixa.nome}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Atende: {caixa.torreIds.map((tid) => data.torres.find((t) => t.id === tid)?.nome).filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Valores atuais */}
                <div className="p-4 border-b">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">EC Atual</p>
                      <p className={`text-2xl font-display font-bold ${
                        ultimaMedicao
                          ? ecForaRange(ultimaMedicao.ec, torre.fase) !== 'ok'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                          : 'text-muted-foreground'
                      }`}>
                        {ultimaMedicao?.ec?.toFixed(1) || '-'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Alvo: {config.ecMin}-{config.ecMax}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">pH Atual</p>
                      <p className={`text-2xl font-display font-bold ${
                        ultimaMedicao
                          ? phForaRange(ultimaMedicao.ph, torre.fase) !== 'ok'
                            ? 'text-red-600'
                            : 'text-emerald-600'
                          : 'text-muted-foreground'
                      }`}>
                        {ultimaMedicao?.ph?.toFixed(1) || '-'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Alvo: {config.phMin}-{config.phMax}
                      </p>
                    </div>
                  </div>
                  {ultimaMedicao && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Medido em {formatarDataHora(ultimaMedicao.dataHora)}
                    </p>
                  )}
                </div>

                {/* Forms */}
                <div className="p-4">
                  <Tabs defaultValue="medicao" className="w-full">
                    <TabsList className="w-full mb-3">
                      <TabsTrigger value="medicao" className="flex-1 text-xs">
                        <Beaker className="w-3 h-3 mr-1" /> Medição
                      </TabsTrigger>
                      <TabsTrigger value="aplicacao" className="flex-1 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Aplicação
                      </TabsTrigger>
                      <TabsTrigger value="historico" className="flex-1 text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Histórico
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="medicao">
                      <form onSubmit={handleAddMedicao} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">EC</Label>
                            <Input name="ec" type="number" step="0.1" min="0" max="10" placeholder="1.5" className="h-9 text-sm" required />
                          </div>
                          <div>
                            <Label className="text-xs">pH</Label>
                            <Input name="ph" type="number" step="0.1" min="0" max="14" placeholder="6.0" className="h-9 text-sm" required />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Data/Hora</Label>
                          <Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required />
                        </div>
                        <Button type="submit" size="sm" className="w-full">
                          Registrar Medição
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="aplicacao">
                      <form onSubmit={handleAddAplicacaoCaixa} className="space-y-3">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={tipoCaixa} onValueChange={setTipoCaixa}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_APLICACAO_CAIXA.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Produto</Label>
                          <Input name="produto" placeholder="Ex: Ácido fosfórico" className="h-9 text-sm" required />
                        </div>
                        <div>
                          <Label className="text-xs">Quantidade</Label>
                          <Input name="quantidade" placeholder="Ex: 5ml" className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Data/Hora</Label>
                          <Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required />
                        </div>
                        <Button type="submit" size="sm" className="w-full">
                          Registrar Aplicação
                        </Button>
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
                                  <span className="flex items-center gap-1">
                                    <Beaker className="w-3 h-3 text-blue-500" />
                                    EC: {(item as MedicaoCaixa).ec} | pH: {(item as MedicaoCaixa).ph}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <Plus className="w-3 h-3 text-emerald-500" />
                                    {(item as AplicacaoCaixa).produto} ({(item as AplicacaoCaixa).quantidade})
                                  </span>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatarDataHora(item.dataHora)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  if (item._type === 'medicao') handleDeleteMedicao(item.id);
                                  else handleDeleteAplicacaoCaixa(item.id);
                                }}
                                className="text-muted-foreground hover:text-destructive p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Andar detail panel */}
            {andarSelecionado && (
              <motion.div
                key={andarSelecionado.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl shadow-sm border overflow-hidden"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="font-display font-bold text-sm">Andar {andarSelecionado.numero}</h3>
                      {andarSelecionado.dataEntrada && (
                        <p className="text-[10px] text-muted-foreground">
                          {diasDecorridos(andarSelecionado.dataEntrada)} dias &middot;
                          {labelPrevisao(torre.fase)}: {formatarData(dataPrevista(andarSelecionado.dataEntrada, torre.fase))}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={handleClearAndar}>
                    <Trash2 className="w-3 h-3 mr-1" /> Limpar
                  </Button>
                </div>

                <div className="p-4">
                  <Tabs defaultValue="dados">
                    <TabsList className="w-full mb-3">
                      <TabsTrigger value="dados" className="flex-1 text-xs">Dados</TabsTrigger>
                      <TabsTrigger value="aplicar" className="flex-1 text-xs">Aplicação</TabsTrigger>
                      <TabsTrigger value="hist" className="flex-1 text-xs">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados">
                      <form onSubmit={handleUpdateAndar} className="space-y-3">
                        <div>
                          <Label className="text-xs">Variedades (separar por vírgula)</Label>
                          <Input
                            name="variedades"
                            defaultValue={andarSelecionado.variedades.join(', ')}
                            placeholder="Ex: Alface Crespa, Rúcula"
                            className="h-9 text-sm"
                            list="variedades-list"
                          />
                          <datalist id="variedades-list">
                            {VARIEDADES_COMUNS.map((v) => (
                              <option key={v} value={v} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <Label className="text-xs">Data de Entrada</Label>
                          <Input
                            name="dataEntrada"
                            type="date"
                            defaultValue={andarSelecionado.dataEntrada ? new Date(andarSelecionado.dataEntrada).toISOString().split('T')[0] : ''}
                            className="h-9 text-sm"
                          />
                        </div>

                        {andarSelecionado.dataEntrada && (
                          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/50">
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">Dias Decorridos</p>
                              <p className="font-display font-bold text-lg">
                                {diasDecorridos(andarSelecionado.dataEntrada)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-muted-foreground">{labelPrevisao(torre.fase)} em</p>
                              <p className={`font-display font-bold text-lg ${
                                (diasRestantes(andarSelecionado.dataEntrada, torre.fase) ?? 999) <= 0
                                  ? 'text-red-600'
                                  : (diasRestantes(andarSelecionado.dataEntrada, torre.fase) ?? 999) <= 3
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}>
                                {diasRestantes(andarSelecionado.dataEntrada, torre.fase)}d
                              </p>
                            </div>
                          </div>
                        )}

                        <Button type="submit" size="sm" className="w-full">
                          Salvar Dados do Andar
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="aplicar">
                      <form onSubmit={handleAddAplicacaoAndar} className="space-y-3">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={tipoAndar} onValueChange={setTipoAndar}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_APLICACAO_ANDAR.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Produto</Label>
                          <Input name="produto" placeholder="Ex: Solução nutritiva A" className="h-9 text-sm" required />
                        </div>
                        <div>
                          <Label className="text-xs">Quantidade</Label>
                          <Input name="quantidade" placeholder="Ex: 10ml" className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Data/Hora</Label>
                          <Input name="dataHora" type="datetime-local" defaultValue={localDatetime} className="h-9 text-sm" required />
                        </div>
                        <Button type="submit" size="sm" className="w-full">
                          Registrar Aplicação
                        </Button>
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
                                  <p className="text-[10px] text-muted-foreground">
                                    {TIPOS_APLICACAO_ANDAR.find((t) => t.value === apl.tipo)?.label} &middot; {formatarDataHora(apl.dataHora)}
                                  </p>
                                </div>
                                <button onClick={() => handleDeleteAplicacaoAndar(apl.id)} className="text-muted-foreground hover:text-destructive p-1">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Help when no andar selected */}
            {!andarSelecionado && (
              <div className="bg-muted/30 rounded-xl border border-dashed p-6 text-center">
                <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Selecione um andar na lista à esquerda para ver detalhes e registrar dados.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
