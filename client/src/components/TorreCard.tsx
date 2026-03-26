// ============================================================
// TorreCard v3 — Colhidas só na maturação, sem diasCiclo
// ============================================================

import { Link } from 'wouter';
import type { Torre } from '@/lib/types';
import { FASES_CONFIG } from '@/lib/types';
import { useFazenda } from '@/contexts/FazendaContext';
import {
  contarAlertasTorre,
  diasRestantes,
  contarPlantasAndar,
  contarColhidasAndar,
  andarPrecisaLavagem,
  variedadePrincipalAndar,
} from '@/lib/utils-farm';
import { AlertTriangle, Droplets, ChevronRight, Sprout, Scissors, Droplet } from 'lucide-react';

interface TorreCardProps {
  torre: Torre;
}

export default function TorreCard({ torre }: TorreCardProps) {
  const { data } = useFazenda();
  const config = data.fasesConfig?.[torre.fase] || FASES_CONFIG[torre.fase];
  const andares = data.andares.filter((a) => a.torreId === torre.id).sort((a, b) => a.numero - b.numero);
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const alertas = contarAlertasTorre(torre, andares, data.ciclos, data.variedades, data.fasesConfig, data.manutencoes);
  const andaresOcupados = andares.filter((a) => a.dataEntrada).length;

  const isMaturacao = torre.fase === 'maturacao';
  const totalPlantas = andares.reduce((sum, a) => sum + contarPlantasAndar(a, torre.fase), 0);
  const totalColhidas = isMaturacao ? andares.reduce((sum, a) => sum + contarColhidasAndar(a), 0) : 0;
  const andaresLavagem = andares.filter((a) => andarPrecisaLavagem(a)).length;

  const faseClass =
    torre.fase === 'mudas' ? 'card-mudas' : torre.fase === 'vegetativa' ? 'card-vegetativa' : 'card-maturacao';
  const badgeClass =
    torre.fase === 'mudas' ? 'badge-mudas' : torre.fase === 'vegetativa' ? 'badge-vegetativa' : 'badge-maturacao';

  return (
    <Link href={`/torre/${torre.id}`}>
      <div className={`group relative bg-card rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${faseClass}`}>
        {alertas > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded-full animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alertas}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-card-foreground leading-tight">{torre.nome}</h3>
              <span className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Mini tower visualization */}
          <div className="flex gap-0.5 mb-3 h-14">
            {andares.map((andar) => {
              const ocupado = !!andar.dataEntrada;
              const precisaLavar = andarPrecisaLavagem(andar);
              let bgColor = 'bg-muted';
              if (precisaLavar) {
                bgColor = 'bg-red-400 animate-pulse';
              } else if (ocupado) {
                const varId = variedadePrincipalAndar(andar);
                const rest = diasRestantes(andar.dataEntrada, torre.fase, varId, data.variedades);
                if (rest !== null && rest <= 0) {
                  bgColor = 'bg-destructive/70';
                } else if (rest !== null && rest <= 3) {
                  bgColor = 'bg-amber-400';
                } else {
                  bgColor = torre.fase === 'mudas' ? 'bg-emerald-500' : torre.fase === 'vegetativa' ? 'bg-cyan-600' : 'bg-orange-500';
                }
              }
              return (
                <div
                  key={andar.id}
                  className={`flex-1 rounded-sm ${bgColor} transition-colors`}
                  title={`A${andar.numero}${ocupado ? ' - Ocupado' : ' - Vazio'}${precisaLavar ? ' [LAVAR]' : ''}`}
                />
              );
            })}
          </div>

          {/* Plantas count */}
          <div className="flex items-center gap-3 mb-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <Sprout className="w-3 h-3" />
              <strong>{totalPlantas}</strong> em processo
            </span>
            {isMaturacao && totalColhidas > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Scissors className="w-3 h-3" />
                <strong>{totalColhidas}</strong> colhidas
              </span>
            )}
            {andaresLavagem > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <Droplet className="w-3 h-3" />
                <strong>{andaresLavagem}</strong> lavar
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <strong className="text-card-foreground">{andaresOcupados}</strong>/{torre.andares} andares
              </span>
              {caixa && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {caixa.nome}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
