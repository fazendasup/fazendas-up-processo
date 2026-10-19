import { describe, expect, it } from "vitest";
import { isLongRunningTrpcOp } from "./trpc-fetch";

describe("isLongRunningTrpcOp", () => {
  it("trata a análise financeira como consulta longa", () => {
    expect(isLongRunningTrpcOp("financeiroCfo.analise")).toBe(true);
    expect(isLongRunningTrpcOp("financeiroCfo.dashboard")).toBe(true);
  });

  it("trata sync de catálogo Conta Azul como operação longa", () => {
    expect(
      isLongRunningTrpcOp("comercial.pedidos.sincronizarCatalogoContaAzul"),
    ).toBe(true);
    expect(
      isLongRunningTrpcOp("comercial.pedidos.repararProdutosInativosContaAzul"),
    ).toBe(true);
  });

  it("mantém consulta curta no lote padrão", () => {
    expect(isLongRunningTrpcOp("financeiroCfo.listClassificacoes")).toBe(false);
  });
});
