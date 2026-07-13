import { describe, expect, it } from "vitest";
import { clientePodeAcumularPedidos } from "./clientesAcumuloPedidos";

describe("clientePodeAcumularPedidos", () => {
  it("permite Licco, Spoleto, Marinara, Novotel e Padoca", () => {
    expect(clientePodeAcumularPedidos("Licco Casa Gourmet")).toBe(true);
    expect(clientePodeAcumularPedidos("Spoleto Shopping")).toBe(true);
    expect(clientePodeAcumularPedidos("Marinara")).toBe(true);
    expect(clientePodeAcumularPedidos("Ibis Novotel")).toBe(true);
    expect(clientePodeAcumularPedidos("Novotel Center Norte")).toBe(true);
    expect(clientePodeAcumularPedidos("Padoca do Bairro")).toBe(true);
  });

  it("bloqueia demais clientes", () => {
    expect(clientePodeAcumularPedidos("Restaurante XYZ")).toBe(false);
    expect(clientePodeAcumularPedidos("Ibis Budget")).toBe(false);
    expect(clientePodeAcumularPedidos("")).toBe(false);
    expect(clientePodeAcumularPedidos(null)).toBe(false);
  });
});
