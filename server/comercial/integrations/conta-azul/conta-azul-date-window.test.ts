import { describe, expect, it } from "vitest";
import {
  CA_MAX_INTERVALO_DIAS,
  addDaysYmd,
  diasEntreYmd,
  janelasContaAzul,
  limitarJanelaCa,
  mensagemErroContaAzulFinanceiro,
} from "./conta-azul-date-window";

describe("conta-azul-date-window", () => {
  it("limitarJanelaCa corta início quando passa de 364 dias", () => {
    const { de, ate } = limitarJanelaCa("2020-01-01", "2024-01-01");
    expect(ate).toBe("2024-01-01");
    expect(diasEntreYmd(de, ate)).toBe(CA_MAX_INTERVALO_DIAS);
    expect(de).toBe(addDaysYmd(ate, -CA_MAX_INTERVALO_DIAS));
  });

  it("janelasContaAzul parte intervalo amplo em pedaços ≤364", () => {
    const chunks = janelasContaAzul("2022-01-01", "2025-01-01");
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(diasEntreYmd(c.de, c.ate)).toBeLessThanOrEqual(CA_MAX_INTERVALO_DIAS);
    }
    expect(chunks[0]?.de).toBe("2022-01-01");
    expect(chunks[chunks.length - 1]?.ate).toBe("2025-01-01");
  });

  it("mensagemErroContaAzulFinanceiro reconhece 365 dias", () => {
    expect(
      mensagemErroContaAzulFinanceiro(
        new Error("HTTP 400: intervalo maior que 365 dias"),
        "fallback",
      ),
    ).toMatch(/recusou o período/i);
  });
});
