import { describe, expect, it } from "vitest";
import {
  montarComparativoDesembolsoMes,
  montarComparativoReceitaMes,
  montarFinanceiroComparativo,
} from "./financeiroComparativoProjecao";
import type { LinhaProjecao, ParcelaBaseProjecao } from "./financeiroProjecaoDesembolso";

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

describe("montarComparativoDesembolsoMes", () => {
  it("agrega por rúbrica: pago, não pago, pago a mais e não programada", () => {
    const out = montarComparativoDesembolsoMes({
      mesYm: "2026-09",
      linhasProjecao: [
        linhaProj("Energia elétrica", 1200),
        linhaProj("Pró-labore", 10_000, "proj:pro1"),
        linhaProj("Pró-labore", 3_000, "proj:pro2"),
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
          id: "p1",
          descricao: "Folha",
          rubrica: "Pró-labore",
          valorPago: 13_000,
          dataPagamento: "2026-09-10",
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

    expect(out.rubricas).toHaveLength(3);

    const energia = out.rubricas.find(r => r.rubrica === "Energia elétrica")!;
    expect(energia.projetado).toBe(1200);
    expect(energia.pago).toBe(1000);
    expect(energia.naoPago).toBe(200);
    expect(energia.pagoAMais).toBe(0);
    expect(energia.status).toBe("faltando");

    const pro = out.rubricas.find(r => r.rubrica === "Pró-labore")!;
    expect(pro.projetado).toBe(13_000);
    expect(pro.pago).toBe(13_000);
    expect(pro.status).toBe("em_dia");

    const mat = out.rubricas.find(r => r.rubrica === "Materiais para Revenda")!;
    expect(mat.projetado).toBe(0);
    expect(mat.pago).toBe(500);
    expect(mat.status).toBe("nao_programada");
    expect(mat.pagoAMais).toBe(500);

    expect(out.totais.projetado).toBe(14_200);
    expect(out.totais.pago).toBe(14_500);
  });
});

describe("montarComparativoReceitaMes", () => {
  it("só totais Conta Azul, sem linhas", () => {
    const out = montarComparativoReceitaMes({
      mesYm: "2026-09",
      parcelasReceberMes: [
        parcela({
          id: "r-pago",
          descricao: "Cliente A",
          valor: 6_000,
          valorPago: 6_000,
          valorEmAberto: 0,
          dataPagamento: "2026-09-05",
          dataVencimento: "2026-09-05",
        }),
        parcela({
          id: "r-aberto",
          descricao: "Cliente B",
          valor: 5_000,
          valorPago: 0,
          valorEmAberto: 5_000,
          status: "EM_ABERTO",
          dataPagamento: null,
          dataVencimento: "2026-09-25",
        }),
      ],
    });

    expect(out.fonte).toBe("conta_azul");
    expect(out.previsto).toBe(11_000);
    expect(out.recebido).toBe(6_000);
    expect(out.aReceber).toBe(5_000);
    expect("linhas" in out).toBe(false);
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
    expect(out.desembolso.rubricas).toHaveLength(1);
  });
});
