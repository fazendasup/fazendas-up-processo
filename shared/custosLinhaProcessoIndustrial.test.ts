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

  it("mesmo operador em duas etapas — MO soma tempos, sem multiplicar pessoas", () => {
    const base = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    const umOp = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      preLavagemOperadorIds: ["1"],
      enxagueOperadorIds: ["1"],
      secagemOperadorIds: ["2"],
      operadores: [
        { id: "1", nome: "Maria", regimeMo: "qualquer" },
        { id: "2", nome: "João", regimeMo: "qualquer" },
      ],
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    const pre = umOp.etapas.find((e) => e.nome === "Pré-lavagem");
    const enx = umOp.etapas.find((e) => e.nome === "Enxague");
    expect(pre?.operadorIds).toEqual(["1"]);
    expect(enx?.operadorIds).toEqual(["1"]);
    expect(umOp.resumoCapacidade.operadores.find((o) => o.id === "1")?.etapas.length).toBeGreaterThan(1);
    expect(umOp.processamentoMoReaisKg).toBeGreaterThan(0);
    expect(umOp.processamentoMoReaisKg).toBeCloseTo(base.processamentoMoReaisKg, 1);
  });

  it("dois operadores na mesma etapa — MO dobra (paralelo)", () => {
    const base = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    const duas = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      preLavagemOperadorIds: ["1", "2"],
      operadores: [
        { id: "1", nome: "Maria", regimeMo: "qualquer" },
        { id: "2", nome: "João", regimeMo: "qualquer" },
      ],
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    const preBase = base.etapas.find((e) => e.nome === "Pré-lavagem")?.moReaisPorKg ?? 0;
    const preDuas = duas.etapas.find((e) => e.nome === "Pré-lavagem")?.moReaisPorKg ?? 0;
    expect(preDuas).toBeCloseTo(preBase * 2);
    expect(duas.processamentoMoReaisKg).toBeCloseTo(base.processamentoMoReaisKg + preBase);
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

  it("resumo capacidade: operador gargalo", () => {
    const r = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    expect(r.resumoCapacidade.minMoPorKgLinha).toBeGreaterThan(0);
    expect(r.resumoCapacidade.operadorGargalo).toBeTruthy();
    expect(r.resumoCapacidade.kgHoraMaxMo).toBeGreaterThan(0);
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
