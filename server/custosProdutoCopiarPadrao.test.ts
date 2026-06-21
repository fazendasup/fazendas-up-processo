import { describe, expect, it } from "vitest";
import { COPIA_PADRAO_COENTRO_DESTINOS, COPIA_PADRAO_COENTRO_ORIGEM } from "./custosProdutoCopiarPadrao";

describe("custosProdutoCopiarPadrao", () => {
  it("define origem e destinos do lote Coentro", () => {
    expect(COPIA_PADRAO_COENTRO_ORIGEM).toBe("Coentro / Restaurante");
    expect(COPIA_PADRAO_COENTRO_DESTINOS).toHaveLength(9);
    expect(COPIA_PADRAO_COENTRO_DESTINOS).toContain("Rúcula / Microverdes");
  });
});
