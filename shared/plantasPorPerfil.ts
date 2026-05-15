/**
 * Densidade operacional (plantas por perfil) — fazenda vertical.
 * Mudas: perfis abertos no BD; cada perfil ativo equivale a N plantas no transplantio.
 */

export const PLANTAS_POR_PERFIL_FV = {
  mudas: 60,
  vegetativa: 9,
  maturacao: 6,
} as const;

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
