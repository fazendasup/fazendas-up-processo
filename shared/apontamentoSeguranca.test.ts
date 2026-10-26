import { describe, expect, it } from "vitest";
import { avaliarApontamentoRaiz, temBloqueio } from "./apontamentoSeguranca";

describe("avaliarApontamentoRaiz", () => {
  it("bloqueia Infinito no mesmo dia do Thyper", () => {
    const alertas = avaliarApontamentoRaiz({
      produto: "Infinito",
      hojeYmd: "2026-10-26",
      ultimasNaCaixa: { thyper: "2026-10-26" },
    });
    expect(temBloqueio(alertas)).toBe(true);
    expect(alertas[0]?.mensagem).toMatch(/Thyper/);
  });

  it("avisa Cercobin antes da folga de 3 dias após Infinito", () => {
    const alertas = avaliarApontamentoRaiz({
      produto: "Cercobin",
      hojeYmd: "2026-10-26",
      ultimasNaCaixa: { infinito: "2026-10-24" },
    });
    expect(temBloqueio(alertas)).toBe(false);
    expect(alertas.some((a) => a.mensagem.includes("Infinito"))).toBe(true);
  });

  it("avisa Cercobin com Infinito carregado do lote", () => {
    const alertas = avaliarApontamentoRaiz({
      produto: "Cercobin",
      hojeYmd: "2026-10-26",
      ultimasNaCaixa: {},
      infinitoCarregadoLoteYmd: "2026-10-25",
    });
    expect(alertas.some((a) => a.mensagem.includes("Lote"))).toBe(true);
  });

  it("libera quando a folga já passou", () => {
    const alertas = avaliarApontamentoRaiz({
      produto: "Infinito",
      hojeYmd: "2026-10-26",
      ultimasNaCaixa: { thyper: "2026-10-24", infinito: "2026-10-10" },
    });
    expect(alertas).toEqual([]);
  });
});
