import { describe, expect, it } from "vitest";
import {
  baseSemTaxaCartao,
  formaPagamentoDoRegistro,
  resolverBaseCobrancaPessoa,
  somarBaseItensPedido,
  totalCobrancaPessoa,
} from "./portalPagamento";

describe("cobrança PF — taxa de cartão 5%", () => {
  const base = 12.79;

  it("Pix cobra só a base dos produtos", () => {
    expect(totalCobrancaPessoa(base, "pix")).toBe(12.79);
  });

  it("cartão acrescenta exatamente 5%", () => {
    expect(totalCobrancaPessoa(base, "cartao")).toBe(13.43);
  });

  it("não aplica taxa duas vezes se a base já estiver correta", () => {
    const comTaxa = totalCobrancaPessoa(base, "cartao");
    // totalCobrancaPessoa espera base sem taxa — se alguém passar o total com taxa por engano:
    expect(totalCobrancaPessoa(comTaxa, "cartao")).toBe(14.1);
  });

  it("ao voltar do cartão para Pix, remove a taxa", () => {
    expect(baseSemTaxaCartao(13.43, "cartao")).toBe(12.79);
    expect(totalCobrancaPessoa(baseSemTaxaCartao(13.43, "cartao"), "pix")).toBe(12.79);
  });

  it("Pix→Pix não inventa desconto", () => {
    expect(baseSemTaxaCartao(12.79, "pix")).toBe(12.79);
  });
});

describe("resolverBaseCobrancaPessoa", () => {
  const itens = [
    { precoUnit: 7.59, quantidade: 1 },
    { precoUnit: 5.2, quantidade: 1 },
  ];

  it("soma itens com Decimal-like e arredonda", () => {
    expect(somarBaseItensPedido(itens)).toBe(12.79);
    expect(somarBaseItensPedido([{ precoUnit: "7.59", quantidade: "1.000" }])).toBe(7.59);
  });

  it("troca cartão→Pix usa itens (sem taxa)", () => {
    expect(
      resolverBaseCobrancaPessoa({
        itens,
        totalCobradoAtual: 13.43,
        formaAnterior: "cartao",
      }),
    ).toBe(12.79);
  });

  it("troca Pix→cartão usa itens (sem taxa)", () => {
    expect(
      resolverBaseCobrancaPessoa({
        itens,
        totalCobradoAtual: 12.79,
        formaAnterior: "pix",
      }),
    ).toBe(12.79);
  });

  it("fallback sem itens: tira 5% se a forma anterior era cartão", () => {
    expect(
      resolverBaseCobrancaPessoa({
        itens: [],
        totalCobradoAtual: 13.43,
        formaAnterior: "cartao",
      }),
    ).toBe(12.79);
  });

  it("fallback sem itens: mantém valor se a forma anterior era Pix", () => {
    expect(
      resolverBaseCobrancaPessoa({
        itens: [],
        totalCobradoAtual: 12.79,
        formaAnterior: "pix",
      }),
    ).toBe(12.79);
  });

  it("ignora preço nulo sem zerar o restante", () => {
    expect(
      somarBaseItensPedido([
        { precoUnit: null, quantidade: 1 },
        { precoUnit: 5.2, quantidade: 1 },
      ]),
    ).toBe(5.2);
  });
});

describe("cenários marketplace Pix ↔ cartão", () => {
  const base = 12.79;

  const matriz: Array<{
    de: "pix" | "cartao" | null;
    para: "pix" | "cartao";
    totalAntes: number;
    totalDepois: number;
  }> = [
    { de: null, para: "pix", totalAntes: 0, totalDepois: 12.79 },
    { de: null, para: "cartao", totalAntes: 0, totalDepois: 13.43 },
    { de: "pix", para: "cartao", totalAntes: 12.79, totalDepois: 13.43 },
    { de: "cartao", para: "pix", totalAntes: 13.43, totalDepois: 12.79 },
    { de: "pix", para: "pix", totalAntes: 12.79, totalDepois: 12.79 },
    { de: "cartao", para: "cartao", totalAntes: 13.43, totalDepois: 13.43 },
  ];

  for (const caso of matriz) {
    it(`${caso.de ?? "novo"} → ${caso.para}: R$ ${caso.totalDepois}`, () => {
      const baseResolvida = resolverBaseCobrancaPessoa({
        itens: [
          { precoUnit: 7.59, quantidade: 1 },
          { precoUnit: 5.2, quantidade: 1 },
        ],
        totalCobradoAtual: caso.totalAntes || base,
        formaAnterior: caso.de,
      });
      expect(totalCobrancaPessoa(baseResolvida, caso.para)).toBe(caso.totalDepois);
    });
  }

  it("ciclo completo Pix→cartão→Pix não deixa taxa residual", () => {
    let cobrado = totalCobrancaPessoa(base, "pix");
    expect(cobrado).toBe(12.79);

    let baseAtual = resolverBaseCobrancaPessoa({
      itens: [
        { precoUnit: 7.59, quantidade: 1 },
        { precoUnit: 5.2, quantidade: 1 },
      ],
      totalCobradoAtual: cobrado,
      formaAnterior: "pix",
    });
    cobrado = totalCobrancaPessoa(baseAtual, "cartao");
    expect(cobrado).toBe(13.43);

    baseAtual = resolverBaseCobrancaPessoa({
      itens: [
        { precoUnit: 7.59, quantidade: 1 },
        { precoUnit: 5.2, quantidade: 1 },
      ],
      totalCobradoAtual: cobrado,
      formaAnterior: "cartao",
    });
    cobrado = totalCobrancaPessoa(baseAtual, "pix");
    expect(cobrado).toBe(12.79);
  });

  it("ciclo só com fallback (sem itens) também remove a taxa", () => {
    let cobrado = totalCobrancaPessoa(base, "cartao");
    expect(cobrado).toBe(13.43);
    const baseVolta = resolverBaseCobrancaPessoa({
      itens: [],
      totalCobradoAtual: cobrado,
      formaAnterior: "cartao",
    });
    expect(totalCobrancaPessoa(baseVolta, "pix")).toBe(12.79);
  });
});

describe("formaPagamentoDoRegistro", () => {
  it("prioriza Pix quando só há Pix", () => {
    expect(formaPagamentoDoRegistro({ pixCobrancaId: "a", pixUrl: "u" })).toBe("pix");
  });

  it("reconhece cartão", () => {
    expect(formaPagamentoDoRegistro({ cartaoCobrancaId: "b", cartaoUrl: "u" })).toBe("cartao");
  });

  it("estado sujo (ambos): cartão vence para não mostrar Pix com total de cartão", () => {
    expect(
      formaPagamentoDoRegistro({
        pixCobrancaId: "pix",
        cartaoCobrancaId: "card",
        pixUrl: "p",
        cartaoUrl: "c",
      }),
    ).toBe("cartao");
  });
});
