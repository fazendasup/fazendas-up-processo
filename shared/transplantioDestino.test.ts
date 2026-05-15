import { describe, expect, it } from "vitest";
import { resolverFaseDestinoTransplantio } from "./transplantioDestino";

describe("resolverFaseDestinoTransplantio", () => {
  it("vegetativa sempre vai para maturação", () => {
    expect(
      resolverFaseDestinoTransplantio("vegetativa", { pulaVegetativa: false }),
    ).toBe("maturacao");
  });

  it("mudas: escolha explícita maturação ignora pulaVegetativa false", () => {
    expect(
      resolverFaseDestinoTransplantio("mudas", {
        pulaVegetativa: false,
        faseDestinoInformada: "maturacao",
      }),
    ).toBe("maturacao");
  });

  it("mudas: escolha explícita vegetativa mesmo com pulaVegetativa true", () => {
    expect(
      resolverFaseDestinoTransplantio("mudas", {
        pulaVegetativa: true,
        faseDestinoInformada: "vegetativa",
      }),
    ).toBe("vegetativa");
  });

  it("mudas: sem escolha, variedade que pula vegetativa → maturação", () => {
    expect(
      resolverFaseDestinoTransplantio("mudas", { pulaVegetativa: true }),
    ).toBe("maturacao");
  });

  it("mudas: sem escolha, variedade normal → vegetativa", () => {
    expect(
      resolverFaseDestinoTransplantio("mudas", { pulaVegetativa: false }),
    ).toBe("vegetativa");
  });
});
