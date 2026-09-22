import { describe, expect, it } from "vitest";
import {
  calcularPagamentoDiaTerceiro,
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
  it("jornada cheia com almoço: 8h × (90/8) + VT", () => {
    // 07–16 = 9h presente − 1h almoço = 8h → 90 + 10
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "16:00",
    });
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorHoras).toBe(90);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.valorTotal).toBe(100);
  });

  it("turno sem almoço: 8h × (90/8) + VT + alimentação", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "12:00",
      horaSaida: "20:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(125);
  });

  it("trabalhou a menos: proporcional por hora", () => {
    // 08–12 = 4h presente, almoço → 3h pagas × 11.25 + 10
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "12:00",
    });
    expect(r!.horasTrabalhadas).toBe(3);
    expect(r!.valorHoras).toBe(3 * TERCEIROS_VALOR_HORA);
    expect(r!.valorTotal).toBe(round2(3 * TERCEIROS_VALOR_HORA + 10));
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
    // 18:00 → 08:00 = 14h presente, entrada ≥ 12 → sem desconto almoço, +VT + alim.
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
