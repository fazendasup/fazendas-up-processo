import { describe, expect, it } from "vitest";
import { temEtapaLogistica } from "@shared/custosProduto";
import { normalizarEtapasLogisticaPersist } from "./custosProdutoLogisticaSync";
import type { CustoProdutoEtapaRow } from "../drizzle/schema";

function etapaRow(partial: Partial<CustoProdutoEtapaRow> & Pick<CustoProdutoEtapaRow, "tipo" | "nome">): CustoProdutoEtapaRow {
  return {
    id: partial.id ?? 1,
    fichaId: partial.fichaId ?? 1,
    tipo: partial.tipo,
    nome: partial.nome,
    custoPorUnidade: partial.custoPorUnidade ?? "0",
    custoPorKgProcessado: partial.custoPorKgProcessado ?? null,
    custoPercentual: partial.custoPercentual ?? null,
    minutosPorUnidade: partial.minutosPorUnidade ?? null,
    regimeMo: partial.regimeMo ?? "qualquer",
    ordem: partial.ordem ?? 0,
  };
}

describe("normalizarEtapasLogisticaPersist", () => {
  it("nao altera ficha que ja tem logistica unica", () => {
    const etapas = [
      etapaRow({ id: 1, tipo: "embalagem", nome: "Embalagem", ordem: 0 }),
      etapaRow({ id: 2, tipo: "logistica", nome: "Logística", custoPercentual: "10", ordem: 1 }),
    ];
    const r = normalizarEtapasLogisticaPersist(etapas, 10);
    expect(r.changed).toBe(false);
    expect(r.etapas).toHaveLength(2);
  });

  it("adiciona logistica quando ausente", () => {
    const etapas = [etapaRow({ tipo: "embalagem", nome: "Embalagem", custoPorUnidade: "1" })];
    const r = normalizarEtapasLogisticaPersist(etapas, 10);
    expect(r.changed).toBe(true);
    expect(temEtapaLogistica(r.etapas)).toBe(true);
    expect(r.etapas.find((e) => e.tipo === "logistica")?.custoPercentual).toBe("10");
  });

  it("deduplica duas etapas logistica", () => {
    const etapas = [
      etapaRow({ id: 1, tipo: "embalagem", nome: "Emb", ordem: 0 }),
      etapaRow({ id: 2, tipo: "logistica", nome: "Logística", custoPercentual: "10", ordem: 1 }),
      etapaRow({ id: 3, tipo: "logistica", nome: "Logística", custoPercentual: "10", ordem: 2 }),
    ];
    const r = normalizarEtapasLogisticaPersist(etapas, 10);
    expect(r.changed).toBe(true);
    expect(r.deduplicada).toBe(true);
    expect(r.etapas.filter((e) => e.tipo === "logistica")).toHaveLength(1);
  });

  it("preserva logistica manual em outros", () => {
    const etapas = [
      etapaRow({ tipo: "embalagem", nome: "Emb", ordem: 0 }),
      etapaRow({ tipo: "outros", nome: "Logística", custoPercentual: "12", ordem: 1 }),
    ];
    const r = normalizarEtapasLogisticaPersist(etapas, 10);
    expect(r.changed).toBe(true);
    expect(r.etapas.filter((e) => e.tipo === "logistica")).toHaveLength(1);
    expect(r.etapas.find((e) => e.tipo === "logistica")?.custoPercentual).toBe("12");
  });
});
