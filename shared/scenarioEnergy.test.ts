import { describe, expect, it } from "vitest";
import { calculateTowerNeeds } from "./towerNeeds";
import {
  calculateScenarioEnergy,
  DEFAULT_SCENARIO_ENERGY_PARAMS,
  pumpGridWatts,
  threePhaseWatts,
  WATTS_POR_CV,
} from "./scenarioEnergy";

describe("scenarioEnergy helpers", () => {
  it("1 CV com 80% rendimento", () => {
    expect(pumpGridWatts(1, 0.8)).toBeCloseTo(WATTS_POR_CV / 0.8, 4);
  });

  it("potência trifásica condensadora 50A 220V FP 0,85", () => {
    const w = threePhaseWatts(220, 50, 0.85);
    expect(w).toBeCloseTo(Math.sqrt(3) * 220 * 50 * 0.85, 4);
  });
});

describe("calculateScenarioEnergy", () => {
  it("soma custo mensal com defaults e 1 torre mat/dia", () => {
    const tower = calculateTowerNeeds({ matTowersPerDay: 1 });
    const energy = calculateScenarioEnergy(tower, DEFAULT_SCENARIO_ENERGY_PARAMS);
    expect(energy.lines.length).toBe(8);
    expect(energy.costPerMonth).toBeGreaterThan(0);
    expect(energy.costPerYear).toBeCloseTo(energy.costPerMonth * 12, 6);

    const mat = tower.phases.find(p => p.fase === "maturacao")!;
    const lampMat = energy.lines.find(l => l.id === "lamp-mat")!;
    expect(lampMat.qty).toBeCloseTo(mat.floorsInPipeline * 5, 6);

    const pumpMat = energy.lines.find(l => l.id === "pump-mat")!;
    expect(pumpMat.qty).toBe(Math.ceil(mat.towersCeil / 2));
  });

  it("2 condensadoras por evaporadora dobra condensadoras", () => {
    const tower = calculateTowerNeeds({ matTowersPerDay: 1 });
    const one = calculateScenarioEnergy(tower, {
      evaporators: 2,
      condensersPerEvaporator: 1,
    });
    const two = calculateScenarioEnergy(tower, {
      evaporators: 2,
      condensersPerEvaporator: 2,
    });
    expect(one.lines.find(l => l.id === "cond")!.qty).toBe(2);
    expect(two.lines.find(l => l.id === "cond")!.qty).toBe(4);
  });
});
