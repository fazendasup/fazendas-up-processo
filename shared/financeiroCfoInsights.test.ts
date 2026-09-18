import { describe, expect, it } from "vitest";
import {
  agregarPorFornecedor,
  agregarPorRubrica,
  aplicarEdicoesClassificacao,
  ajusteManualParaParcela,
  compararRubricasCusto,
  detectarConflitosRubricaPorDestino,
  ehPagamentoPessoalOuEquipe,
  medirQualidadeAlocacao,
  montarFluxoPorDia,
  montarKpisReducaoCusto,
  normalizarParcela,
  parcelasAtivasParaRelatorio,
  pareceNomeEmpresa,
  pareceNomePessoaFisica,
  periodoComparavelAnterior,
  limitarPeriodoComparativoRubricas,
} from "./financeiroCfoInsights";

describe("financeiroCfoInsights ERP", () => {
  it("agrega por rúbrica do rateio Conta Azul", () => {
    const p = normalizarParcela({
      id: "1",
      tipo: "pagar",
      descricao: "Compra embalagem",
      valor: 1000,
      valorPago: 1000,
      contraparte: "Plazom",
      rateio: [
        {
          categoriaId: "c1",
          categoriaNome: "Embalagens",
          valor: 1000,
          centros: [{ id: "cc1", nome: "Produção", valor: 1000 }],
        },
      ],
      fonteClassificacao: "rateio_api",
    });
    expect(p.confiancaClassificacao).toBe("alta");
    expect(p.categoria).toBe("Embalagens");
    const rubricas = agregarPorRubrica([p]);
    expect(rubricas[0]?.label).toBe("Embalagens");
    expect(rubricas[0]?.total).toBe(1000);
  });

  it("permite override de rúbrica e exclusão", () => {
    const base = normalizarParcela({
      id: "pz-1",
      tipo: "pagar",
      descricao: "NF",
      valor: 500,
      categoria: "Outros",
      contraparte: "Plazom",
    });
    const edited = aplicarEdicoesClassificacao([base], [
      {
        tipo: "parcela",
        chave: "pz-1",
        rubricaOverride: "Embalagens",
        centroCustoOverride: "Produção",
        excluido: false,
        nota: "Essencial de linha",
      },
    ]);
    expect(edited[0]?.categoria).toBe("Embalagens");
    expect(edited[0]?.editadoManual).toBe(true);
    expect(edited[0]?.fonteClassificacao).toBe("override_manual");

    const excl = aplicarEdicoesClassificacao([base], [
      { tipo: "parcela", chave: "pz-1", excluido: true },
    ]);
    expect(parcelasAtivasParaRelatorio(excl)).toHaveLength(0);
  });

  it("aplica regra por fornecedor", () => {
    const base = normalizarParcela({
      id: "2",
      tipo: "pagar",
      descricao: "Pedido",
      valor: 200,
      contraparte: "Plazom Ltda",
    });
    const out = aplicarEdicoesClassificacao([base], [
      {
        tipo: "fornecedor",
        chave: "plazom ltda",
        rubricaOverride: "Embalagens",
      },
    ]);
    expect(out[0]?.categoria).toBe("Embalagens");
  });

  it("monta fluxo diário contínuo com saldo acumulado", () => {
    const receber = normalizarParcela({
      id: "r1",
      tipo: "receber",
      descricao: "Venda",
      valor: 300,
      valorPago: 300,
      dataPagamento: "2026-03-02",
      dataVencimento: "2026-03-02",
    });
    const pagar = normalizarParcela({
      id: "p1",
      tipo: "pagar",
      descricao: "Compra",
      valor: 100,
      valorPago: 100,
      dataPagamento: "2026-03-03",
      dataVencimento: "2026-03-03",
    });
    const dias = montarFluxoPorDia([receber, pagar], "2026-03-01", "2026-03-03");
    expect(dias).toHaveLength(3);
    expect(dias[0]?.saldoLiquidoRealizado).toBe(0);
    expect(dias[1]?.entradasRealizadas).toBe(300);
    expect(dias[1]?.saldoAcumuladoRealizado).toBe(300);
    expect(dias[2]?.saidasRealizadas).toBe(100);
    expect(dias[2]?.saldoAcumuladoRealizado).toBe(200);
  });

  it("converte ajuste manual em parcela", () => {
    const p = ajusteManualParaParcela({
      id: 9,
      tipo: "pagar",
      descricao: "Ajuste",
      rubrica: "Embalagens",
      valor: 50,
    });
    expect(p.id).toBe("manual-9");
    expect(p.origem).toBe("ajuste_manual");
    expect(medirQualidadeAlocacao([p]).semRubrica).toBe(0);
  });

  it("exclui funcionários do ranking de fornecedores", () => {
    const funcionario = normalizarParcela({
      id: "f1",
      tipo: "pagar",
      descricao: "Pagamento",
      valor: 5000,
      contraparte: "Adson Bruno Tolentino Lopes",
    });
    const empresa = normalizarParcela({
      id: "e1",
      tipo: "pagar",
      descricao: "Embalagens",
      valor: 1200,
      contraparte: "PLASZOM ZOMER INDUSTRIA LTDA",
    });
    const folha = normalizarParcela({
      id: "f2",
      tipo: "pagar",
      descricao: "Salário setembro",
      valor: 3000,
      categoria: "Folha de pagamento",
      contraparte: "Fornecedor Genérico ME",
    });
    expect(
      ehPagamentoPessoalOuEquipe(funcionario, [
        "ADSON BRUNO TOLENTINO LOPES",
      ]),
    ).toBe(true);
    expect(pareceNomePessoaFisica("JANIO ANDRADE TORRES")).toBe(true);
    expect(pareceNomeEmpresa("PLASZOM ZOMER INDUSTRIA LTDA")).toBe(true);
    const top = agregarPorFornecedor([funcionario, empresa, folha], {
      nomesEquipe: ["ADSON BRUNO TOLENTINO LOPES"],
    });
    expect(top.map(t => t.nome)).toEqual(["PLASZOM ZOMER INDUSTRIA LTDA"]);
  });

  it("compara rúbricas MoM e monta KPIs de redução", () => {
    const prev = periodoComparavelAnterior(
      new Date("2026-09-01T00:00:00-03:00"),
      new Date("2026-09-15T23:59:59.999-03:00"),
    );
    expect(prev.inicio.getUTCMonth()).toBe(7); // agosto (Date em -03)
    // Fim civil = 15/ago (America/Sao_Paulo)
    expect(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
      }).format(prev.fim),
    ).toBe("15");

    const prevClamped = limitarPeriodoComparativoRubricas(
      prev.inicio,
      prev.fim,
    );
    expect(prevClamped).not.toBeNull();
    expect(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        month: "2-digit",
        day: "2-digit",
      }).format(prevClamped!.inicio),
    ).toBe("08-01");

    const jul = periodoComparavelAnterior(
      new Date("2026-08-01T00:00:00-03:00"),
      new Date("2026-08-15T23:59:59.999-03:00"),
    );
    expect(limitarPeriodoComparativoRubricas(jul.inicio, jul.fim)).toBeNull();

    const atual = agregarPorRubrica([
      normalizarParcela({
        id: "1",
        tipo: "pagar",
        descricao: "A",
        valor: 1500,
        valorPago: 1500,
        categoria: "Embalagens",
      }),
      normalizarParcela({
        id: "2",
        tipo: "pagar",
        descricao: "B",
        valor: 500,
        valorPago: 500,
        categoria: "Frete",
      }),
    ]);
    const anterior = agregarPorRubrica([
      normalizarParcela({
        id: "3",
        tipo: "pagar",
        descricao: "C",
        valor: 1000,
        valorPago: 1000,
        categoria: "Embalagens",
      }),
    ]);
    const gaps = compararRubricasCusto(atual, anterior);
    const emb = gaps.find(g => g.rubrica === "Embalagens");
    expect(emb?.delta).toBe(500);
    const kpis = montarKpisReducaoCusto({
      rubricas: atual,
      qualidade: medirQualidadeAlocacao([
        normalizarParcela({
          id: "1",
          tipo: "pagar",
          descricao: "A",
          valor: 1500,
          valorPago: 1500,
          categoria: "Embalagens",
        }),
      ]),
      aPagarEmAberto: 200,
      titulosPagar: 2,
      comparativo: {
        periodoAnterior: { inicio: "2026-08-01", fim: "2026-08-15" },
        gastoAnterior: 1000,
        rubricasAnterior: anterior,
        gaps,
        gapsPorImpacto: gaps,
      },
    });
    expect(kpis.gastoTotal).toBe(2000);
    expect(kpis.deltaGasto).toBe(1000);
    expect(kpis.maiorAumento?.rubrica).toBe("Embalagens");
  });

  it("detecta mesmo destino com rúbricas diferentes entre meses", () => {
    const conflitos = detectarConflitosRubricaPorDestino([
      normalizarParcela({
        id: "a1",
        tipo: "pagar",
        descricao: "Pedido ago",
        valor: 1000,
        valorPago: 1000,
        categoria: "Insumos",
        contraparte: "Horta Sul Ltda",
        dataPagamento: "2026-08-10",
      }),
      normalizarParcela({
        id: "a2",
        tipo: "pagar",
        descricao: "Pedido set",
        valor: 1200,
        valorPago: 1200,
        categoria: "Folhosas",
        contraparte: "Horta Sul Ltda",
        dataPagamento: "2026-09-12",
      }),
      normalizarParcela({
        id: "b1",
        tipo: "pagar",
        descricao: "Aluguel",
        valor: 5000,
        valorPago: 5000,
        categoria: "Aluguel",
        contraparte: "Imob X",
        dataPagamento: "2026-08-05",
      }),
      normalizarParcela({
        id: "b2",
        tipo: "pagar",
        descricao: "Aluguel",
        valor: 5000,
        valorPago: 5000,
        categoria: "Aluguel",
        contraparte: "Imob X",
        dataPagamento: "2026-09-05",
      }),
    ]);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]?.destino).toBe("Horta Sul Ltda");
    expect(conflitos[0]?.rubricas.map(r => r.rubrica).sort()).toEqual([
      "Folhosas",
      "Insumos",
    ]);
  });

  it("ignora lançamentos anteriores a 01/08/2026 no conflito de rúbricas", () => {
    const conflitos = detectarConflitosRubricaPorDestino([
      normalizarParcela({
        id: "jul",
        tipo: "pagar",
        descricao: "Pedido jul",
        valor: 1000,
        valorPago: 1000,
        categoria: "Insumos",
        contraparte: "Horta Norte Ltda",
        dataPagamento: "2026-07-20",
      }),
      normalizarParcela({
        id: "ago",
        tipo: "pagar",
        descricao: "Pedido ago",
        valor: 1200,
        valorPago: 1200,
        categoria: "Folhosas",
        contraparte: "Horta Norte Ltda",
        dataPagamento: "2026-08-10",
      }),
    ]);
    expect(conflitos).toHaveLength(0);
  });
});
