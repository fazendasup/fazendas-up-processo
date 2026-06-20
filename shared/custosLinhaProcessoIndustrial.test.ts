import { describe, expect, it } from "vitest";
import {
  calcularLinhaProcessoIndustrial,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  modeloComumDeLinhaProcesso,
} from "./custosLinhaProcessoIndustrial";

describe("calcularLinhaProcessoIndustrial", () => {
  it("converte capacidades e tempos do usuário em R$/kg e min/un", () => {
    const r = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_INDUSTRIAL_PADRAO);
    // Pré + lav: 30/(300*0.7) cada = 30/210
    expect(r.processamentoReaisKg).toBeCloseTo(30 / 210 + 30 / 210 + (30 / 60 / 3 / 60) * 30 + (2 / 3 / 60) * 30);
    expect(r.desfolhagemMinPorUn).toBeCloseTo(0.5);
    expect(r.embalagemSelagemMinPorUn).toBeCloseTo(3.5);
    const m = modeloComumDeLinhaProcesso(r);
    expect(m.lavagemReaisKg).toBe(r.processamentoReaisKg);
    expect(m.corteMinutosUn).toBeCloseTo(0.5);
    expect(m.embalagemMinutosUn).toBeCloseTo(3.5);
  });
});
