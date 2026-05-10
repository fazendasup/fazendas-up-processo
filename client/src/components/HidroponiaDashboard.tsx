import { Link } from "wouter";
import { motion } from "framer-motion";
import { BarChart3, Clock, LayoutGrid, Box, Sprout, ClipboardList, CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useFazenda } from "@/contexts/FazendaContext";
import { FASES_CONFIG, type Fase } from "@/lib/types";
import { contarCiclosPendentes, cicloPendenteHoje } from "@/lib/utils-farm";
import BancadaCard from "@/components/BancadaCard";
import { filtroTarefasParaHoje, partitionTarefasHojeVsAtrasadas } from "@/lib/tarefasHoje";
import { contarCiclosAplicacaoAtrasados } from "@/lib/ciclosAgenda";
import {
  dateKeyLocal,
  eventosPorDia,
  filtrarEventosDoDiaLocal,
  filtrarEventosSomenteGerminacaoPlantio,
  resumoFasesDoDiaPt,
  type PlanoRow,
} from "@/lib/planejamentoCalendario";
import { filtrarPlanosPrioridadeSomenteGerminacaoPlantio } from "@/lib/planosPlantioOperacao";
import { useMemo } from "react";
import { useAgendaModal } from "@/contexts/AgendaModalContext";

function KPICardH({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-500/[0.07] dark:bg-emerald-500/15",
    blue: "bg-sky-500/[0.07] dark:bg-sky-500/15",
    cyan: "bg-cyan-500/[0.07] dark:bg-cyan-500/15",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-panel p-3.5 ${bgMap[color] || "bg-muted/40"}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
    </motion.div>
  );
}

function AlertBadgeH({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
    red: "border-red-500/30 bg-red-500/10 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100",
    blue: "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:border-sky-500/45 dark:bg-sky-500/15 dark:text-sky-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colorMap[color] ?? colorMap.amber}`}
    >
      {icon}
      {text}
    </span>
  );
}

export default function HidroponiaDashboard() {
  const { openAgenda } = useAgendaModal();
  const { activeProjeto } = useProjeto();
  const { data } = useFazenda();
  const listQuery = trpc.bancadas.list.useQuery(undefined, { staleTime: 30_000 });
  const tarefasQuery = trpc.tarefas.list.useQuery();
  const planosPlantioQuery = trpc.planosPlantio.list.useQuery();

  const rows = listQuery.data ?? [];
  const visiveis = rows.filter((b) => b.ativa && b.status === "ativa");
  const totalCaixas = visiveis.reduce((s, b) => s + (b.quantidadeCaixas ?? 0), 0);

  const { paraHoje: tarefasParaHojeList, atrasadas: tarefasAtrasadasList } = useMemo(() => {
    const lista = filtroTarefasParaHoje(tarefasQuery.data || []);
    return partitionTarefasHojeVsAtrasadas(lista);
  }, [tarefasQuery.data]);

  const ciclosAplicacaoAtrasados = useMemo(
    () => contarCiclosAplicacaoAtrasados(data.ciclos, (tarefasQuery.data || []) as any[]),
    [data.ciclos, tarefasQuery.data],
  );

  const eventosPlantioHoje = useMemo(() => {
    const planos = (planosPlantioQuery.data || []) as PlanoRow[];
    const map = eventosPorDia(planos);
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const hojeKey = dateKeyLocal(hoje);
    const raw = map.get(hojeKey) ?? [];
    return filtrarEventosDoDiaLocal(raw, planos, hojeKey);
  }, [planosPlantioQuery.data]);

  const planosGerminacaoPrioridade = useMemo(
    () => filtrarPlanosPrioridadeSomenteGerminacaoPlantio((planosPlantioQuery.data || []) as any[], new Date()),
    [planosPlantioQuery.data],
  );
  const idsPlanosGerminacao = useMemo(
    () => new Set(planosGerminacaoPrioridade.map((p: { id: number }) => p.id)),
    [planosGerminacaoPrioridade],
  );
  const eventosGerminacaoHoje = useMemo(
    () => filtrarEventosSomenteGerminacaoPlantio(eventosPlantioHoje).filter((e) => !idsPlanosGerminacao.has(e.planoId)),
    [eventosPlantioHoje, idsPlanosGerminacao],
  );
  const totalPlantioGerminacao = planosGerminacaoPrioridade.length + eventosGerminacaoHoje.length;

  const fases: Fase[] = ["mudas", "vegetativa", "maturacao"];

  const ciclosPendentesHoje = data.ciclos.filter((c) => cicloPendenteHoje(c)).length;

  return (
    <>
      <div className="relative h-44 sm:h-52 overflow-hidden border-b border-border/40 bg-gradient-to-br from-cyan-950/90 via-emerald-900/85 to-slate-900">
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(34,211,238,0.35), transparent 45%),
              radial-gradient(circle at 80% 20%, rgba(16,185,129,0.25), transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 flex items-end sm:items-center pb-6 sm:pb-0">
          <div className="container">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/90 mb-1">Hidroponia</p>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Painel de cultivo</h1>
            <p className="text-sm mt-2 max-w-xl text-white/90">
              {activeProjeto?.nome ?? "Projeto"} — bancadas por fase. Toque numa bancada para registar EC/pH, aplicações e
              plantio por caixa. Cadastro em <strong>Configurações</strong>.
            </p>
          </div>
        </div>
      </div>

      <main className="container py-6 space-y-8">
        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            Indicadores
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPICardH
              icon={<LayoutGrid className="w-4 h-4 text-cyan-600" />}
              label="Bancadas ativas"
              value={visiveis.length}
              color="cyan"
            />
            <KPICardH
              icon={<Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              label="Total de caixas"
              value={totalCaixas}
              color="emerald"
            />
            <KPICardH
              icon={<Sprout className="w-4 h-4 text-sky-600" />}
              label="Registros (lista)"
              value={rows.length}
              color="blue"
            />
          </div>
        </section>

        {(ciclosPendentesHoje > 0 ||
          tarefasParaHojeList.length > 0 ||
          tarefasAtrasadasList.length > 0 ||
          ciclosAplicacaoAtrasados > 0 ||
          totalPlantioGerminacao > 0) && (
          <section className="flex flex-wrap gap-2">
            {ciclosPendentesHoje > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('ciclos')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeH
                  icon={<Clock className="w-3 h-3" />}
                  text={`${ciclosPendentesHoje} ciclo(s) pendente(s) hoje`}
                  color="amber"
                />
              </button>
            )}
            {tarefasParaHojeList.length > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('tarefas_hoje')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeH
                  icon={<ClipboardList className="w-3 h-3" />}
                  text={`${tarefasParaHojeList.length} tarefa(s) para hoje`}
                  color="amber"
                />
              </button>
            )}
            {tarefasAtrasadasList.length > 0 || ciclosAplicacaoAtrasados > 0 ? (
              <button
                type="button"
                onClick={() => openAgenda('tarefas_atrasadas')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeH
                  icon={<ClipboardList className="w-3 h-3" />}
                  text={
                    ciclosAplicacaoAtrasados > 0 && tarefasAtrasadasList.length > 0
                      ? `${tarefasAtrasadasList.length} tarefa(s) + ${ciclosAplicacaoAtrasados} ciclo(s) atrasado(s)`
                      : ciclosAplicacaoAtrasados > 0
                        ? `${ciclosAplicacaoAtrasados} ciclo(s) de aplicação atrasado(s)`
                        : `${tarefasAtrasadasList.length} tarefa(s) atrasada(s)`
                  }
                  color="red"
                />
              </button>
            ) : null}
            {totalPlantioGerminacao > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('plantio')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeH
                  icon={<CalendarClock className="w-3 h-3" />}
                  text={`Germinação/plantio: ${resumoFasesDoDiaPt(filtrarEventosSomenteGerminacaoPlantio(eventosPlantioHoje))} · ${totalPlantioGerminacao} ítem(ns)`}
                  color="blue"
                />
              </button>
            )}
          </section>
        )}

        {listQuery.isLoading && <p className="text-sm text-muted-foreground">A carregar bancadas…</p>}
        {listQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar as bancadas.</p>}

        {fases.map((fase) => {
          const cfg = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
          const lista = visiveis.filter((b) => b.fase === fase);
          const ciclosP = contarCiclosPendentes(data.ciclos, fase);

          return (
            <section key={fase}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  {cfg.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({lista.length} bancada{lista.length !== 1 ? "s" : ""})
                  </span>
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>EC {cfg.ecMin}-{cfg.ecMax}</span>
                  <span>pH {cfg.phMin}-{cfg.phMax}</span>
                  {ciclosP > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold">{ciclosP} ciclo(s) pendente(s)</span>}
                </div>
              </div>
              {lista.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
                  Nenhuma bancada ativa nesta fase. Adicione em{" "}
                  <Link href="/config" className="text-primary font-medium underline-offset-2 hover:underline">
                    Configurações
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {lista.map((b) => (
                    <BancadaCard key={b.id} bancada={b} fase={fase} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
