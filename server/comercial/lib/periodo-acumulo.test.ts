import { describe, expect, it } from "vitest";
import {
  isoDataCivil,
  periodoAcumuloContendo,
} from "./periodo-acumulo";

describe("periodoAcumuloContendo", () => {
  it("bloco 1–15 e 16–30 em mês de 31 dias", () => {
    const a = periodoAcumuloContendo(new Date(2026, 6, 3), 15);
    expect(isoDataCivil(a.inicio)).toBe("2026-07-01");
    expect(isoDataCivil(a.fim)).toBe("2026-07-15");
    expect(a.ehUltimoDiaDoPeriodo).toBe(false);

    const b = periodoAcumuloContendo(new Date(2026, 6, 15), 15);
    expect(b.ehUltimoDiaDoPeriodo).toBe(true);

    const c = periodoAcumuloContendo(new Date(2026, 6, 20), 15);
    expect(isoDataCivil(c.inicio)).toBe("2026-07-16");
    expect(isoDataCivil(c.fim)).toBe("2026-07-30");

    const d = periodoAcumuloContendo(new Date(2026, 6, 31), 15);
    expect(isoDataCivil(d.inicio)).toBe("2026-07-31");
    expect(isoDataCivil(d.fim)).toBe("2026-07-31");
    expect(d.ehUltimoDiaDoPeriodo).toBe(true);
  });
});
