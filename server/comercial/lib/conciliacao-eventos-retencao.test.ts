import { describe, expect, it } from "vitest";
import { isErroTabelaConciliacaoEventosCheia } from "./conciliacao-eventos-retencao.js";

describe("isErroTabelaConciliacaoEventosCheia", () => {
  it("detecta erro MySQL 1114 table is full", () => {
    expect(
      isErroTabelaConciliacaoEventosCheia(
        new Error(
          "The table 'pedidos_conciliacao_eventos' is full",
        ),
      ),
    ).toBe(true);
    expect(isErroTabelaConciliacaoEventosCheia({ code: 1114 })).toBe(false);
    expect(isErroTabelaConciliacaoEventosCheia(new Error("outro erro"))).toBe(false);
  });
});
