// ============================================================
// Home v3 — Dashboard com KPIs, colhidas só maturação,
// sem diasCiclo por fase, config atualizada
// ============================================================

import Header from '@/components/Header';
import TorreCard from '@/components/TorreCard';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG } from '@/lib/types';
import type { Fase } from '@/lib/types';
import {
  resumoFazenda,
  contarCiclosPendentes,
  cicloPendenteHoje,
  calcularKPIs,
  contarPlantasAndar,
  contarColhidasAndar,
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
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { motion } from 'framer-motion';

const HERO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663464614308/V8Zeqmat63YDtBSE4w4iyd/torres-real_fb616389.jpeg';

export default function Home() {
  const { data } = useFazenda();
  const resumo = resumoFazenda(data);
  const kpis = calcularKPIs(data);

  // Tarefas pendentes para hoje
  const tarefasQuery = trpc.tarefas.list.useQuery();
  const tarefasPendentes = (tarefasQuery.data || []).filter(
    (t: any) => t.status === 'pendente' || t.status === 'em_andamento'
  ).length;

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];

  // Plantas por fase
  const plantasPorFase = fases.map((fase) => {
    const torres = data.torres.filter((t) => t.fase === fase);
    const andaresFase = data.andares.filter((a) => torres.some((t) => t.id === a.torreId));
    const plantadas = andaresFase.reduce((sum, a) => sum + contarPlantasAndar(a, fase), 0);
    const colhidas = fase === 'maturacao' ? andaresFase.reduce((sum, a) => sum + contarColhidasAndar(a), 0) : 0;
    return { fase, plantadas, colhidas };
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        <img src={HERO_URL} alt="Fazenda Vertical" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Painel de Controle
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {resumo.totalTorres} torres &middot; {resumo.totalAndares} andares &middot; {resumo.andaresOcupados} ocupados
            </p>
          </div>
        </div>
      </div>

      <main className="container py-6 space-y-8">
        {/* KPIs Grid */}
        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Indicadores (KPIs)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard icon={<Sprout className="w-4 h-4 text-emerald-600" />} label="Plantas Ativas" value={kpis.totalPlantas} color="emerald" />
            <KPICard icon={<Target className="w-4 h-4 text-blue-600" />} label="Taxa Ocupação" value={`${kpis.taxaOcupacao}%`} color="blue" />
            <KPICard icon={<Scissors className="w-4 h-4 text-amber-600" />} label="Prontas Colheita" value={kpis.plantasProntasColheita} color="amber" />
            <KPICard icon={<Leaf className="w-4 h-4 text-emerald-600" />} label="Taxa Germinação" value={kpis.taxaGerminacao > 0 ? `${kpis.taxaGerminacao}%` : '-'} color="emerald" />
            <KPICard icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Desperdício" value={kpis.totalDesperdicio > 0 ? `${kpis.taxaDesperdicio}%` : '-'} color="red" />
            <KPICard icon={<Wrench className="w-4 h-4 text-orange-600" />} label="Manutenções" value={kpis.manutencoesAbertas} color={kpis.manutencoesVencidas > 0 ? 'red' : 'orange'} />
          </div>
        </section>

        {/* Alertas rápidos */}
        {(resumo.ciclosPendentes > 0 || resumo.previsaoVencida > 0 || kpis.andaresLavagemPendente > 0 || kpis.manutencoesVencidas > 0 || kpis.totalGerminando > 0 || tarefasPendentes > 0) && (
          <section className="flex flex-wrap gap-2">
            {resumo.ciclosPendentes > 0 && (
              <AlertBadge icon={<Clock className="w-3 h-3" />} text={`${resumo.ciclosPendentes} ciclo(s) pendente(s)`} color="amber" />
            )}
            {resumo.previsaoVencida > 0 && (
              <AlertBadge icon={<AlertTriangle className="w-3 h-3" />} text={`${resumo.previsaoVencida} andar(es) com previsão vencida`} color="red" />
            )}
            {kpis.andaresLavagemPendente > 0 && (
              <AlertBadge icon={<Droplet className="w-3 h-3" />} text={`${kpis.andaresLavagemPendente} andar(es) aguardando lavagem`} color="red" />
            )}
            {kpis.manutencoesVencidas > 0 && (
              <AlertBadge icon={<Wrench className="w-3 h-3" />} text={`${kpis.manutencoesVencidas} manutenção(ões) com prazo vencido`} color="red" />
            )}
            {kpis.totalGerminando > 0 && (
              <AlertBadge icon={<Sprout className="w-3 h-3" />} text={`${kpis.totalGerminando} lote(s) germinando`} color="emerald" />
            )}
            {tarefasPendentes > 0 && (
              <AlertBadge icon={<ClipboardList className="w-3 h-3" />} text={`${tarefasPendentes} tarefa(s) pendente(s)`} color="amber" />
            )}
          </section>
        )}

        {/* Plantas por fase */}
        <section>
          <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Plantas por Fase
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plantasPorFase.map(({ fase, plantadas, colhidas }) => {
              const cfg = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
              const isMaturacao = fase === 'maturacao';
              return (
                <div key={fase} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm">{cfg.icon} {cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      EC {cfg.ecMin}-{cfg.ecMax} | pH {cfg.phMin}-{cfg.phMax}
                    </span>
                  </div>
                  {isMaturacao ? (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <p className="font-display font-bold text-xl text-emerald-700">{plantadas}</p>
                        <p className="text-[10px] text-muted-foreground">Em Processo</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50">
                        <p className="font-display font-bold text-xl text-amber-700">{colhidas}</p>
                        <p className="text-[10px] text-muted-foreground">Colhidas</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <p className="font-display font-bold text-xl text-emerald-700">{plantadas}</p>
                        <p className="text-[10px] text-muted-foreground">Em Processo</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Ciclos pendentes */}
        {data.ciclos.filter((c) => cicloPendenteHoje(c)).length > 0 && (
          <section>
            <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Ciclos Pendentes Hoje
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.ciclos.filter((c) => cicloPendenteHoje(c)).map((ciclo) => (
                <div key={ciclo.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold">{ciclo.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{ciclo.produto} &middot; {ciclo.fasesAplicaveis.map((f) => (data.fasesConfig?.[f] || FASES_CONFIG[f]).label).join(', ')}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Torres por fase */}
        {fases.map((fase) => {
          const cfg = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
          const torresFase = data.torres.filter((t) => t.fase === fase);
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
                    <span className="text-amber-600 font-semibold">{ciclosPendentes} ciclo(s) pendente(s)</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {torresFase.map((torre) => (
                  <TorreCard key={torre.id} torre={torre} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

// ---- Sub-components ----

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
    orange: 'bg-orange-50',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border ${bgMap[color] || 'bg-muted/50'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
    </motion.div>
  );
}

function AlertBadge({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${colorMap[color]}`}>
      {icon}
      {text}
    </span>
  );
}
