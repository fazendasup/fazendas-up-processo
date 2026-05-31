import { describe, expect, it } from "vitest";
import {
  calcularDescontoBoleto,
  composicaoGerencialDoPedido,
  descontoBoletoPercentualNum,
  valorGerencialLiquido,
} from "./valor-gerencial.js";

describe("valor-gerencial", () => {
  it("descontoBoletoPercentualNum limita entre 0 e 100", () => {
    expect(descontoBoletoPercentualNum(2.5)).toBe(2.5);
    expect(descontoBoletoPercentualNum(150)).toBe(100);
    expect(descontoBoletoPercentualNum(null)).toBe(0);
  });

  it("calcularDescontoBoleto aplica percentual sobre o líquido", () => {
    expect(calcularDescontoBoleto(1000, 2)).toBe(20);
    expect(calcularDescontoBoleto(1000, 0)).toBe(0);
  });

  it("valorGerencialLiquido subtrai desconto em boleto sem alterar nota", () => {
    expect(valorGerencialLiquido(1000, 2)).toBe(980);
  });

  it("composicaoGerencialDoPedido preserva composição original e expõe gerencial", () => {
    const out = composicaoGerencialDoPedido(
      { valorBruto: 1000, valorFrete: 0, valorDesconto: 0, valorLiquido: 1000 },
      2,
    );
    expect(out.valorLiquido).toBe(1000);
    expect(out.descontoBoletoValor).toBe(20);
    expect(out.valorGerencial).toBe(980);
  });
});
