import { describe, expect, it } from "vitest";
import { rotuloCaixaComoCadastro } from "./rotuloCaixaCadastro";

describe("rotuloCaixaComoCadastro", () => {
  it("usa o nome da caixa e as torres do cadastro, não o número operacional", () => {
    expect(
      rotuloCaixaComoCadastro("Caixa Torre Maturação 1", [
        { nome: "Torre Maturação 2" },
        { nome: "Torre Maturação 1" },
      ]),
    ).toEqual({
      principal: "Caixa Torre Maturação 1",
      detalhe: "Torre Maturação 1 · Torre Maturação 2",
    });
  });

  it("caixa sem torre mostra só o nome cadastrado", () => {
    expect(rotuloCaixaComoCadastro("Caixa Torre Maturação 2", [])).toEqual({
      principal: "Caixa Torre Maturação 2",
    });
  });

  it("preserva Baby Leaf no nome da torre", () => {
    expect(
      rotuloCaixaComoCadastro("Caixa Torre Maturação 13 - Baby Leaf", [
        { nome: "Torre Maturação 14 - Baby Leaf" },
        { nome: "Torre Maturação 13 - Baby Leaf" },
      ]).detalhe,
    ).toBe("Torre Maturação 13 - Baby Leaf · Torre Maturação 14 - Baby Leaf");
  });
});
