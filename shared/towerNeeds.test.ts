import { describe, expect, it } from "vitest";
import {
  calculateTowerNeeds,
  DEFAULT_TOWER_NEEDS_PARAMS,
} from "./towerNeeds";

describe("calculateTowerNeeds", () => {
  it("com 1 torre mat/dia e defaults FV", () => {
    const r = calculateTowerNeeds({
      ...DEFAULT_TOWER_NEEDS_PARAMS,
      matTowersPerDay: 1,
      daysMudas: 14,
      daysVegetativa: 14,
      daysMaturacao: 14,
      andaresMudas: 12,
      andaresVegetativa: 12,
      andaresMaturacao: 6,
      vegFloorToMatFloors: 3,
      mudFloorToVegTowers: 1,
    });

    // Mat: 1/dia × 14 = 14
    expect(r.phases.find(p => p.fase === "maturacao")!.towersNeeded).toBe(14);
    // Mat floors/day = 6; veg floors/day = 6/3 = 2; veg towers/day = 2/12
    // veg towers = (2/12)*14 = 14/6 ≈ 2.333
    expect(r.phases.find(p => p.fase === "vegetativa")!.towersNeeded).toBeCloseTo(
      14 / 6,
      6,
    );
    // mud floors/day = vegTowersStarted/day = 2/12; mud towers = (2/12)*14/12 = 28/144
    expect(r.phases.find(p => p.fase === "mudas")!.towersNeeded).toBeCloseTo(
      (2 / 12) * (14 / 12),
      6,
    );
  });

  it("encurta dias de maturação reduz torres de mat", () => {
    const long = calculateTowerNeeds({ matTowersPerDay: 1, daysMaturacao: 14 });
    const short = calculateTowerNeeds({ matTowersPerDay: 1, daysMaturacao: 7 });
    expect(short.phases.find(p => p.fase === "maturacao")!.towersNeeded).toBe(7);
    expect(
      short.phases.find(p => p.fase === "maturacao")!.towersNeeded,
    ).toBeLessThan(long.phases.find(p => p.fase === "maturacao")!.towersNeeded);
  });

  it("razao 1 andar mudas = 1 torre veg", () => {
    const r = calculateTowerNeeds({ matTowersPerDay: 1 });
    // veg towers started/day = mud floors/day when mudFloorToVegTowers=1
    expect(r.mudFloorsPerDay).toBeCloseTo(
      r.vegFloorsPerDay / r.params.andaresVegetativa,
      8,
    );
  });
});
