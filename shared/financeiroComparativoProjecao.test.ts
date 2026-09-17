import { describe, expect, it } from "vitest";
import {
  montarComparativoDesembolsoMes,
  montarComparativoReceitaMes,
  montarFinanceiroComparativo,
} from "./financeiroComparativoProjecao";
import {
  ehCreditoOuDescontoObtido,
  type LinhaProjecao,
  type ParcelaBaseProjecao,
} from "./financeiroProjecaoDesembolso";

function parcela(
  partial: Partial<ParcelaBaseProjecao> &
    Pick<ParcelaBaseProjecao, "id" | "descricao">,
): ParcelaBaseProjecao {
  return {
    fornecedor: partial.fornecedor ?? "Cliente",
    rubrica: partial.rubrica ?? "Vendas",
    valor: partial.valor ?? 0,
    valorPago: partial.valorPago ?? 0,
    valorEmAberto: partial.valorEmAberto ?? 0,
    status: partial.status ?? "RECEBIDO",
    dataVencimento: partial.dataVencimento ?? "2026-09-10",
    dataPagamento: partial.dataPagamento ?? "2026-09-10",
    ...partial,
  };
}

function linhaProj(
  rubrica: string,
  valor: number,
  id = `proj:${rubrica}`,
): LinhaProjecao {
  return {
    id,
    label: rubrica,
    fornecedor: null,
    rubrica,
    natureza: "recorrente",
    origemLinha: "projetado",
    totalAtivo: valor,
    celulas: [
      {
        mesYm: "2026-09",
        valorBase: valor,
        valorEfetivo: valor,
        ativo: true,
        editavel: true,
        origem: "projetado",
        parcelaId: null,
      },
    ],
  };
}

describe("ehCreditoOuDescontoObtido", () => {
  it("reconhece descontos incondicionais obtidos", () => {
    expect(
      ehCreditoOuDescontoObtido("", "Descontos incondicionais obtidos"),
    ).toBe(true);
    expect(ehCreditoOuDescontoObtido("Compra", "Insumos")).toBe(false);
  });
});

describe("montarComparativoDesembolsoMes", () => {
  it("agrega por rúbrica e ignora descontos obtidos", () => {
    const out = montarComparativoDesembolsoMes({
      mesYm: "2026-09",
      linhasProjecao: [
        linhaProj("Energia elétrica", 1200),
        linhaProj("Descontos incondicionais obtidos", 294.82),
      ],
      parcelasPagarMes: [
        parcela({
          id: "e1",
          descricao: "CPFL",
          rubrica: "Energia elétrica",
          valorPago: 1000,
          dataPagamento: "2026-09-05",
        }),
        parcela({
          id: "d1",
          descricao: "Desconto fornecedor",
          rubrica: "Descontos incondicionais obtidos",
          valorPago: 1128.8,
          dataPagamento: "2026-09-08",
        }),
        parcela({
          id: "x1",
          descricao: "Extra",
          rubrica: "Materiais para Revenda",
          valorPago: 500,
          dataPagamento: "2026-09-12",
        }),
      ],
    });

    expect(
      out.rubricas.find(r => r.rubrica.includes("Descontos")),
    ).toBeUndefined();

    const energia = out.rubricas.find(r => r.rubrica === "Energia elétrica")!;
    expect(energia.status).toBe("faltando");
    expect(energia.naoPago).toBe(200);

    const mat = out.rubricas.find(r => r.rubrica === "Materiais para Revenda")!;
    expect(mat.status).toBe("nao_programada");
  });

  it("marca vale-transporte pago sem projeção como atraso, não não-programada", () => {
    const out = montarComparativoDesembolsoMes({
      mesYm: "2026-09",
      linhasProjecao: [],
      parcelasPagarMes: [
        parcela({
          id: "vt",
          descricao: "VT setembro atraso",
          rubrica: "Vale-Transporte",
          valorPago: 1040,
          dataPagamento: "2026-09-01",
          dataVencimento: "2026-08-28",
        }),
      ],
    });

    expect(out.rubricas).toHaveLength(1);
    expect(out.rubricas[0]?.status).toBe("pago_em_atraso");
    expect(out.rubricas[0]?.pagoAMais).toBe(0);
    expect(out.totais.pagoEmAtraso).toBe(1040);
    expect(out.totais.pagoAMais).toBe(0);
  });
});

describe("montarComparativoReceitaMes", () => {
  it("só totais Conta Azul", () => {
    const out = montarComparativoReceitaMes({
      mesYm: "2026-09",
      parcelasReceberMes: [
        parcela({
          id: "r-pago",
          descricao: "Cliente A",
          valor: 6_000,
          valorPago: 6_000,
          dataPagamento: "2026-09-05",
          dataVencimento: "2026-09-05",
        }),
      ],
    });
    expect(out.recebido).toBe(6_000);
    expect(out.previsto).toBe(6_000);
  });
});

describe("montarFinanceiroComparativo", () => {
  it("monta caixa com totais", () => {
    const out = montarFinanceiroComparativo({
      mesYm: "2026-09",
      linhasProjecao: [linhaProj("Insumos", 2_000)],
      parcelasPagarMes: [
        parcela({
          id: "p",
          descricao: "Gasto",
          rubrica: "Insumos",
          valorPago: 2_000,
          dataPagamento: "2026-09-01",
        }),
      ],
      parcelasReceberMes: [
        parcela({
          id: "r",
          descricao: "Rec",
          valor: 5_000,
          valorPago: 5_000,
          dataPagamento: "2026-09-02",
          dataVencimento: "2026-09-02",
        }),
      ],
    });
    expect(out.caixa.saldoRealizado).toBe(3_000);
  });
});
