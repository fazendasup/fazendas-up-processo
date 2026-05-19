import { describe, expect, it } from "vitest";
import {
  contarPlantasMudasFv,
  multiplicadorPlantioBabyLeafFV,
  perfisMudasParaLiberar,
  plantasPorAndarFvComFuros,
  PLANTAS_POR_PERFIL_FV,
} from "./plantasPorPerfil";

describe("plantasPorPerfil mudas", () => {
  it("12 perfis ativos = 720 plantas com densidade 60", () => {
    expect(contarPlantasMudasFv(12, PLANTAS_POR_PERFIL_FV.mudas)).toBe(720);
  });

  it("libera perfis inteiros ao transplantar plantas", () => {
    expect(perfisMudasParaLiberar(720, 60)).toBe(12);
    expect(perfisMudasParaLiberar(61, 60)).toBe(2);
    expect(perfisMudasParaLiberar(60, 60)).toBe(1);
  });

  it("baby leaf usa 2 células por furo em veg/mat", () => {
    expect(multiplicadorPlantioBabyLeafFV(true)).toBe(2);
    expect(multiplicadorPlantioBabyLeafFV(false)).toBe(1);
    expect(plantasPorAndarFvComFuros({ perfis: 12, furosPorPerfil: 6 }, 2)).toBe(144);
  });
});
