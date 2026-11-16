import { describe, expect, it } from "vitest";
import {
  calcularCorrecaoPh,
  calcularCorrecaoPhAcido,
  calcularCorrecaoPhKoh,
} from "./correcaoPh";

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

describe("calcularCorrecaoPhAcido", () => {
  it("doseia estoque 10% v/v para baixar pH em 500 L", () => {
    const r = calcularCorrecaoPhAcido({
      volumeCaixaL: 500,
      phAtual: 6.5,
      phAlvo: 6.0,
    });
    expect(r.precisaBase).toBe(false);
    // 500 × 0,5 × 0,05 = 12,5 mL estoque
    expect(r.mlEstoque).toBeCloseTo(12.5, 0);
    expect(r.mlConcentrado).toBeCloseTo(1.25, 1);
    expect(r.produtoGramas).toBeCloseTo(1.25 * 1.685, 1);
    expect(r.teor).toBe(0.85);
  });

  it("doseia proporcionalmente em 310 L", () => {
    const r = calcularCorrecaoPhAcido({
      volumeCaixaL: 310,
      phAtual: 6.4,
      phAlvo: 5.9,
    });
    // 310 × 0,5 × 0,05 = 7,75 ≈ 7,8 mL
    expect(r.mlEstoque).toBeCloseTo(7.8, 0);
    expect(r.quedaPh).toBeCloseTo(0.5, 2);
  });

  it("bloqueia quando alvo é maior (precisa base)", () => {
    const r = calcularCorrecaoPhAcido({
      volumeCaixaL: 500,
      phAtual: 5.5,
      phAlvo: 6.0,
    });
    expect(r.mlEstoque).toBe(0);
    expect(r.precisaBase).toBe(true);
  });
});

describe("calcularCorrecaoPh", () => {
  it("escolhe KOH para subir e ácido para baixar", () => {
    const subir = calcularCorrecaoPh({
      volumeCaixaL: 500,
      phAtual: 5.5,
      phAlvo: 6.0,
    });
    expect(subir.direcao).toBe("subir");
    expect(subir.koh?.mlEstoque).toBeGreaterThan(0);
    expect(subir.acido).toBeNull();

    const baixar = calcularCorrecaoPh({
      volumeCaixaL: 310,
      phAtual: 6.5,
      phAlvo: 6.0,
    });
    expect(baixar.direcao).toBe("baixar");
    expect(baixar.acido?.mlEstoque).toBeGreaterThan(0);
    expect(baixar.koh).toBeNull();
  });
});
