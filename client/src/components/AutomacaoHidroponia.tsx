// ============================================================
// Automação — Hidroponia de bancada
// SCADA simplificado por bancada: EC/pH/temperatura por fase + atuadores (bomba/recirculação).
// Mantém o conceito de bancada (sem torres, andares ou lâmpadas).
// ============================================================

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  Droplets,
  Gauge,
  RefreshCw,
  Thermometer,
  Waves,
  Zap,
  Snowflake,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useRole } from "@/hooks/useRole";
import { trpc } from "@/lib/trpc";
import { FASES_CONFIG, type Fase } from "@/lib/types";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type BancadaRow = inferRouterOutputs<AppRouter>["bancadas"]["list"][number];
type MedicaoRow = inferRouterOutputs<AppRouter>["medicoesBancada"]["ultimasPorProjeto"][number];

const FASES_ORDEM: Fase[] = ["mudas", "vegetativa", "maturacao"];

type Nivel = "ok" | "warn" | "critico" | "sem";

function nivelPorFaixa(valor: number | null, min: number, max: number): Nivel {
  if (valor == null || Number.isNaN(valor)) return "sem";
  if (valor >= min && valor <= max) return "ok";
  const margem = (max - min) * 0.15 || 0.2;
  if (valor >= min - margem && valor <= max + margem) return "warn";
  return "critico";
}

const nivelCorTexto: Record<Nivel, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  critico: "text-red-600 dark:text-red-400",
  sem: "text-muted-foreground",
};

const nivelCorBarra: Record<Nivel, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  critico: "bg-red-500",
  sem: "bg-muted-foreground/30",
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function MetricTile({
  label,
  icon,
  valor,
  unidade,
  decimals,
  nivel,
  faixa,
}: {
  label: string;
  icon: React.ReactNode;
  valor: number | null;
  unidade: string;
  decimals: number;
  nivel: Nivel;
  faixa?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-0.5 font-display text-lg font-bold tabular-nums leading-none ${nivelCorTexto[nivel]}`}>
        {valor != null ? `${valor.toFixed(decimals)}${unidade}` : "—"}
      </p>
      {faixa && <p className="mt-1 text-[9px] text-muted-foreground">Ideal {faixa}</p>}
      <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div className={`h-full rounded-full ${nivelCorBarra[nivel]}`} style={{ width: valor != null ? "100%" : "0%" }} />
      </div>
    </div>
  );
}

export default function AutomacaoHidroponia() {
  const { user } = useAuth();
  const { activeProjetoId, modulosAtivos } = useProjeto();
  const { isAdmin } = useRole();

  const bancadasQuery = trpc.bancadas.list.useQuery(undefined, {
    enabled: Boolean(user && activeProjetoId),
    staleTime: 30_000,
  });
  const medicoesQuery = trpc.medicoesBancada.ultimasPorProjeto.useQuery(undefined, {
    enabled: Boolean(user && activeProjetoId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const mqttStatus = trpc.system.mqttStatus.useQuery(undefined, {
    enabled: Boolean(isAdmin && activeProjetoId && modulosAtivos?.automacao),
  });

  const [bombaPorBancada, setBombaPorBancada] = useState<Record<number, boolean>>({});

  const bancadas = useMemo(
    () => (bancadasQuery.data ?? []).filter((b) => b.ativa && b.status === "ativa"),
    [bancadasQuery.data],
  );
  const medicaoPorBancada = useMemo(() => {
    const map = new Map<number, MedicaoRow>();
    for (const m of medicoesQuery.data ?? []) map.set(m.bancadaId, m);
    return map;
  }, [medicoesQuery.data]);

  const bombaLigada = (id: number) => bombaPorBancada[id] ?? true;

  const resumo = useMemo(() => {
    let comLeitura = 0;
    let dentroFaixa = 0;
    let totalCaixas = 0;
    for (const b of bancadas) {
      totalCaixas += b.quantidadeCaixas ?? 0;
      const med = medicaoPorBancada.get(b.id);
      if (!med) continue;
      comLeitura++;
      const cfg = FASES_CONFIG[b.fase as Fase] ?? FASES_CONFIG.vegetativa;
      const ecNivel = nivelPorFaixa(num(med.ec), cfg.ecMin, cfg.ecMax);
      const phNivel = nivelPorFaixa(num(med.ph), cfg.phMin, cfg.phMax);
      if (ecNivel === "ok" && phNivel === "ok") dentroFaixa++;
    }
    return { comLeitura, dentroFaixa, totalCaixas };
  }, [bancadas, medicaoPorBancada]);

  const bancadasPorFase = useMemo(() => {
    const grupos: Record<Fase, BancadaRow[]> = { mudas: [], vegetativa: [], maturacao: [] };
    for (const b of bancadas) {
      const fase = (b.fase as Fase) in grupos ? (b.fase as Fase) : "vegetativa";
      grupos[fase].push(b);
    }
    return grupos;
  }, [bancadas]);

  const carregando = bancadasQuery.isLoading || medicoesQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        {/* Hero */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Cpu className="w-6 h-6 text-violet-600" />
              Automação
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoramento e controle por bancada — solução nutritiva (EC/pH), temperatura e recirculação.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              void bancadasQuery.refetch();
              void medicoesQuery.refetch();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar leituras
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumoCard label="Bancadas ativas" value={bancadas.length} icon={<Gauge className="w-4 h-4 text-violet-600" />} />
          <ResumoCard label="Caixas no total" value={resumo.totalCaixas} icon={<Activity className="w-4 h-4 text-sky-600" />} />
          <ResumoCard label="Com leitura" value={`${resumo.comLeitura}/${bancadas.length}`} icon={<Droplets className="w-4 h-4 text-cyan-600" />} />
          <ResumoCard
            label="EC/pH na faixa"
            value={`${resumo.dentroFaixa}/${Math.max(resumo.comLeitura, 0)}`}
            icon={<Thermometer className="w-4 h-4 text-emerald-600" />}
          />
        </div>

        {/* Monitoramento por fase */}
        {carregando ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando bancadas…</CardContent></Card>
        ) : bancadas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma bancada ativa. Crie bancadas em Configurações para acompanhar a automação.
            </CardContent>
          </Card>
        ) : (
          FASES_ORDEM.map((fase) => {
            const lista = bancadasPorFase[fase];
            if (lista.length === 0) return null;
            const cfg = FASES_CONFIG[fase];
            return (
              <section key={fase} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <h2 className="font-display font-bold text-base">{cfg.label}</h2>
                  <Badge variant="outline" className="text-[10px]">{lista.length} bancada(s)</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    EC {cfg.ecMin}-{cfg.ecMax} · pH {cfg.phMin}-{cfg.phMax}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {lista.map((b) => {
                    const med = medicaoPorBancada.get(b.id);
                    const ec = num(med?.ec);
                    const ph = num(med?.ph);
                    const tAgua = num(med?.temperaturaAgua);
                    const ecNivel = nivelPorFaixa(ec, cfg.ecMin, cfg.ecMax);
                    const phNivel = nivelPorFaixa(ph, cfg.phMin, cfg.phMax);
                    return (
                      <Card key={b.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm truncate">{b.nome}</CardTitle>
                            <Badge variant="outline" className="text-[9px]">{b.quantidadeCaixas} cx</Badge>
                          </div>
                          <CardDescription className="text-[10px]">
                            {med ? `Última leitura: ${new Date(med.createdAt).toLocaleString("pt-BR")}` : "Sem leitura registrada"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <MetricTile
                              label="EC"
                              icon={<Zap className="w-3 h-3" />}
                              valor={ec}
                              unidade=""
                              decimals={2}
                              nivel={ecNivel}
                              faixa={`${cfg.ecMin}-${cfg.ecMax}`}
                            />
                            <MetricTile
                              label="pH"
                              icon={<Droplets className="w-3 h-3" />}
                              valor={ph}
                              unidade=""
                              decimals={1}
                              nivel={phNivel}
                              faixa={`${cfg.phMin}-${cfg.phMax}`}
                            />
                            <MetricTile
                              label="Temp. água"
                              icon={<Thermometer className="w-3 h-3" />}
                              valor={tAgua}
                              unidade="°"
                              decimals={1}
                              nivel={tAgua == null ? "sem" : "ok"}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <Waves className="w-3.5 h-3.5 text-sky-600" />
                              Bomba / recirculação
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold ${bombaLigada(b.id) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                {bombaLigada(b.id) ? "Ligada" : "Desligada"}
                              </span>
                              <Switch
                                checked={bombaLigada(b.id)}
                                onCheckedChange={(v) => setBombaPorBancada((prev) => ({ ...prev, [b.id]: v }))}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Integração hardware */}
        <section className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Integração operacional com hardware</p>
          <p className="text-xs text-muted-foreground">
            O servidor pode ligar a um broker MQTT (variável <code className="rounded bg-muted px-1">MQTT_URL</code>) e
            subscrever telemetria por projeto; comandos para bombas, dosadoras e sensores usam o mesmo prefixo de tópicos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline"><Waves className="w-3 h-3" /> MQTT</Badge>
            <Badge variant="outline"><Cpu className="w-3 h-3" /> Dosadora EC/pH</Badge>
            <Badge variant="outline"><Snowflake className="w-3 h-3" /> Chiller / aquecedor</Badge>
            <Badge variant="outline"><Zap className="w-3 h-3" /> Bombas / relés</Badge>
          </div>
          {isAdmin && mqttStatus.data && (
            <div className="mt-4 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs">
              <p className="font-semibold text-foreground mb-1">MQTT no servidor (admin)</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>
                  Configurado: {mqttStatus.data.configured ? "sim" : "não"}{" "}
                  {mqttStatus.data.configured && <>— ligado ao broker: {mqttStatus.data.connected ? "sim" : "não"}</>}
                </li>
                {mqttStatus.data.configured && (
                  <>
                    <li>Prefixo: {mqttStatus.data.topicPrefix}</li>
                    <li>Subscrição: {mqttStatus.data.subscribePattern ?? "—"}</li>
                    {mqttStatus.data.brokerHost && <li>Broker: {mqttStatus.data.brokerHost}</li>}
                  </>
                )}
                {mqttStatus.data.lastError && (
                  <li className="text-amber-700 dark:text-amber-400">Último erro: {mqttStatus.data.lastError}</li>
                )}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ResumoCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground font-medium">
          {icon}
          {label}
        </div>
        <p className="font-display font-bold text-xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
