import { describe, expect, it } from "vitest";
import { fmtDataEntrega, isoDataEntrega } from "./dataEntrega";

describe("isoDataEntrega", () => {
  it("mantém o dia UTC mesmo com o relógio do navegador atrás", () => {
    expect(isoDataEntrega("2026-09-30T00:00:00.000Z")).toBe("2026-09-30");
    expect(fmtDataEntrega("2026-09-30T00:00:00.000Z")).toBe("30/09");
  });

  it("não recua o dia no fuso do navegador", () => {
    const d = new Date("2026-09-30T00:00:00.000Z");
    expect(isoDataEntrega(d)).toBe("2026-09-30");
    if (d.getTimezoneOffset() > 0) expect(d.getDate()).toBe(29);
  });

  it("lê a data civil de um texto sem fuso", () => {
    expect(isoDataEntrega("2026-09-30T12:00:00")).toBe("2026-09-30");
    expect(fmtDataEntrega("2026-09-30T12:00:00")).toBe("30/09");
  });
});
