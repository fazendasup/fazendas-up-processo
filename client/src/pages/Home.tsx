// ============================================================
// Home — Dashboard principal do sistema supervisório
// Agronomic Dashboard: visão geral com torres agrupadas por fase
// ============================================================

import Header from '@/components/Header';
import TorreCard from '@/components/TorreCard';
import { useFazenda } from '@/contexts/FazendaContext';
import { resumoFazenda, formatarDataHora, contarCiclosPendentes } from '@/lib/utils-farm';
import { FASES_CONFIG, type Fase } from '@/lib/types';
import {
  Layers,
  Droplets,
  AlertTriangle,
  CalendarClock,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663464614308/V8Zeqmat63YDtBSE4w4iyd/torres-real_5df07c31.jpeg';

export default function Home() {
  const { data } = useFazenda();
  const resumo = resumoFazenda(data);

  const fases: Fase[] = ['mudas', 'vegetativa', 'maturacao'];

  const statCards = [
    {
      label: 'Torres Ativas',
      value: resumo.totalTorres,
      icon: Layers,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Andares Ocupados',
      value: `${resumo.andaresOcupados}/${resumo.totalAndares}`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      label: 'Ciclos Pendentes',
      value: resumo.ciclosPendentes,
      icon: CalendarClock,
      color: resumo.ciclosPendentes > 0 ? 'text-amber-600' : 'text-emerald-600',
      bg: resumo.ciclosPendentes > 0 ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      label: 'Previsões Vencidas',
      value: resumo.previsaoVencida,
      icon: AlertTriangle,
      color: resumo.previsaoVencida > 0 ? 'text-red-600' : 'text-emerald-600',
      bg: resumo.previsaoVencida > 0 ? 'bg-red-50' : 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero section with real farm image */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Torres da fazenda vertical"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">
                Painel de Controle
              </h1>
              <p className="text-white/70 text-sm sm:text-base">
                Monitoramento em tempo real da operação
              </p>
              {resumo.ultimaMedicao && (
                <p className="text-white/50 text-xs mt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Última medição: {formatarDataHora(resumo.ultimaMedicao)}
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <main className="container py-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="bg-card rounded-xl p-4 shadow-sm border"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-card-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Torres por fase */}
        {fases.map((fase) => {
          const config = FASES_CONFIG[fase];
          const torresFase = data.torres.filter((t) => t.fase === fase);
          const pendentes = contarCiclosPendentes(data.ciclos, fase);

          return (
            <motion.section
              key={fase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: config.cor }}
                  />
                  <div>
                    <h2 className="font-display font-bold text-lg text-foreground">
                      {config.label}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {torresFase.length} torre{torresFase.length !== 1 ? 's' : ''} &middot;
                      EC {config.ecMin}-{config.ecMax} &middot;
                      pH {config.phMin}-{config.phMax} &middot;
                      Ciclo {config.diasCiclo} dias
                    </p>
                  </div>
                </div>
                {pendentes > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <CalendarClock className="w-3 h-3" />
                    {pendentes} ciclo{pendentes !== 1 ? 's' : ''} pendente{pendentes !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {torresFase.map((torre, i) => {
                  const andaresTorre = data.andares.filter((a) => a.torreId === torre.id);
                  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
                  return (
                    <motion.div
                      key={torre.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                    >
                      <TorreCard
                        torre={torre}
                        andares={andaresTorre}
                        ciclos={data.ciclos}
                        caixaNome={caixa?.nome || '-'}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </main>
    </div>
  );
}
