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
    expect(r.processamentoReaisKg).toBeCloseTo(
      r.processamentoMoReaisKg +
        r.processamentoMaquinaReaisKg +
        r.processamentoConsumiveisReaisKg,
    );
    const lav = r.etapas.find((e) => e.nome === "Lavagem");
    expect(lav?.moReaisPorKg).toBe(0);
    expect(lav?.maquinaReaisPorKg).toBeGreaterThan(0);
  });

  it("equipe_linha: mesmo operador na sequência — MO soma tempos, pessoas aplicadas uma vez", () => {
    const base = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    const duas = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      modoPessoasProcessamento: "equipe_linha",
      pessoasLinhaProcessamento: 2,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    expect(duas.processamentoMoReaisKg).toBeCloseTo(base.processamentoMoReaisKg * 2);
  });

  it("consumíveis entram em pré-lavagem e enxague", () => {
    const r = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      preLavagemConsumiveisReaisKg: 0.05,
      enxagueConsumiveisReaisKg: 0.03,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    expect(r.processamentoConsumiveisReaisKg).toBeCloseTo(0.08);
    const pre = r.etapas.find((e) => e.nome === "Pré-lavagem");
    expect(pre?.consumiveisReaisPorKg).toBeCloseTo(0.05);
    const m = modeloComumDeLinhaProcesso(r);
    expect(m.lavagemReaisKg).toBe(r.processamentoReaisKg);
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
