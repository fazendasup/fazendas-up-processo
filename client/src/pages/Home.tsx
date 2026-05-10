// ============================================================
// Home v3 — Dashboard com KPIs, colhidas só maturação,
// sem diasCiclo por fase, config atualizada
// ============================================================

import Header from '@/components/Header';
import TorreCard from '@/components/TorreCard';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, torreEstaAtivaNoDashboard } from '@/lib/types';
import type { Fase } from '@/lib/types';
import {
  resumoFazenda,
  contarCiclosPendentes,
  calcularKPIs,
  contarPlantasAndar,
  contarColhidasAndar,
  prontosColheitaPorVariedadeFazenda,
} from '@/lib/utils-farm';
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
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useProjeto } from '@/contexts/ProjetoContext';
import {
  dateKeyLocal,
  eventosPorDia,
  filtrarEventosDoDiaLocal,
  filtrarEventosSomenteGerminacaoPlantio,
  resumoFasesDoDiaPt,
  type PlanoRow,
} from '@/lib/planejamentoCalendario';
import { filtroTarefasParaHoje, partitionTarefasHojeVsAtrasadas } from '@/lib/tarefasHoje';
import { contarCiclosAplicacaoAtrasados } from '@/lib/ciclosAgenda';
import { filtrarPlanosPrioridadeSomenteGerminacaoPlantio } from '@/lib/planosPlantioOperacao';
import { NOME_PROJETO_FAZENDA_LEGADO } from '@shared/const';
import HidroponiaDashboard from '@/components/HidroponiaDashboard';
import MicroverdesDashboard from '@/components/MicroverdesDashboard';
import ProntasColheitaKpiDialog from '@/components/ProntasColheitaKpiDialog';
import { useAgendaModal } from '@/contexts/AgendaModalContext';

const HERO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663464614308/V8Zeqmat63YDtBSE4w4iyd/torres-real_fb616389.jpeg';

export default function Home() {
  const { openAgenda } = useAgendaModal();
  const { user } = useAuth();
  const { activeProjetoId, activeProjeto, projetos, ready: projetoReady } = useProjeto();
  const isHidroDashboard = Boolean(activeProjetoId && activeProjeto?.tipo === 'hidroponia');
  const isMicroverdesDashboard = Boolean(activeProjetoId && activeProjeto?.tipo === 'microverdes');
  const { data } = useFazenda();
  const torresAtivas = data.torres.filter(torreEstaAtivaNoDashboard);
  const torresAtivasIds = new Set(torresAtivas.map((t) => t.id));
  const dataAtiva = {
    ...data,
    torres: torresAtivas,
    andares: data.andares.filter((a) => torresAtivasIds.has(a.torreId)),
    manutencoes: data.manutencoes.filter((m) => torresAtivasIds.has(m.torreId)),
  };
  const resumo = resumoFazenda(dataAtiva);
  const kpis = calcularKPIs(dataAtiva);

  const prontosColheitaPorVariedade = useMemo(() => prontosColheitaPorVariedadeFazenda(dataAtiva), [data]);

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
  const totalPlantioGerminacao =
    planosGerminacaoPrioridade.length + eventosGerminacaoHoje.length;

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];

  // Plantas por fase
  const plantasPorFase = fases.map((fase) => {
    const torres = torresAtivas.filter((t) => t.fase === fase);
    const andaresFase = dataAtiva.andares.filter((a) => torres.some((t) => t.id === a.torreId));
    const plantadas = andaresFase.reduce((sum, a) => sum + contarPlantasAndar(a, fase, dataAtiva.projetoTipo), 0);
    const colhidas =
      fase === 'maturacao' || (dataAtiva.projetoTipo === 'microverdes' && fase === 'vegetativa')
        ? andaresFase.reduce((sum, a) => sum + contarColhidasAndar(a, fase, dataAtiva.projetoTipo), 0)
        : 0;
    return { fase, plantadas, colhidas };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {user && projetoReady && (activeProjetoId == null || projetos.length === 0) && (
        <div className="container pt-4">
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-semibold">Os dados do painel não carregam sem um projeto ativo.</p>
            {projetos.length === 0 ? (
              <p className="mt-1 text-muted-foreground dark:text-amber-100/85">
                Sua conta ainda não está vinculada a nenhum projeto (ou a migração multi-projeto ainda não foi aplicada no banco). Peça a um administrador para rodar{" "}
                <code className="rounded bg-background/60 px-1">pnpm db:migrate</code> e conferir o projeto padrão, ou aceda a{" "}
                <Link href="/projetos" className="font-medium text-primary underline-offset-2 hover:underline">
                  Projetos
                </Link>
                .
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground dark:text-amber-100/85">
                Escolha um projeto no menu <strong>Projetos</strong> ou no canto superior (área &quot;Projeto&quot;).
              </p>
            )}
          </div>
        </div>
      )}

      {user &&
        projetoReady &&
        !isHidroDashboard &&
        !isMicroverdesDashboard &&
        activeProjetoId != null &&
        projetos.length > 1 &&
        data.torres.length === 0 && (
          <div className="container pt-4">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:text-sky-100">
              <p className="font-semibold">Painel vazio neste projeto?</p>
              <p className="mt-1 text-muted-foreground dark:text-sky-100/90">
                Se já tinha torres e cultivo cadastrados, os dados costumam estar no projeto{" "}
                <strong>{NOME_PROJETO_FAZENDA_LEGADO}</strong>. No canto superior, abra o seletor de projeto e escolha esse
                nome, ou vá a{" "}
                <Link href="/projetos" className="font-medium text-primary underline-offset-2 hover:underline">
                  Projetos
                </Link>{" "}
                e clique em <strong>Entrar</strong> nele. Depois de reiniciar o servidor, o sistema também associa a sua
                conta a esse projeto automaticamente.
              </p>
            </div>
        </div>
      )}

      {user && projetoReady && isHidroDashboard ? (
        <HidroponiaDashboard />
      ) : user && projetoReady && isMicroverdesDashboard ? (
        <MicroverdesDashboard />
      ) : (
        <>
      {/* Hero — faixa hero com malha / glow (design v2) */}
      <div className="relative h-44 sm:h-52 overflow-hidden border-b border-border/40">
        <img src={HERO_URL} alt="Fazenda Vertical" className="w-full h-full object-cover scale-105" />
        {/* Escurecimento leve à esquerda (texto) — não cobre a foto toda */}
        <div className="absolute inset-y-0 left-0 w-[62%] sm:w-[52%] bg-gradient-to-r from-black/50 via-black/18 to-transparent sm:from-black/45 sm:via-black/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 flex items-end sm:items-center pb-6 sm:pb-0">
          <div className="container">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/95 mb-1 drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]">
              Supervisão de cultivo
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
              Painel de Controle
            </h1>
            <p className="text-sm mt-2 max-w-xl text-white/95 drop-shadow-[0_1px_10px_rgba(0,0,0,0.75)]">
              {resumo.totalTorres} torres &middot; {resumo.totalAndares} andares &middot; {resumo.andaresOcupados} ocupados
            </p>
          </div>
        </div>
      </div>

      <main className="container py-6 space-y-8">
        {/* KPIs Grid */}
        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            Indicadores (KPIs)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              icon={<Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              label="Cultivo ativo"
              value={kpis.totalPlantas}
              color="emerald"
            />
            <KPICard
              icon={<Target className="w-4 h-4 text-blue-600" />}
              label="Ocupação geral"
              value={`${kpis.taxaOcupacao}%`}
              color="blue"
            />
            <ProntasColheitaKpiDialog
              icon={<Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              label="Prontas Colheita"
              value={kpis.plantasProntasColheita}
              rows={prontosColheitaPorVariedade}
              unidade="plantas"
              dialogDescription="Torres em fase de colheita (maturação): cada número é um furo com planta pronta a colher."
            />
            <KPICard icon={<Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />} label="Taxa Germinação" value={kpis.taxaGerminacao > 0 ? `${kpis.taxaGerminacao}%` : '-'} color="emerald" />
            <KPICard icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Desperdício" value={kpis.totalDesperdicio > 0 ? `${kpis.taxaDesperdicio}%` : '-'} color="red" />
            <KPICard icon={<Wrench className="w-4 h-4 text-orange-600" />} label="Manutenções" value={kpis.manutencoesAbertas} color={kpis.manutencoesVencidas > 0 ? 'red' : 'orange'} />
          </div>
        </section>

        {/* Ocupação + contagem por fase (unificado) */}
        <section>
          <h2 className="font-display font-bold text-base mb-2 flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Layers className="w-4 h-4" />
            </span>
            Cultivo por fase
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {plantasPorFase.map(({ fase, plantadas, colhidas }) => {
              const cfg = dataAtiva.fasesConfig?.[fase] || FASES_CONFIG[fase];
              const o = kpis.ocupacaoPorFase[fase];
              const isMaturacao = fase === 'maturacao';
              const unidade = fase === 'mudas' ? 'perfis' : 'furos';
              const rotuloOperacao = fase === 'mudas' ? 'perfis plantados' : 'furos plantados';
              return (
                <div
                  key={fase}
                  className="surface-panel overflow-hidden border border-border/60 flex flex-col rounded-lg"
                >
                  <div className="border-b border-border/50 bg-muted/20 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-xs">
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground text-right leading-tight tabular-nums">
                      EC {cfg.ecMin}–{cfg.ecMax} · pH {cfg.phMin}–{cfg.phMax}
                    </span>
                  </div>
                  <div className="px-2.5 pt-2 pb-1.5">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Em operação</p>
                    {isMaturacao ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.08] dark:bg-emerald-950/30 px-2 py-1.5 text-center">
                          <p className="font-display font-bold text-lg tabular-nums text-emerald-800 dark:text-emerald-200 leading-none">
                            {plantadas}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Processo</p>
                        </div>
                        <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.08] dark:bg-amber-950/30 px-2 py-1.5 text-center">
                          <p className="font-display font-bold text-lg tabular-nums text-amber-900 dark:text-amber-200 leading-none">
                            {colhidas}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Colhidas</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-display font-bold text-xl tabular-nums text-foreground">{plantadas}</span>
                        <span className="text-[10px] text-muted-foreground">{rotuloOperacao}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto border-t border-border/40 px-2.5 py-2 bg-muted/10">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Ocupação</p>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display font-bold text-lg text-primary tabular-nums">{o.taxa}%</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums text-right leading-tight">
                        {o.ocupadas}/{o.capacidade} {unidade}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/80 transition-[width]"
                        style={{ width: `${Math.min(100, o.taxa)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alertas rápidos */}
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
                <AlertBadge icon={<Clock className="w-3 h-3" />} text={`${resumo.ciclosPendentes} ciclo(s) pendente(s)`} color="amber" />
              </button>
            )}
            {resumo.previsaoVencida > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('colheita')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadge icon={<AlertTriangle className="w-3 h-3" />} text={`${resumo.previsaoVencida} andar(es) com perfis prontos para ação`} color="red" />
              </button>
            )}
            {kpis.andaresLavagemPendente > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('lavagem')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadge icon={<Droplet className="w-3 h-3" />} text={`${kpis.andaresLavagemPendente} andar(es) aguardando lavagem`} color="red" />
              </button>
            )}
            {kpis.manutencoesVencidas > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('manutencao')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadge icon={<Wrench className="w-3 h-3" />} text={`${kpis.manutencoesVencidas} manutenção(ões) com prazo vencido`} color="red" />
              </button>
            )}
            {tarefasParaHojeList.length > 0 && (
              <button
                type="button"
                onClick={() => openAgenda('tarefas_hoje')}
                className="inline-flex rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <AlertBadge
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
                <AlertBadge
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
                <AlertBadge
                  icon={<CalendarClock className="w-3 h-3" />}
                  text={`Germinação/plantio: ${resumoFasesDoDiaPt(filtrarEventosSomenteGerminacaoPlantio(eventosPlantioHoje))} · ${totalPlantioGerminacao} ítem(ns)`}
                  color="blue"
                />
              </button>
            )}
          </section>
        )}

        {/* Torres por fase */}
        {fases.map((fase) => {
          const cfg = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
          const torresFase = torresAtivas.filter((t) => t.fase === fase);
          const ciclosPendentes = contarCiclosPendentes(data.ciclos, fase);

          return (
            <section key={fase}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-base flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  {cfg.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({torresFase.length} torre{torresFase.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>EC {cfg.ecMin}-{cfg.ecMax}</span>
                  <span>pH {cfg.phMin}-{cfg.phMax}</span>
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
      )}
    </div>
  );
}

// ---- Sub-components ----

function KPICard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  hint?: string;
}) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-500/[0.07] dark:bg-emerald-500/15',
    blue: 'bg-sky-500/[0.07] dark:bg-sky-500/15',
    amber: 'bg-amber-500/[0.08] dark:bg-amber-500/15',
    red: 'bg-red-500/[0.07] dark:bg-red-500/15',
    orange: 'bg-orange-500/[0.07] dark:bg-orange-500/15',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-panel p-3.5 ${bgMap[color] || 'bg-muted/40 dark:bg-muted/25'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
      {hint ? <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground/90">{hint}</p> : null}
    </motion.div>
  );
}





function AlertBadge({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber:
      'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100',
    emerald:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100',
    blue: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:border-sky-500/45 dark:bg-sky-500/15 dark:text-sky-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colorMap[color]}`}>
      {icon}
      {text}
    </span>
  );
}
