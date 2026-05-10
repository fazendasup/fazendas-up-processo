import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Lightbulb,
  Cpu,
  Bell,
  ShieldCheck,
  BarChart3,
  Gauge,
  Zap,
  AlertTriangle,
  Play,
  Pause,
  Waves,
  Snowflake,
  TimerReset,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Siren,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EMPTY_FAZENDA_DATA, transformFazendaLoadAllResponse } from "@/lib/fazendaTransform";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useRole } from "@/hooks/useRole";
import { trpc } from "@/lib/trpc";
import { PainelProgramacoesVertical } from "@/components/PainelProgramacoesVertical";
import { carregarProgramacoes, salvarProgramacoes, type ProgramacaoVertical } from "@/lib/programacoesAutomacao";
import { FASES_CONFIG, torreEstaAtivaNoDashboard, type Fase } from "@/lib/types";

const FASES_SCADA_ORDEM: Fase[] = ["mudas", "vegetativa", "maturacao"];

function isFaseCultivoPadrao(f: string): f is Fase {
  return f === "mudas" || f === "vegetativa" || f === "maturacao";
}

type Item = {
  nome: string;
  detalhes: string;
};

type NivelLog = "ok" | "warn" | "critico";
type ModoAtuador = "auto" | "manual";
type NivelMonitoramento = "resumo" | "detalhado";
type TorreMetricKey = "ec" | "ph" | "tempAgua" | "od";
type AbaAutomacao =
  | "monitoramento"
  | "atuadores"
  | "programacoes"
  | "regras"
  | "seguranca"
  | "relatorios";

type ModoScadaTorre = "compacto" | "detalhado";

type SensorLive = {
  id: string;
  nome: string;
  unidade: string;
  valor: number;
  min: number;
  max: number;
};

type RelatorioMensal = {
  competencia: string;
  uptimePct: number;
  dentroFaixaPct: number;
  alertasCriticos: number;
  consumoKwh: number;
  recirculacaoM3: number;
  producaoKg: number;
};

type AtuadorLive = {
  id: string;
  nome: string;
  zona: string;
  online: boolean;
  modo: ModoAtuador;
  ativo: boolean;
};

type LogEvento = {
  id: number;
  quando: string;
  nivel: NivelLog;
  mensagem: string;
};

const monitoramento: Item[] = [
  { nome: "EC e pH da solução", detalhes: "Leitura por reservatório e por setor, com histórico e desvio de setpoint." },
  { nome: "Temperatura da solução", detalhes: "Protege raiz e estabilidade de absorção de nutrientes." },
  { nome: "Temperatura e umidade do ar", detalhes: "Base para cálculo de DPV/VPD por zona e por andar." },
  { nome: "CO2 ambiente", detalhes: "Controle de injeção por janela horária e fase de cultivo." },
  { nome: "PPFD e DLI", detalhes: "Mede intensidade de luz e integral diária de luz por bloco." },
  { nome: "Nível e vazão", detalhes: "Nível de reservatório, fluxo de linha e detecção de cavitação/seca." },
  { nome: "Pressão e consumo elétrico", detalhes: "Falha precoce de bomba/linha e eficiência energética." },
];

const atuadoresCatalogo: Item[] = [
  { nome: "Bombas de recirculação e transferência", detalhes: "Com intertravamento por nível mínimo e proteção térmica." },
  { nome: "Dosadoras A/B e correção pH+/pH-", detalhes: "Acionamento por banda de erro e janela de mistura." },
  { nome: "Válvulas solenoides por setor", detalhes: "Irrigação setorizada por receita e agenda." },
  { nome: "Iluminação por andar/zona", detalhes: "Fotoperíodo, dimerização e rampas amanhecer/anoitecer." },
  { nome: "Exaustão, insuflação e HVAC", detalhes: "Controle térmico por histerese e prioridade operacional." },
  { nome: "Umidificador/desumidificador", detalhes: "Mantém DPV alvo sem oscilar em liga/desliga curto." },
  { nome: "CO2 e alarmes físicos", detalhes: "Injeção controlada e sinalização sonora/visual de falha crítica." },
];

const regras: Item[] = [
  { nome: "Setpoints por fase", detalhes: "Germinação, vegetativo e maturação com alvos específicos." },
  { nome: "Receitas por cultura/variedade", detalhes: "EC, pH, DPV, PPFD, DLI e fotoperíodo por perfil de cultivo." },
  { nome: "Histerese e anti-chattering", detalhes: "Evita comutação excessiva que danifica equipamento." },
  { nome: "Sequência segura de dosagem", detalhes: "Recirculação ativa, espera de mistura e reamostragem." },
  { nome: "Modo manual, auto e fallback", detalhes: "Transição clara entre operadores e automação." },
  { nome: "Agendas por turno", detalhes: "Regras dia/noite e janelas de manutenção." },
];

const seguranca: Item[] = [
  { nome: "Alertas por limite e tendência", detalhes: "Não apenas estourou limite: alerta por deriva contínua." },
  { nome: "Watchdog de comunicação", detalhes: "Perdeu telemetria? entra em modo seguro automaticamente." },
  { nome: "Auditoria de ações", detalhes: "Quem mudou setpoint, quando e qual efeito." },
  { nome: "Intertravamentos críticos", detalhes: "Não dosar sem fluxo; não ligar bomba sem nível; corte de emergência." },
  { nome: "Planos de contingência", detalhes: "Fallback local para operar mesmo sem internet." },
];

const kpis: Item[] = [
  { nome: "% tempo dentro do alvo", detalhes: "Indicador principal de estabilidade por variável e por zona." },
  { nome: "Tempo de resposta de correção", detalhes: "Quanto demora para voltar ao range após desvio." },
  { nome: "Consumo por kg produzido", detalhes: "Água, energia e nutrientes por produtividade real." },
  { nome: "Incidentes e MTTR", detalhes: "Quantidade de eventos e tempo médio de recuperação." },
  { nome: "Confiabilidade de sensores", detalhes: "Drift, calibração pendente e taxa de falhas." },
];

function ListaItens({ itens }: { itens: Item[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {itens.map((item) => (
        <div key={item.nome} className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-sm font-semibold text-foreground">{item.nome}</p>
          <p className="text-xs text-muted-foreground mt-1">{item.detalhes}</p>
        </div>
      ))}
    </div>
  );
}

const sensoresIniciais: SensorLive[] = [
  { id: "ec", nome: "EC Solucao", unidade: "mS/cm", valor: 1.84, min: 1.6, max: 2.2 },
  { id: "ph", nome: "pH Solucao", unidade: "", valor: 5.92, min: 5.6, max: 6.2 },
  { id: "temp_ar", nome: "Temperatura Ar", unidade: "C", valor: 23.8, min: 21, max: 26 },
  { id: "umid_ar", nome: "Umidade Ar", unidade: "%", valor: 71, min: 60, max: 80 },
  { id: "dpv", nome: "DPV", unidade: "kPa", valor: 0.87, min: 0.7, max: 1.1 },
  { id: "co2", nome: "CO2", unidade: "ppm", valor: 805, min: 700, max: 1000 },
];

const atuadoresIniciais: AtuadorLive[] = [
  { id: "bomba_recirc", nome: "Bomba recirculacao", zona: "Reservatorio A", online: true, modo: "auto", ativo: true },
  { id: "dosadora_ab", nome: "Dosadora A/B", zona: "Reservatorio A", online: true, modo: "auto", ativo: false },
  { id: "desumid", nome: "Desumidificador", zona: "Sala principal", online: true, modo: "auto", ativo: false },
  { id: "chiller", nome: "Refrigeracao (chiller)", zona: "Linha agua fria", online: true, modo: "manual", ativo: false },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatValor(sensor: SensorLive) {
  if (sensor.id === "umid_ar" || sensor.id === "co2") return `${Math.round(sensor.valor)} ${sensor.unidade}`.trim();
  return `${sensor.valor.toFixed(2)} ${sensor.unidade}`.trim();
}

function statusSensor(sensor: SensorLive): NivelLog {
  if (sensor.valor < sensor.min || sensor.valor > sensor.max) return "critico";
  const margem = (sensor.max - sensor.min) * 0.1;
  if (sensor.valor < sensor.min + margem || sensor.valor > sensor.max - margem) return "warn";
  return "ok";
}

function faixaSensor(sensor: SensorLive) {
  const pct = ((sensor.valor - sensor.min) / (sensor.max - sensor.min)) * 100;
  return clamp(Number.isFinite(pct) ? pct : 0, 0, 100);
}

function badgeNivel(n: NivelLog) {
  if (n === "critico") return "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30";
  if (n === "warn") return "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/35";
  return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30";
}

function labelNivel(n: NivelLog) {
  if (n === "critico") return "Critico";
  if (n === "warn") return "Atencao";
  return "Estavel";
}

function estadoFaseScada(item: {
  torresAtivas: unknown[];
  torresInativas: unknown[];
  caixasAtivas: unknown[];
  caixasInativas: unknown[];
}): NivelLog {
  if (item.torresInativas.length > 0 || item.caixasInativas.length > 0) return "critico";
  if (item.torresAtivas.length === 0 && item.caixasAtivas.length === 0) return "warn";
  return "ok";
}

function andarTemCultivo(andar: { perfis?: { ativo: boolean }[]; furos?: { status: string }[] }) {
  const perfisAtivos = (andar.perfis || []).some((p) => p.ativo);
  const furosAtivos = (andar.furos || []).some((f) => f.status === "plantado" || f.status === "colhido");
  return perfisAtivos || furosAtivos;
}

function numFromSlug(slug: string): number {
  let n = 0;
  for (let i = 0; i < slug.length; i++) n += slug.charCodeAt(i);
  return n;
}

const LIMITES_TORRE: Record<TorreMetricKey, { okMin: number; okMax: number; warnMin: number; warnMax: number }> = {
  ec: { okMin: 1.7, okMax: 2.3, warnMin: 1.5, warnMax: 2.5 },
  ph: { okMin: 5.8, okMax: 6.3, warnMin: 5.5, warnMax: 6.6 },
  tempAgua: { okMin: 19.5, okMax: 22.5, warnMin: 18.5, warnMax: 23.8 },
  od: { okMin: 6.0, okMax: 8.4, warnMin: 5.5, warnMax: 9.2 },
};

const SETPOINT_FASE: Record<Fase, { ec: number; ph: number; tempAgua: number }> = {
  mudas: { ec: 1.0, ph: 6.0, tempAgua: 22.0 },
  vegetativa: { ec: 1.5, ph: 6.0, tempAgua: 22.0 },
  maturacao: { ec: 1.8, ph: 6.0, tempAgua: 22.0 },
};

function statusMetricaTorre(key: TorreMetricKey, valor: number | null): NivelLog {
  if (valor == null) return "warn";
  const f = LIMITES_TORRE[key];
  if (valor < f.warnMin || valor > f.warnMax) return "critico";
  if (valor < f.okMin || valor > f.okMax) return "warn";
  return "ok";
}

function faixaMetricaTorre(key: TorreMetricKey, valor: number | null): number {
  if (valor == null) return 0;
  const f = LIMITES_TORRE[key];
  return clamp(((valor - f.warnMin) / (f.warnMax - f.warnMin)) * 100, 0, 100);
}

function setpointMetrica(key: TorreMetricKey, fase: Fase): number {
  if (key === "od") return Number((((LIMITES_TORRE.od.okMin + LIMITES_TORRE.od.okMax) / 2)).toFixed(1));
  const f = isFaseCultivoPadrao(String(fase)) ? fase : "vegetativa";
  return SETPOINT_FASE[f][key];
}

function serieCurta(base: number | null, delta: number, tick: number, scale = 1): number[] {
  const b = base ?? 0;
  return Array.from({ length: 12 }).map((_, i) => {
    const osc = Math.sin((tick - (11 - i)) / 2.4) * delta * scale;
    return b + osc;
  });
}

function classeSemaforo(n: NivelLog): string {
  if (n === "critico") return "bg-red-500 animate-pulse";
  if (n === "warn") return "bg-amber-500";
  return "bg-emerald-500";
}

function classeCardMetrica(n: NivelLog): string {
  if (n === "critico") return "border-red-500/40 bg-red-500/10";
  if (n === "warn") return "border-amber-500/40 bg-amber-500/10";
  return "border-emerald-500/40 bg-emerald-500/10";
}

/** Métricas compactas — cor por variável + estado (tintas mais vivas, leitura SCADA profissional). */
function classeMetricaCompactSurface(key: TorreMetricKey, n: NivelLog): string {
  if (n === "critico") {
    return "border border-red-300 bg-red-50 border-l-[4px] border-l-red-600 shadow-sm dark:border-red-800 dark:bg-red-950/55 dark:border-l-red-500";
  }
  if (n === "warn") {
    return "border border-amber-300 bg-amber-50 border-l-[4px] border-l-amber-500 shadow-sm dark:border-amber-800 dark:bg-amber-950/50 dark:border-l-amber-400";
  }
  switch (key) {
    case "ec":
      return "border border-cyan-200 bg-cyan-50 border-l-[4px] border-l-cyan-600 shadow-sm dark:border-cyan-800/90 dark:bg-cyan-950/45 dark:border-l-cyan-400";
    case "ph":
      return "border border-emerald-200 bg-emerald-50 border-l-[4px] border-l-emerald-600 shadow-sm dark:border-emerald-800/90 dark:bg-emerald-950/45 dark:border-l-emerald-400";
    case "tempAgua":
      return "border border-orange-200 bg-orange-50 border-l-[4px] border-l-orange-500 shadow-sm dark:border-orange-900/90 dark:bg-orange-950/40 dark:border-l-orange-400";
    case "od":
      return "border border-sky-200 bg-sky-50 border-l-[4px] border-l-sky-600 shadow-sm dark:border-sky-900/90 dark:bg-sky-950/45 dark:border-l-sky-400";
    default:
      return "border border-border bg-muted/40";
  }
}

function metricCompactLabelClass(key: TorreMetricKey, n: NivelLog): string {
  if (n !== "ok") return "text-muted-foreground";
  switch (key) {
    case "ec":
      return "text-cyan-800 dark:text-cyan-300";
    case "ph":
      return "text-emerald-800 dark:text-emerald-300";
    case "tempAgua":
      return "text-orange-800 dark:text-orange-300";
    case "od":
      return "text-sky-800 dark:text-sky-300";
    default:
      return "text-muted-foreground";
  }
}

function metricCompactValueClass(key: TorreMetricKey, n: NivelLog): string {
  if (n === "critico") return "text-red-950 dark:text-red-100";
  if (n === "warn") return "text-amber-950 dark:text-amber-100";
  switch (key) {
    case "ec":
      return "text-cyan-950 dark:text-cyan-50";
    case "ph":
      return "text-emerald-950 dark:text-emerald-50";
    case "tempAgua":
      return "text-orange-950 dark:text-orange-50";
    case "od":
      return "text-sky-950 dark:text-sky-50";
    default:
      return "text-foreground";
  }
}

function metricBarFillClass(key: TorreMetricKey): string {
  switch (key) {
    case "ec":
      return "bg-cyan-600 dark:bg-cyan-400";
    case "ph":
      return "bg-emerald-600 dark:bg-emerald-400";
    case "tempAgua":
      return "bg-orange-500 dark:bg-orange-400";
    case "od":
      return "bg-sky-600 dark:bg-sky-400";
    default:
      return "bg-primary";
  }
}

function ScadaCompactMetricTile({
  metricKey,
  label,
  nivel,
  raw,
  decimals,
}: {
  metricKey: TorreMetricKey;
  label: string;
  nivel: NivelLog;
  raw: number | null;
  decimals: number;
}) {
  const pct = faixaMetricaTorre(metricKey, raw);

  return (
    <div className={`flex flex-col rounded-md px-1.5 py-1 ${classeMetricaCompactSurface(metricKey, nivel)}`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[9px] font-semibold uppercase tracking-wide ${metricCompactLabelClass(metricKey, nivel)}`}>{label}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/20 ${classeSemaforo(nivel)}`} />
      </div>
      <p
        className={`mt-px text-center font-display text-[21px] font-bold tabular-nums leading-none ${metricCompactValueClass(metricKey, nivel)}`}
      >
        {raw != null ? raw.toFixed(decimals) : "—"}
      </p>
      <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${metricBarFillClass(metricKey)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AutomacaoPage() {
  const { user } = useAuth();
  const { activeProjetoId, modulosAtivos } = useProjeto();
  const { isAdmin } = useRole();

  const { data: rawOperacional } = trpc.automacao.dadosOperacionais.useQuery(undefined, {
    enabled: Boolean(user && activeProjetoId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const data = useMemo(
    () => (rawOperacional ? transformFazendaLoadAllResponse(rawOperacional) : EMPTY_FAZENDA_DATA),
    [rawOperacional],
  );

  const mqttStatus = trpc.system.mqttStatus.useQuery(undefined, {
    enabled: Boolean(isAdmin && activeProjetoId && modulosAtivos?.automacao),
  });
  const [simulacaoAtiva, setSimulacaoAtiva] = useState(true);
  const [tickSimulacao, setTickSimulacao] = useState(0);
  const [abaAtiva, setAbaAtiva] = useState<AbaAutomacao>("monitoramento");
  const [nivelMonitoramento, setNivelMonitoramento] = useState<NivelMonitoramento>("resumo");
  const [modoScadaTorre, setModoScadaTorre] = useState<ModoScadaTorre>("compacto");
  const [alarmePanelAberto, setAlarmePanelAberto] = useState(false);
  const [alarmesReconhecidos, setAlarmesReconhecidos] = useState<Record<string, boolean>>({});
  const [faseFiltroInfra, setFaseFiltroInfra] = useState<"todas" | Fase>("todas");
  const [somenteDesativadosInfra, setSomenteDesativadosInfra] = useState(false);
  const [luzPorAndar, setLuzPorAndar] = useState<Record<string, boolean>>({});
  const [bombaPorTorre, setBombaPorTorre] = useState<Record<string, boolean>>({});
  /** Inibe “agendamentos” automáticos simulados; análogo a “parar painel” em controlador físico. */
  const [supervisorOperacionalPausado, setSupervisorOperacionalPausado] = useState(false);
  const [programacoesVerticais, setProgramacoesVerticais] = useState<ProgramacaoVertical[]>([]);
  const [sensores, setSensores] = useState<SensorLive[]>(sensoresIniciais);
  const [atuadores, setAtuadores] = useState<AtuadorLive[]>(atuadoresIniciais);
  const [eventos, setEventos] = useState<LogEvento[]>([
    { id: 1, quando: "09:12:03", nivel: "ok", mensagem: "Supervisor iniciado no modo automatico." },
    { id: 2, quando: "09:12:18", nivel: "warn", mensagem: "DPV aproximando limite superior na Torre 4." },
    { id: 3, quando: "09:13:04", nivel: "ok", mensagem: "Desumidificador acionado por regra de histerese." },
  ]);

  const pushEvento = (nivel: NivelLog, mensagem: string) => {
    const quando = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setEventos((prev) => [{ id: prev.length + 1, quando, nivel, mensagem }, ...prev].slice(0, 20));
  };

  useEffect(() => {
    if (!simulacaoAtiva) return;
    const t = setInterval(() => {
      setTickSimulacao((prev) => prev + 1);
      setSensores((prev) =>
        prev.map((s) => {
          let delta = 0;
          if (s.id === "ec") delta = (Math.random() - 0.5) * 0.08;
          else if (s.id === "ph") delta = (Math.random() - 0.5) * 0.05;
          else if (s.id === "temp_ar") delta = (Math.random() - 0.5) * 0.6;
          else if (s.id === "umid_ar") delta = (Math.random() - 0.5) * 2.5;
          else if (s.id === "dpv") delta = (Math.random() - 0.5) * 0.1;
          else if (s.id === "co2") delta = (Math.random() - 0.5) * 35;
          const next = { ...s, valor: clamp(s.valor + delta, s.min - (s.max - s.min) * 0.3, s.max + (s.max - s.min) * 0.3) };
          return next;
        }),
      );
    }, 4000);
    return () => clearInterval(t);
  }, [simulacaoAtiva]);

  useEffect(() => {
    const criticos = sensores.filter((s) => statusSensor(s) === "critico");
    if (criticos.length > 0) {
      pushEvento("critico", `Leitura fora da faixa: ${criticos.map((s) => s.nome).join(", ")}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensores.map((s) => `${s.id}:${statusSensor(s)}`).join("|")]);

  const kpisLive = useMemo(() => {
    const total = sensores.length;
    const ok = sensores.filter((s) => statusSensor(s) === "ok").length;
    const warn = sensores.filter((s) => statusSensor(s) === "warn").length;
    const crit = total - ok - warn;
    const dentroFaixaPct = total > 0 ? Math.round((ok / total) * 100) : 0;
    const atuadoresAtivos = atuadores.filter((a) => a.ativo).length;
    return { ok, warn, crit, dentroFaixaPct, atuadoresAtivos };
  }, [sensores, atuadores]);

  const relatorio6Meses = useMemo<RelatorioMensal[]>(() => {
    const agora = new Date();
    const torresMaturacaoIds = new Set(data.torres.filter((t) => t.fase === "maturacao").map((t) => t.id));
    const andaresAtivos = data.andares.length;
    const perfisMaturacao = data.andares
      .filter((a) => torresMaturacaoIds.has(a.torreId))
      .reduce((acc, a) => acc + (a.perfis?.length ?? 0), 0);

    // Premissas operacionais solicitadas:
    // - Iluminação: 5 lâmpadas por andar x 40W = 0.2kW/andar
    // - Refrigeração: 40A em 220V trifásico (P = sqrt(3) * V * I)
    // - Produção: 100g por planta e 6 plantas por perfil de maturação
    const potenciaLuzKwPorAndar = (5 * 40) / 1000;
    const potenciaRefrigeracaoKw = Math.sqrt(3) * 220 * 40 / 1000;
    const horasLuzDia = 16;
    const fatorUsoRefrigeracao = 0.4;
    const ciclosColheitaMes = 4;
    const kgPorPlanta = 0.1;
    const plantasPorPerfilMaturacao = 6;

    return Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - idx, 1);
      const diasNoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const base = d.getMonth() + 1;

      const consumoLuz = andaresAtivos * potenciaLuzKwPorAndar * horasLuzDia * diasNoMes;
      const consumoRefrigeracao = potenciaRefrigeracaoKw * 24 * diasNoMes * fatorUsoRefrigeracao;
      const consumoKwh = Math.round(consumoLuz + consumoRefrigeracao);
      const producaoKg = Math.round(perfisMaturacao * plantasPorPerfilMaturacao * kgPorPlanta * ciclosColheitaMes);
      const recirculacaoM3 = Math.round(andaresAtivos * diasNoMes * 0.42);

      const uptimePct = Number((98.5 + ((base % 4) - 1.5) * 0.3).toFixed(1));
      const dentroFaixaPct = Number((92 + ((base % 5) - 2) * 1.0).toFixed(1));
      const alertasCriticos = Math.max(1, Math.round((100 - dentroFaixaPct) + (base % 3)));

      return {
        competencia: d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        uptimePct,
        dentroFaixaPct,
        alertasCriticos,
        consumoKwh,
        recirculacaoM3,
        producaoKg,
      };
    });
  }, [data.torres, data.andares]);

  const resumoRelatorio = useMemo(() => {
    const totalMeses = relatorio6Meses.length || 1;
    const mediaUptime = relatorio6Meses.reduce((acc, m) => acc + m.uptimePct, 0) / totalMeses;
    const mediaFaixa = relatorio6Meses.reduce((acc, m) => acc + m.dentroFaixaPct, 0) / totalMeses;
    const totalAlertas = relatorio6Meses.reduce((acc, m) => acc + m.alertasCriticos, 0);
    const totalConsumo = relatorio6Meses.reduce((acc, m) => acc + m.consumoKwh, 0);
    const totalProducao = relatorio6Meses.reduce((acc, m) => acc + m.producaoKg, 0);
    return {
      mediaUptime: Number(mediaUptime.toFixed(1)),
      mediaFaixa: Number(mediaFaixa.toFixed(1)),
      totalAlertas,
      totalConsumo,
      totalProducao,
    };
  }, [relatorio6Meses]);

  const eventosCriticosRecentes = useMemo(() => eventos.filter((e) => e.nivel === "critico").length, [eventos]);
  const eventosWarnRecentes = useMemo(() => eventos.filter((e) => e.nivel === "warn").length, [eventos]);
  const sensoresCriticos = useMemo(() => sensores.filter((s) => statusSensor(s) === "critico").length, [sensores]);
  const sensoresWarn = useMemo(() => sensores.filter((s) => statusSensor(s) === "warn").length, [sensores]);
  const atuadoresOffline = useMemo(() => atuadores.filter((a) => !a.online).length, [atuadores]);
  const coberturaAutomacaoPct = useMemo(
    () => (atuadores.length > 0 ? Math.round((atuadores.filter((a) => a.ativo).length / atuadores.length) * 100) : 0),
    [atuadores],
  );

  const infraestruturaPorFase = useMemo(() => {
    const fases: Fase[] = ["mudas", "vegetativa", "maturacao"];
    return fases.map((fase) => {
      const torresFase = data.torres.filter((t) => t.fase === fase);
      const torresAtivas = torresFase.filter((t) => torreEstaAtivaNoDashboard(t));
      const torresInativas = torresFase.filter((t) => !torreEstaAtivaNoDashboard(t));
      const torresAtivasSet = new Set(torresAtivas.map((t) => t.id));
      const caixasFase = data.caixasAgua.filter((c) => c.fase === fase);
      const caixasAtivas = caixasFase.filter((c) => c.torreIds.some((id) => torresAtivasSet.has(id)));
      const caixasInativas = caixasFase.filter((c) => !c.torreIds.some((id) => torresAtivasSet.has(id)));
      const faseLabel = data.fasesConfig?.[fase]?.label ?? fase;
      return { fase, faseLabel, torresAtivas, torresInativas, caixasAtivas, caixasInativas };
    });
  }, [data]);

  const infraestruturaFiltrada = useMemo(
    () =>
      infraestruturaPorFase
        .filter((g) => (faseFiltroInfra === "todas" ? true : g.fase === faseFiltroInfra))
        .map((g) => ({
          ...g,
          torresVisiveis: somenteDesativadosInfra ? g.torresInativas : [...g.torresAtivas, ...g.torresInativas],
          caixasVisiveis: somenteDesativadosInfra ? g.caixasInativas : [...g.caixasAtivas, ...g.caixasInativas],
        })),
    [infraestruturaPorFase, faseFiltroInfra, somenteDesativadosInfra],
  );

  const resumoInfra = useMemo(() => {
    return infraestruturaFiltrada.reduce(
      (acc, g) => {
        acc.torresAtivas += g.torresAtivas.length;
        acc.torresInativas += g.torresInativas.length;
        acc.caixasAtivas += g.caixasAtivas.length;
        acc.caixasInativas += g.caixasInativas.length;
        return acc;
      },
      { torresAtivas: 0, torresInativas: 0, caixasAtivas: 0, caixasInativas: 0 },
    );
  }, [infraestruturaFiltrada]);

  const leiturasPorTorre = useMemo(() => {
    return data.torres
      .filter((t) => (faseFiltroInfra === "todas" ? true : t.fase === faseFiltroInfra))
      .filter((t) => (somenteDesativadosInfra ? !torreEstaAtivaNoDashboard(t) : torreEstaAtivaNoDashboard(t)))
      .map((torre) => {
        const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
        const med = caixa?.medicoes?.length ? caixa.medicoes[caixa.medicoes.length - 1] : undefined;
        /** Sem medição na API → painel mostrava só "—" no navegador com dados reais; usamos estimativa da fase. */
        const temMedicaoCaixa = Boolean(med && (med.ec != null || med.ph != null));
        const faseSp = isFaseCultivoPadrao(String(torre.fase ?? "")) ? (torre.fase as Fase) : "vegetativa";
        const sp = SETPOINT_FASE[faseSp];
        const seed = numFromSlug(torre.id);
        const osc = Math.sin((tickSimulacao + seed) / 3.5);
        const osc2 = Math.cos((tickSimulacao + seed) / 4.1);
        const tempAguaBase = temMedicaoCaixa ? 19 + ((seed % 60) / 10) : sp.tempAgua + ((seed % 14) / 10);
        const odBase = temMedicaoCaixa ? 5.4 + ((seed % 24) / 10) : 6.0 + ((seed % 20) / 10);
        const ec =
          med?.ec != null
            ? Number((med.ec + osc * 0.08).toFixed(2))
            : Number((sp.ec + osc * 0.12).toFixed(2));
        const ph =
          med?.ph != null
            ? Number((med.ph + osc2 * 0.05).toFixed(2))
            : Number((sp.ph + osc2 * 0.06).toFixed(2));
        const tempAgua = Number((tempAguaBase + osc * 0.25).toFixed(1));
        const od = Number((odBase + osc2 * 0.2).toFixed(1));
        const tendencia = {
          ec: Number((osc * 0.06).toFixed(2)),
          ph: Number((osc2 * 0.04).toFixed(2)),
          tempAgua: Number((osc * 0.18).toFixed(2)),
          od: Number((osc2 * 0.12).toFixed(2)),
        };
        const nivelEc = statusMetricaTorre("ec", ec);
        const nivelPh = statusMetricaTorre("ph", ph);
        const nivelTemp = statusMetricaTorre("tempAgua", tempAgua);
        const nivelOd = statusMetricaTorre("od", od);
        const score = [nivelEc, nivelPh, nivelTemp, nivelOd];
        const nivelGeral: NivelLog = score.includes("critico") ? "critico" : score.includes("warn") ? "warn" : "ok";
        return {
          torre,
          ec,
          ph,
          tempAgua,
          od,
          tendencia,
          nivel: { ec: nivelEc, ph: nivelPh, tempAgua: nivelTemp, od: nivelOd, geral: nivelGeral },
          caixaNome: caixa?.nome ?? "Sem caixa",
          fonteAgua: temMedicaoCaixa ? ("medicao" as const) : ("estimativa" as const),
        };
      });
  }, [data.torres, data.caixasAgua, faseFiltroInfra, somenteDesativadosInfra, tickSimulacao]);

  const torresEmAlarme = useMemo(() => leiturasPorTorre.filter((r) => r.nivel.geral === "critico").length, [leiturasPorTorre]);
  const torresEmAtencao = useMemo(() => leiturasPorTorre.filter((r) => r.nivel.geral === "warn").length, [leiturasPorTorre]);
  const leiturasPorTorreOrdenadas = useMemo(() => {
    const prioridade: Record<NivelLog, number> = { critico: 0, warn: 1, ok: 2 };
    return [...leiturasPorTorre].sort((a, b) => {
      const d = prioridade[a.nivel.geral] - prioridade[b.nivel.geral];
      if (d !== 0) return d;
      return a.torre.nome.localeCompare(b.torre.nome);
    });
  }, [leiturasPorTorre]);

  /** Mesmo padrão do dashboard hidropónico: secções por fase; torres com fase inválida no BD não desaparecem. */
  const leiturasAgrupadasPorSetor = useMemo(() => {
    const prioridade: Record<NivelLog, number> = { critico: 0, warn: 1, ok: 2 };
    const sortLeituras = (arr: typeof leiturasPorTorre) =>
      [...arr].sort((a, b) => {
        const d = prioridade[a.nivel.geral] - prioridade[b.nivel.geral];
        if (d !== 0) return d;
        return a.torre.nome.localeCompare(b.torre.nome);
      });

    const outras = sortLeituras(
      leiturasPorTorre.filter((r) => !isFaseCultivoPadrao(String(r.torre.fase ?? ""))),
    );

    const fasesVisiveis: Fase[] =
      faseFiltroInfra === "todas" ? [...FASES_SCADA_ORDEM] : [faseFiltroInfra];

    const grupos: Array<{
      key: string;
      titulo: string;
      icon: string;
      ecFaixa: string;
      phFaixa: string;
      leituras: typeof leiturasPorTorre;
    }> = fasesVisiveis.map((fase) => {
      const cfg = data.fasesConfig?.[fase] ?? FASES_CONFIG[fase];
      return {
        key: fase,
        titulo: cfg.label,
        icon: cfg.icon,
        ecFaixa: `EC ${cfg.ecMin}–${cfg.ecMax}`,
        phFaixa: `pH ${cfg.phMin}–${cfg.phMax}`,
        leituras: sortLeituras(leiturasPorTorre.filter((r) => r.torre.fase === fase)),
      };
    });

    if (outras.length > 0) {
      grupos.push({
        key: "outras",
        titulo: "Outras fases",
        icon: "📌",
        ecFaixa: "—",
        phFaixa: "—",
        leituras: outras,
      });
    }

    return grupos;
  }, [leiturasPorTorre, data.fasesConfig, faseFiltroInfra]);
  const indiceSeguranca = useMemo(() => {
    const penalidade = eventosCriticosRecentes * 4 + eventosWarnRecentes * 2 + torresEmAlarme * 3 + atuadoresOffline * 5;
    return clamp(100 - penalidade, 0, 100);
  }, [eventosCriticosRecentes, eventosWarnRecentes, torresEmAlarme, atuadoresOffline]);

  const torresOperacionais = useMemo(
    () =>
      data.torres
        .filter((t) => (faseFiltroInfra === "todas" ? true : t.fase === faseFiltroInfra))
        .filter((t) => (somenteDesativadosInfra ? !torreEstaAtivaNoDashboard(t) : torreEstaAtivaNoDashboard(t))),
    [data.torres, faseFiltroInfra, somenteDesativadosInfra],
  );

  const torresOperacionaisPorFase = useMemo(() => {
    const ordem: Fase[] = ["mudas", "vegetativa", "maturacao"];
    return ordem
      .map((fase) => ({
        fase,
        faseLabel: data.fasesConfig?.[fase]?.label ?? fase,
        torres: torresOperacionais.filter((t) => t.fase === fase),
      }))
      .filter((g) => g.torres.length > 0);
  }, [torresOperacionais, data.fasesConfig]);

  const fasesScada = useMemo(
    () =>
      infraestruturaFiltrada.map((g) => ({
        ...g,
        estadoScada: estadoFaseScada(g),
      })),
    [infraestruturaFiltrada],
  );

  const sensoresAmbiente = useMemo(
    () => sensores.filter((s) => s.id === "temp_ar" || s.id === "umid_ar" || s.id === "dpv" || s.id === "co2"),
    [sensores],
  );
  const alarmesAtivos = useMemo(() => {
    const alarmesTorre = leiturasPorTorre
      .filter((r) => r.nivel.geral === "critico")
      .map((r) => ({
        key: `torre:${r.torre.id}`,
        nivel: "critico" as NivelLog,
        origem: r.torre.nome,
        mensagem: "Desvio crítico em EC/pH/Temperatura da água/OD",
      }));
    const alarmesAmbiente = sensoresAmbiente
      .filter((s) => statusSensor(s) === "critico")
      .map((s) => ({
        key: `amb:${s.id}`,
        nivel: "critico" as NivelLog,
        origem: "Ambiente geral",
        mensagem: `${s.nome} fora da faixa operacional`,
      }));
    return [...alarmesTorre, ...alarmesAmbiente];
  }, [leiturasPorTorre, sensoresAmbiente]);
  const alarmesPendentes = useMemo(
    () => alarmesAtivos.filter((a) => !alarmesReconhecidos[a.key]),
    [alarmesAtivos, alarmesReconhecidos],
  );
  const resumoTopo = useMemo(() => {
    const sensoresCritAmb = sensoresAmbiente.filter((s) => statusSensor(s) === "critico").length;
    const sensoresWarnAmb = sensoresAmbiente.filter((s) => statusSensor(s) === "warn").length;
    const critTorre = leiturasPorTorre.reduce((acc, r) => {
      return acc + [r.nivel.ec, r.nivel.ph, r.nivel.tempAgua, r.nivel.od].filter((n) => n === "critico").length;
    }, 0);
    const warnTorre = leiturasPorTorre.reduce((acc, r) => {
      return acc + [r.nivel.ec, r.nivel.ph, r.nivel.tempAgua, r.nivel.od].filter((n) => n === "warn").length;
    }, 0);
    const totalTags = sensoresAmbiente.length + leiturasPorTorre.length * 4;
    const tagsEmAlerta = sensoresCritAmb + sensoresWarnAmb + critTorre + warnTorre;
    const bombasAtivas = Object.values(bombaPorTorre).filter(Boolean).length;
    const luzesAtivas = Object.values(luzPorAndar).filter(Boolean).length;
    const atuadoresAtivos = atuadores.filter((a) => a.ativo).length + bombasAtivas + luzesAtivas;
    const atuadoresTotais = atuadores.length + data.torres.length + data.andares.length;
    return { totalTags, tagsEmAlerta, atuadoresAtivos, atuadoresTotais };
  }, [sensoresAmbiente, leiturasPorTorre, bombaPorTorre, luzPorAndar, atuadores, data.torres.length, data.andares.length]);

  useEffect(() => {
    const nextBomba = { ...bombaPorTorre };
    for (const t of data.torres) {
      if (nextBomba[t.id] == null) nextBomba[t.id] = torreEstaAtivaNoDashboard(t);
    }
    setBombaPorTorre(nextBomba);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.torres.map((t) => t.id).join("|")]);

  useEffect(() => {
    const nextLuz = { ...luzPorAndar };
    for (const a of data.andares) {
      if (nextLuz[a.id] == null) nextLuz[a.id] = andarTemCultivo(a);
    }
    setLuzPorAndar(nextLuz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.andares.map((a) => a.id).join("|")]);

  useEffect(() => {
    setProgramacoesVerticais(carregarProgramacoes(activeProjetoId));
  }, [activeProjetoId]);

  useEffect(() => {
    salvarProgramacoes(activeProjetoId, programacoesVerticais);
  }, [activeProjetoId, programacoesVerticais]);

  const toggleAtuador = (id: string) => {
    setAtuadores((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)),
    );
    const alvo = atuadores.find((a) => a.id === id);
    if (alvo) pushEvento("ok", `${alvo.nome}: ${alvo.ativo ? "desligado" : "ligado"} manualmente.`);
  };

  const alterarModo = (id: string, modo: ModoAtuador) => {
    setAtuadores((prev) => prev.map((a) => (a.id === id ? { ...a, modo } : a)));
    const alvo = atuadores.find((a) => a.id === id);
    if (alvo) pushEvento("warn", `${alvo.nome}: modo alterado para ${modo.toUpperCase()}.`);
  };

  const toggleBombaTorre = (torreId: string, torreNome: string) => {
    setBombaPorTorre((prev) => {
      const next = !prev[torreId];
      pushEvento("ok", `${torreNome}: bomba ${next ? "ligada" : "desligada"}.`);
      return { ...prev, [torreId]: next };
    });
  };

  const toggleLuzAndar = (andarId: string, torreNome: string, numero: number) => {
    setLuzPorAndar((prev) => {
      const next = !prev[andarId];
      pushEvento("ok", `${torreNome} / Andar ${numero}: iluminação ${next ? "ligada" : "desligada"}.`);
      return { ...prev, [andarId]: next };
    });
  };

  const alternarSupervisorOperacional = () => {
    setSupervisorOperacionalPausado((p) => {
      const next = !p;
      pushEvento(next ? "warn" : "ok", next ? "Supervisor operacional PAUSADO — rotinas automáticas simuladas inibidas." : "Supervisor operacional RELIGADO.");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-5">
        <section className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-cyan-500/[0.05] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Automação da Fazenda</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                Monitoramento e controle operacional em tempo real, por zona, por andar e por fase de cultivo.
              </p>
              <div className="mt-3 inline-flex items-center gap-2">
                <Badge className={simulacaoAtiva ? "bg-emerald-600/20 text-emerald-800 dark:text-emerald-200" : "bg-muted text-muted-foreground"}>
                  {simulacaoAtiva ? "Supervisao em tempo real" : "Supervisao pausada"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimulacaoAtiva((v) => !v)}
                  className="h-7 text-xs"
                >
                  {simulacaoAtiva ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {simulacaoAtiva ? "Pausar atualizacao" : "Retomar atualizacao"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Card className="py-3 gap-2">
            <CardHeader className="px-4">
              <CardTitle className="text-xs flex items-center gap-1.5"><Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Sensores</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="font-display text-xl font-bold">{resumoTopo.totalTags}</p>
              <p className="text-[11px] text-muted-foreground">tags monitoradas (ambiente + torres)</p>
            </CardContent>
          </Card>
          <Card className="py-3 gap-2">
            <CardHeader className="px-4">
              <CardTitle className="text-xs flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Atuadores</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="font-display text-xl font-bold">{resumoTopo.atuadoresAtivos}</p>
              <p className="text-[11px] text-muted-foreground">ativos de {resumoTopo.atuadoresTotais}</p>
            </CardContent>
          </Card>
          <Card className="py-3 gap-2">
            <CardHeader className="px-4">
              <CardTitle className="text-xs flex items-center gap-1.5"><Activity className="w-4 h-4 text-blue-600" /> Regras</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="font-display text-xl font-bold">{regras.length}</p>
              <p className="text-[11px] text-muted-foreground">regras por fase e histerese</p>
            </CardContent>
          </Card>
          <Card className="py-3 gap-2">
            <CardHeader className="px-4">
              <CardTitle className="text-xs flex items-center gap-1.5"><Bell className="w-4 h-4 text-orange-600" /> Alertas</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="font-display text-xl font-bold">{alarmesPendentes.length}</p>
              <p className="text-[11px] text-muted-foreground">{resumoTopo.tagsEmAlerta} tags em alerta</p>
            </CardContent>
          </Card>
          <Card className="py-3 gap-2">
            <CardHeader className="px-4">
              <CardTitle className="text-xs flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-sky-600" /> Segurança</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="font-display text-xl font-bold">{indiceSeguranca}%</p>
              <p className="text-[11px] text-muted-foreground">índice operacional</p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between px-1">
            <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">KPIs de automação</h2>
            <p className="text-[11px] text-muted-foreground max-w-xl">
              Métricas para comprovar ganho operacional, estabilidade e eficiência por ciclo (tempo real + consolidado 6 meses).
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-900 dark:text-emerald-200/95">Dentro da faixa</p>
              <p className="font-display text-[27px] font-bold leading-tight tabular-nums text-emerald-950 dark:text-emerald-50 mt-1">{kpisLive.dentroFaixaPct}%</p>
              <p className="text-[10px] text-emerald-800/80 dark:text-emerald-200/70 mt-0.5">tags estáveis agora</p>
            </div>
            <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-cyan-900 dark:text-cyan-200/95">Uptime médio (6m)</p>
              <p className="font-display text-[27px] font-bold leading-tight tabular-nums text-cyan-950 dark:text-cyan-50 mt-1">{resumoRelatorio.mediaUptime}%</p>
              <p className="text-[10px] text-cyan-800/80 dark:text-cyan-200/70 mt-0.5">disponibilidade</p>
            </div>
            <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-900 dark:text-violet-200/95">Consumo total (6m)</p>
              <p className="font-display text-[27px] font-bold leading-tight tabular-nums text-violet-950 dark:text-violet-50 mt-1">{resumoRelatorio.totalConsumo.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-violet-800/80 dark:text-violet-200/70 mt-0.5">kWh</p>
            </div>
            <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 px-3 py-2.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-blue-900 dark:text-blue-200/95">Produção total (6m)</p>
              <p className="font-display text-[27px] font-bold leading-tight tabular-nums text-blue-950 dark:text-blue-50 mt-1">{resumoRelatorio.totalProducao.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-blue-800/80 dark:text-blue-200/70 mt-0.5">kg</p>
            </div>
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 shadow-sm col-span-2 md:col-span-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200/95">Eventos críticos (6m)</p>
              <p className="font-display text-[27px] font-bold leading-tight tabular-nums text-amber-950 dark:text-amber-50 mt-1">{resumoRelatorio.totalAlertas}</p>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-200/70 mt-0.5">consolidado</p>
            </div>
          </div>
        </section>

        <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as AbaAutomacao)} className="space-y-4">
          <TabsList className="h-auto p-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full gap-1">
            <TabsTrigger value="monitoramento" className="text-xs gap-1"><Thermometer className="w-3.5 h-3.5" />Monitoramento</TabsTrigger>
            <TabsTrigger value="atuadores" className="text-xs gap-1"><Lightbulb className="w-3.5 h-3.5" />Atuadores</TabsTrigger>
            <TabsTrigger value="programacoes" className="text-xs gap-1"><CalendarClock className="w-3.5 h-3.5" />Programações</TabsTrigger>
            <TabsTrigger value="regras" className="text-xs gap-1"><Cpu className="w-3.5 h-3.5" />Regras</TabsTrigger>
            <TabsTrigger value="seguranca" className="text-xs gap-1"><AlertTriangle className="w-3.5 h-3.5" />Segurança</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs gap-1"><TimerReset className="w-3.5 h-3.5" />Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoramento">
            <Card className="py-4 gap-3">
              <CardHeader className="px-4">
                <CardTitle className="text-base flex items-center gap-2"><Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />Sensores e telemetria</CardTitle>
                <CardDescription>Entradas essenciais para manter nutrição, clima e luz dentro dos parâmetros de cada fase.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAlarmePanelAberto((v) => !v)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      alarmesPendentes.length > 0
                        ? "border-red-500/50 bg-red-500/10 hover:bg-red-500/15"
                        : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Centro de alarmes</p>
                        <p className="text-[11px] text-muted-foreground">
                          {alarmesPendentes.length > 0
                            ? `${alarmesPendentes.length} alarme(s) pendente(s) de reconhecimento`
                            : "Nenhum alarme pendente"}
                        </p>
                      </div>
                      <Badge variant="outline">{alarmePanelAberto ? "Ocultar" : "Ver alarmes"}</Badge>
                    </div>
                  </button>
                  {alarmePanelAberto && (
                    <div className={`rounded-lg border p-3 ${alarmesPendentes.length > 0 ? "border-red-500/40 bg-red-500/5" : "border-border/60 bg-muted/20"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Alarmes ativos</p>
                        <Button
                          size="sm"
                          variant={alarmesPendentes.length > 0 ? "destructive" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => {
                            if (alarmesPendentes.length === 0) return;
                            setAlarmesReconhecidos((prev) => {
                              const next = { ...prev };
                              for (const a of alarmesPendentes) next[a.key] = true;
                              return next;
                            });
                            pushEvento("warn", `Operador reconheceu ${alarmesPendentes.length} alarme(s).`);
                          }}
                        >
                          Reconhecer todos
                        </Button>
                      </div>
                      {alarmesAtivos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {alarmesAtivos.slice(0, 12).map((a) => {
                            const ack = Boolean(alarmesReconhecidos[a.key]);
                            return (
                              <button
                                key={a.key}
                                type="button"
                                onClick={() => {
                                  setAlarmesReconhecidos((prev) => ({ ...prev, [a.key]: true }));
                                  pushEvento("warn", `Alarme reconhecido: ${a.origem}.`);
                                }}
                                className={`rounded-md border px-2 py-1 text-[11px] ${
                                  ack
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                                    : "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100"
                                }`}
                              >
                                {ack ? "ACK" : "ALM"} · {a.origem}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Painel operacional por fase</p>
                      <Badge variant="outline" className="text-[10px]">dados reais da fazenda</Badge>
                    </div>
                    <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
                      <Button size="sm" variant={nivelMonitoramento === "resumo" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setNivelMonitoramento("resumo")}>
                        Resumo
                      </Button>
                      <Button size="sm" variant={nivelMonitoramento === "detalhado" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setNivelMonitoramento("detalhado")}>
                        Detalhado
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="inline-flex rounded-md border border-border/70 bg-background/70 p-0.5">
                      <Button size="sm" variant={faseFiltroInfra === "todas" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setFaseFiltroInfra("todas")}>
                        Todas
                      </Button>
                      <Button size="sm" variant={faseFiltroInfra === "mudas" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setFaseFiltroInfra("mudas")}>
                        Mudas
                      </Button>
                      <Button size="sm" variant={faseFiltroInfra === "vegetativa" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setFaseFiltroInfra("vegetativa")}>
                        Vegetativa
                      </Button>
                      <Button size="sm" variant={faseFiltroInfra === "maturacao" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setFaseFiltroInfra("maturacao")}>
                        Maturação
                      </Button>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/70 px-2 py-1">
                      <span className="text-[11px] text-muted-foreground">Só desativados</span>
                      <Switch checked={somenteDesativadosInfra} onCheckedChange={setSomenteDesativadosInfra} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
                    {fasesScada.map((g) => (
                      <div
                        key={`scada-${g.fase}`}
                        className={`rounded-md border p-2.5 ${
                          g.estadoScada === "critico"
                            ? "border-red-500/45 bg-red-500/10 shadow-[0_0_0_1px_rgba(239,68,68,0.18)]"
                            : g.estadoScada === "warn"
                              ? "border-amber-500/45 bg-amber-500/10"
                              : "border-emerald-500/45 bg-emerald-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{g.faseLabel}</p>
                          <Badge variant="outline" className={`${badgeNivel(g.estadoScada)} ${g.estadoScada === "critico" ? "animate-pulse" : ""}`}>
                            {labelNivel(g.estadoScada)}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded border border-border/60 bg-background/70 px-2 py-1.5">
                            <p className="text-muted-foreground">Torres</p>
                            <p className="font-semibold">
                              {g.torresAtivas.length} ON / <span className="text-red-700 dark:text-red-300">{g.torresInativas.length} OFF</span>
                            </p>
                          </div>
                          <div className="rounded border border-border/60 bg-background/70 px-2 py-1.5">
                            <p className="text-muted-foreground">Caixas</p>
                            <p className="font-semibold">
                              {g.caixasAtivas.length} ON / <span className="text-red-700 dark:text-red-300">{g.caixasInativas.length} OFF</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-[10px] text-emerald-900 dark:text-emerald-200">Torres ativas</p>
                      <p className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-100">{resumoInfra.torresAtivas}</p>
                    </div>
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                      <p className="text-[10px] text-red-900 dark:text-red-200">Torres desativadas</p>
                      <p className="font-display text-lg font-bold text-red-900 dark:text-red-100">{resumoInfra.torresInativas}</p>
                    </div>
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-[10px] text-emerald-900 dark:text-emerald-200">Caixas ativas</p>
                      <p className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-100">{resumoInfra.caixasAtivas}</p>
                    </div>
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                      <p className="text-[10px] text-red-900 dark:text-red-200">Caixas desativadas</p>
                      <p className="font-display text-lg font-bold text-red-900 dark:text-red-100">{resumoInfra.caixasInativas}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold">Ambiente geral</p>
                    <Badge variant="outline" className="text-[10px]">não por torre</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {sensoresAmbiente.map((s) => {
                      const nivel = statusSensor(s);
                      return (
                        <div key={s.id} className="rounded-md border border-border/70 bg-background/80 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] font-semibold leading-tight">{s.nome}</p>
                            <span className={`h-2.5 w-2.5 rounded-full ${nivel === "critico" ? "bg-red-500 animate-pulse" : nivel === "warn" ? "bg-amber-500" : "bg-emerald-500"}`} />
                          </div>
                          <p className="font-display text-lg leading-none">{formatValor(s)}</p>
                          <Progress value={faixaSensor(s)} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-lg border border-border/60 bg-muted/20 space-y-2 ${modoScadaTorre === "compacto" ? "p-2" : "p-3"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Waves className="w-4 h-4 text-cyan-600" />
                      <p className="text-sm font-semibold">Monitoramento por torre (água)</p>
                      <Badge variant="outline" className="text-[10px]">EC / pH / Temp. água / OD</Badge>
                    </div>
                    <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
                      <Button size="sm" variant={modoScadaTorre === "compacto" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setModoScadaTorre("compacto")}>
                        Compacto
                      </Button>
                      <Button size="sm" variant={modoScadaTorre === "detalhado" ? "default" : "ghost"} className="h-6 text-[11px] px-2" onClick={() => setModoScadaTorre("detalhado")}>
                        Detalhado
                      </Button>
                    </div>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-4 ${modoScadaTorre === "compacto" ? "gap-1.5" : "gap-2"}`}>
                    <div className={`rounded-md border border-emerald-500/30 bg-emerald-500/10 ${modoScadaTorre === "compacto" ? "p-1.5" : "p-2"}`}>
                      <p className="text-[10px] text-emerald-900 dark:text-emerald-200">Torres estáveis</p>
                      <p className={`font-display font-bold text-emerald-900 dark:text-emerald-100 ${modoScadaTorre === "compacto" ? "text-base" : "text-lg"}`}>
                        {leiturasPorTorre.filter((r) => r.nivel.geral === "ok").length}
                      </p>
                    </div>
                    <div className={`rounded-md border border-amber-500/30 bg-amber-500/10 ${modoScadaTorre === "compacto" ? "p-1.5" : "p-2"}`}>
                      <p className="text-[10px] text-amber-900 dark:text-amber-200">Em atenção</p>
                      <p className={`font-display font-bold text-amber-900 dark:text-amber-100 ${modoScadaTorre === "compacto" ? "text-base" : "text-lg"}`}>
                        {leiturasPorTorre.filter((r) => r.nivel.geral === "warn").length}
                      </p>
                    </div>
                    <div className={`rounded-md border border-red-500/30 bg-red-500/10 ${modoScadaTorre === "compacto" ? "p-1.5" : "p-2"}`}>
                      <p className="text-[10px] text-red-900 dark:text-red-200">Em alarme</p>
                      <p className={`font-display font-bold text-red-900 dark:text-red-100 ${modoScadaTorre === "compacto" ? "text-base" : "text-lg"}`}>
                        {leiturasPorTorre.filter((r) => r.nivel.geral === "critico").length}
                      </p>
                    </div>
                    <div className={`rounded-md border border-cyan-500/30 bg-cyan-500/10 ${modoScadaTorre === "compacto" ? "p-1.5" : "p-2"}`}>
                      <p className="text-[10px] text-cyan-900 dark:text-cyan-200">Torres exibidas</p>
                      <p className={`font-display font-bold text-cyan-900 dark:text-cyan-100 ${modoScadaTorre === "compacto" ? "text-base" : "text-lg"}`}>{leiturasPorTorreOrdenadas.length}</p>
                    </div>
                  </div>
                  <div className={modoScadaTorre === "compacto" ? "space-y-3" : "space-y-5"}>
                    {leiturasPorTorre.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-foreground">Nenhuma torre corresponde ao filtro atual</p>
                        <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
                          Escolha <strong>Todas</strong> ou a fase certa em «Painel operacional por fase» e desligue{" "}
                          <strong>Só desativados</strong> se quiser ver torres ativas no SCADA.
                        </p>
                      </div>
                    ) : (
                      leiturasAgrupadasPorSetor.map((grupo) => (
                        <section key={grupo.key} className={modoScadaTorre === "compacto" ? "space-y-1" : "space-y-2"}>
                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 border-b border-border/50 ${modoScadaTorre === "compacto" ? "pb-1" : "pb-2"}`}
                          >
                            <h3
                              className={`font-display font-bold flex items-center gap-2 ${modoScadaTorre === "compacto" ? "text-xs" : "text-sm"}`}
                            >
                              <span aria-hidden>{grupo.icon}</span>
                              {grupo.titulo}
                              <span className="text-xs font-normal text-muted-foreground">
                                ({grupo.leituras.length} torre{grupo.leituras.length !== 1 ? "s" : ""})
                              </span>
                            </h3>
                            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground tabular-nums">
                              <span>{grupo.ecFaixa}</span>
                              <span>{grupo.phFaixa}</span>
                            </div>
                          </div>
                          {grupo.leituras.length === 0 ? (
                            <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-4 text-center">
                              Nenhuma torre neste setor com o filtro atual.
                            </p>
                          ) : (
                            <div
                              className={
                                modoScadaTorre === "compacto"
                                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-x-2 gap-y-1.5"
                                  : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2"
                              }
                            >
                              {grupo.leituras.map((r) => {
                      const ativa = torreEstaAtivaNoDashboard(r.torre);
                      const TrendIcon = (delta: number) => (delta > 0.02 ? ArrowUpRight : delta < -0.02 ? ArrowDownRight : Minus);
                      const alarmeAtivo = r.nivel.geral === "critico";
                      const andares = data.andares
                        .filter((a) => a.torreId === r.torre.id)
                        .sort((a, b) => b.numero - a.numero);
                      const compacto = modoScadaTorre === "compacto";

                      if (compacto) {
                        return (
                          <div
                            key={`tower-mon-${r.torre.id}`}
                            className="rounded-lg border border-primary/15 bg-card p-1.5 shadow-md ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card dark:ring-primary/15"
                          >
                            <div className="flex items-start justify-between gap-1.5 min-w-0 border-b border-primary/10 pb-1 dark:border-primary/20">
                              <div className="min-w-0 leading-tight">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/80 dark:text-primary">Água · SCADA</p>
                                <p className="text-xs font-semibold truncate font-display text-foreground">{r.torre.nome}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{r.caixaNome}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {r.fonteAgua === "estimativa" && (
                                  <Badge
                                    variant="outline"
                                    title="Nenhuma medição registrada na caixa — exibindo estimativa pela fase da torre (comportamento comum no navegador sem histórico de sensores)."
                                    className="h-5 max-w-[4.5rem] truncate border-amber-500/40 bg-amber-500/10 px-1 text-[8px] font-semibold text-amber-950 dark:text-amber-100"
                                  >
                                    Est.
                                  </Badge>
                                )}
                                <span className={`h-2 w-2 rounded-full shadow-sm ${classeSemaforo(r.nivel.geral)}`} />
                                {alarmeAtivo && <Siren className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
                                <Badge
                                  variant="outline"
                                  className={`h-5 border-0 px-1.5 text-[9px] font-bold tabular-nums shadow-sm ${
                                    alarmeAtivo
                                      ? "bg-red-600 text-white hover:bg-red-600 dark:bg-red-600"
                                      : ativa
                                        ? "bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500"
                                        : "border border-border bg-muted text-muted-foreground shadow-none"
                                  }`}
                                >
                                  {alarmeAtivo ? "ALM" : ativa ? "OK" : "OFF"}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-1.5 flex gap-1.5">
                              <div className="shrink-0 w-[2.6rem] rounded-md border border-cyan-500/25 bg-cyan-500/[0.08] px-0.5 pb-0.5 pt-0.5 dark:border-cyan-500/35 dark:bg-cyan-950/30">
                                <p className="text-[8px] font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300 text-center leading-none mb-0.5">
                                  And.
                                </p>
                                <div
                                  className={`flex flex-col gap-[2px] ${andares.length > 12 ? "max-h-[min(11rem,calc(100vh-14rem))] overflow-y-auto [scrollbar-width:thin]" : ""}`}
                                >
                                  {andares.map((andar) => {
                                    const ligado = Boolean(luzPorAndar[andar.id]);
                                    return (
                                      <div
                                        key={`mon-floor-c-${andar.id}`}
                                        className={`h-[1.125rem] min-h-[1.125rem] w-full rounded-sm text-[9px] font-bold flex items-center justify-center tabular-nums border shadow-sm ${
                                          ligado
                                            ? "border-cyan-600 bg-cyan-600 text-white dark:bg-cyan-500 dark:border-cyan-400"
                                            : "border-transparent bg-muted/70 text-muted-foreground dark:bg-muted/40"
                                        }`}
                                      >
                                        {andar.numero}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1 flex-1 min-w-0">
                                <ScadaCompactMetricTile metricKey="ec" label="EC" nivel={r.nivel.ec} raw={r.ec} decimals={2} />
                                <ScadaCompactMetricTile metricKey="ph" label="pH" nivel={r.nivel.ph} raw={r.ph} decimals={2} />
                                <ScadaCompactMetricTile
                                  metricKey="tempAgua"
                                  label="T°"
                                  nivel={r.nivel.tempAgua}
                                  raw={r.tempAgua}
                                  decimals={1}
                                />
                                <ScadaCompactMetricTile metricKey="od" label="OD" nivel={r.nivel.od} raw={r.od} decimals={1} />
                              </div>
                            </div>
                            {alarmeAtivo && (
                              <div className="mt-1 flex items-center justify-center gap-1 rounded-md border border-red-400 bg-red-600 px-1.5 py-1 text-[10px] font-bold leading-tight text-white shadow-sm dark:border-red-500 dark:bg-red-700">
                                <AlertTriangle className="w-3 h-3 shrink-0 opacity-95" />
                                Fora de faixa
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`tower-mon-${r.torre.id}`}
                          className="rounded-xl border border-border/70 bg-background/80 p-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold truncate">{r.torre.nome}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{r.caixaNome}</p>
                            </div>
                            <div className="text-right space-y-1">
                              {r.fonteAgua === "estimativa" && (
                                <Badge
                                  variant="outline"
                                  title="Sem medição na caixa — valores estimados"
                                  className="border-amber-500/40 bg-amber-500/10 text-[9px] text-amber-950 dark:text-amber-100"
                                >
                                  Estimativa
                                </Badge>
                              )}
                              <Badge variant="outline" className={alarmeAtivo ? "bg-red-500/15 text-red-900 dark:text-red-100 border-red-500/40" : ativa ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30" : "bg-red-500/10 text-red-800 dark:text-red-200 border-red-500/30"}>
                                {alarmeAtivo ? "ALARME" : ativa ? "Ativa" : "Desativada"}
                              </Badge>
                              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                                <span className={`h-2.5 w-2.5 rounded-full ${classeSemaforo(r.nivel.geral)}`} />
                                {alarmeAtivo && <Siren className="w-3 h-3 text-red-500" />}
                                SCADA
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-12 gap-2">
                            <div className="col-span-3 rounded-lg border border-border/60 bg-background/70 p-1.5">
                              <p className="text-[9px] text-muted-foreground font-semibold mb-1">ANDARES</p>
                              <div className="space-y-1">
                                {andares.map((andar) => {
                                  const ligado = Boolean(luzPorAndar[andar.id]);
                                  return (
                                    <div
                                      key={`mon-floor-${andar.id}`}
                                      className={`h-4 rounded-md text-[10px] font-semibold flex items-center justify-center ${
                                        ligado
                                          ? "bg-cyan-500/25 text-cyan-900 dark:text-cyan-100 border border-cyan-500/40"
                                          : "bg-muted/40 text-muted-foreground border border-border/50"
                                      }`}
                                    >
                                      {andar.numero}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="col-span-9 grid grid-cols-2 gap-1.5 text-[11px]">
                              <div className={`rounded border px-2 py-1 ${classeCardMetrica(r.nivel.ec)}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-muted-foreground">EC</p>
                                  <span className={`h-2 w-2 rounded-full ${classeSemaforo(r.nivel.ec)}`} />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold">{r.ec != null ? r.ec.toFixed(2) : "—"}</p>
                                  {(() => {
                                    const Icon = TrendIcon(r.tendencia.ec);
                                    return <Icon className="w-3 h-3 text-muted-foreground" />;
                                  })()}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  PV {r.ec != null ? r.ec.toFixed(2) : "—"} / SP {setpointMetrica("ec", r.torre.fase).toFixed(2)} / MV{" "}
                                  {bombaPorTorre[r.torre.id] ? "ON" : "OFF"}
                                </p>
                                <Progress value={faixaMetricaTorre("ec", r.ec)} className="mt-1 h-1" />
                                <div className="mt-1 flex items-end gap-[2px] h-6">
                                  {serieCurta(r.ec, r.tendencia.ec, tickSimulacao, 1.6).map((v, i) => (
                                    <div
                                      key={`trend-ec-${r.torre.id}-${i}`}
                                      className="w-1 rounded-sm bg-cyan-500/70"
                                      style={{ height: `${Math.max(2, Math.min(24, faixaMetricaTorre("ec", v) * 0.24))}px` }}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className={`rounded border px-2 py-1 ${classeCardMetrica(r.nivel.ph)}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-muted-foreground">pH</p>
                                  <span className={`h-2 w-2 rounded-full ${classeSemaforo(r.nivel.ph)}`} />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold">{r.ph != null ? r.ph.toFixed(2) : "—"}</p>
                                  {(() => {
                                    const Icon = TrendIcon(r.tendencia.ph);
                                    return <Icon className="w-3 h-3 text-muted-foreground" />;
                                  })()}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  PV {r.ph != null ? r.ph.toFixed(2) : "—"} / SP {setpointMetrica("ph", r.torre.fase).toFixed(2)} / MV{" "}
                                  {atuadores.find((a) => a.id === "dosadora_ab")?.ativo ? "ON" : "OFF"}
                                </p>
                                <Progress value={faixaMetricaTorre("ph", r.ph)} className="mt-1 h-1" />
                                <div className="mt-1 flex items-end gap-[2px] h-6">
                                  {serieCurta(r.ph, r.tendencia.ph, tickSimulacao, 1.6).map((v, i) => (
                                    <div
                                      key={`trend-ph-${r.torre.id}-${i}`}
                                      className="w-1 rounded-sm bg-emerald-500/70"
                                      style={{ height: `${Math.max(2, Math.min(24, faixaMetricaTorre("ph", v) * 0.24))}px` }}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className={`rounded border px-2 py-1 ${classeCardMetrica(r.nivel.tempAgua)}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-muted-foreground">Temp. água</p>
                                  <span className={`h-2 w-2 rounded-full ${classeSemaforo(r.nivel.tempAgua)}`} />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold">{r.tempAgua != null ? `${r.tempAgua.toFixed(1)} C` : "—"}</p>
                                  {(() => {
                                    const Icon = TrendIcon(r.tendencia.tempAgua);
                                    return <Icon className="w-3 h-3 text-muted-foreground" />;
                                  })()}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  PV {r.tempAgua != null ? r.tempAgua.toFixed(1) : "—"} / SP {setpointMetrica("tempAgua", r.torre.fase).toFixed(1)} / MV{" "}
                                  {atuadores.find((a) => a.id === "chiller")?.ativo ? "ON" : "OFF"}
                                </p>
                                <Progress value={faixaMetricaTorre("tempAgua", r.tempAgua)} className="mt-1 h-1" />
                                <div className="mt-1 flex items-end gap-[2px] h-6">
                                  {serieCurta(r.tempAgua, r.tendencia.tempAgua, tickSimulacao, 1.2).map((v, i) => (
                                    <div
                                      key={`trend-temp-${r.torre.id}-${i}`}
                                      className="w-1 rounded-sm bg-amber-500/70"
                                      style={{ height: `${Math.max(2, Math.min(24, faixaMetricaTorre("tempAgua", v) * 0.24))}px` }}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className={`rounded border px-2 py-1 ${classeCardMetrica(r.nivel.od)}`}>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-muted-foreground">OD</p>
                                  <span className={`h-2 w-2 rounded-full ${classeSemaforo(r.nivel.od)}`} />
                                </div>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold">{r.od != null ? `${r.od.toFixed(1)} mg/L` : "—"}</p>
                                  {(() => {
                                    const Icon = TrendIcon(r.tendencia.od);
                                    return <Icon className="w-3 h-3 text-muted-foreground" />;
                                  })()}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  PV {r.od != null ? r.od.toFixed(1) : "—"} / SP {setpointMetrica("od", r.torre.fase).toFixed(1)} / MV{" "}
                                  {bombaPorTorre[r.torre.id] ? "ALTO" : "BAIXO"}
                                </p>
                                <Progress value={faixaMetricaTorre("od", r.od)} className="mt-1 h-1" />
                                <div className="mt-1 flex items-end gap-[2px] h-6">
                                  {serieCurta(r.od, r.tendencia.od, tickSimulacao, 1.4).map((v, i) => (
                                    <div
                                      key={`trend-od-${r.torre.id}-${i}`}
                                      className="w-1 rounded-sm bg-sky-500/70"
                                      style={{ height: `${Math.max(2, Math.min(24, faixaMetricaTorre("od", v) * 0.24))}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          {alarmeAtivo && (
                            <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-900 dark:text-red-100 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              Fora de limite operacional em uma ou mais métricas da torre.
                            </div>
                          )}
                        </div>
                      );
                              })}
                            </div>
                          )}
                        </section>
                      ))
                    )}
                  </div>
                </div>

                {nivelMonitoramento === "detalhado" && (
                  <>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                      <p className="text-sm font-semibold">Eventos recentes do supervisor</p>
                      <div className="flex flex-wrap gap-1.5">
                        {eventos.slice(0, 8).map((ev) => (
                          <Badge key={`ev-chip-${ev.id}`} variant="outline" className={badgeNivel(ev.nivel)}>
                            [{ev.quando}] {ev.mensagem}
                          </Badge>
                        ))}
                        {eventos.length === 0 && <Badge variant="outline">Sem eventos</Badge>}
                      </div>
                    </div>
                    <Separator />
                    <ListaItens itens={monitoramento} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="py-4 gap-3 mt-4">
              <CardHeader className="px-4">
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-600" />Indicadores de desempenho</CardTitle>
                <CardDescription>Detalhe instantâneo de faixa, atuadores e sensores em alerta.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Tempo dentro da faixa</p>
                    <p className="font-display text-2xl font-bold mt-1">{kpisLive.dentroFaixaPct}%</p>
                    <Progress value={kpisLive.dentroFaixaPct} className="mt-2" />
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Atuadores ativos</p>
                    <p className="font-display text-2xl font-bold mt-1">{kpisLive.atuadoresAtivos}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">de {atuadores.length} dispositivos</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Sensores em alerta</p>
                    <p className="font-display text-2xl font-bold mt-1">{kpisLive.warn + kpisLive.crit}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {kpisLive.crit} criticos / {kpisLive.warn} atencao
                    </p>
                  </div>
                </div>
                <Separator />
                <ListaItens itens={kpis} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atuadores">
            <Card className="py-4 gap-3">
              <CardHeader className="px-4">
                <CardTitle className="text-base flex items-center gap-2"><Wind className="w-4 h-4 text-cyan-600" />Acionamentos e controle</CardTitle>
                <CardDescription>Saídas controláveis por software para fechar o loop entre setpoint e execução.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                {supervisorOperacionalPausado && (
                  <div className="rounded-lg border border-amber-500/45 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                    Supervisor operacional em pausa: rotinas automáticas simuladas estão inibidas (equivalente a “parar painel”). Os comandos manuais abaixo continuam disponíveis; detalhes de modo e agenda ficam na aba Programações.
                  </div>
                )}
                <div className="space-y-2">
                  {atuadores.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.zona}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={a.online ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-red-500/10 text-red-800 dark:text-red-200"}>
                            {a.online ? "Online" : "Offline"}
                          </Badge>
                          <Badge variant="outline">{a.modo.toUpperCase()}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant={a.ativo ? "destructive" : "default"} className="h-7 text-xs" onClick={() => toggleAtuador(a.id)}>
                          {a.ativo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {a.ativo ? "Desligar" : "Ligar"}
                        </Button>
                        <div className="inline-flex items-center gap-2 rounded-md border border-border/70 px-2 py-1">
                          <span className="text-[11px] text-muted-foreground">Auto</span>
                          <Switch checked={a.modo === "auto"} onCheckedChange={(v) => alterarModo(a.id, v ? "auto" : "manual")} />
                        </div>
                        <Badge variant="outline" className={a.ativo ? "bg-sky-500/10 text-sky-800 dark:text-sky-200" : ""}>
                          {a.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Controle por torre e por andar (SCADA)</p>
                    <Badge variant="outline" className="text-[10px]">clique no andar para ligar/desligar luz</Badge>
                  </div>
                  {torresOperacionaisPorFase.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                      Nenhuma torre para os filtros atuais.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {torresOperacionaisPorFase.map((grupo) => (
                        <div key={`fase-oper-${grupo.fase}`} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{grupo.faseLabel}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                            {grupo.torres.map((torre) => {
                              const andares = data.andares
                                .filter((a) => a.torreId === torre.id)
                                .sort((a, b) => b.numero - a.numero);
                              const ativos = andares.filter((a) => luzPorAndar[a.id]).length;
                              const bombaOn = Boolean(bombaPorTorre[torre.id]);
                              return (
                                <div key={`ctrl-${torre.id}`} className="rounded-md border border-border/70 bg-background/75 p-2.5 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold truncate">{torre.nome}</p>
                                    <Badge
                                      variant="outline"
                                      className={bombaOn ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30" : "bg-red-500/10 text-red-800 dark:text-red-200 border-red-500/30"}
                                    >
                                      Bomba {bombaOn ? "ON" : "OFF"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <Button size="sm" className="h-7 text-xs" variant={bombaOn ? "destructive" : "default"} onClick={() => toggleBombaTorre(torre.id, torre.nome)}>
                                      {bombaOn ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                      {bombaOn ? "Desligar bomba" : "Ligar bomba"}
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground">{ativos}/{andares.length} andares com luz ON</p>
                                  </div>
                                  <div className="rounded-lg border border-border/60 bg-background/60 p-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">ANDARES (torre vertical)</p>
                                    <div className="flex flex-col gap-1">
                                      {andares.map((andar) => {
                                        const luzOn = Boolean(luzPorAndar[andar.id]);
                                        const ocupado = andarTemCultivo(andar);
                                        return (
                                          <button
                                            key={andar.id}
                                            type="button"
                                            onClick={() => toggleLuzAndar(andar.id, torre.nome, andar.numero)}
                                            className={`h-6 rounded-md border px-2 text-[11px] font-semibold transition flex items-center justify-between ${
                                              luzOn
                                                ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                                                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70"
                                            } ${ocupado && !luzOn ? "border-amber-500/40 text-amber-800 dark:text-amber-200" : ""}`}
                                            title={`${torre.nome} / Andar ${andar.numero}: iluminação ${luzOn ? "ligada" : "desligada"}`}
                                          >
                                            <span>Andar {andar.numero}</span>
                                            <span className="text-[10px]">{luzOn ? "ON" : "OFF"}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
                <ListaItens itens={atuadoresCatalogo} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programacoes">
            <div className="space-y-4">
              <PainelProgramacoesVertical
                torres={data.torres.map((t) => ({ id: t.id, nome: t.nome }))}
                caixasAgua={data.caixasAgua.map((c) => ({ id: c.id, nome: c.nome }))}
                programacoes={programacoesVerticais}
                onProgramacoesChange={setProgramacoesVerticais}
                supervisorPausado={supervisorOperacionalPausado}
                onToggleSupervisor={alternarSupervisorOperacional}
                pushLog={pushEvento}
              />

              <Card className="py-4 gap-3">
                <CardHeader className="px-4">
                  <CardTitle className="text-base">Modos explicados para a operação vertical</CardTitle>
                  <CardDescription>Resumo funcional; amarração com sensores e caixas segue as mesmas ideias do manual de referência.</CardDescription>
                </CardHeader>
                <CardContent className="px-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="sem">
                      <AccordionTrigger>Semanal</AccordionTrigger>
                      <AccordionContent>
                        Horário fixo e duração por evento — por exemplo irrigação nutricional da torre às 10h em segunda, quarta e sexta. Complementos (ferti na linha ou dosadora) ficam centrados na janela, como no painel físico.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="temp">
                      <AccordionTrigger>Temporizador (cíclico)</AccordionTrigger>
                      <AccordionContent>
                        Janela do dia com ciclos ligado/desligado — útil para névoa, pulso de irrigação em substrato ou refresh em circuito fechado ao longo do fotoperíodo.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="bloco">
                      <AccordionTrigger>Bloco (fila)</AccordionTrigger>
                      <AccordionContent>
                        Vários setores em sequência num único disparo — na vertical, fila de torres ou andares que compartilham bomba para não haver sobreposição de vazão.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="bs">
                      <AccordionTrigger>Bloco por sensores / sensores inteligentes</AccordionTrigger>
                      <AccordionContent>
                        Partida por DPV, umidade, EC de leito ou condição ambiental; “extra” pode ser só luz de reforço ou exaustão sem ligar a bomba principal da linha.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="multi">
                      <AccordionTrigger>Hidroponia multicaixa</AccordionTrigger>
                      <AccordionContent>
                        Ajuste de EC por reservatório em horários programados, com tempo de mistura e limpeza de linha — mapeado às várias caixas ligadas às torres do projeto.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="pos">
                      <AccordionTrigger>Acionamento pós-torre</AccordionTrigger>
                      <AccordionContent>
                        Depois que uma torre termina um ciclo (por exemplo irrigação), aciona dreno, retrolavagem ou válvula extra por alguns minutos — equivalente ao pós-setor do manual.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="al">
                      <AccordionTrigger>Alarme</AccordionTrigger>
                      <AccordionContent>
                        Falha de comunicação, dosagem ou vazão/pressão fora da faixa: sirene ou saída dedicada; combine com a aba Segurança e o painel de alarmes do monitoramento.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="regras">
            <Card className="py-4 gap-3">
              <CardHeader className="px-4">
                <CardTitle className="text-base">Lógica de automação</CardTitle>
                <CardDescription>Regras operacionais para estabilidade, repetibilidade e menor intervenção manual.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2">
                    <p className="text-[10px] text-blue-900 dark:text-blue-200">Regras ativas</p>
                    <p className="font-display text-lg font-bold text-blue-900 dark:text-blue-100">{regras.length}</p>
                  </div>
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
                    <p className="text-[10px] text-emerald-900 dark:text-emerald-200">Sensores dentro da faixa</p>
                    <p className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-100">{kpisLive.ok}/{sensores.length}</p>
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    <p className="text-[10px] text-amber-900 dark:text-amber-200">Torres em atenção</p>
                    <p className="font-display text-lg font-bold text-amber-900 dark:text-amber-100">{torresEmAtencao}</p>
                  </div>
                  <div className="rounded-md border border-violet-500/30 bg-violet-500/10 p-2">
                    <p className="text-[10px] text-violet-900 dark:text-violet-200">Cobertura de automação</p>
                    <p className="font-display text-lg font-bold text-violet-900 dark:text-violet-100">{coberturaAutomacaoPct}%</p>
                  </div>
                </div>
                <ListaItens itens={regras} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguranca">
            <Card className="py-4 gap-3">
              <CardHeader className="px-4">
                <CardTitle className="text-base">Alertas, auditoria e fail-safe</CardTitle>
                <CardDescription>Camada de proteção para evitar perdas por falha de equipamento, sensor ou comunicação.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                    <p className="text-[10px] text-red-900 dark:text-red-200">Eventos críticos</p>
                    <p className="font-display text-lg font-bold text-red-900 dark:text-red-100">{eventosCriticosRecentes}</p>
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    <p className="text-[10px] text-amber-900 dark:text-amber-200">Eventos de atenção</p>
                    <p className="font-display text-lg font-bold text-amber-900 dark:text-amber-100">{eventosWarnRecentes}</p>
                  </div>
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                    <p className="text-[10px] text-red-900 dark:text-red-200">Torres em alarme</p>
                    <p className="font-display text-lg font-bold text-red-900 dark:text-red-100">{torresEmAlarme}</p>
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    <p className="text-[10px] text-amber-900 dark:text-amber-200">Sensores críticos</p>
                    <p className="font-display text-lg font-bold text-amber-900 dark:text-amber-100">{sensoresCriticos}</p>
                  </div>
                  <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-2">
                    <p className="text-[10px] text-sky-900 dark:text-sky-200">Índice de segurança</p>
                    <p className="font-display text-lg font-bold text-sky-900 dark:text-sky-100">{indiceSeguranca}%</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Log de eventos (tempo real)</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEventos([])}>
                      <TimerReset className="w-3.5 h-3.5" />
                      Limpar
                    </Button>
                  </div>
                  <div className="mt-3 max-h-52 overflow-auto space-y-2 pr-1">
                    {eventos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem eventos recentes.</p>
                    ) : (
                      eventos.map((ev) => (
                        <div key={ev.id} className="rounded-md border border-border/60 px-2.5 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className={badgeNivel(ev.nivel)}>{labelNivel(ev.nivel)}</Badge>
                            <span className="text-muted-foreground">{ev.quando}</span>
                          </div>
                          <p className="mt-1 text-foreground">{ev.mensagem}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <Separator />
                <ListaItens itens={seguranca} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios">
            <Card className="py-4 gap-3">
              <CardHeader className="px-4">
                <CardTitle className="text-base flex items-center gap-2"><TimerReset className="w-4 h-4 text-violet-600" />Relatórios operacionais</CardTitle>
                <CardDescription>Consolidado mensal de desempenho, estabilidade e eficiência da operação.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
                    <p className="text-[10px] text-emerald-900 dark:text-emerald-200">Uptime médio</p>
                    <p className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-100">{resumoRelatorio.mediaUptime}%</p>
                  </div>
                  <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-2">
                    <p className="text-[10px] text-cyan-900 dark:text-cyan-200">Dentro da faixa</p>
                    <p className="font-display text-lg font-bold text-cyan-900 dark:text-cyan-100">{resumoRelatorio.mediaFaixa}%</p>
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                    <p className="text-[10px] text-amber-900 dark:text-amber-200">Alertas críticos (6m)</p>
                    <p className="font-display text-lg font-bold text-amber-900 dark:text-amber-100">{resumoRelatorio.totalAlertas}</p>
                  </div>
                  <div className="rounded-md border border-violet-500/30 bg-violet-500/10 p-2">
                    <p className="text-[10px] text-violet-900 dark:text-violet-200">Consumo elétrico (6m)</p>
                    <p className="font-display text-lg font-bold text-violet-900 dark:text-violet-100">{resumoRelatorio.totalConsumo.toLocaleString("pt-BR")} kWh</p>
                  </div>
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2">
                    <p className="text-[10px] text-blue-900 dark:text-blue-200">Produção total (6m)</p>
                    <p className="font-display text-lg font-bold text-blue-900 dark:text-blue-100">{resumoRelatorio.totalProducao.toLocaleString("pt-BR")} kg</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-semibold">Premissas de cálculo</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5 text-[11px]">
                    <div className="rounded border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="text-muted-foreground">Iluminação</p>
                      <p className="font-semibold">5 lâmpadas/andar x 40W (16h/dia)</p>
                    </div>
                    <div className="rounded border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="text-muted-foreground">Refrigeração</p>
                      <p className="font-semibold">40A em 220V trifásico (fator de uso 40%)</p>
                    </div>
                    <div className="rounded border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="text-muted-foreground">Produção</p>
                      <p className="font-semibold">100g/planta, 6 plantas por perfil de maturação</p>
                    </div>
                    <div className="rounded border border-border/60 bg-background/80 px-2 py-1.5">
                      <p className="text-muted-foreground">Base operacional</p>
                      <p className="font-semibold">Quantidade de andares e perfis ativos do projeto</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-semibold">Histórico mensal (últimos 6 meses)</p>
                  <div className="space-y-2">
                    {relatorio6Meses.map((m) => (
                      <div key={m.competencia} className="rounded-md border border-border/70 bg-background/80 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold uppercase">{m.competencia}</p>
                          <div className="inline-flex items-center gap-1.5">
                            <Badge variant="outline" className={m.alertasCriticos > 6 ? "bg-red-500/10 text-red-900 dark:text-red-100 border-red-500/30" : "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 border-emerald-500/30"}>
                              {m.alertasCriticos} alertas críticos
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-1.5 text-[11px]">
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Uptime</p>
                            <p className="font-semibold">{m.uptimePct}%</p>
                          </div>
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Dentro faixa</p>
                            <p className="font-semibold">{m.dentroFaixaPct}%</p>
                          </div>
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Consumo</p>
                            <p className="font-semibold">{m.consumoKwh.toLocaleString("pt-BR")} kWh</p>
                          </div>
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Recirculação</p>
                            <p className="font-semibold">{m.recirculacaoM3.toLocaleString("pt-BR")} m3</p>
                          </div>
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Produção</p>
                            <p className="font-semibold">{m.producaoKg.toLocaleString("pt-BR")} kg</p>
                          </div>
                          <div className="rounded border border-border/60 bg-muted/30 px-2 py-1">
                            <p className="text-muted-foreground">Alertas críticos</p>
                            <p className="font-semibold">{m.alertasCriticos}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <section className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Integração operacional com hardware</p>
          <p className="text-xs text-muted-foreground">
            O servidor pode ligar a um broker MQTT (variável <code className="rounded bg-muted px-1">MQTT_URL</code>) e
            subscrever telemetria por projeto; comandos para dispositivos usam o mesmo prefixo de tópicos. Ver{" "}
            <code className="rounded bg-muted px-1">docs/MQTT-INTEGRACAO.md</code>. Modbus, PLC e ESP32 seguem como
            extensões futuras sobre esta camada.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline"><Waves className="w-3 h-3" /> MQTT</Badge>
            <Badge variant="outline"><Cpu className="w-3 h-3" /> Modbus TCP</Badge>
            <Badge variant="outline"><Snowflake className="w-3 h-3" /> HVAC / CLP</Badge>
            <Badge variant="outline"><Zap className="w-3 h-3" /> Reles / Atuadores</Badge>
          </div>
          {isAdmin && mqttStatus.data && (
            <div className="mt-4 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs">
              <p className="font-semibold text-foreground mb-1">MQTT no servidor (admin)</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                <li>
                  Configurado: {mqttStatus.data.configured ? "sim" : "não"}{" "}
                  {mqttStatus.data.configured && (
                    <>
                      — ligado ao broker: {mqttStatus.data.connected ? "sim" : "não"}
                    </>
                  )}
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
