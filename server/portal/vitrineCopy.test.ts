import { describe, expect, it } from "vitest";
import { jpegValido, produtoVisivelNaLoja } from "./portalLoja";
import { fichaDoProduto } from "./vitrineCopy";

describe("fichaDoProduto", () => {
  it("separa microverde, flor, processado e folha", () => {
    expect(fichaDoProduto("Beterraba / Microverdes").grupo).toBe("Microverdes");
    expect(fichaDoProduto("Mix de flores - Flores").grupo).toBe("Flores");
    expect(fichaDoProduto("Cenoura Higienizada e Descascada- 200g").grupo).toBe("Processados");
    expect(fichaDoProduto("Alface Crespa Roxa 100g").foto).toBe("/produtos/alface-roxa.jpg");
    expect(fichaDoProduto("Rúcula").grupo).toBe("Folhas");
    expect(fichaDoProduto("Manjericão Folha Fina 60g").grupo).toBe("Ervas");
    expect(fichaDoProduto("Mix Clássico 80g").grupo).toBe("Saladas");
    expect(fichaDoProduto("Alho Inteiro Descascado e Higienizado Kg").grupo).toBe("Processados");
  });

  it("esconde produto exclusivo de quem não tem o preço na regra", () => {
    expect(produtoVisivelNaLoja({ visivel: true, exclusivo: false, temPrecoEspecial: false, logado: false })).toBe(true);
    expect(produtoVisivelNaLoja({ visivel: true, exclusivo: true, temPrecoEspecial: false, logado: false })).toBe(false);
    expect(produtoVisivelNaLoja({ visivel: true, exclusivo: true, temPrecoEspecial: false, logado: true })).toBe(false);
    expect(produtoVisivelNaLoja({ visivel: true, exclusivo: true, temPrecoEspecial: true, logado: true })).toBe(true);
    expect(produtoVisivelNaLoja({ visivel: false, exclusivo: false, temPrecoEspecial: true, logado: true })).toBe(false);
  });

  it("aceita só jpeg com tamanho de foto", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, ...new Array(120).fill(1)]);
    expect(jpegValido(jpeg)).toBe(true);
    expect(jpegValido(Buffer.from("nao-e-foto"))).toBe(false);
  });
});