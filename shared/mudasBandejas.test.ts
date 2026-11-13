import { describe, expect, it } from "vitest";
import {
  CELULAS_PADRAO_BANDEJA_MUDAS,
  caixaElegivelProgramacao,
  idCaixaMudasCompartilhada,
  nomeTorreComoMicroverdes,
  torreEhMicroverdesCultivo,
  torreEhMudasOperacional,
  torreMudasViraMicroverdes,
} from "./mudasBandejas";

describe("torre de mudas vira microverdes", () => {
  it("converte a torre antiga e preserva o identificador", () => {
    expect(
      torreMudasViraMicroverdes({ fase: "mudas", slug: "torre-mudas", cultivo: "folhosa" }, false),
    ).toBe(true);
  });

  it("não converte de novo depois que as torres de bandeja existem", () => {
    expect(
      torreMudasViraMicroverdes({ fase: "mudas", slug: "torre-mudas", cultivo: "folhosa" }, true),
    ).toBe(false);
  });

  it("não converte as torres novas de bandeja", () => {
    expect(
      torreMudasViraMicroverdes({ fase: "mudas", slug: "mudas-b-1", cultivo: "folhosa" }, false),
    ).toBe(false);
  });

  it("padrão da bandeja é 345 células", () => {
    expect(CELULAS_PADRAO_BANDEJA_MUDAS).toBe(345);
  });

  it("renomeia sem apagar o restante do nome", () => {
    expect(nomeTorreComoMicroverdes("Torre Mudas")).toBe("Torre Microverdes");
    expect(nomeTorreComoMicroverdes("Torre Microverdes")).toBe("Torre Microverdes");
  });

  it("distingue mudas operacional de cultivo microverdes", () => {
    expect(torreEhMudasOperacional({ fase: "mudas", cultivo: "folhosa" })).toBe(true);
    expect(torreEhMudasOperacional({ fase: "mudas", cultivo: "microverdes" })).toBe(false);
    expect(torreEhMicroverdesCultivo({ cultivo: "microverdes" })).toBe(true);
    expect(torreEhMicroverdesCultivo({ cultivo: "folhosa" })).toBe(false);
  });

  it("escolhe uma caixa compartilhada de mudas e exclui microverdes da programação", () => {
    const torres = [
      { caixaAguaId: "ca-a", fase: "mudas", cultivo: "folhosa" },
      { caixaAguaId: "ca-a", fase: "mudas", cultivo: "folhosa" },
      { caixaAguaId: "ca-b", fase: "mudas", cultivo: "folhosa" },
      { caixaAguaId: "ca-mv", fase: "mudas", cultivo: "microverdes" },
    ];
    expect(idCaixaMudasCompartilhada(torres)).toBe("ca-a");
    expect(
      caixaElegivelProgramacao({ id: "ca-a", fase: "mudas" }, torres, "ca-a"),
    ).toBe(true);
    expect(
      caixaElegivelProgramacao({ id: "ca-b", fase: "mudas" }, torres, "ca-a"),
    ).toBe(false);
    expect(
      caixaElegivelProgramacao({ id: "ca-mv", fase: "mudas" }, torres, "ca-a"),
    ).toBe(false);
  });
});