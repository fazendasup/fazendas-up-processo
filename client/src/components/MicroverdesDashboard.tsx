// ============================================================
// Dashboard — projeto tipo microverdes (torres até 6 andares)
// ============================================================

import { Link } from "wouter";
import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  BarChart3,
  AlertTriangle,
  Sprout,
  Scissors,
  Wrench,
  Leaf,
  Clock,
  Layers,
  Target,
  Droplet,
  ClipboardList,
  CalendarClock,
  Rows3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useFazenda } from "@/contexts/FazendaContext";
import { FASES_CONFIG, torreEstaAtivaNoDashboard, type Fase } from "@/lib/types";
import {
  AGRUPAMENTO_FASES_TORRE_MV,
  LAYOUT_FASE_ESTUFA_REFERENCIA,
  labelFaseTorreMicroverdes,
} from "@/lib/microverdesPhases";
import {
  resumoFazenda,
  contarCiclosPendentes,
  calcularKPIs,
  contarPlantasAndar,
  contarColhidasAndar,
  andarDentroDoModeloDaTorre,
  prontosColheitaPorVariedadeFazenda,
} from "@/lib/utils-farm";
import TorreCard from "@/components/TorreCard";
import ProntasColheitaKpiDialog from "@/components/ProntasColheitaKpiDialog";
import { filtroTarefasParaHoje, partitionTarefasHojeVsAtrasadas } from "@/lib/tarefasHoje";
import { contarCiclosAplicacaoAtrasados } from "@/lib/ciclosAgenda";
import { filtrarPlanosPrioridadeSomenteGerminacaoPlantio } from "@/lib/planosPlantioOperacao";
import { useAgendaModal } from "@/contexts/AgendaModalContext";
import {
  dateKeyLocal,
  eventosPorDia,
  filtrarEventosDoDiaLocal,
  filtrarEventosSomenteGerminacaoPlantio,
  resumoFasesDoDiaPt,
  type PlanoRow,
} from "@/lib/planejamentoCalendario";

function KPICardMv({
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
    amber: "bg-amber-500/[0.08] dark:bg-amber-500/15",
    red: "bg-red-500/[0.07] dark:bg-red-500/15",
    orange: "bg-orange-500/[0.07] dark:bg-orange-500/15",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-panel p-3.5 ${bgMap[color] || "bg-muted/40 dark:bg-muted/25"}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
    </motion.div>
  );
}

function AlertBadgeMv({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
    red: "border-red-500/30 bg-red-500/10 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100",
    blue: "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:border-sky-500/45 dark:bg-sky-500/15 dark:text-sky-100",
    emerald:
      "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colorMap[color]}`}
    >
      {icon}
      {text}
    </span>
  );
}

export default function MicroverdesDashboard() {
  const { openAgenda } = useAgendaModal();
  const { activeProjeto } = useProjeto();
  const { data } = useFazenda();
  const torresAtivas = data.torres.filter(torreEstaAtivaNoDashboard);
  const torresAtivasIds = new Set(torresAtivas.map((t) => t.id));
  const dataAtiva = {
    ...data,
    torres: torresAtivas,
    andares: data.andares.filter((a) => {
      if (!torresAtivasIds.has(a.torreId)) return false;
      const t = data.torres.find((x) => x.id === a.torreId);
      return t ? andarDentroDoModeloDaTorre(a, t) : false;
    }),
    manutencoes: data.manutencoes.filter((m) => torresAtivasIds.has(m.torreId)),
  };
  const resumo = resumoFazenda(dataAtiva);
  const kpis = calcularKPIs(dataAtiva);

  const prontosColheitaPorVariedade = useMemo(() => prontosColheitaPorVariedadeFazenda(dataAtiva), [data]);

  const torresComExcessoAndares = useMemo(
    () =>
      torresAtivas.filter((t) => {
        const n = Number(t.numAndares ?? t.andares ?? 0);
        return n > 6;
      }),
    [torresAtivas],
  );

  const tarefasQuery = trpc.tarefas.list.useQuery();
  const { paraHoje: tarefasParaHojeList, atrasadas: tarefasAtrasadasList } = useMemo(() => {
    const lista = filtroTarefasParaHoje(tarefasQuery.data || []);
    return partitionTarefasHojeVsAtrasadas(lista);
  }, [tarefasQuery.data]);

  const ciclosAplicacaoAtrasados = useMemo(
    () => contarCiclosAplicacaoAtrasados(data.ciclos, (tarefasQuery.data || []) as any[]),
    [data.ciclos, tarefasQuery.data],
  );

  const planosPlantioQuery = trpc.planosPlantio.list.useQuery();
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

  const plantasPorGrupoMv = AGRUPAMENTO_FASES_TORRE_MV.map(({ id, label, fases }) => {
    const torresG = torresAtivas.filter((t) => fases.includes(t.fase));
    const andaresG = dataAtiva.andares.filter((a) => {
      const t = dataAtiva.torres.find((x) => x.id === a.torreId);
      return t != null && fases.includes(t.fase);
    });
    const plantadas = andaresG.reduce((sum, a) => {
      const t = dataAtiva.torres.find((x) => x.id === a.torreId);
      return sum + contarPlantasAndar(a, t?.fase, dataAtiva.projetoTipo);
    }, 0);
    const colhidas =
      id === "iluminacao"
        ? andaresG.reduce((sum, a) => {
            const t = dataAtiva.torres.find((x) => x.id === a.torreId);
            return sum + contarColhidasAndar(a, t?.fase, dataAtiva.projetoTipo);
          }, 0)
        : 0;
    return { id, label, fases, plantadas, colhidas };
  });

  return (
    <>
      <div className="relative h-44 sm:h-52 overflow-hidden border-b border-emerald-900/30 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-950">
        <div
          className="absolute inset-0 opacity-[0.18] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-end sm:items-center pb-6 sm:pb-0">
          <div className="container">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-100/90 mb-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
              Microverdes · bandejas
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
              {activeProjeto?.nome ?? "Painel"}
            </h1>
            <p className="text-sm mt-2 max-w-xl text-white/92 drop-shadow-[0_1px_10px_rgba(0,0,0,0.65)]">
              Fase estufa: referência de <strong>{LAYOUT_FASE_ESTUFA_REFERENCIA.estufas} estufas</strong> e{" "}
              <strong>{LAYOUT_FASE_ESTUFA_REFERENCIA.torres} torres</strong> de até{" "}
              <strong>{LAYOUT_FASE_ESTUFA_REFERENCIA.andaresPorTorre} andares</strong> (amplie no cadastro). Cada
              andar: até <strong>4 bandejas</strong> (coco ou espuma). Rega manual por defeito. Duas fases de torre:{" "}
              <strong>germinação</strong> e <strong>iluminação</strong> — a colheita faz-se na iluminação.
            </p>
            <p className="text-xs mt-1 text-emerald-100/85">
              {resumo.totalTorres} torre{resumo.totalTorres !== 1 ? "s" : ""} · {resumo.totalAndares} andares no
              cadastro · {resumo.andaresOcupados} ocupados
            </p>
          </div>
        </div>
      </div>

      <main className="container py-6 space-y-8">
        {torresComExcessoAndares.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
            <p className="font-semibold flex items-center gap-2">
              <Rows3 className="w-4 h-4 shrink-0" />
              Ajuste o modelo físico das torres
            </p>
            <p className="mt-1 text-muted-foreground dark:text-amber-100/90">
              Em microverdes cada torre deve ter no máximo <strong>6 andares</strong>. As seguintes ultrapassam esse
              limite — edite em{" "}
              <Link href="/config" className="font-medium text-primary underline-offset-2 hover:underline">
                Configurações → Torres
              </Link>
              : {torresComExcessoAndares.map((t) => `${t.nome} (${t.numAndares ?? t.andares} and.)`).join(" · ")}
            </p>
          </div>
        )}

        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600/25">
              <BarChart3 className="w-4 h-4" />
            </span>
            Indicadores
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICardMv
              icon={<Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              label="Bandejas em cultivo"
              value={kpis.totalPlantas}
              color="emerald"
            />
            <KPICardMv
              icon={<Target className="w-4 h-4 text-blue-600" />}
              label="Ocupação geral"
              value={`${kpis.taxaOcupacao}%`}
              color="blue"
            />
            <ProntasColheitaKpiDialog
              icon={<Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              label="Prontas colheita"
              value={kpis.plantasProntasColheita}
              rows={prontosColheitaPorVariedade}
              unidade="bandejas"
              dialogDescription="Torres de iluminação (colheita): bandejas com prazo vencido ou hoje, agrupadas por variedade."
            />
            <KPICardMv
              icon={<Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              label="Taxa germinação"
              value={kpis.taxaGerminacao > 0 ? `${kpis.taxaGerminacao}%` : "-"}
              color="emerald"
            />
            <KPICardMv
              icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
              label="Desperdício"
              value={kpis.totalDesperdicio > 0 ? `${kpis.taxaDesperdicio}%` : "-"}
              color="red"
            />
            <KPICardMv
              icon={<Wrench className="w-4 h-4 text-orange-600" />}
              label="Manutenções"
              value={kpis.manutencoesAbertas}
              color={kpis.manutencoesVencidas > 0 ? "red" : "orange"}
            />
          </div>
        </section>

        {(resumo.ciclosPendentes > 0 ||
          resumo.previsaoVencida > 0 ||
          kpis.andaresLavagemPendente > 0 ||
          kpis.manutencoesVencidas > 0 ||
          tarefasParaHojeList.length > 0 ||
          tarefasAtrasadasList.length > 0 ||
          ciclosAplicacaoAtrasados > 0 ||
          totalPlantioGerminacao > 0) && (
          <section className="flex flex-wrap gap-2">
            {resumo.ciclosPendentes > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('ciclos')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv icon={<Clock className="w-3 h-3" />} text={`${resumo.ciclosPendentes} ciclo(s) pendente(s)`} color="amber" />
              </button>
            )}
            {resumo.previsaoVencida > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('colheita')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
                  icon={<AlertTriangle className="w-3 h-3" />}
                  text={`${resumo.previsaoVencida} andar(es) com bandejas prontas para ação`}
                  color="red"
                />
              </button>
            )}
            {kpis.andaresLavagemPendente > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('lavagem')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
                  icon={<Droplet className="w-3 h-3" />}
                  text={`${kpis.andaresLavagemPendente} andar(es) aguardando lavagem`}
                  color="red"
                />
              </button>
            )}
            {kpis.manutencoesVencidas > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('manutencao')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
                  icon={<Wrench className="w-3 h-3" />}
                  text={`${kpis.manutencoesVencidas} manutenção(ões) com prazo vencido`}
                  color="red"
                />
              </button>
            )}
            {tarefasParaHojeList.length > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('tarefas_hoje')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
                  icon={<ClipboardList className="w-3 h-3" />}
                  text={`${tarefasParaHojeList.length} tarefa(s) para hoje`}
                  color="amber"
                />
              </button>
            )}
            {(tarefasAtrasadasList.length > 0 || ciclosAplicacaoAtrasados > 0) && (
              <button
                type="button"
                onClick={() => openAgenda('tarefas_atrasadas')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
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
            )}
            {totalPlantioGerminacao > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('plantio')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadgeMv
                  icon={<CalendarClock className="w-3 h-3" />}
                  text={`Germinação/plantio: ${resumoFasesDoDiaPt(filtrarEventosSomenteGerminacaoPlantio(eventosPlantioHoje))} · ${totalPlantioGerminacao} ítem(ns)`}
                  color="emerald"
                />
              </button>
            )}
          </section>
        )}

        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600/25">
              <Layers className="w-4 h-4" />
            </span>
            Cultivo por etapa
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plantasPorGrupoMv.map(({ id, label, fases, plantadas, colhidas }) => {
              const refFase = fases[0]!;
              const cfg = data.fasesConfig?.[refFase] || FASES_CONFIG[refFase];
              const isIluminacao = id === "iluminacao";
              return (
                <div key={id} className="surface-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm">
                      {cfg.icon} {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      EC {cfg.ecMin}-{cfg.ecMax} | pH {cfg.phMin}-{cfg.phMax}
                    </span>
                  </div>
                  {isIluminacao ? (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                        <p className="font-display font-bold text-xl text-emerald-800 dark:text-emerald-200">{plantadas}</p>
                        <p className="text-[10px] text-muted-foreground">Em processo</p>
                      </div>
                      <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/15 dark:border-amber-500/30">
                        <p className="font-display font-bold text-xl text-amber-800 dark:text-amber-200">{colhidas}</p>
                        <p className="text-[10px] text-muted-foreground">Colhidas</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/15 dark:border-emerald-500/30">
                        <p className="font-display font-bold text-xl text-emerald-800 dark:text-emerald-200">{plantadas}</p>
                        <p className="text-[10px] text-muted-foreground">Em processo</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {AGRUPAMENTO_FASES_TORRE_MV.map(({ id, label, fases }) => {
          const refFase = fases[0]!;
          const cfg = data.fasesConfig?.[refFase] || FASES_CONFIG[refFase];
          const torresFase = torresAtivas.filter((t) => fases.includes(t.fase));
          const ciclosPendentes = fases.reduce((s, f) => s + contarCiclosPendentes(data.ciclos, f), 0);

          return (
            <section key={id}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  {label}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({torresFase.length} torre{torresFase.length !== 1 ? "s" : ""})
                  </span>
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>
                    EC {cfg.ecMin}-{cfg.ecMax}
                  </span>
                  <span>
                    pH {cfg.phMin}-{cfg.phMax}
                  </span>
                  {ciclosPendentes > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{ciclosPendentes} ciclo(s) pendente(s)</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {torresFase.map((torre) => (
                  <TorreCard key={torre.id} torre={torre} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
