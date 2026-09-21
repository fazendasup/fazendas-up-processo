import { describe, expect, it } from "vitest";
import {
  calcularPagamentoDiaTerceiro,
  formatarCpf,
  normalizarCpf,
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

describe("calcularPagamentoDiaTerceiro", () => {
  it("diária com almoço na empresa (entrada < 12h) sem extra", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "16:00",
    });
    expect(r).not.toBeNull();
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.horasPresente).toBe(9);
    expect(r!.horasExtras).toBe(0);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.valorTotal).toBe(100); // 90 + 10
  });

  it("diária sem almoço (entrada >= 12h) inclui alimentação", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "12:00",
      horaSaida: "20:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasPresente).toBe(8);
    expect(r!.horasExtras).toBe(0);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(125); // 90 + 10 + 25
  });

  it("horas extras além de 8h + 1h almoço", () => {
    // 07:00–17:00 = 10h presentes → 1h extra × (90/8) = 11.25
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "17:00",
    });
    expect(r!.horasPresente).toBe(10);
    expect(r!.horasExtras).toBe(1);
    expect(r!.valorHorasExtras).toBe(11.25);
    expect(r!.valorTotal).toBe(111.25); // 100 + 11.25
  });

  it("rejeita saída antes da entrada", () => {
    expect(
      calcularPagamentoDiaTerceiro({
        horaEntrada: "18:00",
        horaSaida: "08:00",
      }),
    ).toBeNull();
  });
});
