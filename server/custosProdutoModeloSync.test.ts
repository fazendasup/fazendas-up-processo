import { describe, expect, it } from "vitest";
import { etapasEsperadasParaMapeamento } from "./custosProdutoModeloSync";
import type { ProcessoModeloRecord } from "@shared/custosLinhaProcessoIndustrial";
import { LINHA_PROCESSO_INDUSTRIAL_PADRAO } from "@shared/custosLinhaProcessoIndustrial";

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

  it("recalcula lavagem R$/kg quando R$/h das equipes muda", () => {
    const modeloComLinha: ProcessoModeloRecord = {
      ...modeloBase,
      linhaProcesso: LINHA_PROCESSO_INDUSTRIAL_PADRAO,
    };
    const mapaBaixo = { clt: 20, pj: 15, misto: 17.5 };
    const mapaAlto = { clt: 40, pj: 30, misto: 35 };
    const etapasBaixo = etapasEsperadasParaMapeamento(
      "lavagem_embalagem",
      "alface",
      modeloComLinha,
      mapaBaixo,
    );
    const etapasAlto = etapasEsperadasParaMapeamento(
      "lavagem_embalagem",
      "alface",
      modeloComLinha,
      mapaAlto,
    );
    const lavagemBaixo = etapasBaixo.find((e) => e.tipo === "lavagem")?.custoPorKgProcessado ?? 0;
    const lavagemAlto = etapasAlto.find((e) => e.tipo === "lavagem")?.custoPorKgProcessado ?? 0;
    expect(lavagemBaixo).toBeGreaterThan(0);
    expect(lavagemAlto).toBeGreaterThan(lavagemBaixo);
  });
});
