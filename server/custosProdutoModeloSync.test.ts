import { describe, expect, it } from "vitest";
import { etapasEsperadasParaMapeamento } from "./custosProdutoModeloSync";
import type { ProcessoModeloRecord } from "@shared/custosLinhaProcessoIndustrial";

const modeloBase: ProcessoModeloRecord = {
  id: 1,
  nome: "Folhosas",
  slug: "folhosas",
  descricao: null,
  familia: "folhosas",
  isDefault: true,
  kgReferenciaMes: 1000,
  embalagemMicroverdeUn: 0.95,
  embalagemOutrosUn: 0.6,
  lavagemReaisKg: 0.05,
  corteMinutosUn: null,
  embalagemMinutosUn: null,
  adesivoCustoUn: null,
  regimeMoPadrao: "clt",
  incluirAdesivo: false,
  linhaProcesso: { etapas: [] },
};

describe("etapasEsperadasParaMapeamento", () => {
  it("atualiza valor de embalagem quando modelo muda", () => {
    const etapas = etapasEsperadasParaMapeamento("colheita_embalagem", "outros", modeloBase, null);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.6);

    const modeloNovo = { ...modeloBase, embalagemOutrosUn: 0.85 };
    const etapasNovo = etapasEsperadasParaMapeamento("colheita_embalagem", "outros", modeloNovo, null);
    expect(etapasNovo.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.85);
  });

  it("usa embalagem microverde no perfil microverde_embalagem", () => {
    const etapas = etapasEsperadasParaMapeamento("microverde_embalagem", "microverde", modeloBase, null);
    expect(etapas.find((e) => e.tipo === "embalagem")?.custoPorUnidade).toBe(0.95);
  });
});
