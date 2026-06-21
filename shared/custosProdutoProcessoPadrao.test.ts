import { describe, expect, it } from "vitest";
import {
  calcularLavagemReaisKgDeLote,
  etapasProcessoPadraoParaPerfil,
  etapasProcessoPadraoParaProduto,
  inferirCategoriaProdutoCusto,
  inferirPerfilProcessoSugerido,
  sugerirMapeamentoProduto,
} from "./custosProdutoProcessoPadrao";
import {
  calcularLinhaProcessoIndustrial,
  LINHA_PROCESSO_FLORES_PADRAO,
  LINHA_PROCESSO_MICROVERDES_PADRAO,
} from "./custosLinhaProcessoIndustrial";

describe("custosProdutoProcessoPadrao", () => {
  it("infere microverde e perfil sem lavagem", () => {
    expect(inferirCategoriaProdutoCusto("Acelga / Microverdes")).toBe("microverde");
    expect(inferirPerfilProcessoSugerido("Acelga / Microverdes")).toBe("microverde_embalagem");
    const calc = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_MICROVERDES_PADRAO);
    const etapas = etapasProcessoPadraoParaPerfil("microverde_embalagem", "microverde", {
      embalagemMicroverdeUn: 0.95,
      embalagemOutrosUn: 0.6,
      lavagemReaisKg: 0,
      lavagemMinutosUn: null,
      embalagemMinutosUn: null,
      corteMinutosUn: null,
      adesivoCustoUn: null,
      regimeMoPadrao: "qualquer",
      incluirAdesivo: false,
      logisticaPercentualPadrao: 10,
    }, calc);
    expect(etapas.some((e) => e.tipo === "lavagem")).toBe(false);
    expect(etapas.find((e) => e.nome === "Colheita (MO)")?.minutosPorUnidade).toBe(1.5);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.95);
    expect(etapas.find((e) => e.tipo === "logistica")?.custoPercentual).toBe(10);
  });

  it("infere flores comestíveis e perfil colheita + embalagem", () => {
    expect(inferirCategoriaProdutoCusto("Mix de flores / Restaurante")).toBe("flores");
    expect(inferirPerfilProcessoSugerido("Mix de flores / Restaurante")).toBe("colheita_embalagem");
    const calc = calcularLinhaProcessoIndustrial(LINHA_PROCESSO_FLORES_PADRAO);
    const etapas = etapasProcessoPadraoParaPerfil("colheita_embalagem", "flores", {
      embalagemMicroverdeUn: 0.95,
      embalagemOutrosUn: 0.6,
      lavagemReaisKg: 0,
      lavagemMinutosUn: null,
      embalagemMinutosUn: null,
      corteMinutosUn: null,
      adesivoCustoUn: null,
      regimeMoPadrao: "qualquer",
      incluirAdesivo: true,
      logisticaPercentualPadrao: 10,
    }, calc);
    expect(etapas.some((e) => e.tipo === "lavagem")).toBe(false);
    expect(etapas.some((e) => e.tipo === "descasque_corte")).toBe(false);
    expect(etapas.find((e) => e.nome === "Seleção (MO)")?.minutosPorUnidade).toBe(2);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.6);
    expect(etapas.find((e) => e.tipo === "logistica")?.custoPercentual).toBe(10);
  });

  it("baby leaf sugere colheita sem lavagem", () => {
    expect(inferirPerfilProcessoSugerido("Baby Leaf - Manjericão")).toBe("colheita_embalagem");
  });

  it("alface sugere lavagem por kg", () => {
    expect(inferirPerfilProcessoSugerido("Alface 240g Plano 3")).toBe("lavagem_embalagem");
    const etapas = etapasProcessoPadraoParaPerfil("lavagem_embalagem", "alface", {
      embalagemMicroverdeUn: 0.95,
      embalagemOutrosUn: 0.6,
      lavagemReaisKg: 0.25,
      lavagemMinutosUn: null,
      embalagemMinutosUn: null,
      corteMinutosUn: null,
      adesivoCustoUn: null,
      regimeMoPadrao: "qualquer",
      incluirAdesivo: true,
      logisticaPercentualPadrao: 10,
    });
    expect(etapas.find((e) => e.tipo === "lavagem")?.custoPorKgProcessado).toBe(0.25);
    expect(etapas.find((e) => e.tipo === "logistica")?.custoPercentual).toBe(10);
  });

  it("calcula R$/kg de lote de lavagem", () => {
    expect(
      calcularLavagemReaisKgDeLote({
        minutosLote: 40,
        kgTotalLote: 80,
        custoHoraMo: 30,
      }),
    ).toBeCloseTo(0.25, 4);
  });

  it("mapeamento sugerido traz ids", () => {
    const m = sugerirMapeamentoProduto("abc", "Agrião", null);
    expect(m.produtoComercialId).toBe("abc");
    expect(m.perfilProcesso).toBe("lavagem_embalagem");
  });

  it("compat etapasProcessoPadraoParaProduto", () => {
    expect(etapasProcessoPadraoParaProduto("outros").find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(
      0.6,
    );
  });
});
