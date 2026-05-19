/**
 * Densidade operacional (plantas por perfil) — fazenda vertical.
 * Mudas: perfis abertos no BD; cada perfil ativo equivale a N plantas no transplantio.
 */

export const PLANTAS_POR_PERFIL_FV = {
  mudas: 60,
  vegetativa: 9,
  maturacao: 6,
} as const;

/** Torres 12×6 (baby leaf): 2 células por furo em vegetativa e maturação. */
export const CELULAS_POR_FURO_BABY_LEAF_FV = 2;

export function multiplicadorPlantioBabyLeafFV(ehBabyLeaf: boolean): number {
  return ehBabyLeaf ? CELULAS_POR_FURO_BABY_LEAF_FV : 1;
}

/** Plantas por andar quando a ocupação é por furos (veg/mat). */
export function plantasPorAndarFvComFuros(
  est: { perfis: number; furosPorPerfil: number },
  celulasPorFuro: number,
): number {
  return est.perfis * Math.max(1, est.furosPorPerfil) * Math.max(1, celulasPorFuro);
}

/** Posições de colheita por andar (1 célula/furo — planejamento de ocupação em mat). */
export function posicoesColheitaPorAndarBabyLeafFv(est: {
  perfis: number;
  furosPorPerfil: number;
}): number {
  return plantasPorAndarFvComFuros(est, 1);
}

export function plantasPorPerfilMudas(densidadeReceita?: number | null): number {
  if (densidadeReceita != null && densidadeReceita > 0) return densidadeReceita;
  return PLANTAS_POR_PERFIL_FV.mudas;
}

/** Plantas disponíveis num andar de mudas (perfis ativos × densidade). */
export function contarPlantasMudasFv(perfisAtivos: number, plantasPorPerfil: number): number {
  return Math.max(0, perfisAtivos) * Math.max(1, plantasPorPerfil);
}

/** Quantos perfis esvaziar após transplantar N plantas (perfis inteiros). */
export function perfisMudasParaLiberar(totalPlantas: number, plantasPorPerfil: number): number {
  const ppp = Math.max(1, plantasPorPerfil);
  if (totalPlantas <= 0) return 0;
  return Math.ceil(totalPlantas / ppp);
}
