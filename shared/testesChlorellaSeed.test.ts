import { describe, expect, it } from "vitest";
import {
  CHLORELLA_DOSE_ML_POR_L,
  doseTotalMl,
  volumePadraoFaseAlface,
  volumePadraoPrimeiraRega,
  VOLUMES_PRIMEIRA_REGA_PRE_ESCURO,
} from "./testesChlorellaSeed";

describe("testesChlorellaSeed", () => {
  it("calcula 100 ml em 500 L a 0,2 ml/L", () => {
    expect(doseTotalMl(CHLORELLA_DOSE_ML_POR_L, 500)).toBe(100);
    expect(doseTotalMl(CHLORELLA_DOSE_ML_POR_L, 310)).toBe(62);
    expect(doseTotalMl(CHLORELLA_DOSE_ML_POR_L, 50)).toBe(10);
  });

  it("define volumes padrão por fase da alface", () => {
    expect(volumePadraoFaseAlface("mudas")).toBe(50);
    expect(volumePadraoFaseAlface("vegetativa")).toBe(310);
    expect(volumePadraoFaseAlface("maturacao")).toBe(500);
  });

  it("usa 5 L ou 10 L na 1ª rega pré-escuro", () => {
    expect(VOLUMES_PRIMEIRA_REGA_PRE_ESCURO).toEqual([5, 10]);
    expect(volumePadraoPrimeiraRega()).toBe(5);
    expect(doseTotalMl(CHLORELLA_DOSE_ML_POR_L, 5)).toBe(1);
    expect(doseTotalMl(CHLORELLA_DOSE_ML_POR_L, 10)).toBe(2);
  });
});
