import { describe, expect, it } from "vitest";
import { bytesDaFoto, jpegValido, marcaHeic, produtoVisivelNaLoja } from "./portalLoja";
import { fichaDoProduto } from "./vitrineCopy";

describe("fichaDoProduto", () => {
  it("separa microverde, flor, processado e folha", () => {
    expect(fichaDoProduto("Beterraba / Microverdes").grupo).toBe("Microverdes");
    expect(fichaDoProduto("Beterraba / Microverdes").foto).toBe("/produtos/micro-beterraba.jpg");
    expect(fichaDoProduto("Coentro / Microverdes").foto).toBe("/produtos/micro-coentro.jpg");
    expect(fichaDoProduto("Baby Leaf -Manjericão").foto).toBe("/produtos/baby-manjericao.jpg");
    expect(fichaDoProduto("MIx de Alfaces com Rúcula 100g").foto).toBe("/produtos/mix-rucula.jpg");
    expect(fichaDoProduto("Batata Bolinha Kg").foto).not.toBe(fichaDoProduto("Batata Portuguesa Kg").foto);
    expect(fichaDoProduto("Mix de flores - Flores").grupo).toBe("Flores");
    expect(fichaDoProduto("Cenoura Higienizada e Descascada- 200g").grupo).toBe("Minimamente Processados");
    expect(fichaDoProduto("Alface Crespa Roxa 100g").foto).toBe("/produtos/alface-roxa.jpg?v=1");
    expect(fichaDoProduto("Alface Americana 150g").foto).toBe("/produtos/americana.jpg?v=1");
    expect(fichaDoProduto("Alface Crespa 200g").foto).toBe("/produtos/alface.jpg?v=1");
    expect(fichaDoProduto("Rúcula").grupo).toBe("Folhas");
    expect(fichaDoProduto("Manjericão Folha Fina 60g").grupo).toBe("Ervas");
    expect(fichaDoProduto("Folhas de Manjericão 50g").foto).toBe("/produtos/manjericao.jpg?v=1");
    expect(fichaDoProduto("Baby Leaf -Manjericão").foto).toBe("/produtos/baby-manjericao.jpg");
    expect(fichaDoProduto("Mix Clássico 80g").grupo).toBe("Saladas");
    expect(fichaDoProduto("Mix Clássico 80g").foto).toBe("/produtos/mix-classico.jpg?v=1");
    expect(fichaDoProduto("Mix Chefe - Seleção Especial").foto).toBe("/produtos/mix-chefe.jpg?v=1");
    expect(fichaDoProduto("Mix Crocante - Base para Salada").foto).toBe("/produtos/mix-crocante.jpg?v=1");
    expect(fichaDoProduto("Mix de Alfaces 200g").foto).toBe("/produtos/mix-alfaces.jpg?v=1");
    expect(fichaDoProduto("Alho Inteiro Descascado e Higienizado Kg").grupo).toBe("Minimamente Processados");
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
    const heic = Buffer.alloc(16);
    heic.write("ftypheic", 4, "ascii");
    expect(marcaHeic(heic)).toBe(true);
    expect(marcaHeic(jpeg)).toBe(false);
  });

  it("entrega a foto como buffer, mesmo quando o banco devolve um array de bytes", () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 1, 2, 3]);
    const bytes = bytesDaFoto(jpeg);
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });
});