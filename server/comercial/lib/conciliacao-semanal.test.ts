import { describe, expect, it } from "vitest";
import {
  classificarClienteSemanal,
  pedidosOperacionaisEfetivos,
} from "./conciliacao-semanal.js";

describe("pedidosOperacionaisEfetivos", () => {
  it("conta vínculos únicos CA + pedidos sem vínculo", () => {
    expect(
      pedidosOperacionaisEfetivos([
        { pedidoContaAzulId: "ca-1" },
        { pedidoContaAzulId: "ca-1" },
        { pedidoContaAzulId: "ca-2" },
        { pedidoContaAzulId: null },
      ]),
    ).toBe(3);
  });
});

describe("classificarClienteSemanal", () => {
  it("ok quando unidades e valor batem apesar de mais entregas que vendas", () => {
    expect(classificarClienteSemanal(2, 1, 0, 0)).toBe("ok");
  });

  it("não marca aguardando venda quando já há faturamento CA", () => {
    expect(classificarClienteSemanal(2, 1, 10, 0)).toBe("divergente");
  });

  it("aguardando venda só sem documento CA na semana", () => {
    expect(classificarClienteSemanal(2, 0, 15, 100)).toBe("aguardando_venda");
  });

  it("venda sem pedido quando só há CA", () => {
    expect(classificarClienteSemanal(0, 1, -5, -10)).toBe("venda_sem_pedido");
  });
});
