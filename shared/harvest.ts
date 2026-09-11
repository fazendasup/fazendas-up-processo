/**
 * Calculadora Verde Torre — planejamento de colheita + comercialização.
 * Domínio puro (sem UI/DB). API: simulateYear(params, year) → HarvestResult.
 */

export type HarvestBottleneck = "calendario" | "ciclo" | "equilibrado";

export type HarvestParams = {
  towers: number;
  plantsPerTower: number;
  lossPercent: number;
  growthDays: number;
  sanitizeHours: number;
  skipSaturday: boolean;
  towersPerDay: number;
  weightPerPlantG: number;
  weightPerProductG: number;
  salePrice: number;
};

export type HarvestDay = {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=dom … 6=sáb
  isHarvestDay: boolean;
  towersHarvested: number;
  creditAfter: number;
};

export type HarvestMonth = {
  monthIndex: number; // 0–11
  year: number;
  label: string;
  daysInMonth: number;
  saturdays: number;
  harvestDays: number;
  /** Capacidade pelo ciclo biológico (torres colhidas). */
  capacityCycleTowers: number;
  /** Capacidade pela rotina diária (torres colhidas). */
  capacityRoutineTowers: number;
  /** Resultado = min(ciclo, rotina). */
  towersHarvested: number;
  plantsGross: number;
  plantsNet: number;
  kg: number;
  products: number;
  revenue: number;
};

export type HarvestResult = {
  params: HarvestParams;
  year: number;
  cycleDays: number;
  recommendedTowersPerDay: number;
  recommendedPlantsPerHarvestDay: number;
  bottleneck: HarvestBottleneck;
  avgMonthlyPlants: number;
  avgMonthlyProducts: number;
  avgMonthlyRevenue: number;
  totals: {
    plants: number;
    kg: number;
    products: number;
    revenue: number;
  };
  months: HarvestMonth[];
  /** Calendário do mês de referência (mês atual no ano simulado, ou janeiro). */
  calendar: HarvestDay[];
  referenceMonthIndex: number;
  notes: string[];
};

export const DEFAULT_HARVEST_PARAMS: HarvestParams = {
  towers: 14,
  plantsPerTower: 324,
  lossPercent: 10,
  growthDays: 14,
  sanitizeHours: 48,
  skipSaturday: true,
  towersPerDay: 1,
  weightPerPlantG: 40,
  weightPerProductG: 100,
  salePrice: 8,
};

const MONTH_LABELS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function cycleDaysFromParams(params: Pick<HarvestParams, "growthDays" | "sanitizeHours">): number {
  return params.growthDays + params.sanitizeHours / 24;
}

/** Volume diário recomendado: torres/ciclo × (7/6 se pula sábado), 1 casa decimal. */
export function recommendedTowersPerDay(
  params: Pick<HarvestParams, "towers" | "growthDays" | "sanitizeHours" | "skipSaturday">,
): number {
  const ciclo = cycleDaysFromParams(params);
  if (!(ciclo > 0) || !(params.towers > 0)) return 0;
  const factor = params.skipSaturday ? 7 / 6 : 1;
  return Math.round((params.towers / ciclo) * factor * 10) / 10;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function isHarvestCalendarDay(dayOfWeek: number, skipSaturday: boolean): boolean {
  if (skipSaturday && dayOfWeek === 6) return false;
  return true;
}

/**
 * Simula um mês: nos dias de colheita, soma towersPerDay ao crédito e colhe floor(crédito).
 * Sábado (se skip) não recebe crédito nem colhe — alinhado ao volume recomendado × 7/6.
 */
export function simulateMonthRoutine(opts: {
  year: number;
  monthIndex: number;
  towersPerDay: number;
  skipSaturday: boolean;
}): { towersHarvested: number; harvestDays: number; saturdays: number; calendar: HarvestDay[] } {
  const { year, monthIndex, towersPerDay, skipSaturday } = opts;
  const n = daysInMonth(year, monthIndex);
  let credit = 0;
  let towersHarvested = 0;
  let harvestDays = 0;
  let saturdays = 0;
  const calendar: HarvestDay[] = [];

  for (let day = 1; day <= n; day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) saturdays += 1;

    const canHarvest = isHarvestCalendarDay(dayOfWeek, skipSaturday);
    let harvested = 0;
    if (canHarvest) {
      harvestDays += 1;
      credit += Math.max(0, towersPerDay);
      harvested = Math.floor(credit + 1e-9);
      if (harvested > 0) {
        credit -= harvested;
        towersHarvested += harvested;
      }
    }

    calendar.push({
      date: ymd(year, monthIndex, day),
      dayOfWeek,
      isHarvestDay: canHarvest,
      towersHarvested: harvested,
      creditAfter: Math.round(credit * 1000) / 1000,
    });
  }

  return { towersHarvested, harvestDays, saturdays, calendar };
}

export function capacityCycleTowers(
  towers: number,
  days: number,
  cycleDays: number,
): number {
  if (!(cycleDays > 0) || !(towers > 0) || !(days > 0)) return 0;
  return (towers * days) / cycleDays;
}

function commercialFromPlants(
  plantsNet: number,
  weightPerPlantG: number,
  weightPerProductG: number,
  salePrice: number,
): { kg: number; products: number; revenue: number } {
  const kg = (plantsNet * weightPerPlantG) / 1000;
  const products =
    weightPerProductG > 0
      ? Math.floor((plantsNet * weightPerPlantG) / weightPerProductG)
      : 0;
  return { kg, products, revenue: products * salePrice };
}

function detectBottleneck(
  capacityCycle: number,
  capacityRoutine: number,
): HarvestBottleneck {
  const eps = 0.05; // ~5% de torres/mês
  if (capacityRoutine + eps < capacityCycle) return "calendario";
  if (capacityCycle + eps < capacityRoutine) return "ciclo";
  return "equilibrado";
}

function buildNotes(
  params: HarvestParams,
  result: Pick<
    HarvestResult,
    | "cycleDays"
    | "recommendedTowersPerDay"
    | "bottleneck"
    | "avgMonthlyProducts"
    | "avgMonthlyRevenue"
    | "totals"
  >,
  sampleMonth: HarvestMonth,
): string[] {
  const notes: string[] = [];
  notes.push(
    `Ciclo operacional = ${params.growthDays} dias de crescimento + ${params.sanitizeHours} h de sanitização = ${fmtNum(result.cycleDays)} dias.`,
  );
  notes.push(
    `Capacidade pelo ciclo em ${sampleMonth.label}: (${params.towers} torres × ${sampleMonth.daysInMonth} dias) ÷ ${fmtNum(result.cycleDays)} = ${fmtNum(sampleMonth.capacityCycleTowers)} torres colhidas.`,
  );
  notes.push(
    `Capacidade pela rotina (${fmtNum(params.towersPerDay)} torre(s)/dia${params.skipSaturday ? ", sem sábado" : ""}): ${fmtNum(sampleMonth.capacityRoutineTowers)} torres em ${sampleMonth.label}.`,
  );
  notes.push(
    `Resultado do mês = min(ciclo, rotina) = ${fmtNum(sampleMonth.towersHarvested)} torres → ${fmtInt(sampleMonth.plantsGross)} plantas brutas → ${fmtInt(sampleMonth.plantsNet)} líquidas (−${fmtNum(params.lossPercent)}% perda).`,
  );
  notes.push(
    `Comercial: ${fmtNum(params.weightPerPlantG)} g/planta e ${fmtNum(params.weightPerProductG)} g/produto → ${fmtInt(sampleMonth.products)} produtos × R$ ${fmtNum(params.salePrice)} = R$ ${fmtMoney(sampleMonth.revenue)} em ${sampleMonth.label}.`,
  );
  notes.push(
    `Volume diário recomendado para acompanhar o ciclo: ${fmtNum(result.recommendedTowersPerDay)} torre(s)/dia` +
      (params.skipSaturday ? " (fator 7/6 por pular sábado)." : "."),
  );

  if (result.bottleneck === "calendario") {
    notes.push(
      "Gargalo: calendário/rotina. Encurtar o ciclo biológico sozinho não sobe a média enquanto o volume diário (torres/dia) for o limitante.",
    );
  } else if (result.bottleneck === "ciclo") {
    notes.push(
      "Gargalo: ciclo biológico. A rotina diária colheria mais torres do que o ciclo permite — reduzir volume diário ou alongar sanitização/crescimento não ajuda; o teto é o ciclo.",
    );
  } else {
    notes.push("Gargalo: equilibrado — rotina diária e ciclo biológico estão alinhados.");
  }

  notes.push(
    `Média mensal ≈ ${fmtInt(result.avgMonthlyProducts)} produtos e R$ ${fmtMoney(result.avgMonthlyRevenue)}; total no ano: ${fmtInt(result.totals.products)} produtos e R$ ${fmtMoney(result.totals.revenue)}.`,
  );

  return notes;
}

function fmtNum(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
function fmtMoney(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizeHarvestParams(partial?: Partial<HarvestParams>): HarvestParams {
  const d = DEFAULT_HARVEST_PARAMS;
  const p = { ...d, ...partial };
  return {
    towers: Math.max(0, Number(p.towers) || 0),
    plantsPerTower: Math.max(0, Number(p.plantsPerTower) || 0),
    lossPercent: Math.min(100, Math.max(0, Number(p.lossPercent) || 0)),
    growthDays: Math.max(0, Number(p.growthDays) || 0),
    sanitizeHours: Math.max(0, Number(p.sanitizeHours) || 0),
    skipSaturday: Boolean(p.skipSaturday),
    towersPerDay: Math.max(0, Number(p.towersPerDay) || 0),
    weightPerPlantG: Math.max(0, Number(p.weightPerPlantG) || 0),
    weightPerProductG: Math.max(0, Number(p.weightPerProductG) || 0),
    salePrice: Math.max(0, Number(p.salePrice) || 0),
  };
}

export function simulateYear(
  rawParams: Partial<HarvestParams> | HarvestParams,
  year: number,
  opts?: { referenceMonthIndex?: number },
): HarvestResult {
  const params = normalizeHarvestParams(rawParams);
  const cycleDays = cycleDaysFromParams(params);
  const recommended = recommendedTowersPerDay(params);
  const lossFactor = 1 - params.lossPercent / 100;

  const months: HarvestMonth[] = [];
  let sumCycle = 0;
  let sumRoutine = 0;

  for (let m = 0; m < 12; m++) {
    const days = daysInMonth(year, m);
    const capacityCycle = capacityCycleTowers(params.towers, days, cycleDays);
    const routine = simulateMonthRoutine({
      year,
      monthIndex: m,
      towersPerDay: params.towersPerDay,
      skipSaturday: params.skipSaturday,
    });
    const towersHarvested = Math.min(capacityCycle, routine.towersHarvested);
    const plantsGross = towersHarvested * params.plantsPerTower;
    const plantsNet = plantsGross * lossFactor;
    const { kg, products, revenue } = commercialFromPlants(
      plantsNet,
      params.weightPerPlantG,
      params.weightPerProductG,
      params.salePrice,
    );

    sumCycle += capacityCycle;
    sumRoutine += routine.towersHarvested;

    months.push({
      monthIndex: m,
      year,
      label: MONTH_LABELS_PT[m],
      daysInMonth: days,
      saturdays: routine.saturdays,
      harvestDays: routine.harvestDays,
      capacityCycleTowers: capacityCycle,
      capacityRoutineTowers: routine.towersHarvested,
      towersHarvested,
      plantsGross,
      plantsNet,
      kg,
      products,
      revenue,
    });
  }

  const totals = months.reduce(
    (acc, mo) => {
      acc.plants += mo.plantsNet;
      acc.kg += mo.kg;
      acc.products += mo.products;
      acc.revenue += mo.revenue;
      return acc;
    },
    { plants: 0, kg: 0, products: 0, revenue: 0 },
  );

  const bottleneck = detectBottleneck(sumCycle / 12, sumRoutine / 12);

  const now = new Date();
  const referenceMonthIndex =
    opts?.referenceMonthIndex ??
    (now.getFullYear() === year ? now.getMonth() : 0);

  const calendar = simulateMonthRoutine({
    year,
    monthIndex: referenceMonthIndex,
    towersPerDay: params.towersPerDay,
    skipSaturday: params.skipSaturday,
  }).calendar;

  const avgMonthlyPlants = totals.plants / 12;
  const avgMonthlyProducts = totals.products / 12;
  const avgMonthlyRevenue = totals.revenue / 12;

  const partial = {
    cycleDays,
    recommendedTowersPerDay: recommended,
    bottleneck,
    avgMonthlyProducts,
    avgMonthlyRevenue,
    totals,
  };

  const notes = buildNotes(params, partial, months[referenceMonthIndex] ?? months[0]!);

  return {
    params,
    year,
    cycleDays,
    recommendedTowersPerDay: recommended,
    recommendedPlantsPerHarvestDay: recommended * params.plantsPerTower,
    bottleneck,
    avgMonthlyPlants,
    avgMonthlyProducts,
    avgMonthlyRevenue,
    totals,
    months,
    calendar,
    referenceMonthIndex,
    notes,
  };
}
