import { describe, expect, it } from "vitest";
import { dosesDaVariante, rotulosNoDia } from "./cicloFases14d";

describe("protocolo fases 14 dias", () => {
  it("troca a dose exata ao mudar o tanque", () => {
    expect(dosesDaVariante("310")).toMatchObject({
      h2o2: "1,0 ml",
      infinito: "20 ml",
      cercobin: "6 g",
      bio: "31 ml",
    });
    expect(dosesDaVariante("500").h2o2).toBe("1,5 ml");
    expect(dosesDaVariante("500").cercobin).toBe("10 g");
  });

  it("não sugere Infinito nem Cercobin em Mudas", () => {
    expect(rotulosNoDia("mudas", 2)).toEqual([]);
    expect(rotulosNoDia("vegetativa", 3)).toContain("Infinito");
    expect(rotulosNoDia("vegetativa", 9)).toContain("Cercobin");
    expect(rotulosNoDia("maturacao", 10)).toContain("Sem sistêmico novo");
  });
});
