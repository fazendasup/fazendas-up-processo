// ============================================================
// BancadaDetail — operação da bancada (hidroponia): plantio da linha, EC/pH, aplicações
// Plantio é único por bancada (como variedade+entrada no perfil da torre), sem andar/perfil.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import Header from "@/components/Header";
import { useFazenda } from "@/contexts/FazendaContext";
import { useAgendaModal } from "@/contexts/AgendaModalContext";
import { FASES_CONFIG, type Fase } from "@/lib/types";
import {
  ecForaRange,
  phForaRange,
  formatarData,
  formatarDataHora,
  TIPOS_APLICACAO_CAIXA,
  dataPrevista,
  cicloPrazoOptsFromFazenda,
  diasDecorridos,
  labelPrevisao,
  resolverDataPlantioCampo,
  valorCampoDataPlantio,
  type ModoDataPlantio,
} from "@/lib/utils-farm";
import { PlantioModoDataSelector, labelCampoDataPlantio } from "@/components/PlantioModoDataSelector";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Droplets,
  Leaf,
  Trash2,
  ClipboardList,
  CalendarClock,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function numFromDb(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function entradaNoFuturo(d: Date | null): boolean {
  if (!d) return true;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime() <= hoje.getTime();
}

export default function BancadaDetail() {
  const { id } = useParams<{ id: string }>();
  const bancadaId = Number(id);
  const { data } = useFazenda();
  const { openAgenda } = useAgendaModal();
  const resolver = useDbIdResolver();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();

  const [tipoAplicacao, setTipoAplicacao] = useState("");

  const bancadaQuery = trpc.bancadas.getById.useQuery(
    { id: bancadaId },
    { enabled: Number.isFinite(bancadaId) && bancadaId > 0 },
  );
  const medicoesQuery = trpc.medicoesBancada.listByBancada.useQuery(
    { bancadaId },
    { enabled: Number.isFinite(bancadaId) && bancadaId > 0 },
  );
  const aplicacoesQuery = trpc.aplicacoesBancada.listByBancada.useQuery(
    { bancadaId },
    { enabled: Number.isFinite(bancadaId) && bancadaId > 0 },
  );
  const createMed = trpc.medicoesBancada.create.useMutation({
    onSuccess: async () => {
      toast.success("Medição registrada");
      await utils.medicoesBancada.listByBancada.invalidate({ bancadaId });
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const deleteMed = trpc.medicoesBancada.delete.useMutation({
    onSuccess: async () => {
      toast.success("Medição removida");
      await utils.medicoesBancada.listByBancada.invalidate({ bancadaId });
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const createApl = trpc.aplicacoesBancada.create.useMutation({
    onSuccess: async () => {
      toast.success("Aplicação registrada");
      await utils.aplicacoesBancada.listByBancada.invalidate({ bancadaId });
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const deleteApl = trpc.aplicacoesBancada.delete.useMutation({
    onSuccess: async () => {
      toast.success("Aplicação removida");
      await utils.aplicacoesBancada.listByBancada.invalidate({ bancadaId });
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const updatePlantio = trpc.bancadas.updatePlantio.useMutation({
    onSuccess: async () => {
      await utils.bancadas.getById.invalidate({ id: bancadaId });
      await utils.bancadas.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const colheitasQuery = trpc.registrosColheita.listByBancada.useQuery(
    { bancadaId },
    { enabled: Number.isFinite(bancadaId) && bancadaId > 0 },
  );
  const createColheita = trpc.registrosColheita.create.useMutation({
    onSuccess: async () => {
      toast.success("Colheita registrada");
      await Promise.all([
        utils.registrosColheita.listByBancada.invalidate({ bancadaId }),
        utils.bancadas.getById.invalidate({ id: bancadaId }),
        utils.bancadas.list.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message || "Erro ao registrar colheita"),
  });

  const b = bancadaQuery.data;
  const fase = (b?.fase as Fase) || "vegetativa";
  const fConfig = data.fasesConfig?.[fase] || FASES_CONFIG[fase];

  const medicoes = medicoesQuery.data ?? [];
  const aplicacoes = aplicacoesQuery.data ?? [];

  const [bulkVariedade, setBulkVariedade] = useState("");
  const [bulkDataEntrada, setBulkDataEntrada] = useState("");
  const [modoDataPlantio, setModoDataPlantio] = useState<ModoDataPlantio>("plantio");

  const plantioVarSlug = useMemo(() => {
    if (!b?.plantioVariedadeId) return undefined;
    for (const v of data.variedades) {
      if (resolver.varSlugToId.get(v.id) === b.plantioVariedadeId) return v.id;
    }
    return undefined;
  }, [b?.plantioVariedadeId, data.variedades, resolver.varSlugToId]);

  useEffect(() => {
    if (!b) return;
    let slug = "";
    for (const v of data.variedades) {
      if (resolver.varSlugToId.get(v.id) === b.plantioVariedadeId) {
        slug = v.id;
        break;
      }
    }
    setBulkVariedade(slug);
    const cicloOpts = cicloPrazoOptsFromFazenda(data);
    setBulkDataEntrada(
      valorCampoDataPlantio(
        modoDataPlantio,
        b.plantioDataEntrada ? String(b.plantioDataEntrada) : null,
        fase,
        slug || plantioVarSlug,
        data.variedades,
        cicloOpts,
      ),
    );
  }, [b?.id, b?.plantioVariedadeId, b?.plantioDataEntrada, data.variedades, resolver, modoDataPlantio, fase, plantioVarSlug]);

  const persistPlantio = async (input: {
    plantioVariedadeId: number | null;
    plantioDataEntrada: Date | null;
  }) => {
    const slug =
      input.plantioVariedadeId != null
        ? data.variedades.find((v) => resolver.varSlugToId.get(v.id) === input.plantioVariedadeId)?.id
        : undefined;
    let prev: Date | null = null;
    if (input.plantioDataEntrada && slug) {
      const prevStr = dataPrevista(
        input.plantioDataEntrada.toISOString(),
        fase,
        slug,
        data.variedades,
        cicloPrazoOptsFromFazenda(data),
      );
      prev = prevStr ? new Date(prevStr) : null;
    }
    await updatePlantio.mutateAsync({
      id: bancadaId,
      plantioVariedadeId: input.plantioVariedadeId,
      plantioDataEntrada: input.plantioDataEntrada,
      plantioPrevisaoColheita: prev,
    });
  };

  const validarAntesPlantio = (opts: { vaiAtivar?: boolean; variedadeIdDb?: number | null; dataEntrada?: Date | null }) => {
    if (opts.vaiAtivar && !opts.variedadeIdDb) {
      return { ok: false as const, reason: "Não é possível ativar perfis sem variedade." };
    }
    const bHasDate = !!b?.plantioDataEntrada;
    if (opts.vaiAtivar && !opts.dataEntrada && !bHasDate) {
      const ok = window.confirm(
        "Você está ativando perfis sem data de entrada. Isso pode bagunçar previsões/alertas. Continuar mesmo assim?",
      );
      if (!ok) return { ok: false as const, reason: "Sem data" };
    }
    if (opts.dataEntrada && !entradaNoFuturo(opts.dataEntrada)) {
      return { ok: false as const, reason: "Data de entrada no futuro." };
    }
    return { ok: true as const };
  };

  const handleSalvarData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!b) return;
    const fd = new FormData(e.currentTarget);
    const dataEntradaRaw = fd.get("dataEntrada") as string;
    const cicloOpts = cicloPrazoOptsFromFazenda(data);
    const dateVal = dataEntradaRaw
      ? resolverDataPlantioCampo(
          modoDataPlantio,
          dataEntradaRaw,
          fase,
          plantioVarSlug,
          data.variedades,
          cicloOpts,
        )
      : null;
    if (dataEntradaRaw && !dateVal) {
      toast.error(
        plantioVarSlug
          ? "Não foi possível calcular o plantio a partir da data alvo."
          : "Selecione a variedade para usar a data alvo.",
      );
      return;
    }
    if (!entradaNoFuturo(dateVal)) {
      toast.error("Data de entrada no futuro.");
      return;
    }
    const currentVarId = b.plantioVariedadeId ?? null;
    try {
      await persistPlantio({
        plantioVariedadeId: currentVarId,
        plantioDataEntrada: dateVal,
      });
      toast.success("Data de entrada da bancada atualizada!");
    } catch {
      /* onError já emite toast */
    }
  };

  const handleLimparPlantio = async () => {
    if (!window.confirm("Limpar dados de plantio desta bancada? (variedade e data de entrada)")) return;
    try {
      await updatePlantio.mutateAsync({
        id: bancadaId,
        plantioVariedadeId: null,
        plantioDataEntrada: null,
        plantioPrevisaoColheita: null,
      });
      toast.success("Plantio limpo!");
    } catch {
      /* onError já emite toast */
    }
  };

  const ultimaMedicao = medicoes[0] ?? null;
  const ecUlt = ultimaMedicao ? numFromDb(ultimaMedicao.ec) : null;
  const phUlt = ultimaMedicao ? numFromDb(ultimaMedicao.ph) : null;

  const historicoMerged = useMemo(() => {
    const m = medicoes.map((x) => ({
      kind: "medicao" as const,
      id: x.id,
      t: new Date(x.createdAt as unknown as string).getTime(),
      row: x,
    }));
    const a = aplicacoes.map((x) => ({
      kind: "aplicacao" as const,
      id: x.id,
      t: new Date(x.createdAt as unknown as string).getTime(),
      row: x,
    }));
    return [...m, ...a].sort((u, v) => v.t - u.t).slice(0, 30);
  }, [medicoes, aplicacoes]);

  const handleAddMedicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ec = parseFloat(fd.get("ec") as string);
    const ph = parseFloat(fd.get("ph") as string);
    if (Number.isNaN(ec) || Number.isNaN(ph)) {
      toast.error("Preencha EC e pH");
      return;
    }
    const ta = parseFloat(fd.get("temperaturaAgua") as string);
    const um = parseFloat(fd.get("umidade") as string);
    createMed.mutate({
      bancadaId,
      ec,
      ph,
      temperaturaAgua: Number.isFinite(ta) ? ta : null,
      umidade: Number.isFinite(um) ? um : null,
    });
    e.currentTarget.reset();
    if (ecForaRange(ec, fase, data.fasesConfig) !== "ok")
      toast.warning(`EC fora do ideal (${fConfig.ecMin}-${fConfig.ecMax})`);
    if (phForaRange(ph, fase, data.fasesConfig) !== "ok")
      toast.warning(`pH fora do ideal (${fConfig.phMin}-${fConfig.phMax})`);
  };

  const handleAddAplicacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const produto = (fd.get("produto") as string)?.trim();
    const quantidadeRaw = (fd.get("quantidade") as string)?.trim();
    const quantidade = quantidadeRaw ? parseFloat(quantidadeRaw.replace(",", ".")) : undefined;
    if (!tipoAplicacao || !produto) {
      toast.error("Tipo e produto são obrigatórios");
      return;
    }
    createApl.mutate({
      bancadaId,
      tipoAplicacao: tipoAplicacao,
      produto,
      quantidade: quantidade !== undefined && !Number.isNaN(quantidade) ? quantidade : undefined,
      unidade: (fd.get("unidade") as string)?.trim() || undefined,
    });
    e.currentTarget.reset();
    setTipoAplicacao("");
  };

  const colheitas = colheitasQuery.data ?? [];
  const plantioVarNome = useMemo(() => {
    if (!b?.plantioVariedadeId) return null;
    return data.variedades.find((v) => resolver.varSlugToId.get(v.id) === b.plantioVariedadeId)?.nome ?? null;
  }, [b?.plantioVariedadeId, data.variedades, resolver.varSlugToId]);

  const handleRegistrarColheita = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!b) return;
    if (!b.plantioVariedadeId) {
      toast.error("Defina a variedade do plantio antes de registrar a colheita.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const pesoRaw = (fd.get("peso") as string)?.trim();
    const peso = pesoRaw ? parseFloat(pesoRaw.replace(",", ".")) : NaN;
    const qtdRaw = (fd.get("quantidade") as string)?.trim();
    const qtd = qtdRaw ? parseInt(qtdRaw, 10) : (b.quantidadeCaixas || 1);
    createColheita.mutate(
      {
        bancadaId,
        variedadeId: b.plantioVariedadeId,
        variedadeNome: plantioVarNome,
        dataColheita: new Date(),
        quantidadePlantas: Number.isFinite(qtd) && qtd > 0 ? qtd : 1,
        pesoTotalGramas: Number.isFinite(peso) ? peso : null,
        qualidade: (fd.get("qualidade") as string) || "B",
        destino: (fd.get("destino") as string) || null,
        observacoes: (fd.get("observacoes") as string)?.trim() || null,
      },
      { onSuccess: () => e.currentTarget?.reset?.() },
    );
  };

  if (!Number.isFinite(bancadaId) || bancadaId < 1) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Identificador de bancada inválido.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              Voltar ao painel
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (bancadaQuery.isError || (!bancadaQuery.isLoading && !b)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Bancada não encontrada ou sem acesso.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              Voltar ao painel
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (b.ativa === false || b.status !== "ativa") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Esta bancada está inativa — reative-a em Configurações.</p>
          <Link href="/config">
            <Button variant="outline" className="mt-4">
              Configurações
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Painel
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-1">
              <Droplets className="w-6 h-6" />
              <span className="text-xs font-semibold uppercase tracking-wide">Bancada</span>
            </div>
            <h1 className="font-display text-2xl font-bold">{b.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {FASES_CONFIG[fase].label} · {b.quantidadeCaixas} caixa(s)
              {b.codigo && <span className="font-mono ml-2">{b.codigo}</span>}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/planejamento" className="no-underline">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Plantio (planeamento)
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/ciclos" className="no-underline">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Ciclos de solução
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" type="button" onClick={() => openAgenda()}>
                Agenda do dia
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 text-right shrink-0">
            <p className="text-[10px] text-muted-foreground mb-1">Referência {FASES_CONFIG[fase].label}</p>
            <p className="text-xs">
              EC {fConfig.ecMin}–{fConfig.ecMax} · pH {fConfig.phMin}–{fConfig.phMax}
            </p>
            {ultimaMedicao && ecUlt != null && phUlt != null && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <span
                  className={`text-sm font-bold ${ecForaRange(ecUlt, fase, data.fasesConfig) !== "ok" ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  EC {ecUlt}
                </span>
                <span
                  className={`text-sm font-bold ${phForaRange(phUlt, fase, data.fasesConfig) !== "ok" ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  pH {phUlt}
                </span>
              </div>
            )}
            {ultimaMedicao && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Última: {formatarDataHora(String(ultimaMedicao.createdAt))}
              </p>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl shadow-sm border overflow-hidden"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-display font-bold text-sm">Plantio</h3>
              </div>
              {b.plantioDataEntrada && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {diasDecorridos(
                    typeof b.plantioDataEntrada === "string"
                      ? b.plantioDataEntrada
                      : new Date(b.plantioDataEntrada).toISOString(),
                    cicloPrazoOptsFromFazenda(data),
                  )}
                  d decorridos
                  {(() => {
                    const entradaIso =
                      typeof b.plantioDataEntrada === "string"
                        ? new Date(b.plantioDataEntrada).toISOString()
                        : (b.plantioDataEntrada as Date).toISOString();
                    const prev = dataPrevista(
                      entradaIso,
                      fase,
                      plantioVarSlug,
                      data.variedades,
                      cicloPrazoOptsFromFazenda(data),
                    );
                    return prev ? ` · ${labelPrevisao(fase)}: ${formatarData(prev)}` : "";
                  })()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" className="text-xs text-destructive h-9 px-3" onClick={handleLimparPlantio}>
                <Trash2 className="w-4 h-4 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <div className="p-4">
            <form
              onSubmit={handleSalvarData}
              className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed space-y-3"
            >
              <PlantioModoDataSelector
                value={modoDataPlantio}
                onChange={setModoDataPlantio}
                fase={fase}
              />
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">{labelCampoDataPlantio(modoDataPlantio, fase)}</Label>
                  <Input
                    name="dataEntrada"
                    type="date"
                    defaultValue={valorCampoDataPlantio(
                      modoDataPlantio,
                      b.plantioDataEntrada ? String(b.plantioDataEntrada) : null,
                      fase,
                      plantioVarSlug,
                      data.variedades,
                      cicloPrazoOptsFromFazenda(data),
                    )}
                    className="h-10 text-sm"
                    key={`${b.id}-date-${modoDataPlantio}-${b.plantioDataEntrada || "empty"}`}
                  />
                </div>
                <Button type="submit" className="h-10 text-sm px-4" disabled={updatePlantio.isPending}>
                  Salvar Data
                </Button>
              </div>
            </form>

            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed space-y-3">
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
                  <Label className="text-xs">{labelCampoDataPlantio(modoDataPlantio, fase)}</Label>
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
                    disabled={updatePlantio.isPending}
                    onClick={async () => {
                      const varDbId = bulkVariedade ? (resolver.varSlugToId.get(bulkVariedade) ?? null) : null;
                      const slug = bulkVariedade || plantioVarSlug;
                      const cicloOpts = cicloPrazoOptsFromFazenda(data);
                      const dt = bulkDataEntrada
                        ? resolverDataPlantioCampo(
                            modoDataPlantio,
                            bulkDataEntrada,
                            fase,
                            slug,
                            data.variedades,
                            cicloOpts,
                          )
                        : null;
                      if (bulkDataEntrada && !dt) {
                        toast.error(
                          slug
                            ? "Não foi possível calcular o plantio a partir da data alvo."
                            : "Selecione a variedade para usar a data alvo.",
                        );
                        return;
                      }
                      const mergedDt =
                        dt ?? (b.plantioDataEntrada ? new Date(b.plantioDataEntrada as string | Date) : null);
                      const valid = validarAntesPlantio({
                        vaiAtivar: true,
                        variedadeIdDb: varDbId,
                        dataEntrada: mergedDt,
                      });
                      if (!valid.ok) {
                        toast.error(valid.reason);
                        return;
                      }
                      try {
                        await persistPlantio({
                          plantioVariedadeId: varDbId,
                          plantioDataEntrada: mergedDt,
                        });
                        toast.success("Perfis ativados");
                      } catch {
                        /* onError já emite toast */
                      }
                    }}
                  >
                    Ativar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs"
                    disabled={updatePlantio.isPending}
                    onClick={async () => {
                      const varDbId = bulkVariedade ? (resolver.varSlugToId.get(bulkVariedade) ?? null) : null;
                      const slug = bulkVariedade || plantioVarSlug;
                      const cicloOpts = cicloPrazoOptsFromFazenda(data);
                      const dt = bulkDataEntrada
                        ? resolverDataPlantioCampo(
                            modoDataPlantio,
                            bulkDataEntrada,
                            fase,
                            slug,
                            data.variedades,
                            cicloOpts,
                          )
                        : null;
                      if (bulkDataEntrada && !dt) {
                        toast.error(
                          slug
                            ? "Não foi possível calcular o plantio a partir da data alvo."
                            : "Selecione a variedade para usar a data alvo.",
                        );
                        return;
                      }
                      const nextVar = varDbId ?? b.plantioVariedadeId ?? null;
                      const nextDt =
                        dt ?? (b.plantioDataEntrada ? new Date(b.plantioDataEntrada as string | Date) : null);
                      const valid = validarAntesPlantio({
                        vaiAtivar: false,
                        variedadeIdDb: nextVar,
                        dataEntrada: nextDt,
                      });
                      if (!valid.ok) {
                        toast.error(valid.reason);
                        return;
                      }
                      try {
                        await persistPlantio({
                          plantioVariedadeId: nextVar,
                          plantioDataEntrada: nextDt,
                        });
                        toast.success("Perfis atualizados");
                      } catch {
                        /* onError já emite toast */
                      }
                    }}
                  >
                    Trocar/Definir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs text-destructive"
                    disabled={updatePlantio.isPending}
                    onClick={async () => {
                      try {
                        await updatePlantio.mutateAsync({
                          id: bancadaId,
                          plantioVariedadeId: null,
                          plantioDataEntrada: null,
                          plantioPrevisaoColheita: null,
                        });
                        toast.success("Perfis esvaziados");
                      } catch {
                        /* onError já emite toast */
                      }
                    }}
                  >
                    Esvaziar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold text-sm">Colheita</h2>
          </div>
          <div className="p-4 space-y-4">
            <form onSubmit={handleRegistrarColheita} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {plantioVarNome
                  ? <>Colhendo <span className="font-semibold text-foreground">{plantioVarNome}</span>. Ao registrar, a bancada é liberada para novo plantio.</>
                  : "Defina a variedade do plantio acima antes de registrar a colheita."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Peso total (g)</Label>
                  <Input name="peso" type="number" step="0.1" placeholder="Ex: 1200" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Unidades/maços colhidos</Label>
                  <Input name="quantidade" type="number" min="1" defaultValue={b.quantidadeCaixas || 1} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Qualidade</Label>
                  <select name="qualidade" defaultValue="A" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                    <option value="A">A (excelente)</option>
                    <option value="B">B (boa)</option>
                    <option value="C">C (abaixo)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Destino (opcional)</Label>
                  <select name="destino" defaultValue="" className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                    <option value="">—</option>
                    <option value="venda_direta">Venda direta</option>
                    <option value="estoque">Estoque</option>
                    <option value="doacao">Doação</option>
                    <option value="descarte">Descarte</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações (opcional)</Label>
                <Input name="observacoes" placeholder="Notas da colheita…" className="h-9 text-sm" />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={createColheita.isPending || !b.plantioVariedadeId}
              >
                {createColheita.isPending ? "A guardar…" : "Registrar colheita"}
              </Button>
            </form>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de colheitas ({colheitas.length})</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {colheitas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhuma colheita registrada.</p>
                ) : (
                  colheitas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                      <div>
                        <p className="font-medium">
                          {c.variedadeNome || "Colheita"}
                          {c.pesoTotalGramas != null ? ` · ${c.pesoTotalGramas} g` : ""}
                          {c.quantidadePlantas ? ` · ${c.quantidadePlantas} un` : ""}
                          {c.qualidade ? ` · ${c.qualidade}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatarData(String(c.dataColheita))}
                          {c.destino ? ` · ${c.destino}` : ""}
                          {c.executadoPorNome ? ` · ${c.executadoPorNome}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold text-sm">Solução (EC / pH) e aplicações</h2>
          </div>
          <div className="p-4">
            <Tabs defaultValue="medir">
              <TabsList className="w-full mb-3">
                <TabsTrigger value="medir" className="flex-1 text-xs">
                  Medição
                </TabsTrigger>
                <TabsTrigger value="aplicar" className="flex-1 text-xs">
                  Aplicação
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex-1 text-xs">
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="medir">
                <form onSubmit={handleAddMedicao} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">EC</Label>
                      <Input name="ec" type="number" step="0.01" placeholder="Ex: 1.1" className="h-9 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">pH</Label>
                      <Input name="ph" type="number" step="0.01" placeholder="Ex: 5.9" className="h-9 text-sm" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Temp. água (opcional)</Label>
                      <Input name="temperaturaAgua" type="number" step="0.1" className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Umidade % (opcional)</Label>
                      <Input name="umidade" type="number" step="0.1" className="h-9 text-sm" />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createMed.isPending}>
                    {createMed.isPending ? "A guardar…" : "Registar medição"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="aplicar">
                <form onSubmit={handleAddAplicacao} className="space-y-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={tipoAplicacao} onValueChange={setTipoAplicacao}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_APLICACAO_CAIXA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Produto</Label>
                    <Input name="produto" placeholder="Ex: Nutriente A+B" className="h-9 text-sm" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Quantidade (opcional)</Label>
                      <Input name="quantidade" type="number" step="0.01" className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Unidade (opcional)</Label>
                      <Input name="unidade" placeholder="ml, g…" className="h-9 text-sm" />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={createApl.isPending}>
                    {createApl.isPending ? "A guardar…" : "Registar aplicação"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="historico">
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {historicoMerged.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro ainda.</p>
                  )}
                  {historicoMerged.map((item) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs"
                    >
                      {item.kind === "medicao" ? (
                        <div>
                          <p className="font-medium">
                            EC{" "}
                            <span
                              className={
                                numFromDb(item.row.ec) != null &&
                                ecForaRange(numFromDb(item.row.ec)!, fase, data.fasesConfig) !== "ok"
                                  ? "text-red-600"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {numFromDb(item.row.ec) ?? "—"}
                            </span>
                            {" · "}pH{" "}
                            <span
                              className={
                                numFromDb(item.row.ph) != null &&
                                phForaRange(numFromDb(item.row.ph)!, fase, data.fasesConfig) !== "ok"
                                  ? "text-red-600"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {numFromDb(item.row.ph) ?? "—"}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Medição · {formatarDataHora(String(item.row.createdAt))}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">
                            {(item.row as { produto: string }).produto}
                            {(item.row as { quantidade: unknown }).quantidade != null
                              ? ` (${String((item.row as { quantidade: unknown }).quantidade)})`
                              : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {TIPOS_APLICACAO_CAIXA.find((t) => t.value === (item.row as { tipoAplicacao: string }).tipoAplicacao)?.label ??
                              (item.row as { tipoAplicacao: string }).tipoAplicacao}{" "}
                            · {formatarDataHora(String((item.row as { createdAt: unknown }).createdAt))}
                          </p>
                        </div>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            item.kind === "medicao"
                              ? deleteMed.mutate({ id: item.id })
                              : deleteApl.mutate({ id: item.id })
                          }
                          className="text-muted-foreground hover:text-destructive p-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
