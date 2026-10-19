import { describe, expect, it } from "vitest";
import { escolherPessoaExistente } from "./portalPessoa";

describe("escolherPessoaExistente", () => {
  const itens = [
    { id: "a", documento: "97418480210", email: "" },
    { id: "b", documento: "974.184.802-10", email: "adson.tolentino@gmail.com" },
    { id: "c", documento: "97418480210", email: "adson.tolentino@visioneer.com.br" },
  ];

  it("prioriza o id já vinculado ao cliente local", () => {
    expect(escolherPessoaExistente(itens, "97418480210", "adson.tolentino@gmail.com", "c")).toBe("c");
  });

  it("prioriza o e-mail do cadastro no site", () => {
    expect(escolherPessoaExistente(itens, "97418480210", "adson.tolentino@gmail.com")).toBe("b");
  });

  it("aceita documento formatado", () => {
    expect(escolherPessoaExistente([{ id: "x", documento: "974.184.802-10" }], "97418480210", "x@y.com")).toBe("x");
  });
});
