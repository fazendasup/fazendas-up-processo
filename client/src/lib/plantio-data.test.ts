import { describe, expect, it } from "vitest";
import {
  dataAlvoYmdFromEntrada,
  dataEntradaFromDataAlvo,
  resolverDataPlantioCampo,
} from "./utils-farm";
import type { VariedadeConfig } from "./types";

const variedades: VariedadeConfig[] = [
  {
    id: "alface",
    nome: "Alface",
    diasMudas: 10,
    diasVegetativa: 14,
    diasMaturacao: 7,
  },
];

describe("plantio data alvo", () => {
  it("calcula data de entrada a partir da colheita alvo", () => {
    const entrada = dataEntradaFromDataAlvo("2026-02-01", "maturacao", "alface", variedades);
    expect(entrada).not.toBeNull();
    expect(dataAlvoYmdFromEntrada(entrada, "maturacao", "alface", variedades)).toBe("2026-02-01");
  });

  it("resolverDataPlantioCampo em modo plantio usa a data informada", () => {
    const d = resolverDataPlantioCampo("plantio", "2026-01-15", "mudas", "alface", variedades);
    expect(d?.toISOString().slice(0, 10)).toBe("2026-01-15");
  });
});
