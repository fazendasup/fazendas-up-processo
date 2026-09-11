import { describe, expect, it } from "vitest";
import {
  capacityCycleTowers,
  cycleDaysFromParams,
  DEFAULT_HARVEST_PARAMS,
  recommendedTowersPerDay,
  simulateMonthRoutine,
  simulateYear,
} from "./harvest";

describe("cycleDaysFromParams", () => {
  it("soma crescimento + sanitização em dias", () => {
    expect(cycleDaysFromParams({ growthDays: 14, sanitizeHours: 48 })).toBe(16);
  });
});

describe("recommendedTowersPerDay", () => {
  it("aplica fator 7/6 quando pula sábado", () => {
    // 14 / 16 * 7/6 ≈ 1.0208 → 1.0
    expect(
      recommendedTowersPerDay({
        towers: 14,
        growthDays: 14,
        sanitizeHours: 48,
        skipSaturday: true,
      }),
    ).toBe(1);
  });

  it("exemplo clássico ~1,4", () => {
    // 14 / 16 * 7/6 ≈ 1.02 — use towers that yield 1.4
    // 16 * 1.4 * 6/7 ≈ 19.2 → use 22.4/16*7/6?
    // 14 towers, cycle 10: 14/10 * 7/6 = 1.633 → 1.6
    expect(
      recommendedTowersPerDay({
        towers: 14,
        growthDays: 8,
        sanitizeHours: 48, // ciclo 10
        skipSaturday: true,
      }),
    ).toBe(1.6);
  });
});

describe("simulateMonthRoutine", () => {
  it("acumula crédito fracionário 1,5/dia", () => {
    // Jan 2026: starts Thursday. Skip Saturday.
    const r = simulateMonthRoutine({
      year: 2026,
      monthIndex: 0,
      towersPerDay: 1.5,
      skipSaturday: true,
    });
    // First harvest day Jan 1 (Thu): credit 1.5 → harvest 1, remain 0.5
    expect(r.calendar[0]?.towersHarvested).toBe(1);
    expect(r.calendar[0]?.creditAfter).toBe(0.5);
    // Jan 2 (Fri): 0.5+1.5=2 → harvest 2
    expect(r.calendar[1]?.towersHarvested).toBe(2);
    expect(r.calendar[1]?.creditAfter).toBe(0);
  });

  it("não colhe no sábado quando skipSaturday", () => {
    const r = simulateMonthRoutine({
      year: 2026,
      monthIndex: 0,
      towersPerDay: 1,
      skipSaturday: true,
    });
    const saturdays = r.calendar.filter(d => d.dayOfWeek === 6);
    expect(saturdays.length).toBeGreaterThan(0);
    expect(saturdays.every(d => d.towersHarvested === 0 && !d.isHarvestDay)).toBe(true);
  });
});

describe("capacityCycleTowers", () => {
  it("calcula (torres × dias) / ciclo", () => {
    expect(capacityCycleTowers(14, 31, 16)).toBeCloseTo((14 * 31) / 16, 6);
  });
});

describe("simulateYear", () => {
  it("usa min(ciclo, rotina) e aplica perda antes do peso", () => {
    const result = simulateYear(
      {
        ...DEFAULT_HARVEST_PARAMS,
        towers: 14,
        plantsPerTower: 100,
        lossPercent: 10,
        growthDays: 14,
        sanitizeHours: 48,
        towersPerDay: 1,
        weightPerPlantG: 40,
        weightPerProductG: 100,
        salePrice: 8,
        skipSaturday: true,
      },
      2026,
      { referenceMonthIndex: 0 },
    );

    expect(result.cycleDays).toBe(16);
    const jan = result.months[0]!;
    expect(jan.towersHarvested).toBe(
      Math.min(jan.capacityCycleTowers, jan.capacityRoutineTowers),
    );
    expect(jan.plantsNet).toBeCloseTo(jan.plantsGross * 0.9, 6);
    expect(jan.products).toBe(Math.floor((jan.plantsNet * 40) / 100));
    expect(jan.revenue).toBe(jan.products * 8);
  });

  it("gargalo calendário: com 1 torre/dia, encurtar ciclo não sobe a média", () => {
    const withLong = simulateYear(
      { ...DEFAULT_HARVEST_PARAMS, growthDays: 14, sanitizeHours: 48, towersPerDay: 1 },
      2026,
    );
    const withShort = simulateYear(
      { ...DEFAULT_HARVEST_PARAMS, growthDays: 8, sanitizeHours: 48, towersPerDay: 1 },
      2026,
    );
    expect(withShort.avgMonthlyProducts).toBeCloseTo(withLong.avgMonthlyProducts, 0);
    expect(withShort.bottleneck).toBe("calendario");
  });

  it("12 meses e totais positivos com defaults", () => {
    const r = simulateYear(DEFAULT_HARVEST_PARAMS, 2026);
    expect(r.months).toHaveLength(12);
    expect(r.totals.products).toBeGreaterThan(0);
    expect(r.totals.revenue).toBeGreaterThan(0);
    expect(r.notes.length).toBeGreaterThan(3);
    expect(r.calendar.length).toBeGreaterThan(27);
  });
});
