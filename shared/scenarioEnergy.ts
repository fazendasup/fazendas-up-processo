/**
 * Custo de energia do cenário de torres (iluminação, bombas, refrigeração).
 *
 * Tarifação: R$/kWh (padrão 0,89).
 * Lâmpadas: potência nominal em W (40 W).
 * Bombas: 1 CV ≈ 735,5 W no eixo; consumo de rede = eixo / rendimento.
 * Refrigeração trifásica: P = √3 × V × I × FP.
 */

import type { TowerNeedsResult } from "./towerNeeds";

export const WATTS_POR_CV = 735.49875;
export const SQRT3 = Math.SQRT3;

export type ScenarioEnergyParams = {
  /** R$ por kWh — padrão 0,89 */
  tariffReaisPerKwh: number;
  /** Fator de potência (trifásico / motores). */
  powerFactor: number;
  /** Rendimento elétrico da bomba (eixo → rede). */
  pumpEfficiency: number;

  lampWatts: number;
  lampsPerFloorMudas: number;
  lampsPerFloorVegetativa: number;
  lampsPerFloorMaturacao: number;
  lampHoursPerDay: number;

  /** Potência no eixo da bomba (CV). */
  pumpCv: number;
  /** 1 bomba por torre em mudas/vegetativa. */
  pumpsPerTowerMudas: number;
  pumpsPerTowerVegetativa: number;
  /** Torres de maturação por bomba (padrão 2). */
  matTowersPerPump: number;
  pumpHoursPerDay: number;

  /** Quantidade de evaporadoras no cenário. */
  evaporators: number;
  /** Condensadoras por evaporadora (1 ou 2). */
  condensersPerEvaporator: 1 | 2;
  condenserAmps: number;
  evaporatorAmps: number;
  refrigerationVoltageV: number;
  refrigerationHoursPerDay: number;
};

export type EnergyLine = {
  id: string;
  label: string;
  qty: number;
  unit: string;
  wattsEach: number;
  hoursPerDay: number;
  kwhPerDay: number;
  kwhPerMonth: number;
  costPerMonth: number;
  costPerYear: number;
};

export type ScenarioEnergyResult = {
  params: ScenarioEnergyParams;
  lines: EnergyLine[];
  kwhPerDay: number;
  kwhPerMonth: number;
  costPerMonth: number;
  costPerYear: number;
  notes: string[];
};

export const DEFAULT_SCENARIO_ENERGY_PARAMS: ScenarioEnergyParams = {
  tariffReaisPerKwh: 0.89,
  powerFactor: 0.85,
  pumpEfficiency: 0.8,
  lampWatts: 40,
  lampsPerFloorMudas: 4,
  lampsPerFloorVegetativa: 4,
  lampsPerFloorMaturacao: 5,
  lampHoursPerDay: 16,
  pumpCv: 1,
  pumpsPerTowerMudas: 1,
  pumpsPerTowerVegetativa: 1,
  matTowersPerPump: 2,
  pumpHoursPerDay: 24,
  evaporators: 1,
  condensersPerEvaporator: 2,
  condenserAmps: 50,
  evaporatorAmps: 20,
  refrigerationVoltageV: 220,
  refrigerationHoursPerDay: 24,
};

export function normalizeScenarioEnergyParams(
  partial?: Partial<ScenarioEnergyParams>,
): ScenarioEnergyParams {
  const d = DEFAULT_SCENARIO_ENERGY_PARAMS;
  const p = { ...d, ...partial };
  const num = (v: unknown, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const pos = (v: unknown, fb: number) => Math.max(0, num(v, fb));
  const cond = p.condensersPerEvaporator === 1 ? 1 : 2;
  return {
    tariffReaisPerKwh: pos(p.tariffReaisPerKwh, d.tariffReaisPerKwh),
    powerFactor: Math.min(1, Math.max(0.1, pos(p.powerFactor, d.powerFactor))),
    pumpEfficiency: Math.min(1, Math.max(0.1, pos(p.pumpEfficiency, d.pumpEfficiency))),
    lampWatts: pos(p.lampWatts, d.lampWatts),
    lampsPerFloorMudas: pos(p.lampsPerFloorMudas, d.lampsPerFloorMudas),
    lampsPerFloorVegetativa: pos(p.lampsPerFloorVegetativa, d.lampsPerFloorVegetativa),
    lampsPerFloorMaturacao: pos(p.lampsPerFloorMaturacao, d.lampsPerFloorMaturacao),
    lampHoursPerDay: Math.min(24, pos(p.lampHoursPerDay, d.lampHoursPerDay)),
    pumpCv: pos(p.pumpCv, d.pumpCv),
    pumpsPerTowerMudas: pos(p.pumpsPerTowerMudas, d.pumpsPerTowerMudas),
    pumpsPerTowerVegetativa: pos(p.pumpsPerTowerVegetativa, d.pumpsPerTowerVegetativa),
    matTowersPerPump: Math.max(0.1, pos(p.matTowersPerPump, d.matTowersPerPump)),
    pumpHoursPerDay: Math.min(24, pos(p.pumpHoursPerDay, d.pumpHoursPerDay)),
    evaporators: pos(p.evaporators, d.evaporators),
    condensersPerEvaporator: cond,
    condenserAmps: pos(p.condenserAmps, d.condenserAmps),
    evaporatorAmps: pos(p.evaporatorAmps, d.evaporatorAmps),
    refrigerationVoltageV: pos(p.refrigerationVoltageV, d.refrigerationVoltageV),
    refrigerationHoursPerDay: Math.min(
      24,
      pos(p.refrigerationHoursPerDay, d.refrigerationHoursPerDay),
    ),
  };
}

/** Potência trifásica ativa (W): √3 × V × I × FP */
export function threePhaseWatts(volts: number, amps: number, powerFactor: number): number {
  return SQRT3 * volts * amps * powerFactor;
}

/** Consumo elétrico da bomba (W na rede) a partir do CV no eixo. */
export function pumpGridWatts(cv: number, efficiency: number): number {
  const shaft = cv * WATTS_POR_CV;
  const eta = efficiency > 0 ? efficiency : 0.8;
  return shaft / eta;
}

function line(
  id: string,
  label: string,
  qty: number,
  unit: string,
  wattsEach: number,
  hoursPerDay: number,
  tariff: number,
): EnergyLine {
  const q = Math.max(0, qty);
  const kwhPerDay = (q * wattsEach * hoursPerDay) / 1000;
  const kwhPerMonth = kwhPerDay * 30;
  const costPerMonth = kwhPerMonth * tariff;
  return {
    id,
    label,
    qty: q,
    unit,
    wattsEach,
    hoursPerDay,
    kwhPerDay,
    kwhPerMonth,
    costPerMonth,
    costPerYear: costPerMonth * 12,
  };
}

/**
 * Energia do cenário com base nas torres/andares em fluxo (ceil operacional para bombas).
 */
export function calculateScenarioEnergy(
  tower: TowerNeedsResult,
  rawEnergy?: Partial<ScenarioEnergyParams>,
): ScenarioEnergyResult {
  const e = normalizeScenarioEnergyParams(rawEnergy);
  const mud = tower.phases.find(p => p.fase === "mudas")!;
  const veg = tower.phases.find(p => p.fase === "vegetativa")!;
  const mat = tower.phases.find(p => p.fase === "maturacao")!;

  const lampsMud = mud.floorsInPipeline * e.lampsPerFloorMudas;
  const lampsVeg = veg.floorsInPipeline * e.lampsPerFloorVegetativa;
  const lampsMat = mat.floorsInPipeline * e.lampsPerFloorMaturacao;

  const pumpsMud = mud.towersCeil * e.pumpsPerTowerMudas;
  const pumpsVeg = veg.towersCeil * e.pumpsPerTowerVegetativa;
  const pumpsMat = Math.ceil(mat.towersCeil / e.matTowersPerPump - 1e-9);

  const pumpW = pumpGridWatts(e.pumpCv, e.pumpEfficiency);
  const condW = threePhaseWatts(e.refrigerationVoltageV, e.condenserAmps, e.powerFactor);
  const evapW = threePhaseWatts(e.refrigerationVoltageV, e.evaporatorAmps, e.powerFactor);
  const condensers = e.evaporators * e.condensersPerEvaporator;

  const lines: EnergyLine[] = [
    line(
      "lamp-mudas",
      `Lâmpadas mudas (${e.lampsPerFloorMudas}/andar × ${e.lampWatts} W)`,
      lampsMud,
      "lâmpadas",
      e.lampWatts,
      e.lampHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "lamp-veg",
      `Lâmpadas vegetativa (${e.lampsPerFloorVegetativa}/andar × ${e.lampWatts} W)`,
      lampsVeg,
      "lâmpadas",
      e.lampWatts,
      e.lampHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "lamp-mat",
      `Lâmpadas maturação (${e.lampsPerFloorMaturacao}/andar × ${e.lampWatts} W)`,
      lampsMat,
      "lâmpadas",
      e.lampWatts,
      e.lampHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "pump-mudas",
      `Bombas mudas (${e.pumpsPerTowerMudas}/torre, ${e.pumpCv} CV)`,
      pumpsMud,
      "bombas",
      pumpW,
      e.pumpHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "pump-veg",
      `Bombas vegetativa (${e.pumpsPerTowerVegetativa}/torre, ${e.pumpCv} CV)`,
      pumpsVeg,
      "bombas",
      pumpW,
      e.pumpHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "pump-mat",
      `Bombas maturação (1 / ${e.matTowersPerPump} torres, ${e.pumpCv} CV)`,
      pumpsMat,
      "bombas",
      pumpW,
      e.pumpHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "cond",
      `Condensadoras (${e.condensersPerEvaporator} por evaporadora, ${e.condenserAmps} A trifásico)`,
      condensers,
      "unidades",
      condW,
      e.refrigerationHoursPerDay,
      e.tariffReaisPerKwh,
    ),
    line(
      "evap",
      `Evaporadoras (${e.evaporatorAmps} A trifásico)`,
      e.evaporators,
      "unidades",
      evapW,
      e.refrigerationHoursPerDay,
      e.tariffReaisPerKwh,
    ),
  ];

  const kwhPerDay = lines.reduce((s, l) => s + l.kwhPerDay, 0);
  const kwhPerMonth = lines.reduce((s, l) => s + l.kwhPerMonth, 0);
  const costPerMonth = lines.reduce((s, l) => s + l.costPerMonth, 0);

  const notes = [
    `Tarifa R$ ${e.tariffReaisPerKwh.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/kWh. Mês = 30 dias.`,
    `Lâmpadas: andares em fluxo × lâmpadas/andar × ${e.lampWatts} W × ${e.lampHoursPerDay} h/dia.`,
    `Bombas: 1 CV = ${WATTS_POR_CV.toFixed(1)} W no eixo ÷ rendimento ${Math.round(e.pumpEfficiency * 100)}% ≈ ${pumpW.toFixed(0)} W na rede.`,
    `Refrigeração trifásica 220 V: P = √3 × V × I × FP(${e.powerFactor}) → condensadora ${condW.toFixed(0)} W, evaporadora ${evapW.toFixed(0)} W.`,
  ];

  return {
    params: e,
    lines,
    kwhPerDay,
    kwhPerMonth,
    costPerMonth,
    costPerYear: costPerMonth * 12,
    notes,
  };
}
