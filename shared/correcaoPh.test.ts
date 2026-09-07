import { describe, expect, it } from "vitest";
import { calcularCorrecaoPhKoh } from "./correcaoPh";

describe("calcularCorrecaoPhKoh", () => {
  it("calcula gramas e diluição para subir pH", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 500,
      phAtual: 5.5,
      phAlvo: 6.0,
    });
    expect(r.precisaAcido).toBe(false);
    expect(r.kohGramas).toBeGreaterThan(0);
    expect(r.aguaDiluicaoMl).toBeGreaterThanOrEqual(100);
    expect(r.kohGramas).toBeCloseTo(500 * 0.5 * 0.08, 1);
  });

  it("bloqueia quando alvo é menor (precisa ácido)", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 200,
      phAtual: 6.5,
      phAlvo: 5.8,
    });
    expect(r.kohGramas).toBe(0);
    expect(r.precisaAcido).toBe(true);
  });

  it("não doseia no alvo", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 100,
      phAtual: 6.0,
      phAlvo: 6.0,
    });
    expect(r.kohGramas).toBe(0);
    expect(r.aviso).toMatch(/alvo/i);
  });
});
