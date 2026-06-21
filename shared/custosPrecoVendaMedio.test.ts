import { describe, expect, it } from "vitest";
import { precoVendaMedio } from "./custosPrecoVendaMedio";

describe("precoVendaMedio", () => {
  it("calcula receita / quantidade", () => {
    expect(precoVendaMedio(8686.83, 1203)).toBeCloseTo(7.22, 2);
  });

  it("retorna null sem vendas", () => {
    expect(precoVendaMedio(0, 10)).toBeNull();
    expect(precoVendaMedio(100, 0)).toBeNull();
  });
});
