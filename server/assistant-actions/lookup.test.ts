import { describe, expect, it } from "vitest";
import { findTorre, repartirQuantidades, parseFaseRef } from "./lookup";

describe("assistant-actions lookup", () => {
  const torres = [
    { id: 1, nome: "Mudas 1", fase: "mudas", numeroTorre: 1, ativa: true },
    { id: 2, nome: "Vegetativa 3", fase: "vegetativa", numeroTorre: 3, ativa: true },
    { id: 3, nome: "Mudas 1 backup", fase: "mudas", numeroTorre: 1, ativa: false },
  ] as Parameters<typeof findTorre>[0];

  it("parseFaseRef normaliza aliases", () => {
    expect(parseFaseRef("veg")).toBe("vegetativa");
    expect(parseFaseRef("mudas")).toBe("mudas");
  });

  it("findTorre por fase e número", () => {
    const t = findTorre(torres, { fase: "mudas", numeroTorre: 1 });
    expect(t?.id).toBe(1);
  });

  it("findTorre não devolve torre só inativa", () => {
    const onlyInactive = [
      { id: 9, nome: "Mudas backup", fase: "mudas", numeroTorre: 9, ativa: false },
    ] as Parameters<typeof findTorre>[0];
    const t = findTorre(onlyInactive, { fase: "mudas", numeroTorre: 9 });
    expect(t).toBeNull();
  });

  it("repartirQuantidades soma total quando há capacidade", () => {
    const q = repartirQuantidades(100, [40, 40, 40]);
    expect(q.reduce((a, b) => a + b, 0)).toBe(100);
    expect(q.every((n, i) => n <= [40, 40, 40][i]!)).toBe(true);
  });
});
