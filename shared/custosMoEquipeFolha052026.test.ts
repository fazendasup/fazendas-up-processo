import { describe, expect, it } from "vitest";
import { colaboradoresFolha052026, FOLHA_REFERENCIA } from "./custosMoEquipeFolha052026";
import { calcularEquipeCompleta, somarMoOverheadEquipes } from "./custosMoEquipe";

describe("colaboradoresFolha052026", () => {
  it("contém 6 colaboradores da folha ref. 05/2026", () => {
    const cols = colaboradoresFolha052026();
    expect(cols).toHaveLength(6);
    expect(FOLHA_REFERENCIA).toBe("05/2026");
  });

  it("custo empregador CLT = proventos + FGTS e bate total da folha", () => {
    const cols = colaboradoresFolha052026();
    const totalEmpregador = cols.reduce(
      (s, c) => s + (calcularEquipeCompleta(c).custoMensalEfetivo ?? 0),
      0,
    );
    expect(totalEmpregador).toBeCloseTo(38830.92, 2);
    expect(cols.filter((c) => c.regime === "prolabore")).toHaveLength(2);
    expect(cols.filter((c) => c.finalidade === "processamento")).toHaveLength(2);
  });

  it("overhead inclui gestão, liderança e pró-labore", () => {
    const overhead = somarMoOverheadEquipes(colaboradoresFolha052026());
    expect(overhead).toBeCloseTo(30755.64, 2);
  });
});
