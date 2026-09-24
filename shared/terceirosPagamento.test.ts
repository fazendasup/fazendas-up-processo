import { describe, expect, it } from "vitest";
import {
  calcularPagamentoDiaTerceiro,
  dataSaidaServico,
  formatarCpf,
  normalizarCpf,
  TERCEIROS_VALOR_HORA,
  validarCpf,
} from "./terceirosPagamento";

describe("validarCpf", () => {
  it("aceita CPF válido", () => {
    expect(validarCpf("529.982.247-25")).toBe(true);
    expect(validarCpf("52998224725")).toBe(true);
  });

  it("rejeita inválidos", () => {
    expect(validarCpf("111.111.111-11")).toBe(false);
    expect(validarCpf("123")).toBe(false);
    expect(validarCpf("529.982.247-24")).toBe(false);
  });
});

describe("formatarCpf / normalizarCpf", () => {
  it("normaliza e formata", () => {
    expect(normalizarCpf("529.982.247-25")).toBe("52998224725");
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("calcularPagamentoDiaTerceiro (por hora)", () => {
  it("diária customizada R$ 116 (8h) com almoço: 116 + VT, sem alimentação", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "16:00",
      diariaBase: 116,
    });
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorHoras).toBe(116);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.valorTotal).toBe(126);
  });

  it("turno da tarde (entrada ≥ 13h): sem desconto de almoço + alimentação", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "21:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(125);
  });

  it("entrada 12h ainda sem desconto (só desconta se entrou antes das 11h)", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "12:00",
      horaSaida: "20:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(125);
  });

  it("só manhã (sai antes/às 13h): 4h pagas, sem desconto de almoço + alimentação", () => {
    // 08–12 = 4h presente, não cobriu janela 11–13 → 4h × 11.25 + VT + alim.
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "12:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(4);
    expect(r!.valorHoras).toBe(4 * TERCEIROS_VALOR_HORA);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(round2(4 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("sai exatamente às 13h: ainda sem desconto (precisa sair depois das 13h)", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "13:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(5);
  });

  it("entrou antes das 11h e saiu depois das 13h: desconta almoço", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "10:30",
      horaSaida: "13:30",
    });
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.horasPresente).toBe(3);
    expect(r!.horasTrabalhadas).toBe(2);
  });

  it("trabalhou a mais: também por hora", () => {
    // 07–17 = 10h − 1h = 9h × 11.25 + 10 = 111.25
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "17:00",
    });
    expect(r!.horasTrabalhadas).toBe(9);
    expect(r!.horasExtras).toBe(1);
    expect(r!.valorHoras).toBe(101.25);
    expect(r!.valorTotal).toBe(111.25);
  });

  it("jornada noturna: saída no dia seguinte, um VT e uma alimentação", () => {
    // 18:00 → 08:00 = 14h presente, entrada ≥ 13 → sem desconto almoço, +VT + alim.
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "18:00",
      horaSaida: "08:00",
    });
    expect(r).not.toBeNull();
    expect(r!.cruzaMeiaNoite).toBe(true);
    expect(r!.horasPresente).toBe(14);
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(14);
    expect(r!.valorValeTransporte).toBe(10);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorHoras).toBe(round2(14 * TERCEIROS_VALOR_HORA));
    expect(r!.valorTotal).toBe(round2(14 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("dataSaidaServico avança um dia quando cruza meia-noite", () => {
    expect(dataSaidaServico("2026-09-22", "18:00", "08:00")).toBe("2026-09-23");
    expect(dataSaidaServico("2026-09-22", "07:00", "16:00")).toBe("2026-09-22");
    expect(dataSaidaServico("2026-12-31", "22:00", "06:00")).toBe("2027-01-01");
  });

  it("rejeita entrada igual à saída", () => {
    expect(
      calcularPagamentoDiaTerceiro({
        horaEntrada: "08:00",
        horaSaida: "08:00",
      }),
    ).toBeNull();
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
