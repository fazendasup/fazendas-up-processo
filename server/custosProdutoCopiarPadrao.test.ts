import { describe, expect, it } from "vitest";
import {
  COPIA_PADRAO_COENTRO_DESTINOS,
  COPIA_PADRAO_COENTRO_ORIGEM,
  findOrigemCoentro,
} from "./custosProdutoCopiarPadrao";

describe("custosProdutoCopiarPadrao", () => {
  it("define origem e destinos do lote Coentro", () => {
    expect(COPIA_PADRAO_COENTRO_ORIGEM).toBe("Coentro / Restaurante");
    expect(COPIA_PADRAO_COENTRO_DESTINOS).toHaveLength(9);
    expect(COPIA_PADRAO_COENTRO_DESTINOS).toContain("Rúcula / Microverdes");
  });

  it("acha origem Coentro com nome aproximado", () => {
    const origem = findOrigemCoentro([
      { id: 1, nome: "Coentro / Restaurantes" } as any,
      { id: 2, nome: "Outro produto" } as any,
    ]);
    expect(origem?.nome).toBe("Coentro / Restaurantes");
  });
});
