import { describe, expect, it } from "vitest";
import {
  escolherContaCobrancaBoleto,
  extrairIdEventoFinanceiro,
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

  it("lê a parcela aninhada em venda.condicao_pagamento", () => {
    expect(
      extrairIdParcelaVenda({
        venda: {
          condicao_pagamento: {
            parcelas: [{ id: "parc-venda", numero: 1 }],
          },
        },
        evento_financeiro: { id: "evt-1" },
      }),
    ).toBe("parc-venda");
    expect(
      extrairIdEventoFinanceiro({
        evento_financeiro: { id: "evt-1" },
      }),
    ).toBe("evt-1");
  });
});

describe("escolherContaCobrancaBoleto", () => {
  it("prefere Cobranças Conta Azul quando a conta selecionada não emite boleto", () => {
    expect(
      escolherContaCobrancaBoleto(
        [
          { id: "caixa", tipo: "CAIXINHA" },
          { id: "cob", tipo: "COBRANCAS_CONTA_AZUL" },
          { id: "cc", tipo: "CONTA_CORRENTE" },
        ],
        "caixa",
      ),
    ).toBe("cob");
  });

  it("ignora conta corrente comum e usa a Conta PJ Conta Azul", () => {
    expect(
      escolherContaCobrancaBoleto(
        [
          { id: "bb", tipo: "CONTA_CORRENTE", nome: "Banco do Brasil", banco: "BANCO_BRASIL" },
          {
            id: "pj",
            tipo: "CONTA_CORRENTE",
            nome: "Conta PJ Conta Azul IP",
            banco: "CONTAAZUL_IP",
          },
        ],
        "bb",
      ),
    ).toBe("pj");
  });

  it("mantém a conta selecionada quando ela já emite boleto", () => {
    expect(
      escolherContaCobrancaBoleto(
        [
          { id: "cob", tipo: "COBRANCAS_CONTA_AZUL" },
          { id: "pj", tipo: "CONTA_CORRENTE", banco: "CONTAAZUL_IP" },
        ],
        "cob",
      ),
    ).toBe("cob");
  });

  it("não escolhe conta corrente sem configuração de boleto", () => {
    expect(
      escolherContaCobrancaBoleto(
        [
          { id: "bb", tipo: "CONTA_CORRENTE", banco: "BANCO_BRASIL" },
          { id: "bradesco", tipo: "CONTA_CORRENTE", banco: "BRADESCO" },
        ],
        "bb",
      ),
    ).toBeNull();
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
