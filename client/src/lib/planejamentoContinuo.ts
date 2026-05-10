/**
 * Planejamento para colheita contínua (ex.: a cada 2 dias).
 * Taxas de desperdício e capacidades por perfil conforme operação.
 */

import type { Fase } from '@/lib/types';
import {
  ESTRUTURA_OVERRIDE_FV_12x6,
  estruturaFaseParaProjeto,
  torreEstruturaOverrideIgual,
  type TorreEstruturaOverride,
} from '@shared/types';

/** Germinação fixa em 24h antes de ir para mudas. */
export const GERMINACAO_DIAS = 1;

/** Plantas por perfil em cada fase (operacional). */
export const PLANTAS_POR_PERFIL: Record<Fase, number> = {
  mudas: 60,
  vegetativa: 9,
  maturacao: 6,
};

export const DESPERDICIO = {
  /** Não germina */
  germinacao: 0.2,
  /** Mudas → vegetativa */
  mudasParaVegetativa: 0.2,
  /** Vegetativa → maturação */
  vegetativaParaMaturacao: 0.05,
} as const;

export function taxaSobrevivenciaAcumulada(): number {
  return (
    (1 - DESPERDICIO.germinacao) *
    (1 - DESPERDICIO.mudasParaVegetativa) *
    (1 - DESPERDICIO.vegetativaParaMaturacao)
  );
}

/** Quantidade mínima de sementes/mudas a plantar na germinação para esperar `plantasNaColheita` na maturação. */
export function sementesParaColheitaEsperada(plantasNaColheita: number): number {
  const t = taxaSobrevivenciaAcumulada();
  if (plantasNaColheita <= 0) return 0;
  return Math.ceil(plantasNaColheita / t);
}

export function diasCicloTotal(diasMudas: number, diasVegetativa: number, diasMaturacao: number): number {
  return GERMINACAO_DIAS + diasMudas + diasVegetativa + diasMaturacao;
}

/** Ciclo sem período em vegetativa (mudas → maturação direto). */
export function diasCicloTotalSemVegetativa(diasMudas: number, diasMaturacao: number): number {
  return GERMINACAO_DIAS + diasMudas + diasMaturacao;
}

export interface TorreCapInput {
  fase: Fase;
  numAndares: number;
  ativa?: boolean;
  estruturaOverride?: TorreEstruturaOverride | null;
}

/** Capacidade máxima de plantas por fase (torres ativas × andares × perfis × densidade). */
export function capacidadePorFaseInstalacao(
  torres: TorreCapInput[],
  projetoTipo?: string | null,
): Record<Fase, number> {
  const cap: Record<Fase, number> = { mudas: 0, vegetativa: 0, maturacao: 0 };
  const mv = projetoTipo === 'microverdes';
  for (const t of torres) {
    if (t.ativa === false) continue;
    const n = Math.max(0, t.numAndares | 0);
    const f = t.fase;
    const e = estruturaFaseParaProjeto(projetoTipo, f, t.estruturaOverride ?? null);
    let porAndar: number;
    if (f === 'mudas') {
      porAndar = e.perfis * PLANTAS_POR_PERFIL.mudas;
    } else if (f === 'vegetativa') {
      porAndar = mv
        ? e.perfis * Math.max(1, e.furosPorPerfil)
        : e.perfis * PLANTAS_POR_PERFIL.vegetativa;
    } else {
      porAndar = mv
        ? e.perfis * Math.max(1, e.furosPorPerfil)
        : e.perfis * e.furosPorPerfil;
    }
    cap[f] += porAndar * n;
  }
  return cap;
}

/** Torres com override 12 perfis × 6 furos (veg/mat): reservadas a variedades baby leaf na FV. */
export function torreReservadaGrelhaBabyLeaf(t: TorreCapInput): boolean {
  const o = t.estruturaOverride;
  if (!o) return false;
  if (torreEstruturaOverrideIgual(o, ESTRUTURA_OVERRIDE_FV_12x6)) return true;
  const m = o.maturacao;
  const v = o.vegetativa;
  if (m && m.perfis === 12 && m.furosPorPerfil === 6) return true;
  if (v && v.perfis === 12 && v.furosPorPerfil === 6) return true;
  return false;
}

export type FiltroTorresBabyLeafFv = 'todas' | 'apenas_baby_leaf' | 'exceto_baby_leaf';

export function capacidadePorFaseInstalacaoComFiltro(
  torres: TorreCapInput[],
  projetoTipo: string | null | undefined,
  filtro: FiltroTorresBabyLeafFv,
): Record<Fase, number> {
  const list =
    filtro === 'todas'
      ? torres
      : filtro === 'apenas_baby_leaf'
        ? torres.filter(torreReservadaGrelhaBabyLeaf)
        : torres.filter((t) => !torreReservadaGrelhaBabyLeaf(t));
  return capacidadePorFaseInstalacao(list, projetoTipo);
}

/**
 * Estimativa grosseira: plantas ocupando maturação em regime estável,
 * com novo lote a cada `intervaloDias` e duração da fase de maturação `diasMaturacao`.
 */
export function estimativaPlantasEmMaturacao(
  plantasPorColheita: number,
  diasMaturacao: number,
  intervaloDias: number
): number {
  if (intervaloDias <= 0 || plantasPorColheita <= 0) return 0;
  const lotes = diasMaturacao / intervaloDias;
  return Math.ceil(plantasPorColheita * lotes);
}
