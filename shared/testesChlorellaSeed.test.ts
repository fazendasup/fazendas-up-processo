import { describe, expect, it } from "vitest";
import {
  CHLORELLA_DOSE_ML_POR_L,
  doseTotalMl,
  volumePadraoFaseAlface,
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
});
