import {
  listarMesesYmEntre,
  periodoMesAnterior,
} from "@shared/comercial/periodo-america-sp";

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
  /** Unidades vendidas (só ABC de produtos). */
  quantidade?: number;
};

export function curvaAbc(
  rows: Array<{ id: string; nome: string; valor: number; quantidade?: number }>
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
      ...(row.quantidade != null
        ? { quantidade: round2(row.quantidade) }
        : {}),
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

export type ProjecaoVolumeProdutoBase = {
  produto: string;
  categoria: string | null;
  quantidadeTotal: number;
  valorBrutoTotal: number;
  quantidadeMediaMensal: number;
  valorMediaMensal: number;
};

/**
 * Média mensal de volume (unidades) e faturamento bruto por produto
 * no período: total ÷ nº de meses civis do intervalo.
 */
export function montarProjecaoVolumeBase(input: {
  inicio: Date;
  fim: Date;
  produtos: Array<{
    produto: string;
    categoria?: string | null;
    quantidade: number;
    valorBruto: number;
  }>;
}): {
  mesesBase: string[];
  nMesesBase: number;
  produtos: ProjecaoVolumeProdutoBase[];
  totais: {
    quantidadeTotal: number;
    valorBrutoTotal: number;
    quantidadeMediaMensal: number;
    valorMediaMensal: number;
  };
} {
  const mesesBase = listarMesesYmEntre(input.inicio, input.fim);
  const nMesesBase = Math.max(mesesBase.length, 1);
  const produtos = [...input.produtos]
    .filter(p => p.quantidade > 0 || p.valorBruto > 0)
    .map(p => ({
      produto: p.produto,
      categoria: p.categoria ?? null,
      quantidadeTotal: round2(p.quantidade),
      valorBrutoTotal: round2(p.valorBruto),
      quantidadeMediaMensal: round2(p.quantidade / nMesesBase),
      valorMediaMensal: round2(p.valorBruto / nMesesBase),
    }))
    .sort(
      (a, b) =>
        b.valorMediaMensal - a.valorMediaMensal ||
        b.quantidadeMediaMensal - a.quantidadeMediaMensal ||
        a.produto.localeCompare(b.produto, "pt-BR")
    );

  const quantidadeTotal = round2(
    produtos.reduce((s, p) => s + p.quantidadeTotal, 0)
  );
  const valorBrutoTotal = round2(
    produtos.reduce((s, p) => s + p.valorBrutoTotal, 0)
  );

  return {
    mesesBase,
    nMesesBase,
    produtos,
    totais: {
      quantidadeTotal,
      valorBrutoTotal,
      quantidadeMediaMensal: round2(quantidadeTotal / nMesesBase),
      valorMediaMensal: round2(valorBrutoTotal / nMesesBase),
    },
  };
}
