import { describe, expect, it } from "vitest";
import {
  GO_LIVE_PEDIDOS,
  inicioSemana,
  intervaloSemanaAnterior,
  semanaAnteriorInicio,
} from "./semana.js";

describe("intervaloSemanaAnterior", () => {
  it("retorna a semana imediatamente anterior", () => {
    const ref = new Date(2026, 5, 16, 12, 0, 0, 0); // terça 16/06
    const { inicio, fim } = intervaloSemanaAnterior(ref);
    expect(inicio.getDate()).toBe(8);
    expect(inicio.getMonth()).toBe(5);
    expect(fim.getDate()).toBe(14);
  });
});

describe("semanaAnteriorInicio", () => {
  it("volta exatamente 7 dias a partir da segunda da semana alvo", () => {
    const alvo = inicioSemana(new Date(2026, 5, 16));
    expect(semanaAnteriorInicio(alvo).getTime()).toBe(
      inicioSemana(GO_LIVE_PEDIDOS).getTime() + 7 * 86_400_000,
    );
  });
});
