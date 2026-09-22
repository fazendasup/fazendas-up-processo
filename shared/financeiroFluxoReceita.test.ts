import { describe, expect, it } from "vitest";
import {
  classificarSaidaFluxo,
  diaMesParaCobertura,
  montarFluxoReceita,
  weekdayFromYmd,
  type EventoCaixaFluxo,
  type RitmoDiaMes,
} from "./financeiroFluxoReceita";

describe("weekdayFromYmd", () => {
  it("usa calendário UTC estável", () => {
    // 2026-09-22 = terça
    expect(weekdayFromYmd("2026-09-22")).toBe(2);
  });
});

describe("classificarSaidaFluxo", () => {
  it("separa fixos, diaristas e fornecedores", () => {
    expect(
      classificarSaidaFluxo({
        descricao: "Folha de pagamento setembro",
        rubrica: "Salários",
        fornecedor: null,
      }),
    ).toBe("fixos");
    expect(
      classificarSaidaFluxo({
        descricao: "Pagamento diaristas semana 12",
        rubrica: null,
        fornecedor: null,
      }),
    ).toBe("diaristas");
    expect(
      classificarSaidaFluxo({
        descricao: "NF sementes",
        rubrica: "Insumos",
        fornecedor: "Agro Seed",
      }),
    ).toBe("fornecedores");
  });
});

describe("diaMesParaCobertura", () => {
  it("acha o primeiro dia que atinge o acumulado", () => {
    const rows: RitmoDiaMes[] = [
      { dia: 1, valorTotal: 10, valorMedioPorMes: 10, pctDoMes: 10, pctAcumulado: 10 },
      { dia: 5, valorTotal: 40, valorMedioPorMes: 40, pctDoMes: 40, pctAcumulado: 50 },
      { dia: 15, valorTotal: 50, valorMedioPorMes: 50, pctDoMes: 50, pctAcumulado: 100 },
    ];
    expect(diaMesParaCobertura(rows, 45)).toBe(5);
    expect(diaMesParaCobertura(rows, 80)).toBe(15);
  });
});

describe("montarFluxoReceita", () => {
  it("monta ritmo e cobertura a partir das entradas de vendas", () => {
    const eventos: EventoCaixaFluxo[] = [
      { dataPagamento: "2026-07-05", valor: 100, grupo: "vendas" },
      { dataPagamento: "2026-07-20", valor: 50, grupo: "vendas" },
      { dataPagamento: "2026-08-05", valor: 100, grupo: "vendas" },
      { dataPagamento: "2026-08-20", valor: 50, grupo: "vendas" },
      { dataPagamento: "2026-09-05", valor: 100, grupo: "vendas" },
      { dataPagamento: "2026-09-20", valor: 50, grupo: "vendas" },
      { dataPagamento: "2026-07-10", valor: 60, grupo: "fixos" },
      { dataPagamento: "2026-08-10", valor: 60, grupo: "fixos" },
      { dataPagamento: "2026-09-10", valor: 60, grupo: "fixos" },
      { dataPagamento: "2026-07-12", valor: 30, grupo: "diaristas" },
      { dataPagamento: "2026-08-12", valor: 30, grupo: "diaristas" },
      { dataPagamento: "2026-09-12", valor: 30, grupo: "diaristas" },
      { dataPagamento: "2026-07-25", valor: 40, grupo: "fornecedores" },
      { dataPagamento: "2026-08-25", valor: 40, grupo: "fornecedores" },
      { dataPagamento: "2026-09-25", valor: 40, grupo: "fornecedores" },
    ];
    const r = montarFluxoReceita({
      periodoInicio: "2026-07-01",
      periodoFim: "2026-09-30",
      nMeses: 3,
      eventos,
    });
    expect(r.mediaMensalVendas).toBe(150);
    expect(r.cobertura.mediaSaidasOperacionais).toBe(130);
    expect(r.cobertura.saldoMedio).toBe(20);
    expect(r.cobertura.pctCobertura).toBeCloseTo(115.38, 0);
    expect(r.serieMensal).toHaveLength(3);
    expect(r.janelas).toHaveLength(3);
    expect(r.porDiaMes.find(d => d.dia === 5)!.pctDoMes).toBeCloseTo(66.67, 0);
  });
});
