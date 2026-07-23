import { describe, expect, it } from "vitest";
import { formatDecimalForInput, parseOptDecimal } from "./decimalInput";

describe("parseOptDecimal", () => {
  it("aceita vírgula brasileira sem virar dezenas", () => {
    expect(parseOptDecimal("4,20")).toBeCloseTo(4.2);
    expect(parseOptDecimal("4,2")).toBeCloseTo(4.2);
    expect(parseOptDecimal("0,10")).toBeCloseTo(0.1);
  });

  it("aceita ponto e milhar pt-BR", () => {
    expect(parseOptDecimal("4.20")).toBeCloseTo(4.2);
    expect(parseOptDecimal("1.234,56")).toBeCloseTo(1234.56);
  });

  it("não interpreta 4,20 como 42", () => {
    expect(parseOptDecimal("4,20")).not.toBe(42);
    expect(parseOptDecimal("4,20")).toBeLessThan(5);
  });
});

describe("formatDecimalForInput", () => {
  it("formata sem agrupamento de milhar", () => {
    expect(formatDecimalForInput(4.2)).toBe("4,2");
    expect(formatDecimalForInput(1234.5)).toBe("1234,5");
  });
});
