import { describe, expect, it } from "vitest";
import {
  contarPlantasMudasFv,
  perfisMudasParaLiberar,
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
});
