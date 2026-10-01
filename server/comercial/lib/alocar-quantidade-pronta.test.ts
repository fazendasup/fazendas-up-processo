import { describe, expect, it } from "vitest";
import { alocarQuantidadePronta } from "./alocar-quantidade-pronta";

describe("alocarQuantidadePronta", () => {
  const linhas = [
    { id: "a", quantidade: 20 },
    { id: "b", quantidade: 20 },
    { id: "c", quantidade: 20 },
    { id: "d", quantidade: 10 },
  ];

  it("preenche os primeiros clientes da ordem até a quantidade digitada", () => {
    expect(alocarQuantidadePronta(linhas, 45)).toEqual([
      { id: "a", quantidadePronta: 20, pronto: true },
      { id: "b", quantidadePronta: 20, pronto: true },
      { id: "c", quantidadePronta: 5, pronto: false },
      { id: "d", quantidadePronta: 0, pronto: false },
    ]);
  });

  it("marca todas as linhas quando a quantidade cobre o total", () => {
    const alocado = alocarQuantidadePronta(linhas, 70);
    expect(alocado.every(linha => linha.pronto)).toBe(true);
    expect(alocado.reduce((s, l) => s + l.quantidadePronta, 0)).toBe(70);
  });

  it("zera tudo quando a quantidade é zero e limita ao total", () => {
    expect(alocarQuantidadePronta(linhas, 0).every(l => l.quantidadePronta === 0)).toBe(
      true,
    );
    const acima = alocarQuantidadePronta(linhas, 999);
    expect(acima.reduce((s, l) => s + l.quantidadePronta, 0)).toBe(70);
    expect(acima.at(-1)?.pronto).toBe(true);
  });
});
