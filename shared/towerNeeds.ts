/**
 * Necessidade de torres por fase (fluxo contínuo).
 *
 * Regras operacionais Fazendas Up (editáveis):
 * - 1 andar de mudas preenche 1 torre de vegetativa
 * - 1 andar de vegetativa preenche `vegFloorToMatFloors` andares de maturação (padrão 3)
 */

export type TowerNeedsParams = {
  /** Torres de maturação colhidas por dia (mesmo ritmo da projeção). */
  matTowersPerDay: number;
  daysMudas: number;
  daysVegetativa: number;
  daysMaturacao: number;
  andaresMudas: number;
  andaresVegetativa: number;
  andaresMaturacao: number;
  /** Andares de maturação preenchidos por 1 andar de vegetativa. */
  vegFloorToMatFloors: number;
  /**
   * Torres de vegetativa preenchidas por 1 andar de mudas.
   * Padrão 1 (1 andar mudas → 1 torre vegetativa).
   */
  mudFloorToVegTowers: number;
};

export type TowerNeedsPhase = {
  fase: "mudas" | "vegetativa" | "maturacao";
  label: string;
  days: number;
  andaresPorTorre: number;
  /** Torres necessárias no steady-state (pode ser fracionário). */
  towersNeeded: number;
  /** Sugestão operacional (ceil). */
  towersCeil: number;
  floorsInPipeline: number;
};

export type TowerNeedsResult = {
  params: TowerNeedsParams;
  /** Andares de maturação colhidos por dia. */
  matFloorsPerDay: number;
  /** Andares de vegetativa a transplantar por dia. */
  vegFloorsPerDay: number;
  /** Andares de mudas a transplantar por dia. */
  mudFloorsPerDay: number;
  phases: TowerNeedsPhase[];
  totalTowersCeil: number;
  notes: string[];
};

export const DEFAULT_TOWER_NEEDS_PARAMS: TowerNeedsParams = {
  matTowersPerDay: 1,
  daysMudas: 14,
  daysVegetativa: 14,
  daysMaturacao: 14,
  andaresMudas: 12,
  andaresVegetativa: 12,
  andaresMaturacao: 9,
  vegFloorToMatFloors: 3,
  mudFloorToVegTowers: 1,
};

export function normalizeTowerNeedsParams(
  partial?: Partial<TowerNeedsParams>,
): TowerNeedsParams {
  const d = DEFAULT_TOWER_NEEDS_PARAMS;
  const p = { ...d, ...partial };
  const pos = (n: number, fallback: number) => {
    const v = Number(n);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    matTowersPerDay: Math.max(0, Number(p.matTowersPerDay) || 0),
    daysMudas: pos(p.daysMudas, d.daysMudas),
    daysVegetativa: pos(p.daysVegetativa, d.daysVegetativa),
    daysMaturacao: pos(p.daysMaturacao, d.daysMaturacao),
    andaresMudas: pos(p.andaresMudas, d.andaresMudas),
    andaresVegetativa: pos(p.andaresVegetativa, d.andaresVegetativa),
    andaresMaturacao: pos(p.andaresMaturacao, d.andaresMaturacao),
    vegFloorToMatFloors: pos(p.vegFloorToMatFloors, d.vegFloorToMatFloors),
    mudFloorToVegTowers: pos(p.mudFloorToVegTowers, d.mudFloorToVegTowers),
  };
}

function fmt(n: number, digits = 2): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

/**
 * Calcula torres necessárias em cada fase para sustentar `matTowersPerDay`.
 */
export function calculateTowerNeeds(
  raw?: Partial<TowerNeedsParams>,
): TowerNeedsResult {
  const params = normalizeTowerNeedsParams(raw);
  const {
    matTowersPerDay: R,
    daysMudas,
    daysVegetativa,
    daysMaturacao,
    andaresMudas,
    andaresVegetativa,
    andaresMaturacao,
    vegFloorToMatFloors,
    mudFloorToVegTowers,
  } = params;

  const matFloorsPerDay = R * andaresMaturacao;
  // 1 andar veg → vegFloorToMatFloors andares mat
  const vegFloorsPerDay =
    vegFloorToMatFloors > 0 ? matFloorsPerDay / vegFloorToMatFloors : 0;
  // Torres veg iniciadas/dia = andares veg/dia ÷ andares por torre veg
  const vegTowersStartedPerDay =
    andaresVegetativa > 0 ? vegFloorsPerDay / andaresVegetativa : 0;
  // 1 andar mudas → mudFloorToVegTowers torres veg
  const mudFloorsPerDay =
    mudFloorToVegTowers > 0 ? vegTowersStartedPerDay / mudFloorToVegTowers : 0;

  const towersMat = R * daysMaturacao;
  const towersVeg = vegTowersStartedPerDay * daysVegetativa;
  const towersMud =
    andaresMudas > 0 ? (mudFloorsPerDay * daysMudas) / andaresMudas : 0;

  const phases: TowerNeedsPhase[] = [
    {
      fase: "mudas",
      label: "Mudas",
      days: daysMudas,
      andaresPorTorre: andaresMudas,
      towersNeeded: towersMud,
      towersCeil: Math.ceil(towersMud - 1e-9),
      floorsInPipeline: mudFloorsPerDay * daysMudas,
    },
    {
      fase: "vegetativa",
      label: "Vegetativa",
      days: daysVegetativa,
      andaresPorTorre: andaresVegetativa,
      towersNeeded: towersVeg,
      towersCeil: Math.ceil(towersVeg - 1e-9),
      floorsInPipeline: vegFloorsPerDay * daysVegetativa,
    },
    {
      fase: "maturacao",
      label: "Maturação",
      days: daysMaturacao,
      andaresPorTorre: andaresMaturacao,
      towersNeeded: towersMat,
      towersCeil: Math.ceil(towersMat - 1e-9),
      floorsInPipeline: matFloorsPerDay * daysMaturacao,
    },
  ];

  const notes: string[] = [
    `Ritmo: ${fmt(R, 2)} torre(s) de maturação/dia → ${fmt(matFloorsPerDay, 1)} andar(es) de maturação/dia.`,
    `Razão veg→mat: 1 andar vegetativa preenche ${fmt(vegFloorToMatFloors, 1)} andar(es) de maturação → ${fmt(vegFloorsPerDay, 2)} andar(es) vegetativa/dia.`,
    `Razão mudas→veg: 1 andar mudas preenche ${fmt(mudFloorToVegTowers, 1)} torre(s) vegetativa → ${fmt(mudFloorsPerDay, 2)} andar(es) mudas/dia.`,
    `Torres = (fluxo diário de andares × dias na fase) ÷ andares por torre (maturação: ritmo × dias).`,
  ];

  return {
    params,
    matFloorsPerDay,
    vegFloorsPerDay,
    mudFloorsPerDay,
    phases,
    totalTowersCeil: phases.reduce((s, p) => s + p.towersCeil, 0),
    notes,
  };
}
