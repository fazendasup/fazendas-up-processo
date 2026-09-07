import { describe, expect, it } from "vitest";
import {
  RECEITA_AB_PADRAO,
  calcularCorrecaoEc,
  concentracaoGalaoGL,
  potenciaEcPorMlPorLitro,
} from "./correcaoEc";

describe("correcaoEc", () => {
  it("calcula concentração dos galões A/B", () => {
    const a = concentracaoGalaoGL(RECEITA_AB_PADRAO.galaoA, 50);
    const b = concentracaoGalaoGL(RECEITA_AB_PADRAO.galaoB, 50);
    expect(a).toBeCloseTo(235.16, 1);
    expect(b).toBeCloseTo(130.8, 1);
  });

  it("estima potência > 0", () => {
    expect(potenciaEcPorMlPorLitro(RECEITA_AB_PADRAO)).toBeGreaterThan(0.3);
    expect(potenciaEcPorMlPorLitro(RECEITA_AB_PADRAO)).toBeLessThan(0.7);
  });

  it("sobe EC com volumes iguais de A e B", () => {
    const r = calcularCorrecaoEc({
      volumeCaixaL: 1000,
      ecAtual: 1.2,
      ecAlvo: 1.5,
    });
    expect(r.aviso).toBeNull();
    expect(r.mlA).toBeGreaterThan(0);
    expect(r.mlA).toBe(r.mlB);
    expect(r.sais.length).toBe(6);
  });

  it("sugere diluição quando EC alvo < atual", () => {
    const r = calcularCorrecaoEc({
      volumeCaixaL: 100,
      ecAtual: 2.0,
      ecAlvo: 1.0,
    });
    expect(r.mlA).toBe(0);
    expect(r.diluirComAguaL).toBeCloseTo(100, 0);
  });

  it("não doseia quando já no alvo", () => {
    const r = calcularCorrecaoEc({
      volumeCaixaL: 200,
      ecAtual: 1.4,
      ecAlvo: 1.4,
    });
    expect(r.mlA).toBe(0);
    expect(r.aviso).toMatch(/alvo/i);
  });
});
