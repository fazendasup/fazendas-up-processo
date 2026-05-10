import { describe, expect, it } from "vitest";
import { receitaCicloPrioritariaParaVariedade, receitaEstaAtiva } from "./cicloReceita";

describe("receitaEstaAtiva", () => {
  it("trata 0 (MySQL tinyint) como inativa", () => {
    expect(receitaEstaAtiva({ variedadeId: 1, ativa: 0 })).toBe(false);
  });
  it("aceita true, 1 e undefined como ativa", () => {
    expect(receitaEstaAtiva({ variedadeId: 1, ativa: true })).toBe(true);
    expect(receitaEstaAtiva({ variedadeId: 1, ativa: 1 })).toBe(true);
    expect(receitaEstaAtiva({ variedadeId: 1 })).toBe(true);
  });
});

describe("receitaCicloPrioritariaParaVariedade", () => {
  it("ignora receita inativa (0) quando há ativa para a mesma variedade", () => {
    const r = receitaCicloPrioritariaParaVariedade(
      [
        { id: 1, variedadeId: 5, ativa: 0, updatedAt: "2099-01-01", diasVegetativa: 99 },
        { id: 2, variedadeId: 5, ativa: 1, updatedAt: "2020-01-01", diasVegetativa: 10 },
      ],
      5,
    );
    expect(r?.id).toBe(2);
    expect(r?.diasVegetativa).toBe(10);
  });
});
