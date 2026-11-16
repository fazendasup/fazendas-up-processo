import { describe, expect, it } from "vitest";

function disponivel(planejado: number, reservado: number) {
  return Math.max(0, Math.round((planejado - reservado) * 1000) / 1000);
}

describe("estoque semanal portal", () => {
  it("disponível = planejado − reservado (não negativo)", () => {
    expect(disponivel(100, 30)).toBe(70);
    expect(disponivel(10, 12)).toBe(0);
    expect(disponivel(5.5, 1.25)).toBe(4.25);
  });
});
