import { describe, expect, it } from "vitest";
import {
  calcularLinhaProcessoIndustrial,
  calcularMaquinaReaisKg,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  modeloComumDeLinhaProcesso,
} from "./custosLinhaProcessoIndustrial";

describe("calcularLinhaProcessoIndustrial", () => {
  it("MO + máquina — lavagem automática com energia e secagem com ciclo", () => {
    const r = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_INDUSTRIAL_PADRAO, {
      clt: 28,
      pj: 18,
      misto: 22,
    });
    expect(r.processamentoMoReaisKg).toBeGreaterThan(0);
    expect(r.processamentoMaquinaReaisKg).toBeGreaterThan(0);
    expect(r.processamentoReaisKg).toBeCloseTo(
      r.processamentoMoReaisKg + r.processamentoMaquinaReaisKg,
    );
    const lav = r.etapas.find((e) => e.nome === "Lavagem");
    expect(lav?.moReaisPorKg).toBe(0);
    expect(lav?.maquinaReaisPorKg).toBeGreaterThan(0);
    const sec = r.etapas.find((e) => e.nome.startsWith("Secagem"));
    expect(sec?.moReaisPorKg).toBeGreaterThan(0);
    expect(sec?.maquinaReaisPorKg).toBeGreaterThan(0);
    const m = modeloComumDeLinhaProcesso(r);
    expect(m.lavagemReaisKg).toBe(r.processamentoReaisKg);
  });

  it("usa R$/h CLT quando regime da etapa é CLT", () => {
    const r = calcularLinhaProcessoIndustrial(
      {
        ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
        preLavagemRegimeMo: "clt",
      },
      { clt: 40, pj: 20, misto: 30 },
    );
    const pre = r.etapas.find((e) => e.nome === "Pré-lavagem");
    expect(pre?.custoHoraUsado).toBe(40);
  });

  it("calcularMaquinaReaisKg — ciclo centrífuga", () => {
    const v = calcularMaquinaReaisKg(
      {
        ativo: true,
        potenciaKw: 3,
        modoContinuo: false,
        minutosCiclo: 2,
        kgPorCiclo: 3,
        tarifaKwh: null,
        depreciacaoReaisKg: 0,
        consumiveisReaisKg: 0,
      },
      0.75,
    );
    expect(v).toBeCloseTo(3 * (2 / 60 / 3) * 0.75);
  });
});
