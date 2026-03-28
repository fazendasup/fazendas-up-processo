// ============================================================
// TorreCard v4 — Status parcial por perfil (dataEntrada individual)
// ============================================================

import { Link } from 'wouter';
import type { Torre, Andar } from '@/lib/types';
import { FASES_CONFIG } from '@/lib/types';
import { useFazenda } from '@/contexts/FazendaContext';
import {
  contarAlertasTorre,
  diasRestantes,
  contarPlantasAndar,
  contarColhidasAndar,
  andarPrecisaLavagem,
  andarOcupado,
} from '@/lib/utils-farm';
import { AlertTriangle, Droplets, ChevronRight, Sprout, Scissors, Droplet, Clock } from 'lucide-react';

interface TorreCardProps {
  torre: Torre;
}

/**
 * Calcula o status de um andar baseado nas datas individuais dos perfis.
 * Retorna: 'lavar' | 'pronto' | 'parcial' | 'quase' | 'ok' | 'vazio'
 * E contagens de prontos/total
 */
function calcAndarPerfilStatus(
  andar: Andar,
  fase: string,
  variedades: any[],
): { status: string; prontos: number; quase: number; total: number } {
  const perfisAtivos = (andar.perfis || []).filter((p) => p.ativo);
  if (perfisAtivos.length === 0) return { status: 'vazio', prontos: 0, quase: 0, total: 0 };

  let prontos = 0;
  let quase = 0;
  let comData = 0;

  for (const p of perfisAtivos) {
    const dateStr = p.dataEntrada || andar.dataEntrada;
    if (!dateStr) continue;
    comData++;
    const rest = diasRestantes(dateStr, fase as any, p.variedadeId || undefined, variedades);
    if (rest !== null && rest <= 0) prontos++;
    else if (rest !== null && rest <= 3) quase++;
  }

  const total = perfisAtivos.length;
  if (prontos === total && total > 0) return { status: 'pronto', prontos, quase, total };
  if (prontos > 0) return { status: 'parcial', prontos, quase, total };
  if (quase > 0) return { status: 'quase', prontos, quase, total };
  if (comData > 0) return { status: 'ok', prontos, quase, total };
  return { status: 'vazio', prontos, quase, total };
}

export default function TorreCard({ torre }: TorreCardProps) {
  const { data } = useFazenda();
  const config = data.fasesConfig?.[torre.fase] || FASES_CONFIG[torre.fase];
  const andares = data.andares.filter((a) => a.torreId === torre.id).sort((a, b) => a.numero - b.numero);
  const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
  const alertas = contarAlertasTorre(torre, andares, data.ciclos, data.variedades, data.fasesConfig, data.manutencoes);
  const andaresOcupados = andares.filter((a) => andarOcupado(a, torre.fase)).length;

  const isMaturacao = torre.fase === 'maturacao';
  const totalPlantas = andares.reduce((sum, a) => sum + contarPlantasAndar(a, torre.fase), 0);
  const totalColhidas = isMaturacao ? andares.reduce((sum, a) => sum + contarColhidasAndar(a), 0) : 0;
  const andaresLavagem = andares.filter((a) => andarPrecisaLavagem(a)).length;

  // Calcular contagem de perfis prontos na torre
  let perfisProntosTorre = 0;
  let perfisQuaseTorre = 0;
  let perfisTotalTorre = 0;
  for (const andar of andares) {
    const ps = calcAndarPerfilStatus(andar, torre.fase, data.variedades);
    perfisProntosTorre += ps.prontos;
    perfisQuaseTorre += ps.quase;
    perfisTotalTorre += ps.total;
  }

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

          {/* Mini tower visualization — agora com status parcial */}
          <div className="flex gap-0.5 mb-3 h-14">
            {andares.map((andar) => {
              const ocupado = andarOcupado(andar, torre.fase);
              const precisaLavar = andarPrecisaLavagem(andar);
              const ps = calcAndarPerfilStatus(andar, torre.fase, data.variedades);

              let bgColor = 'bg-muted';
              if (precisaLavar) {
                bgColor = 'bg-red-400 animate-pulse';
              } else if (ps.status === 'pronto') {
                bgColor = 'bg-destructive/70';
              } else if (ps.status === 'parcial') {
                // Parcialmente pronto — gradiente visual
                bgColor = 'bg-gradient-to-t from-destructive/60 to-amber-400';
              } else if (ps.status === 'quase') {
                bgColor = 'bg-amber-400';
              } else if (ocupado) {
                bgColor = torre.fase === 'mudas' ? 'bg-emerald-500' : torre.fase === 'vegetativa' ? 'bg-cyan-600' : 'bg-orange-500';
              }

              const titleParts = [`A${andar.numero}`];
              if (precisaLavar) titleParts.push('[LAVAR]');
              else if (ps.prontos > 0) titleParts.push(`${ps.prontos}/${ps.total} prontos`);
              else if (ps.quase > 0) titleParts.push(`${ps.quase}/${ps.total} quase prontos`);
              else if (!ocupado) titleParts.push('Vazio');
              else titleParts.push('Em processo');

              return (
                <div
                  key={andar.id}
                  className={`flex-1 rounded-sm ${bgColor} transition-colors`}
                  title={titleParts.join(' - ')}
                />
              );
            })}
          </div>

          {/* Plantas count */}
          <div className="flex items-center gap-3 mb-2 text-xs flex-wrap">
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

          {/* Status de perfis prontos (se houver) */}
          {(perfisProntosTorre > 0 || perfisQuaseTorre > 0) && (
            <div className="flex items-center gap-3 mb-2 text-xs flex-wrap">
              {perfisProntosTorre > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-semibold">
                  <Clock className="w-3 h-3" />
                  <strong>{perfisProntosTorre}</strong>/{perfisTotalTorre} prontos
                </span>
              )}
              {perfisQuaseTorre > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="w-3 h-3" />
                  <strong>{perfisQuaseTorre}</strong> quase
                </span>
              )}
            </div>
          )}

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
