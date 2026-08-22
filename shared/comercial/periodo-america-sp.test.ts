import { describe, expect, it } from "vitest";
import {
  diaIsoAmericaSp,
  diaIsoMesAnterior,
  periodoMesAnterior,
} from "./periodo-america-sp";

describe("diaIsoMesAnterior", () => {
  it("recua um mês mantendo o dia", () => {
    expect(diaIsoMesAnterior("2026-08-22")).toBe("2026-07-22");
    expect(diaIsoMesAnterior("2026-08-01")).toBe("2026-07-01");
  });

  it("ajusta 31 para o último dia do mês anterior", () => {
    expect(diaIsoMesAnterior("2026-03-31")).toBe("2026-02-28");
    expect(diaIsoMesAnterior("2024-03-31")).toBe("2024-02-29");
  });

  it("vira o ano em janeiro", () => {
    expect(diaIsoMesAnterior("2026-01-15")).toBe("2025-12-15");
  });
});

describe("periodoMesAnterior", () => {
  it("mantém a mesma quantidade de dias no mês anterior", () => {
    const { inicio, fim } = periodoMesAnterior(
      new Date("2026-08-01T00:00:00-03:00"),
      new Date("2026-08-22T23:59:59.999-03:00"),
    );
    expect(diaIsoAmericaSp(inicio)).toBe("2026-07-01");
    expect(diaIsoAmericaSp(fim)).toBe("2026-07-22");
  });

  it("funciona em intervalo que cruza meses", () => {
    const { inicio, fim } = periodoMesAnterior(
      new Date("2026-07-25T00:00:00-03:00"),
      new Date("2026-08-18T23:59:59.999-03:00"),
    );
    expect(diaIsoAmericaSp(inicio)).toBe("2026-06-25");
    expect(diaIsoAmericaSp(fim)).toBe("2026-07-18");
  });
});
