import { describe, expect, it } from "vitest";
import { dateKeyLocal, eventosPorDia, type PlanoRow } from "./planejamentoCalendario";

function plano(parcial: Partial<PlanoRow> & Pick<PlanoRow, "id" | "status">): PlanoRow {
  return {
    variedadeNome: "Alface",
    quantidadePlantas: 100,
    dataInicioGerminacao: "2026-10-20",
    dataTransplantioMudas: "2026-10-25",
    dataTransplantioVeg: "2026-11-08",
    dataTransplantioMat: "2026-11-29",
    dataColheitaPrevista: "2026-12-27",
    ...parcial,
  };
}

describe("eventosPorDia somenteProximoMarco", () => {
  it("mostra só a germinação futura e esconde os marcos seguintes", () => {
    const map = eventosPorDia([plano({ id: 1, status: "planejado" })], { somenteProximoMarco: true });
    const dias = [...map.keys()];
    expect(dias).toEqual(["2026-10-20"]);
    expect(map.get("2026-10-20")?.map((e) => e.tipo)).toEqual(["germinacao"]);
  });

  it("lote atrasado aparece no dia de hoje", () => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const map = eventosPorDia(
      [plano({ id: 2, status: "planejado", dataInicioGerminacao: "2026-01-02" })],
      { somenteProximoMarco: true },
    );
    const hojeKey = dateKeyLocal(hoje);
    expect(map.get(hojeKey)?.[0]?.atrasado).toBe(true);
    expect(map.get(hojeKey)?.[0]?.rotulo.startsWith("Em atraso")).toBe(true);
  });
});
