import { describe, expect, it } from "vitest";
import { isPlanoAtrasado, marcoAtualDoPlano } from "./planosPlantioOperacao";

function plano(status: string, datas: Partial<Record<string, string>> = {}) {
  return {
    status,
    dataInicioGerminacao: datas.germ ?? "2026-10-01",
    dataTransplantioMudas: datas.mudas ?? "2026-10-06",
    dataTransplantioVeg: datas.veg ?? "2026-10-20",
    dataTransplantioMat: datas.mat ?? "2026-11-10",
    dataColheitaPrevista: datas.colheita ?? "2026-12-08",
  };
}

const hoje = new Date(2026, 9, 11, 12, 0, 0);

describe("marcoAtualDoPlano", () => {
  it("lote planejado mostra só a germinação", () => {
    const marco = marcoAtualDoPlano(plano("planejado", { germ: "2026-10-15" }), hoje);
    expect(marco).toEqual({ tipo: "germinacao", ymd: "2026-10-15", atrasado: false });
  });

  it("germinação vencida fica em atraso", () => {
    const marco = marcoAtualDoPlano(plano("planejado", { germ: "2026-10-08" }), hoje);
    expect(marco?.tipo).toBe("germinacao");
    expect(marco?.atrasado).toBe(true);
    expect(isPlanoAtrasado(plano("planejado", { germ: "2026-10-08" }), hoje.getTime())).toBe(true);
  });

  it("em germinação o passo é o transplantio para mudas", () => {
    const marco = marcoAtualDoPlano(plano("em_germinacao", { mudas: "2026-10-09" }), hoje);
    expect(marco).toMatchObject({ tipo: "mudas", atrasado: true });
  });

  it("em produção segura a vegetativa vencida até a data da maturação", () => {
    const marco = marcoAtualDoPlano(
      plano("em_producao", { veg: "2026-10-08", mat: "2026-10-25" }),
      hoje,
    );
    expect(marco).toMatchObject({ tipo: "veg", atrasado: true });
  });

  it("em produção mostra a vegetativa futura quando ela ainda não venceu", () => {
    const marco = marcoAtualDoPlano(plano("em_producao", { veg: "2026-10-18" }), hoje);
    expect(marco).toEqual({ tipo: "veg", ymd: "2026-10-18", atrasado: false });
  });

  it("colhido sai do cronograma", () => {
    expect(marcoAtualDoPlano(plano("colhido"), hoje)).toBeNull();
    expect(isPlanoAtrasado(plano("colhido", { colheita: "2026-10-01" }), hoje.getTime())).toBe(false);
  });
});
