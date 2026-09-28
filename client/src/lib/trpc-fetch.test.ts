import { describe, expect, it } from "vitest";
import { isLongRunningTrpcOp } from "./trpc-fetch";

describe("isLongRunningTrpcOp", () => {
  it("trata a análise financeira como consulta longa", () => {
    expect(isLongRunningTrpcOp("financeiroCfo.analise")).toBe(true);
    expect(isLongRunningTrpcOp("financeiroCfo.dashboard")).toBe(true);
  });

  it("mantém consulta curta no lote padrão", () => {
    expect(isLongRunningTrpcOp("financeiroCfo.listClassificacoes")).toBe(false);
  });
});
