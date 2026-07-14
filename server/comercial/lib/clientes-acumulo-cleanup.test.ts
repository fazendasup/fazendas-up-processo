import { describe, expect, it } from "vitest";
import { acumulaPedidosEfetivo } from "./clientes-acumulo-cleanup";

describe("acumulaPedidosEfetivo", () => {
  it("desliga clientes fora da allowlist mesmo com flag true", () => {
    expect(acumulaPedidosEfetivo(true, "Banzeiro Cozinha Amazônica")).toBe(false);
    expect(acumulaPedidosEfetivo(true, "UNA VITTA")).toBe(false);
  });

  it("mantém allowlist", () => {
    expect(acumulaPedidosEfetivo(true, "Licco Casa Gourmet")).toBe(true);
    expect(acumulaPedidosEfetivo(true, "Spoleto")).toBe(true);
    expect(acumulaPedidosEfetivo(false, "Spoleto")).toBe(false);
  });
});
