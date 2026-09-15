import { describe, expect, it } from "vitest";
import {
  agregarPorRubrica,
  aplicarEdicoesClassificacao,
  ajusteManualParaParcela,
  medirQualidadeAlocacao,
  normalizarParcela,
  parcelasAtivasParaRelatorio,
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
});
