import { describe, expect, it } from "vitest";
import {
  detectarNaturezaDesembolso,
  ehDespesaEssencialRecorrente,
  montarProjecaoDesembolso,
  mesesProjecaoNoTotal,
  mesesProjecaoPadrao,
  sugerirValorAoAtivarProjecao,
} from "./financeiroProjecaoDesembolso";

describe("financeiroProjecaoDesembolso", () => {
  it("parcela só para cartão/boleto; essenciais são recorrentes", () => {
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
    ).toBe("recorrente");
    expect(detectarNaturezaDesembolso("10/12 - ALUGUEL REF. TARUMA", 1)).toBe(
      "recorrente",
    );
    expect(detectarNaturezaDesembolso("Energia elétrica", 1)).toBe("recorrente");
    expect(detectarNaturezaDesembolso("Notebook à vista", 1)).toBe("unico");
  });

  it("detecta rúbricas essenciais", () => {
    expect(ehDespesaEssencialRecorrente("Conta luz", "Energia")).toBe(true);
    expect(ehDespesaEssencialRecorrente("ALUGUEL REF. TARUMA", "Aluguel")).toBe(
      true,
    );
    expect(ehDespesaEssencialRecorrente("Pagamento salário", "Folha")).toBe(
      true,
    );
    expect(
      ehDespesaEssencialRecorrente("Serviço mensal", "Terceiro fixo"),
    ).toBe(true);
    expect(ehDespesaEssencialRecorrente("Abastecimento", "Combustível")).toBe(
      true,
    );
    expect(
      ehDespesaEssencialRecorrente("Compra semana", "Folhosas", "Horta Sul"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Pedido", "Legumes", "Fornecedor XYZ"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Mix flores", "Flores comestíveis"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Marmita equipe", "Lanches e Refeições"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Caixas", "Insumo de Embalagens"),
    ).toBe(true);
    expect(ehDespesaEssencialRecorrente("Folha set", "Salários")).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Anuidade", "Anuidade Cartão"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Sabão", "Insumo lavagem industrial"),
    ).toBe(true);
    expect(ehDespesaEssencialRecorrente("Compra", "Insumo")).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("TED", "Tarifas Bancárias"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("MP", "Insumo produção"),
    ).toBe(true);
    expect(
      ehDespesaEssencialRecorrente("Papel", "Materiais de Uso e Consumo"),
    ).toBe(true);
    expect(ehDespesaEssencialRecorrente("Compra notebook", "Equipamentos")).toBe(
      false,
    );
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

  it("só usa o que foi pago no mês anterior; ignora previsão CA", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      parcelas: [
        {
          id: "pago-ago",
          descricao: "Compra produto",
          fornecedor: "Fornecedor X",
          rubrica: "Materiais para Revenda",
          valor: 5000,
          valorPago: 5000,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-08-10",
          dataPagamento: "2026-08-09",
        },
        {
          id: "aberto-set",
          descricao: "Título aberto Conta Azul",
          fornecedor: "Fornecedor Y",
          rubrica: "Materiais para Revenda",
          valor: 9000,
          valorPago: 0,
          valorEmAberto: 9000,
          status: "EM_ABERTO",
          dataVencimento: "2026-09-15",
          dataPagamento: null,
        },
      ],
    });

    expect(grade.linhas).toHaveLength(1);
    const lin = grade.linhas[0]!;
    const ago = lin.celulas.find(c => c.mesYm === "2026-08");
    const set = lin.celulas.find(c => c.mesYm === "2026-09");
    expect(ago?.origem).toBe("executado");
    expect(ago?.editavel).toBe(false);
    expect(ago?.valorEfetivo).toBe(5000);
    expect(set?.origem).toBe("projetado");
    expect(set?.ativo).toBe(false); // não essencial → usuário decide
    expect(set?.valorBase).toBe(5000);
    expect(grade.totalGeral).toBe(0);
  });

  it("essenciais (energia/aluguel) já entram projetados ativos", () => {
    const grade = montarProjecaoDesembolso({
      mesInicioYm: "2026-09",
      parcelas: [
        {
          id: "energia",
          descricao: "Conta de energia",
          fornecedor: "CPFL",
          rubrica: "Energia elétrica",
          valor: 1200,
          valorPago: 1200,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-08-20",
          dataPagamento: "2026-08-18",
        },
        {
          id: "aluguel",
          descricao: "ALUGUEL REF. TARUMA",
          fornecedor: "Imob",
          rubrica: "Aluguel",
          valor: 17400,
          valorPago: 17400,
          valorEmAberto: 0,
          status: "RECEBIDO",
          dataVencimento: "2026-08-10",
          dataPagamento: "2026-08-10",
        },
      ],
    });

    expect(grade.linhas).toHaveLength(2);
    for (const lin of grade.linhas) {
      expect(lin.natureza).toBe("recorrente");
      const set = lin.celulas.find(c => c.mesYm === "2026-09");
      expect(set?.ativo).toBe(true);
      expect(set?.origem).toBe("projetado");
      expect(set?.editavel).toBe(true);
      const ago = lin.celulas.find(c => c.mesYm === "2026-08");
      expect(ago?.editavel).toBe(false);
    }
    // 3 meses × (1200+17400) = 55800
    expect(grade.totalGeral).toBe(55800);
  });

  it("sugere valor ao ativar a partir da base da linha", () => {
    expect(
      sugerirValorAoAtivarProjecao(
        { mesYm: "2026-10", valorBase: 0, valorEfetivo: 0 },
        [
          { mesYm: "2026-08", valorBase: 1000, valorEfetivo: 1000 },
          { mesYm: "2026-10", valorBase: 0, valorEfetivo: 0 },
        ],
      ),
    ).toBe(1000);
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
