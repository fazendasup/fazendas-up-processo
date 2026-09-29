import { describe, expect, it } from "vitest";
import {
  CELULAS_PADRAO_BANDEJA_MUDAS,
  nomeTorreComoMicroverdes,
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
});