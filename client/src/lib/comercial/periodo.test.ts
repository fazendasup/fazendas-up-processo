import { describe, expect, it } from "vitest";
import { intervaloDoPreset, labelPreset } from "./periodo";
import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";

function diasNoIntervalo(inicio: Date, fim: Date): number {
  const a = new Date(`${diaIsoAmericaSp(inicio)}T12:00:00-03:00`);
  const b = new Date(`${diaIsoAmericaSp(fim)}T12:00:00-03:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

describe("intervaloDoPreset", () => {
  it("últimos 30 dias cobre 30 dias civis, não só a semana", () => {
    const { inicio, fim } = intervaloDoPreset("ultimos_30_dias");
    expect(diasNoIntervalo(inicio, fim)).toBe(30);
    expect(labelPreset("ultimos_30_dias")).toBe("Últimos 30 dias");
  });

  it("últimos 90 dias cobre 90 dias civis", () => {
    const { inicio, fim } = intervaloDoPreset("ultimos_90_dias");
    expect(diasNoIntervalo(inicio, fim)).toBe(90);
  });

  it("personalizado respeita o intervalo informado", () => {
    const { inicio, fim } = intervaloDoPreset("personalizado", {
      inicio: "2026-07-01",
      fim: "2026-08-18",
    });
    expect(diaIsoAmericaSp(inicio)).toBe("2026-07-01");
    expect(diaIsoAmericaSp(fim)).toBe("2026-08-18");
    expect(diasNoIntervalo(inicio, fim)).toBe(49);
  });
});
