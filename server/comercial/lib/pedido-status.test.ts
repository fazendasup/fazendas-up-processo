import { describe, expect, it } from "vitest";
import { classificarStatusPedido } from "./pedido-status";

describe("classificarStatusPedido", () => {
  it("não conta pedido em andamento como venda realizada", () => {
    expect(classificarStatusPedido("Em andamento")).toBe("outro");
  });

  it("conta status finalizados como venda", () => {
    expect(classificarStatusPedido("Faturado")).toBe("venda");
    expect(classificarStatusPedido("Venda realizada")).toBe("venda");
  });
});
