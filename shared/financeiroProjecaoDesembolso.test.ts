import { describe, expect, it } from "vitest";
import {
  detectarNaturezaDesembolso,
  montarProjecaoDesembolso,
  mesesProjecaoNoTotal,
  mesesProjecaoPadrao,
} from "./financeiroProjecaoDesembolso";

describe("financeiroProjecaoDesembolso", () => {
  it("parcela só para cartão/boleto; folha e aluguel n/m não são parcela", () => {
    expect(
      detectarNaturezaDesembolso("Compra notebook cartão 3/12", 1),
    ).toBe("parcela");
    expect(
      detectarNaturezaDesembolso("Boleto parcelado equipamento", 1),
    ).toBe("parcela");
    expect(
      detectarNaturezaDesembolso("14/17 - Folha de Pagamento", 1, {
        rubrica: "Folha",
      }),
    ).toBe("unico");
    expect(
      detectarNaturezaDesembolso("14/17 - Folha de Pagamento", 3, {
        rubrica: "Folha",
      }),
    ).toBe("recorrente");
    expect(detectarNaturezaDesembolso("10/12 - ALUGUEL REF. TARUMA", 2)).toBe(
      "recorrente",
    );
    expect(detectarNaturezaDesembolso("Energia elétrica", 3)).toBe("recorrente");
    expect(detectarNaturezaDesembolso("Notebook à vista", 1)).toBe("unico");
  });

  it("horizonte = mês anterior + 3 meses; total só 3 à frente", () => {
    expect(mesesProjecaoPadrao("2026-09")).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(mesesProjecaoNoTotal("2026-09")).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
  });

  it("trava célula executada e permite override na projetada", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      parcelas: [
        {
          id: "p1",
          descricao: "Cartão Visa 1/6 notebook",
          fornecedor: "Loja X",
          rubrica: "Equipamentos",
          valor: 5000,
          valorPago: 5000,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-09-10",
          dataPagamento: "2026-09-09",
        },
        {
          id: "p2",
          descricao: "Cartão Visa 2/6 notebook",
          fornecedor: "Loja X",
          rubrica: "Equipamentos",
          valor: 5000,
          valorPago: 0,
          valorEmAberto: 5000,
          status: "EM_ABERTO",
          dataVencimento: "2026-10-10",
          dataPagamento: null,
        },
      ],
      overrides: [
        {
          linhaId: "ca:p2",
          mesYm: "2026-10",
          valorOverride: 4800,
          ativo: true,
        },
      ],
    });

    expect(grade.colunas.map(c => c.mesYm)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(grade.colunas.find(c => c.mesYm === "2026-08")?.contaNoTotal).toBe(
      false,
    );
    expect(grade.colunas.find(c => c.mesYm === "2026-09")?.contaNoTotal).toBe(
      true,
    );
    const set = grade.linhas.find(l => l.id === "ca:p1");
    const out = grade.linhas.find(l => l.id === "ca:p2");
    expect(set?.celulas.find(c => c.mesYm === "2026-09")?.editavel).toBe(false);
    expect(out?.celulas.find(c => c.mesYm === "2026-10")?.valorEfetivo).toBe(
      4800,
    );
    expect(out?.natureza).toBe("parcela");
  });

  it("totalGeral ignora o mês anterior", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      parcelas: [
        {
          id: "ago",
          descricao: "Aluguel ago",
          fornecedor: "Imob",
          rubrica: "Aluguel",
          valor: 10000,
          valorPago: 10000,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-08-05",
          dataPagamento: "2026-08-05",
        },
        {
          id: "set",
          descricao: "Aluguel set",
          fornecedor: "Imob",
          rubrica: "Aluguel",
          valor: 10000,
          valorPago: 0,
          valorEmAberto: 10000,
          status: "EM_ABERTO",
          dataVencimento: "2026-09-05",
          dataPagamento: null,
        },
      ],
    });
    const ago = grade.totaisPorMes.find(t => t.mesYm === "2026-08");
    const set = grade.totaisPorMes.find(t => t.mesYm === "2026-09");
    expect(ago?.total).toBe(10000);
    expect(set?.total).toBe(10000);
    expect(grade.totalGeral).toBe(10000);
    expect(grade.linhas.find(l => l.id === "ca:ago")?.totalAtivo).toBe(0);
    expect(grade.linhas.find(l => l.id === "ca:set")?.totalAtivo).toBe(10000);
  });

  it("aceita linha e coluna manuais", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      colunasExtraYm: ["2026-12"],
      parcelas: [],
      linhasManuais: [
        { id: 1, descricao: "Reserva manutenção", rubrica: "Manutenção" },
      ],
      overrides: [
        {
          linhaId: "manual:1",
          mesYm: "2026-12",
          valorOverride: 1500,
          ativo: true,
        },
      ],
    });
    expect(grade.colunas.map(c => c.mesYm)).toContain("2026-12");
    const lin = grade.linhas.find(l => l.id === "manual:1");
    expect(lin?.celulas.find(c => c.mesYm === "2026-12")?.valorEfetivo).toBe(
      1500,
    );
    expect(grade.totalGeral).toBe(1500);
  });
});
