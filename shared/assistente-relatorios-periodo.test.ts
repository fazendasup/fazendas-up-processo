import { describe, expect, it } from "vitest";
import { parsePeriodoAssistente } from "../server/comercial/services/assistente-relatorios";

describe("parsePeriodoAssistente", () => {
  it("aceita YYYY-MM e cobre o mês inteiro em America/Sao_Paulo", () => {
    const p = parsePeriodoAssistente("2025-07", "2025-08");
    expect("error" in p).toBe(false);
    if ("error" in p) return;
    expect(p.inicioIso).toBe("2025-07-01");
    expect(p.fimIso).toBe("2025-08-31");
  });

  it("aceita YYYY-MM-DD", () => {
    const p = parsePeriodoAssistente("2025-07-15", "2025-08-10");
    expect("error" in p).toBe(false);
    if ("error" in p) return;
    expect(p.inicioIso).toBe("2025-07-15");
    expect(p.fimIso).toBe("2025-08-10");
  });

  it("rejeita intervalo invertido", () => {
    const p = parsePeriodoAssistente("2025-09", "2025-08");
    expect("error" in p).toBe(true);
  });
});
