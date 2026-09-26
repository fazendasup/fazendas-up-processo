import { describe, expect, it } from "vitest";
import {
  extrairIdParcelaVenda,
  parseProximoNumeroDisponivelCa,
} from "./venda-outbound.service";

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

describe("parseProximoNumeroDisponivelCa", () => {
  it("extrai o nº da mensagem oficial da Conta Azul", () => {
    expect(
      parseProximoNumeroDisponivelCa(
        "Conta Azul (400): O número da venda informado já foi utilizado em outra venda. O nº 5566 é o próximo disponível",
      ),
    ).toBe(5566);
  });

  it("retorna null sem indicação clara", () => {
    expect(parseProximoNumeroDisponivelCa("erro genérico")).toBeNull();
  });
});
