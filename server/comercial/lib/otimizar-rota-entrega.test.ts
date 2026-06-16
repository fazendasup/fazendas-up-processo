import { describe, expect, it } from "vitest";
import {
  bucketPeriodoEntrega,
  distanciaHaversineMetros,
  otimizarNearestNeighbor,
} from "./otimizar-rota-entrega";

describe("otimizar-rota-entrega", () => {
  it("prioriza manhã antes de tarde nos buckets", () => {
    expect(bucketPeriodoEntrega("MANHA")).toBeLessThan(bucketPeriodoEntrega("TARDE"));
    expect(bucketPeriodoEntrega("TARDE")).toBeLessThan(bucketPeriodoEntrega(null));
  });

  it("nearest neighbor escolhe o ponto mais próximo", () => {
    const origem = { lat: 0, lng: 0 };
    const ordem = otimizarNearestNeighbor(origem, [
      { idx: 0, lat: 0.01, lng: 0.01 },
      { idx: 1, lat: 0.001, lng: 0.001 },
      { idx: 2, lat: 0.05, lng: 0.05 },
    ]);
    expect(ordem[0]).toBe(1);
  });

  it("calcula distância haversine de forma simétrica", () => {
    const a = { lat: -3.119, lng: -60.0217 };
    const b = { lat: -3.1, lng: -60.01 };
    const d1 = distanciaHaversineMetros(a, b);
    const d2 = distanciaHaversineMetros(b, a);
    expect(d1).toBeGreaterThan(0);
    expect(d1).toBeCloseTo(d2, 5);
  });
});
