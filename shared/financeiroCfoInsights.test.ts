import { describe, expect, it } from "vitest";
import {
  classificarSetorFinanceiro,
  detectarOportunidadesCompra,
  gerarInsightsCfo,
  montarFluxoPorSemana,
  normalizarParcela,
  resumirCaixa,
  agregarPorSetor,
} from "./financeiroCfoInsights";

describe("financeiroCfoInsights", () => {
  it("classifica setores essenciais", () => {
    expect(classificarSetorFinanceiro("Aluguel galpão")).toBe("aluguel_imoveis");
    expect(classificarSetorFinanceiro("Folha CLT março")).toBe("folha_pessoal");
    expect(classificarSetorFinanceiro("Nutriente A hidroponia")).toBe(
      "insumos_producao",
    );
  });

  it("detecta gap de caixa e despesas adiáveis", () => {
    const receber = [
      normalizarParcela({
        id: "r1",
        tipo: "receber",
        descricao: "Cliente A",
        valor: 1000,
        valorPago: 0,
        valorEmAberto: 1000,
        dataVencimento: "2026-09-10",
        contraparte: "Cliente A",
      }),
    ];
    const pagar = [
      normalizarParcela({
        id: "p1",
        tipo: "pagar",
        descricao: "Marketing Meta Ads",
        valor: 800,
        valorPago: 0,
        valorEmAberto: 800,
        dataVencimento: "2026-09-12",
        categoria: "Marketing",
        contraparte: "Agência X",
      }),
      normalizarParcela({
        id: "p2",
        tipo: "pagar",
        descricao: "Energia elétrica",
        valor: 1500,
        valorPago: 0,
        valorEmAberto: 1500,
        dataVencimento: "2026-09-15",
        categoria: "Energia",
        contraparte: "Concessionária",
      }),
    ];
    const resumo = resumirCaixa(receber, pagar);
    expect(resumo.gapCaixaPrevisto).toBeLessThan(0);
    expect(resumo.aPagarAdiavelEmAberto).toBeGreaterThan(0);
    expect(resumo.aPagarEssencialEmAberto).toBeGreaterThan(0);

    const insights = gerarInsightsCfo({
      resumo,
      setores: agregarPorSetor(pagar),
      fornecedores: [],
      oportunidadesCompra: [],
      saldoContas: 200,
    });
    expect(insights.some(i => i.id === "gap-previsto")).toBe(true);
    expect(insights.some(i => i.tipo === "recuperacao" || i.id === "adiavel")).toBe(
      true,
    );
  });

  it("monta fluxo semanal e oportunidades entre fornecedores", () => {
    const pagar = [
      normalizarParcela({
        id: "a",
        tipo: "pagar",
        descricao: "Embalagem",
        categoria: "Embalagens",
        valor: 1000,
        valorPago: 1000,
        dataPagamento: "2026-09-08",
        dataVencimento: "2026-09-08",
        contraparte: "Fornecedor Caro",
      }),
      normalizarParcela({
        id: "b",
        tipo: "pagar",
        descricao: "Embalagem",
        categoria: "Embalagens",
        valor: 400,
        valorPago: 400,
        dataPagamento: "2026-09-09",
        dataVencimento: "2026-09-09",
        contraparte: "Fornecedor Barato",
      }),
      normalizarParcela({
        id: "c",
        tipo: "pagar",
        descricao: "Embalagem",
        categoria: "Embalagens",
        valor: 1000,
        valorPago: 1000,
        dataPagamento: "2026-09-10",
        dataVencimento: "2026-09-10",
        contraparte: "Fornecedor Caro",
      }),
    ];
    const ops = detectarOportunidadesCompra(pagar);
    expect(ops.length).toBeGreaterThan(0);
    const fluxo = montarFluxoPorSemana(pagar);
    expect(fluxo.length).toBeGreaterThanOrEqual(1);
  });
});
