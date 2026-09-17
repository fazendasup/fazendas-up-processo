import { describe, expect, it } from "vitest";
import {
  montarComparativoDesembolsoMes,
  montarComparativoReceitaMes,
  montarFinanceiroComparativo,
} from "./financeiroComparativoProjecao";
import {
  hashSerie,
  chaveSerie,
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

describe("montarComparativoDesembolsoMes", () => {
  it("calcula desvio, restante e match entre projeção e pago", () => {
    const base = parcela({
      id: "p1",
      descricao: "Energia CPFL",
      rubrica: "Energia elétrica",
      valor: 1000,
      valorPago: 1000,
      dataPagamento: "2026-09-05",
    });
    const linhaId = hashSerie(chaveSerie(base));
    const linhas: LinhaProjecao[] = [
      {
        id: linhaId,
        label: "Energia CPFL",
        fornecedor: "Cliente",
        rubrica: "Energia elétrica",
        natureza: "recorrente",
        origemLinha: "projetado",
        totalAtivo: 1200,
        celulas: [
          {
            mesYm: "2026-09",
            valorBase: 1200,
            valorEfetivo: 1200,
            ativo: true,
            editavel: true,
            origem: "projetado",
            parcelaId: null,
          },
        ],
      },
    ];

    const out = montarComparativoDesembolsoMes({
      mesYm: "2026-09",
      linhasProjecao: linhas,
      parcelasPagarMes: [base],
    });

    expect(out.totais.projetado).toBe(1200);
    expect(out.totais.realizado).toBe(1000);
    expect(out.totais.restanteADesembolsar).toBe(200);
    expect(out.totais.desvio).toBe(-200);
    expect(out.linhas[0]?.matchStatus).toBe("matched");
  });
});

describe("montarComparativoReceitaMes", () => {
  it("puxa previsto, recebido e a receber do Conta Azul", () => {
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
        parcela({
          id: "r-pago-fora-venc",
          descricao: "Cliente C atrasado",
          valor: 2_000,
          valorPago: 2_000,
          valorEmAberto: 0,
          dataPagamento: "2026-09-12",
          dataVencimento: "2026-08-20",
        }),
      ],
    });

    expect(out.fonte).toBe("conta_azul");
    // Previsto = só vencimento no mês (A+B)
    expect(out.previsto).toBe(11_000);
    // Recebido = pagamentos no mês (A+C)
    expect(out.recebido).toBe(8_000);
    // A receber = aberto com vencimento no mês (B)
    expect(out.aReceber).toBe(5_000);
    expect(out.pipelineMes).toBe(13_000);
    expect(out.linhas.length).toBe(3);
  });
});

describe("montarFinanceiroComparativo", () => {
  it("monta caixa com recebido Conta Azul", () => {
    const out = montarFinanceiroComparativo({
      mesYm: "2026-09",
      linhasProjecao: [],
      parcelasPagarMes: [
        parcela({
          id: "p",
          descricao: "Gasto",
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
    expect(out.receita.recebido).toBe(5_000);
    expect(out.receita.previsto).toBe(5_000);
  });
});
