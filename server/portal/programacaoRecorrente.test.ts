import { describe, expect, it } from "vitest";
import { ocorrenciasDaProgramacao, proximasDatasDoDia, validarProgramacao } from "./programacaoRecorrente";

const manaus = new Date("2026-10-12T16:00:00.000Z");

describe("programação recorrente", () => {
  it("exige dia útil e produto em cada dia, com cardápios independentes", () => {
    expect(validarProgramacao([])).toMatch(/ao menos um dia/);
    expect(validarProgramacao([{ diaSemana: 0, itens: [{ produtoId: "a", quantidade: 1 }] }])).toMatch(/segunda a sexta/);
    expect(validarProgramacao([{ diaSemana: 1, itens: [] }])).toMatch(/ao menos um produto/);
    expect(
      validarProgramacao([
        { diaSemana: 1, itens: [{ produtoId: "a", quantidade: 1 }] },
        { diaSemana: 1, itens: [{ produtoId: "b", quantidade: 1 }] },
      ]),
    ).toMatch(/uma vez/);
    expect(
      validarProgramacao([
        {
          diaSemana: 2,
          itens: [
            { produtoId: "a", quantidade: 2 },
            { produtoId: "a", quantidade: 1 },
          ],
        },
      ]),
    ).toMatch(/mesmo produto/);
    expect(
      validarProgramacao([
        { diaSemana: 1, itens: [{ produtoId: "alface", quantidade: 4 }] },
        { diaSemana: 4, itens: [{ produtoId: "rucula", quantidade: 2 }] },
      ]),
    ).toBeNull();
  });

  it("repete o dia na semana seguinte e pula feriado", () => {
    expect(proximasDatasDoDia(1, manaus, 2)).toEqual(["2026-10-19", "2026-10-26"]);
    expect(proximasDatasDoDia(5, manaus, 1)).toEqual(["2026-10-16"]);
    const datas = ocorrenciasDaProgramacao([1, 5], manaus, 1).map((item) => item.data);
    expect(datas).toEqual(["2026-10-16", "2026-10-19"]);
  });
});
