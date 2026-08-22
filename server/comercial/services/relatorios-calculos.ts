import { periodoMesAnterior } from "@shared/comercial/periodo-america-sp";

export function n(v: unknown): number {
  const out = Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Mesmo intervalo de dias no mês anterior (ex.: 1–22/ago → 1–22/jul). */
export function periodoAnterior(inicio: Date, fim: Date): { inicio: Date; fim: Date } {
  return periodoMesAnterior(inicio, fim);
}

export function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior <= 0) return atual > 0 ? 1 : null;
  return round2((atual - anterior) / anterior);
}

export type AbcRow = {
  id: string;
  nome: string;
  valor: number;
  participacao: number;
  acumulado: number;
  classe: "A" | "B" | "C";
};

export function curvaAbc(
  rows: Array<{ id: string; nome: string; valor: number }>
): AbcRow[] {
  const sorted = [...rows]
    .filter(r => r.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const total = sorted.reduce((sum, r) => sum + r.valor, 0);
  if (total <= 0) return [];

  let acumulado = 0;
  return sorted.map(row => {
    acumulado += row.valor;
    const pctAcum = acumulado / total;
    const classe: AbcRow["classe"] =
      pctAcum <= 0.8 ? "A" : pctAcum <= 0.95 ? "B" : "C";
    return {
      id: row.id,
      nome: row.nome,
      valor: round2(row.valor),
      participacao: round2(row.valor / total),
      acumulado: round2(pctAcum),
      classe,
    };
  });
}

export function addMap<T>(map: Map<string, T>, key: string, init: () => T): T {
  const current = map.get(key);
  if (current) return current;
  const created = init();
  map.set(key, created);
  return created;
}
