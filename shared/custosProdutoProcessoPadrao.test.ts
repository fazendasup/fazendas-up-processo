import { describe, expect, it } from "vitest";
import {
  CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
  custoEmbalagemPorCategoria,
  etapasProcessoPadraoParaProduto,
  inferirCategoriaProdutoCusto,
} from "./custosProdutoProcessoPadrao";

describe("custosProdutoProcessoPadrao", () => {
  it("infere microverde pelo nome", () => {
    expect(inferirCategoriaProdutoCusto("Mix Microverdes Premium")).toBe("microverde");
    expect(inferirCategoriaProdutoCusto("Alface Hidroponica")).toBe("alface");
  });

  it("embalagem microverde 0,95 e demais 0,60", () => {
    expect(custoEmbalagemPorCategoria("microverde")).toBe(0.95);
    expect(custoEmbalagemPorCategoria("outros")).toBe(0.6);
  });

  it("gera embalagem sem etapa mao_de_obra fixa", () => {
    const etapas = etapasProcessoPadraoParaProduto("microverde");
    expect(etapas.some((e) => e.tipo === "mao_de_obra")).toBe(false);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.95);
  });

  it("inclui minutos quando configurado", () => {
    const etapas = etapasProcessoPadraoParaProduto("outros", {
      ...CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
      lavagemMinutosUn: 2,
      embalagemMinutosUn: 1.5,
    });
    expect(etapas.find((e) => e.tipo === "lavagem")?.minutosPorUnidade).toBe(2);
    expect(etapas.find((e) => e.tipo === "embalagem")?.minutosPorUnidade).toBe(1.5);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.6);
  });
});
