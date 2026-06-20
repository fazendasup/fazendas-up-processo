import { describe, expect, it } from "vitest";
import {
  calcularCustoMensalEquipe,
  calcularEquipeCompleta,
  custoMoPorMinutos,
  mapaCustoHoraProcessamento,
  somarMoOverheadEquipes,
} from "./custosMoEquipe";

describe("custosMoEquipe", () => {
  it("CLT aplica encargos sobre base", () => {
    expect(
      calcularCustoMensalEquipe({
        nome: "CLT",
        regime: "clt",
        finalidade: "processamento",
        numPessoas: 2,
        horasMes: 352,
        custoMensalBase: 10000,
        encargosPct: 80,
      }),
    ).toBe(18000);
  });

  it("PJ usa custo mensal total", () => {
    const e = calcularEquipeCompleta({
      nome: "PJ",
      regime: "pj",
      finalidade: "processamento",
      numPessoas: 1,
      horasMes: 160,
      custoMensalTotal: 12000,
    });
    expect(e.custoHora).toBe(75);
  });

  it("mapa separa CLT e PJ e calcula MO por minutos", () => {
    const mapa = mapaCustoHoraProcessamento([
      {
        nome: "CLT proc",
        regime: "clt",
        finalidade: "processamento",
        numPessoas: 1,
        horasMes: 100,
        custoMensalTotal: 5000,
      },
      {
        nome: "PJ proc",
        regime: "pj",
        finalidade: "processamento",
        numPessoas: 1,
        horasMes: 100,
        custoMensalTotal: 8000,
      },
    ]);
    expect(mapa.clt).toBe(50);
    expect(mapa.pj).toBe(80);
    expect(custoMoPorMinutos(6, "clt", mapa)).toBe(5);
    expect(custoMoPorMinutos(6, "pj", mapa)).toBe(8);
  });

  it("soma overhead fixo de equipes", () => {
    expect(
      somarMoOverheadEquipes([
        {
          nome: "Supervisor CLT",
          regime: "clt",
          finalidade: "overhead",
          numPessoas: 1,
          horasMes: 176,
          custoMensalTotal: 9000,
        },
        {
          nome: "Proc",
          regime: "pj",
          finalidade: "processamento",
          numPessoas: 1,
          horasMes: 160,
          custoMensalTotal: 10000,
        },
      ]),
    ).toBe(9000);
  });

  it("modo liquido usa liquidoMensal e fallback para empregador", () => {
    const equipe = {
      nome: "CLT",
      regime: "clt" as const,
      finalidade: "processamento" as const,
      numPessoas: 1,
      horasMes: 100,
      custoMensalTotal: 5000,
      liquidoMensal: 3800,
    };
    expect(calcularCustoMensalEquipe(equipe, "empregador")).toBe(5000);
    expect(calcularCustoMensalEquipe(equipe, "liquido")).toBe(3800);
    expect(calcularEquipeCompleta(equipe, "liquido").custoHora).toBe(38);

    const semLiquido = { ...equipe, liquidoMensal: null };
    expect(calcularCustoMensalEquipe(semLiquido, "liquido")).toBe(5000);
  });

  it("mapa e overhead respeitam modo liquido", () => {
    const equipes = [
      {
        nome: "Overhead",
        regime: "clt" as const,
        finalidade: "overhead" as const,
        numPessoas: 1,
        horasMes: 0,
        custoMensalTotal: 9000,
        liquidoMensal: 6500,
      },
      {
        nome: "Proc",
        regime: "pj" as const,
        finalidade: "processamento" as const,
        numPessoas: 1,
        horasMes: 100,
        custoMensalTotal: 8000,
        liquidoMensal: 6000,
      },
    ];
    expect(somarMoOverheadEquipes(equipes, "liquido")).toBe(6500);
    expect(mapaCustoHoraProcessamento(equipes, "liquido").pj).toBe(60);
  });
});
