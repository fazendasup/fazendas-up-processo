import { describe, expect, it } from "vitest";
import {
  calcularLinhaProcessoIndustrial,
  calcularMaquinaReaisKg,
  calcularMaquinaReaisUn,
  LINHA_PROCESSO_FLORES_PADRAO,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  LINHA_PROCESSO_MICROVERDES_PADRAO,
  linhaPresetParaFamilia,
  modeloComumDeLinhaProcesso,
} from "./custosLinhaProcessoIndustrial";

describe("calcularMaquinaReaisKg", () => {
  it("modo contínuo usa horas (não minutos) — evita inflar energia ~60×", () => {
    // 8 kW · 210 kg/h · R$ 0,75/kWh → 8 × (1/210) × 0,75 ≈ R$ 0,0286/kg
    const energia = calcularMaquinaReaisKg(
      {
        ativo: true,
        potenciaKw: 8,
        modoContinuo: true,
        minutosCiclo: 0,
        kgPorCiclo: 1,
        tarifaKwh: 0.75,
        depreciacaoReaisKg: 0,
        consumiveisReaisKg: 0,
      },
      0.75,
      210,
    );
    expect(energia).toBeCloseTo(8 / 210 * 0.75, 4);
    expect(energia).toBeLessThan(0.05);
  });

  it("modo ciclo: 4 min / 3 kg · 3 kW · R$ 0,75 → R$ 0,05/kg", () => {
    const energia = calcularMaquinaReaisKg(
      {
        ativo: true,
        potenciaKw: 3,
        modoContinuo: false,
        minutosCiclo: 4,
        kgPorCiclo: 3,
        tarifaKwh: 0.75,
        depreciacaoReaisKg: 0,
        consumiveisReaisKg: 0,
      },
      0.75,
    );
    expect(energia).toBeCloseTo(0.05, 4);
  });

  it("seladora: energia por unidade", () => {
    const v = calcularMaquinaReaisUn(
      {
        ativo: true,
        potenciaKw: 2,
        modoContinuo: false,
        minutosCiclo: 0,
        kgPorCiclo: 1,
        tarifaKwh: 0.89,
        depreciacaoReaisKg: 0,
        consumiveisReaisKg: 0,
      },
      0.89,
      0.75,
    );
    expect(v).toBeCloseTo(2 * (0.75 / 60) * 0.89, 4);
  });
});

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
    expect(m.lavagemReaisKg).toBe(r.processamentoLinhaMolhadaReaisKg);
    expect(m.lavagemReaisKg).toBeCloseTo(
      r.processamentoMoReaisKg +
        r.processamentoMaquinaReaisKg +
        r.processamentoConsumiveisReaisKg,
    );
  });

  it("kgPorUnidadeRef > 0: lavagemReaisKg só linha molhada; total inclui emb convertida", () => {
    const r = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      kgPorUnidadeRef: 0.12,
      lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
      secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
    });
    expect(r.processamentoLinhaMolhadaReaisKg).toBeGreaterThan(0);
    expect(r.processamentoReaisKg).toBeGreaterThan(r.processamentoLinhaMolhadaReaisKg);
    // MO por kg nunca some do total quando há kgRef
    const moPorKg = r.etapas
      .filter((e) => e.modo === "por_kg")
      .reduce((s, e) => s + (e.moReaisPorKg ?? 0), 0);
    expect(r.processamentoReaisKg).toBeCloseTo(
      moPorKg +
        r.processamentoMaquinaReaisKg +
        r.processamentoConsumiveisReaisKg +
        r.processamentoReaisUn / 0.12,
    );
    const m = modeloComumDeLinhaProcesso(r);
    expect(m.lavagemReaisKg).toBe(r.processamentoLinhaMolhadaReaisKg);
    expect(m.lavagemReaisKg).toBeLessThan(r.processamentoReaisKg);
    // embalagem em homem-min (não misturada em lavagem)
    expect(m.embalagemMinutosUn).toBe(r.embalagemSelagemMinPorUn);
  });

  it("dois ops na embalagem → homem-minutos dobram no modelo comum", () => {
    const uma = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      embalagemOperadorIds: ["1"],
    });
    const duas = calcularLinhaProcessoIndustrial({
      ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
      embalagemOperadorIds: ["1", "2"],
      operadores: [
        { id: "1", nome: "A", regimeMo: "qualquer" },
        { id: "2", nome: "B", regimeMo: "qualquer" },
      ],
    });
    const m1 = modeloComumDeLinhaProcesso(uma);
    const m2 = modeloComumDeLinhaProcesso(duas);
    expect(m2.embalagemMinutosUn).toBeCloseTo(
      m1.embalagemMinutosUn + LINHA_PROCESSO_INDUSTRIAL_PADRAO.embalagemMinPorUn,
    );
  });

  it("pré-lavagem e seladora contabilizam energia de máquina", () => {
    const r = calcularLinhaProcessoIndustrial(
      {
        ...LINHA_PROCESSO_INDUSTRIAL_PADRAO,
        preLavagemKgHora: 18,
        preLavagemEficienciaPct: 80,
        preLavagemMaquina: {
          ativo: true,
          potenciaKw: 1.5,
          modoContinuo: true,
          minutosCiclo: 0,
          kgPorCiclo: 1,
          tarifaKwh: 0.89,
          depreciacaoReaisKg: 0,
          consumiveisReaisKg: 0,
        },
        lavagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.lavagemMaquina, ativo: false },
        secagemMaquina: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO.secagemMaquina, ativo: false },
        selagemMinPorCiclo: 3,
        selagemUnPorCiclo: 4,
        selagemMaquina: {
          ativo: true,
          potenciaKw: 2,
          modoContinuo: false,
          minutosCiclo: 0,
          kgPorCiclo: 1,
          tarifaKwh: 0.89,
          depreciacaoReaisKg: 0,
          consumiveisReaisKg: 0,
        },
      },
      { clt: 16, pj: 16, misto: 16 },
    );
    const pre = r.etapas.find((e) => e.nome === "Pré-lavagem");
    // 1.5 kW × (1/14.4) h × 0.89 ≈ 0.0927
    expect(pre?.maquinaReaisPorKg).toBeCloseTo(1.5 / 14.4 * 0.89, 3);
    const sel = r.etapas.find((e) => e.nome === "Selagem");
    // 2 kW × (0.75/60) h × 0.89 ≈ 0.02225
    expect(sel?.maquinaReaisPorUn).toBeCloseTo(2 * (0.75 / 60) * 0.89, 3);
    expect(sel?.reaisPorUn).toBeGreaterThan(sel?.moReaisPorUn ?? 0);
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

  it("preset microverdes — colheita + embalagem, sem lavagem", () => {
    const r = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_MICROVERDES_PADRAO, {
      clt: 28,
      pj: 18,
      misto: 22,
    });
    expect(r.etapas.map((e) => e.nome)).toEqual(["Colheita", "Embalagem"]);
    const col = r.etapas.find((e) => e.nome === "Colheita");
    expect(col?.reaisPorUn).toBeGreaterThan(0);
    expect(col?.minPorUn).toBe(1.5);
    expect(r.processamentoMaquinaReaisKg).toBe(0);
    expect(r.processamentoConsumiveisReaisKg).toBe(0);
    expect(r.processamentoMoReaisUn).toBeGreaterThan(0);
    expect(r.processamentoMoReaisKg).toBeGreaterThan(0);
    expect(r.alertas).toEqual([]);
  });

  it("linhaPresetParaFamilia aplica defaults microverdes", () => {
    const linha = linhaPresetParaFamilia("microverdes", LINHA_PROCESSO_INDUSTRIAL_PADRAO);
    expect(linha.colheitaMinPorUn).toBe(1.5);
    expect(linha.desfolhagemSegPorPe).toBe(0);
    expect(linha.lavagemMaquina.ativo).toBe(false);
  });

  it("preset flores — seleção + embalagem, sem lavagem/secagem/desfolhagem", () => {
    const r = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_FLORES_PADRAO, {
      clt: 28,
      pj: 18,
      misto: 22,
    });
    expect(r.etapas.map((e) => e.nome)).toEqual(["Seleção", "Embalagem"]);
    const sel = r.etapas.find((e) => e.nome === "Seleção");
    expect(sel?.reaisPorUn).toBeGreaterThan(0);
    expect(sel?.minPorUn).toBe(2);
    expect(r.processamentoMaquinaReaisKg).toBe(0);
    expect(r.processamentoConsumiveisReaisKg).toBe(0);
    expect(r.alertas).toEqual([]);
  });

  it("linhaPresetParaFamilia aplica defaults flores com rótulo Seleção", () => {
    const linha = linhaPresetParaFamilia("flores", LINHA_PROCESSO_INDUSTRIAL_PADRAO);
    expect(linha.rotuloEtapaColheita).toBe("Seleção");
    expect(linha.colheitaMinPorUn).toBe(2);
    expect(linha.desfolhagemSegPorPe).toBe(0);
    expect(linha.lavagemMaquina.ativo).toBe(false);
    expect(linha.secagemMaquina.ativo).toBe(false);
  });
});
