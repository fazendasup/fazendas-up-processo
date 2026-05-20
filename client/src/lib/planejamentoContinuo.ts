/**
 * Planejamento para colheita contínua (ex.: a cada 2 dias).
 * Taxas de desperdício e capacidades por perfil conforme operação.
 */

import type { Fase } from '@/lib/types';
import {
  CELULAS_POR_FURO_BABY_LEAF_FV,
  PLANTAS_POR_PERFIL_FV,
  plantasPorAndarFvComFuros,
  posicoesColheitaPorAndarBabyLeafFv,
} from '@shared/plantasPorPerfil';
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
  mudas: PLANTAS_POR_PERFIL_FV.mudas,
  vegetativa: PLANTAS_POR_PERFIL_FV.vegetativa,
  maturacao: PLANTAS_POR_PERFIL_FV.maturacao,
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
export function sementesParaColheitaEsperada(
  plantasNaColheita: number,
  opts?: { multiplicadorPlantio?: number },
): number {
  const t = taxaSobrevivenciaAcumulada();
  const m = opts?.multiplicadorPlantio ?? 1;
  const alvo = plantasNaColheita * m;
  if (alvo <= 0) return 0;
  return Math.ceil(alvo / t);
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
  nome?: string;
}

/**
 * - colheita: ocupação / meta de colheita (baby leaf mat = 1 posição por furo).
 * - plantio: capacidade física de células (baby leaf veg/mat = 2 por furo).
 */
export type PropositoCapacidadeFv = 'colheita' | 'plantio';

export interface LinhaCapacidadeTorre {
  nome?: string;
  fase: Fase;
  numAndares: number;
  perfis: number;
  furosPorPerfil: number;
  celulasPorFuro: number;
  plantasPorAndar: number;
  subtotal: number;
  modelo: 'padrao' | 'baby_leaf_12x6';
}

function celulasPorFuroBabyLeaf(fase: Fase, proposito: PropositoCapacidadeFv): number {
  if (proposito === 'plantio') return CELULAS_POR_FURO_BABY_LEAF_FV;
  if (fase === 'maturacao') return 1;
  return CELULAS_POR_FURO_BABY_LEAF_FV;
}

/** Plantas (ou posições de colheita) por andar de uma torre. */
export function plantasPorAndarTorre(
  t: TorreCapInput,
  projetoTipo?: string | null,
  proposito: PropositoCapacidadeFv = 'colheita',
): number {
  const mv = projetoTipo === 'microverdes';
  const f = t.fase;
  const e = estruturaFaseParaProjeto(projetoTipo, f, t.estruturaOverride ?? null);
  const torreBaby12x6 = !mv && torreReservadaGrelhaBabyLeaf(t);
  if (f === 'mudas') {
    return e.perfis * PLANTAS_POR_PERFIL.mudas;
  }
  if (f === 'vegetativa') {
    return mv
      ? e.perfis * Math.max(1, e.furosPorPerfil)
      : torreBaby12x6
        ? plantasPorAndarFvComFuros(e, celulasPorFuroBabyLeaf(f, proposito))
        : e.perfis * PLANTAS_POR_PERFIL.vegetativa;
  }
  if (torreBaby12x6) {
    if (proposito === 'colheita') return posicoesColheitaPorAndarBabyLeafFv(e);
    return plantasPorAndarFvComFuros(e, celulasPorFuroBabyLeaf(f, proposito));
  }
  return mv
    ? e.perfis * Math.max(1, e.furosPorPerfil)
    : e.perfis * e.furosPorPerfil;
}

export function linhaCapacidadeTorre(
  t: TorreCapInput,
  projetoTipo?: string | null,
  proposito: PropositoCapacidadeFv = 'colheita',
): LinhaCapacidadeTorre | null {
  const n = Math.max(0, t.numAndares | 0);
  if (n <= 0) return null;
  const f = t.fase;
  const e = estruturaFaseParaProjeto(projetoTipo, f, t.estruturaOverride ?? null);
  const baby = torreReservadaGrelhaBabyLeaf(t);
  const porAndar = plantasPorAndarTorre(t, projetoTipo, proposito);
  const celulas =
    baby && f !== 'mudas'
      ? celulasPorFuroBabyLeaf(f, proposito)
      : f === 'mudas'
        ? 0
        : 1;
  return {
    nome: t.nome,
    fase: f,
    numAndares: n,
    perfis: e.perfis,
    furosPorPerfil: e.furosPorPerfil,
    celulasPorFuro: celulas,
    plantasPorAndar: porAndar,
    subtotal: porAndar * n,
    modelo: baby ? 'baby_leaf_12x6' : 'padrao',
  };
}

function filtrarTorresCapacidade(torres: TorreCapInput[], filtro: FiltroTorresBabyLeafFv): TorreCapInput[] {
  if (filtro === 'todas') return torres;
  if (filtro === 'apenas_baby_leaf') return torres.filter(torreReservadaGrelhaBabyLeaf);
  return torres.filter((t) => !torreReservadaGrelhaBabyLeaf(t));
}

/** Detalhe por torre (para exibir de onde vem a capacidade instalada). */
export function linhasCapacidadeInstalacao(
  torres: TorreCapInput[],
  projetoTipo?: string | null,
  filtro: FiltroTorresBabyLeafFv = 'todas',
  proposito: PropositoCapacidadeFv = 'colheita',
): LinhaCapacidadeTorre[] {
  const linhas: LinhaCapacidadeTorre[] = [];
  for (const t of filtrarTorresCapacidade(torres, filtro)) {
    const linha = linhaCapacidadeTorre(t, projetoTipo, proposito);
    if (linha) linhas.push(linha);
  }
  return linhas;
}

/** Capacidade máxima de plantas por fase (torres ativas × andares × perfis × densidade). */
export function capacidadePorFaseInstalacao(
  torres: TorreCapInput[],
  projetoTipo?: string | null,
  proposito: PropositoCapacidadeFv = 'colheita',
): Record<Fase, number> {
  const cap: Record<Fase, number> = { mudas: 0, vegetativa: 0, maturacao: 0 };
  for (const t of torres) {
    const n = Math.max(0, t.numAndares | 0);
    const porAndar = plantasPorAndarTorre(t, projetoTipo, proposito);
    cap[t.fase] += porAndar * n;
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
  proposito: PropositoCapacidadeFv = 'colheita',
): Record<Fase, number> {
  return capacidadePorFaseInstalacao(filtrarTorresCapacidade(torres, filtro), projetoTipo, proposito);
}

export interface ResumoGrupoMaturacao {
  quantidadeTorres: number;
  totalAndares: number;
  capacidadeColheita: number;
  linhas: LinhaCapacidadeTorre[];
}

export interface ResumoInstalacaoFv {
  torresCadastradas: number;
  torresPorFase: Record<Fase, number>;
  torresBabyLeaf12x6: number;
  maturacaoPadrao: ResumoGrupoMaturacao;
  maturacaoBabyLeaf: ResumoGrupoMaturacao;
  maturacaoTotalColheita: number;
}

/** Inventário e capacidade de colheita em maturação (auditável). */
export function resumoInstalacaoCapacidadeFv(
  torres: TorreCapInput[],
  projetoTipo?: string | null,
): ResumoInstalacaoFv {
  const torresPorFase: Record<Fase, number> = { mudas: 0, vegetativa: 0, maturacao: 0 };
  for (const t of torres) torresPorFase[t.fase] += 1;

  const linhasMatPadrao = linhasCapacidadeInstalacao(torres, projetoTipo, 'exceto_baby_leaf', 'colheita').filter(
    (l) => l.fase === 'maturacao',
  );
  const linhasMatBaby = linhasCapacidadeInstalacao(torres, projetoTipo, 'apenas_baby_leaf', 'colheita').filter(
    (l) => l.fase === 'maturacao',
  );

  const grupo = (linhas: LinhaCapacidadeTorre[]): ResumoGrupoMaturacao => ({
    quantidadeTorres: linhas.length,
    totalAndares: linhas.reduce((s, l) => s + l.numAndares, 0),
    capacidadeColheita: linhas.reduce((s, l) => s + l.subtotal, 0),
    linhas,
  });

  const maturacaoPadrao = grupo(linhasMatPadrao);
  const maturacaoBabyLeaf = grupo(linhasMatBaby);

  return {
    torresCadastradas: torres.length,
    torresPorFase,
    torresBabyLeaf12x6: torres.filter(torreReservadaGrelhaBabyLeaf).length,
    maturacaoPadrao,
    maturacaoBabyLeaf,
    maturacaoTotalColheita: maturacaoPadrao.capacidadeColheita + maturacaoBabyLeaf.capacidadeColheita,
  };
}

/**
 * Estimativa grosseira: plantas ocupando maturação em regime estável,
 * com novo lote a cada `intervaloDias` e duração da fase de maturação `diasMaturacao`.
 */
export function estimativaPlantasEmMaturacao(
  plantasPorColheita: number,
  diasMaturacao: number,
  intervaloDias: number,
): number {
  if (intervaloDias <= 0 || plantasPorColheita <= 0) return 0;
  const lotes = diasMaturacao / intervaloDias;
  return Math.ceil(plantasPorColheita * lotes);
}
