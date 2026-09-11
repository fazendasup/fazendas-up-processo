import { describe, expect, it } from "vitest";
import {
  calculateTowerNeeds,
  DEFAULT_TOWER_NEEDS_PARAMS,
} from "./towerNeeds";

/**
 * Operação real:
 * - mudas 12 andares/torre, veg 12, mat 9
 * - 1 andar mudas → 1 torre vegetativa
 * - 1 andar vegetativa → 3 andares maturação
 */
describe("calculateTowerNeeds (12/12/9)", () => {
  it("defaults usam 12 mudas, 12 veg, 9 mat", () => {
    expect(DEFAULT_TOWER_NEEDS_PARAMS.andaresMudas).toBe(12);
    expect(DEFAULT_TOWER_NEEDS_PARAMS.andaresVegetativa).toBe(12);
    expect(DEFAULT_TOWER_NEEDS_PARAMS.andaresMaturacao).toBe(9);
  });

  it("com 1 torre mat/dia e 14 dias em cada fase", () => {
    const r = calculateTowerNeeds({
      matTowersPerDay: 1,
      daysMudas: 14,
      daysVegetativa: 14,
      daysMaturacao: 14,
      andaresMudas: 12,
      andaresVegetativa: 12,
      andaresMaturacao: 9,
      vegFloorToMatFloors: 3,
      mudFloorToVegTowers: 1,
    });

    // Mat: 1/dia × 14 d = 14 torres; 9 andares/dia
    expect(r.matFloorsPerDay).toBe(9);
    expect(r.phases.find(p => p.fase === "maturacao")!.towersNeeded).toBe(14);
    expect(r.phases.find(p => p.fase === "maturacao")!.towersCeil).toBe(14);

    // Veg: 9 andares mat/dia ÷ 3 = 3 andares veg/dia
    // torres veg/dia = 3/12 = 0,25 → × 14 d = 3,5 torres
    expect(r.vegFloorsPerDay).toBe(3);
    expect(r.phases.find(p => p.fase === "vegetativa")!.towersNeeded).toBeCloseTo(3.5, 8);
    expect(r.phases.find(p => p.fase === "vegetativa")!.towersCeil).toBe(4);

    // Mudas: 1 andar mudas → 1 torre veg ⇒ andares mudas/dia = torres veg iniciadas/dia = 0,25
    // torres mudas = 0,25 × 14 / 12 = 3,5/12 ≈ 0,2917 → ceil 1
    expect(r.mudFloorsPerDay).toBeCloseTo(0.25, 8);
    expect(r.phases.find(p => p.fase === "mudas")!.towersNeeded).toBeCloseTo(3.5 / 12, 8);
    expect(r.phases.find(p => p.fase === "mudas")!.towersCeil).toBe(1);
  });

  it("1 andar mudas preenche exatamente 1 torre vegetativa (12 andares)", () => {
    // Para encher 1 torre veg/dia (= 12 andares veg/dia) com razão 3:
    // andares mat/dia = 12 × 3 = 36 → torres mat/dia = 36/9 = 4
    const r = calculateTowerNeeds({
      matTowersPerDay: 4,
      andaresMudas: 12,
      andaresVegetativa: 12,
      andaresMaturacao: 9,
      vegFloorToMatFloors: 3,
      mudFloorToVegTowers: 1,
      daysMudas: 1,
      daysVegetativa: 1,
      daysMaturacao: 1,
    });
    expect(r.vegFloorsPerDay).toBe(12);
    expect(r.mudFloorsPerDay).toBeCloseTo(1, 8); // 1 andar mudas/dia
    expect(r.phases.find(p => p.fase === "vegetativa")!.towersNeeded).toBeCloseTo(1, 8);
    expect(r.phases.find(p => p.fase === "mudas")!.towersNeeded).toBeCloseTo(1 / 12, 8);
  });

  it("1 andar vegetativa preenche 3 andares maturação (9 andares = 3 andares veg)", () => {
    // 1 torre mat = 9 andares → precisa 9/3 = 3 andares veg = 3/12 torre veg
    const r = calculateTowerNeeds({
      matTowersPerDay: 1,
      daysMaturacao: 1,
      daysVegetativa: 1,
      daysMudas: 1,
      andaresMaturacao: 9,
      andaresVegetativa: 12,
      vegFloorToMatFloors: 3,
    });
    expect(r.vegFloorsPerDay).toBe(3);
    expect(r.phases.find(p => p.fase === "vegetativa")!.towersNeeded).toBeCloseTo(3 / 12, 8);
  });
});
