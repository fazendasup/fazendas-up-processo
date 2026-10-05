import { describe, expect, it } from "vitest";
import {
  calcularPagamentoDiaTerceiro,
  dataSaidaServico,
  formatarCpf,
  mascaraHoraDigitada,
  normalizarCpf,
  normalizarHora24h,
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

describe("mascaraHoraDigitada / normalizarHora24h", () => {
  it("insere os dois pontos enquanto digita", () => {
    expect(mascaraHoraDigitada("0")).toBe("0");
    expect(mascaraHoraDigitada("07")).toBe("07");
    expect(mascaraHoraDigitada("073")).toBe("07:3");
    expect(mascaraHoraDigitada("0730")).toBe("07:30");
  });

  it("aceita digitação com dois pontos e normaliza para 24h", () => {
    expect(mascaraHoraDigitada("7:30")).toBe("7:30");
    expect(normalizarHora24h("7:30")).toBe("07:30");
    expect(normalizarHora24h("07:30")).toBe("07:30");
    expect(normalizarHora24h("24:00")).toBeNull();
    expect(normalizarHora24h("07:")).toBeNull();
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

  it("turno da tarde: desconta 1h por padrão e mantém os R$ 25", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "21:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.descontaDescanso).toBe(true);
    expect(r!.descontaDescansoManual).toBe(false);
    expect(r!.horasPresente).toBe(8);
    expect(r!.horasTrabalhadas).toBe(7);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(round2(7 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("não descontar 1h neste dia: paga as horas cheias e mantém os R$ 25", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "21:00",
      descontaDescansoOverride: false,
    });
    expect(r!.descontaDescanso).toBe(false);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(125);
  });

  it("1h de descanso marcada no dia: desconta a hora e mantém os R$ 25", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "21:00",
      descontaDescansoOverride: true,
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.descontaDescanso).toBe(true);
    expect(r!.descontaDescansoManual).toBe(true);
    expect(r!.horasTrabalhadas).toBe(7);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(round2(7 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("entrada 12h ainda sem desconto (só desconta se entrou antes das 11h)", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "12:00",
      horaSaida: "20:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasTrabalhadas).toBe(7);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(round2(7 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("só manhã com menos de 6h: paga a hora e o VT, sem refeição", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "12:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasPresente).toBe(4);
    expect(r!.horasTrabalhadas).toBe(3);
    expect(r!.valorHoras).toBe(3 * TERCEIROS_VALOR_HORA);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.valorTotal).toBe(round2(3 * TERCEIROS_VALOR_HORA + 10));
  });

  it("exatamente 6h sem almoço na empresa: recebe os R$ 25", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "19:00",
    });
    expect(r!.horasPresente).toBe(6);
    expect(r!.horasTrabalhadas).toBe(5);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorTotal).toBe(round2(5 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("sai exatamente às 13h: ainda sem desconto (precisa sair depois das 13h)", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "13:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.horasPresente).toBe(5);
    expect(r!.horasTrabalhadas).toBe(4);
    expect(r!.valorAlimentacao).toBe(0);
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

  it("jornada noturna fora do almoço: desconta 1h e mantém os R$ 25", () => {
    // 18:00 → 08:00 = 14h presente − 1h. Não cobre 11h–13h.
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "18:00",
      horaSaida: "08:00",
    });
    expect(r).not.toBeNull();
    expect(r!.cruzaMeiaNoite).toBe(true);
    expect(r!.horasPresente).toBe(14);
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.descontaDescanso).toBe(true);
    expect(r!.horasTrabalhadas).toBe(13);
    expect(r!.valorValeTransporte).toBe(10);
    expect(r!.valorAlimentacao).toBe(25);
    expect(r!.valorHoras).toBe(round2(13 * TERCEIROS_VALOR_HORA));
    expect(r!.valorTotal).toBe(round2(13 * TERCEIROS_VALOR_HORA + 10 + 25));
  });

  it("noite fora do almoço da empresa mantém os R$ 25 e desconta 1h", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "22:00",
      horaSaida: "06:00",
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.descontaDescanso).toBe(true);
    expect(r!.horasTrabalhadas).toBe(7);
    expect(r!.valorAlimentacao).toBe(25);
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

  it("override: força vale alimentação mesmo no turno diurno", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "16:00",
      almocouNaEmpresaOverride: false,
    });
    expect(r!.almocouNaEmpresa).toBe(false);
    expect(r!.almocouNaEmpresaManual).toBe(true);
    expect(r!.horasTrabalhadas).toBe(8);
    expect(r!.valorAlimentacao).toBe(25);
  });

  it("menos de 6h: o vale forçado pelo admin também não paga refeição", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "08:00",
      horaSaida: "12:00",
      almocouNaEmpresaOverride: false,
    });
    expect(r!.horasTrabalhadas).toBe(3);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.valorValeTransporte).toBe(10);
  });

  it("override: força almoço na empresa no turno da tarde", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "13:00",
      horaSaida: "21:00",
      almocouNaEmpresaOverride: true,
    });
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.almocouNaEmpresaManual).toBe(true);
    expect(r!.horasTrabalhadas).toBe(7);
    expect(r!.valorAlimentacao).toBe(0);
    expect(r!.descontaDescanso).toBe(true);
  });

  it("almoço na empresa com a hora de descanso desligada: tira os R$ 25 e paga as horas cheias", () => {
    const r = calcularPagamentoDiaTerceiro({
      horaEntrada: "07:00",
      horaSaida: "16:00",
      descontaDescansoOverride: false,
    });
    expect(r!.almocouNaEmpresa).toBe(true);
    expect(r!.descontaDescanso).toBe(false);
    expect(r!.horasTrabalhadas).toBe(9);
    expect(r!.valorAlimentacao).toBe(0);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
