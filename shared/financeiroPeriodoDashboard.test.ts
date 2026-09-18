import { describe, expect, it } from "vitest";
import {
  fimSemanaIsoSp,
  inicioSemanaIsoSp,
  resolverPeriodoDashboard,
} from "./financeiroPeriodoDashboard";

describe("financeiroPeriodoDashboard", () => {
  it("resolve dia", () => {
    const p = resolverPeriodoDashboard("dia", "2026-09-10");
    expect(p.inicioIso).toBe("2026-09-10");
    expect(p.fimIso).toBe("2026-09-10");
    expect(p.mesYmAncora).toBe("2026-09");
    expect(p.planoAlinhadoAoPeriodo).toBe(false);
  });

  it("resolve semana seg–dom e corta em hoje", () => {
    expect(inicioSemanaIsoSp("2026-09-18")).toBe("2026-09-14");
    expect(fimSemanaIsoSp("2026-09-18")).toBe("2026-09-20");
    const p = resolverPeriodoDashboard(
      "semana",
      "2026-09-16",
      new Date("2026-09-18T15:00:00-03:00"),
    );
    expect(p.inicioIso).toBe("2026-09-14");
    expect(p.fimIso).toBe("2026-09-18");
  });

  it("resolve mes civil completo", () => {
    const p = resolverPeriodoDashboard(
      "mes",
      "2026-09",
      new Date("2026-09-18T12:00:00-03:00"),
    );
    expect(p.inicioIso).toBe("2026-09-01");
    expect(p.fimIso).toBe("2026-09-30");
    expect(p.planoAlinhadoAoPeriodo).toBe(true);
  });

  it("resolve ano corrente até hoje", () => {
    const p = resolverPeriodoDashboard(
      "ano",
      "2026",
      new Date("2026-09-18T12:00:00-03:00"),
    );
    expect(p.inicioIso).toBe("2026-01-01");
    expect(p.fimIso).toBe("2026-09-18");
    expect(p.mesYmAncora).toBe("2026-09");
  });
});
