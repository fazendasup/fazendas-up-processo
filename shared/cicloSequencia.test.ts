import { describe, expect, it } from "vitest";
import {
  escolherPassoDaCaixa,
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
});
