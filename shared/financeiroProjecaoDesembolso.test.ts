import { describe, expect, it } from "vitest";
import {
  detectarNaturezaDesembolso,
  montarProjecaoDesembolso,
  mesesProjecaoPadrao,
} from "./financeiroProjecaoDesembolso";

describe("financeiroProjecaoDesembolso", () => {
  it("detecta parcela e recorrente", () => {
    expect(detectarNaturezaDesembolso("Aluguel (2/12)", 1)).toBe("parcela");
    expect(detectarNaturezaDesembolso("Energia elétrica", 3)).toBe("recorrente");
    expect(detectarNaturezaDesembolso("Notebook novo", 1)).toBe("unico");
  });

  it("trava célula executada e permite override na projetada", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      parcelas: [
        {
          id: "p1",
          descricao: "Aluguel (1/12)",
          fornecedor: "Imobiliaria X",
          rubrica: "Aluguel",
          valor: 5000,
          valorPago: 5000,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-09-10",
          dataPagamento: "2026-09-09",
        },
        {
          id: "p2",
          descricao: "Aluguel (2/12)",
          fornecedor: "Imobiliaria X",
          rubrica: "Aluguel",
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

    expect(mesesProjecaoPadrao("2026-09")).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    const set = grade.linhas.find(l => l.id === "ca:p1");
    const out = grade.linhas.find(l => l.id === "ca:p2");
    expect(set?.celulas.find(c => c.mesYm === "2026-09")?.editavel).toBe(false);
    expect(out?.celulas.find(c => c.mesYm === "2026-10")?.valorEfetivo).toBe(
      4800,
    );
    expect(out?.natureza).toBe("parcela");
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
  });
});
