import { describe, expect, it } from "vitest";
import {
  escolherPassoDaCaixa,
  reagendarCaldasAposAplicar,
  reagendarSequenciaAposAplicar,
  type PassoCicloAgenda,
} from "./cicloSequencia";

function passo(
  id: number,
  dataInicio: string,
  extra: Partial<PassoCicloAgenda<string>> = {},
): PassoCicloAgenda<string> {
  return {
    id,
    ativo: true,
    alvo: "caixa",
    frequencia: "personalizada",
    intervaloDias: 7,
    dataInicio,
    caixaIds: ["cx"],
    execucoes: [],
    ...extra,
  };
}

describe("escolherPassoDaCaixa", () => {
  it("mostra só o primeiro da sequência e marca o atraso", () => {
    const escolhido = escolherPassoDaCaixa(
      [passo(2, "2026-09-27"), passo(1, "2026-09-25")],
      "cx",
      "2026-09-29",
    );
    expect(escolhido?.passo.id).toBe(1);
    expect(escolhido?.diasAtraso).toBe(4);
  });

  it("não sugere o passo seguinte mesmo que a data dele já tenha passado", () => {
    const escolhido = escolherPassoDaCaixa(
      [passo(1, "2026-09-25", { intervaloDias: 2 }), passo(2, "2026-09-27")],
      "cx",
      "2026-09-29",
    );
    expect(escolhido?.passo.id).toBe(1);
  });

  it("não mostra nada quando o próximo ainda é futuro", () => {
    expect(escolherPassoDaCaixa([passo(1, "2026-10-02")], "cx", "2026-09-29")).toBeNull();
  });

  it("vence hoje sem atraso", () => {
    const escolhido = escolherPassoDaCaixa([passo(1, "2026-09-29")], "cx", "2026-09-29");
    expect(escolhido?.diasAtraso).toBe(0);
  });
});

describe("reagendarSequenciaAposAplicar", () => {
  it("empurra os seguintes a partir do dia aplicado, com o intervalo original", () => {
    const passos = [passo(1, "2026-09-25"), passo(2, "2026-09-27"), passo(3, "2026-09-30")];
    const novos = reagendarSequenciaAposAplicar(passos, "cx", 1, "2026-09-29");
    expect(novos).toEqual([
      { cicloId: 2, dataAgendaYmd: "2026-10-01" },
      { cicloId: 3, dataAgendaYmd: "2026-10-04" },
    ]);
  });

  it("o passo do mesmo dia só entra depois, no próprio dia da aplicação", () => {
    const novos = reagendarSequenciaAposAplicar(
      [passo(1, "2026-09-25"), passo(2, "2026-09-25")],
      "cx",
      1,
      "2026-09-29",
    );
    expect(novos).toEqual([{ cicloId: 2, dataAgendaYmd: "2026-09-29" }]);
  });

  it("atraso do peróxido empurra bio, Infinito e Cercobin", () => {
    const novos = reagendarSequenciaAposAplicar(
      [
        passo(1, "2026-10-02", {
          nome: "Peróxido",
          produto: "H₂O₂ 200V (~50%)",
          intervaloDias: 2,
        }),
        passo(2, "2026-10-03", { nome: "Bio", produto: "Bio", intervaloDias: 2 }),
        passo(3, "2026-10-15", {
          nome: "Infinito",
          produto: "Infinito",
          frequencia: "quinzenal",
          intervaloDias: 14,
        }),
        passo(4, "2026-10-07", {
          nome: "Cercobin",
          produto: "Cercobin",
          frequencia: "quinzenal",
          intervaloDias: 14,
        }),
      ],
      "cx",
      1,
      "2026-10-05",
    );
    const porId = Object.fromEntries(novos.map((item) => [item.cicloId, item.dataAgendaYmd]));
    expect(porId[2]).toBe("2026-10-06");
    expect(porId[3]).toBe("2026-10-16");
    expect(porId[4]).toBe("2026-10-08");
  });

  it("Infinito atrasado deixa o Cercobin pelo menos 3 dias depois", () => {
    const novos = reagendarSequenciaAposAplicar(
      [
        passo(1, "2026-10-15", {
          nome: "Infinito",
          produto: "Infinito",
          frequencia: "quinzenal",
          intervaloDias: 14,
        }),
        passo(2, "2026-10-07", {
          nome: "Cercobin",
          produto: "Cercobin",
          frequencia: "quinzenal",
          intervaloDias: 14,
        }),
      ],
      "cx",
      1,
      "2026-10-20",
    );
    expect(novos).toEqual([{ cicloId: 2, dataAgendaYmd: "2026-10-23" }]);
  });
});

describe("reagendarCaldasAposAplicar", () => {
  it("calda feita dois dias depois empurra a outra calda", () => {
    const novos = reagendarCaldasAposAplicar(
      [
        {
          id: 1,
          nome: "Calda A",
          produto: "Biozenith, Nutrisolve, Magleaf",
          ativo: true,
          diasSemana: [5],
          dataInicio: "2026-09-28",
        },
        {
          id: 2,
          nome: "Calda B",
          produto: "Forticell",
          ativo: true,
          diasSemana: [1],
          dataInicio: "2026-09-28",
        },
      ],
      1,
      "2026-10-04",
    );
    expect(novos).toEqual([
      { cicloId: 2, dataInicioYmd: "2026-10-07", diasSemana: [3] },
    ]);
  });
});
