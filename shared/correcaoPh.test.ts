import { describe, expect, it } from "vitest";
import { calcularCorrecaoPhKoh } from "./correcaoPh";

describe("calcularCorrecaoPhKoh", () => {
  it("indica poucos mL de estoque 100 g/L e aplica teor 85%", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 500,
      phAtual: 5.5,
      phAlvo: 6.0,
    });
    expect(r.precisaAcido).toBe(false);
    // 500 × 0,5 × 0,06 = 15 mL
    expect(r.mlEstoque).toBeCloseTo(15, 0);
    expect(r.mlEstoque).toBeLessThan(50);
    expect(r.produtoGramas).toBeCloseTo(1.5, 1);
    expect(r.kohPuroGramas).toBeCloseTo(1.5 * 0.85, 2);
    expect(r.teor).toBe(0.85);
  });

  it("bloqueia quando alvo é menor (precisa ácido)", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 200,
      phAtual: 6.5,
      phAlvo: 5.8,
    });
    expect(r.mlEstoque).toBe(0);
    expect(r.precisaAcido).toBe(true);
  });

  it("não doseia no alvo", () => {
    const r = calcularCorrecaoPhKoh({
      volumeCaixaL: 100,
      phAtual: 6.0,
      phAlvo: 6.0,
    });
    expect(r.mlEstoque).toBe(0);
    expect(r.aviso).toMatch(/alvo/i);
  });
});
