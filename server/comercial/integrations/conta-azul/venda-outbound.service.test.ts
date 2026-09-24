import { describe, expect, it } from "vitest";
import { extrairIdParcelaVenda } from "./venda-outbound.service";

describe("extrairIdParcelaVenda", () => {
  it("lê id em condicao_pagamento.parcelas", () => {
    expect(
      extrairIdParcelaVenda({
        condicao_pagamento: {
          parcelas: [{ id: "parc-1", valor: 10 }],
        },
      }),
    ).toBe("parc-1");
  });

  it("aceita id_parcela e installments", () => {
    expect(
      extrairIdParcelaVenda({
        installments: [{ id_parcela: "inst-9" }],
      }),
    ).toBe("inst-9");
  });

  it("retorna null sem parcela", () => {
    expect(extrairIdParcelaVenda({ condicao_pagamento: {} })).toBeNull();
    expect(extrairIdParcelaVenda(null)).toBeNull();
  });
});
