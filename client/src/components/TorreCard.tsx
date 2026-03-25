// ============================================================
// TorreCard — Card clicável de torre no dashboard
// Agronomic Dashboard: cores por fase, mini-visualização de andares
// ============================================================

import { Link } from 'wouter';
import type { Torre, Andar, CicloAplicacao } from '@/lib/types';
import { FASES_CONFIG } from '@/lib/types';
import { contarAlertasTorre, diasDecorridos, diasRestantes } from '@/lib/utils-farm';
import { AlertTriangle, Droplets, ChevronRight } from 'lucide-react';

interface TorreCardProps {
  torre: Torre;
  andares: Andar[];
  ciclos: CicloAplicacao[];
  caixaNome: string;
}

export default function TorreCard({ torre, andares, ciclos, caixaNome }: TorreCardProps) {
  const config = FASES_CONFIG[torre.fase];
  const alertas = contarAlertasTorre(torre, andares, ciclos);
  const andaresOcupados = andares.filter((a) => a.dataEntrada).length;

  const faseClass =
    torre.fase === 'mudas'
      ? 'card-mudas'
      : torre.fase === 'vegetativa'
      ? 'card-vegetativa'
      : 'card-maturacao';

  const badgeClass =
    torre.fase === 'mudas'
      ? 'badge-mudas'
      : torre.fase === 'vegetativa'
      ? 'badge-vegetativa'
      : 'badge-maturacao';

  return (
    <Link href={`/torre/${torre.id}`}>
      <div
        className={`group relative bg-card rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${faseClass}`}
      >
        {/* Alert badge */}
        {alertas > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded-full animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {alertas}
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-card-foreground leading-tight">
                {torre.nome}
              </h3>
              <span className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Mini tower visualization */}
          <div className="flex gap-0.5 mb-3 h-16">
            {andares.map((andar) => {
              const ocupado = !!andar.dataEntrada;
              const torre_ = FASES_CONFIG[torre.fase];
              let bgColor = 'bg-muted';
              if (ocupado) {
                const rest = diasRestantes(andar.dataEntrada, torre.fase);
                if (rest !== null && rest <= 0) {
                  bgColor = 'bg-destructive/70';
                } else if (rest !== null && rest <= 3) {
                  bgColor = 'bg-amber-400';
                } else {
                  bgColor =
                    torre.fase === 'mudas'
                      ? 'bg-emerald-500'
                      : torre.fase === 'vegetativa'
                      ? 'bg-cyan-600'
                      : 'bg-orange-500';
                }
              }
              return (
                <div
                  key={andar.id}
                  className={`flex-1 rounded-sm ${bgColor} transition-colors`}
                  title={`Andar ${andar.numero}${ocupado ? ` - ${andar.variedades.join(', ') || 'Sem variedade'}` : ' - Vazio'}`}
                />
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <strong className="text-card-foreground">{andaresOcupados}</strong>/{torre.andares} andares
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {caixaNome}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}
