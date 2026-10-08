import {
  diaIsoAmericaSp,
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
      participacao: row.valor / total,
      acumulado: pctAcum,
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

export type LevantamentoUnidade = {
  clienteId: string;
  cliente: string;
  q1: number;
  q2: number;
  totalUn: number;
  faturamentoQ1: number;
  faturamentoQ2: number;
  faturamento: number;
  vendas: number;
  share: number;
};

export type LevantamentoUnidades = {
  precoMedio: number;
  volumeTotal: number;
  faturamentoTotal: number;
  volumeQ1: number;
  volumeQ2: number;
  faturamentoQ1: number;
  faturamentoQ2: number;
  variacaoVolumeQ2: number | null;
  vendas: number;
  unidades: number;
  mediaPorUnidade: number;
  faturamentoMedioPorUnidade: number;
  top3: {
    nomes: string;
    volume: number;
    faturamento: number;
    share: number;
  };
  linhas: LevantamentoUnidade[];
};

function quinzenaAmericaSp(data: Date): 1 | 2 {
  const dia = Number(diaIsoAmericaSp(data).slice(8, 10));
  return dia <= 15 ? 1 : 2;
}

/** Volume e faturamento por cliente, partido em 1ª quinzena (dias 1–15) e 2ª (dia 16 em diante). */
export function montarLevantamentoUnidades(
  vendas: Array<{
    dataPedido: Date;
    clienteId: string;
    clienteNome: string;
    itens: Array<{ quantidade: unknown; precoUnit: unknown }>;
  }>,
): LevantamentoUnidades {
  const map = new Map<
    string,
    {
      clienteId: string;
      cliente: string;
      q1: number;
      q2: number;
      faturamentoQ1: number;
      faturamentoQ2: number;
      vendas: number;
    }
  >();

  for (const venda of vendas) {
    const q = quinzenaAmericaSp(venda.dataPedido);
    const row = addMap(map, venda.clienteId, () => ({
      clienteId: venda.clienteId,
      cliente: venda.clienteNome,
      q1: 0,
      q2: 0,
      faturamentoQ1: 0,
      faturamentoQ2: 0,
      vendas: 0,
    }));
    let entrou = false;
    for (const item of venda.itens) {
      const quantidade = n(item.quantidade);
      const valor = quantidade * n(item.precoUnit);
      if (quantidade === 0 && valor === 0) continue;
      entrou = true;
      if (q === 1) {
        row.q1 += quantidade;
        row.faturamentoQ1 += valor;
      } else {
        row.q2 += quantidade;
        row.faturamentoQ2 += valor;
      }
    }
    if (entrou) row.vendas += 1;
  }

  const bruto = [...map.values()]
    .map(row => {
      const totalUn = row.q1 + row.q2;
      const faturamento = row.faturamentoQ1 + row.faturamentoQ2;
      return { ...row, totalUn, faturamento };
    })
    .filter(row => row.totalUn > 0 || row.faturamento > 0)
    .sort(
      (a, b) => b.totalUn - a.totalUn || b.faturamento - a.faturamento || a.cliente.localeCompare(b.cliente, "pt-BR"),
    );

  const volumeTotal = bruto.reduce((s, r) => s + r.totalUn, 0);
  const faturamentoTotal = bruto.reduce((s, r) => s + r.faturamento, 0);
  const volumeQ1 = bruto.reduce((s, r) => s + r.q1, 0);
  const volumeQ2 = bruto.reduce((s, r) => s + r.q2, 0);
  const faturamentoQ1 = bruto.reduce((s, r) => s + r.faturamentoQ1, 0);
  const faturamentoQ2 = bruto.reduce((s, r) => s + r.faturamentoQ2, 0);
  const unidades = bruto.length;
  const top = bruto.slice(0, 3);
  const volumeTop = top.reduce((s, r) => s + r.totalUn, 0);
  const faturamentoTop = top.reduce((s, r) => s + r.faturamento, 0);

  return {
    precoMedio: volumeTotal > 0 ? round2(faturamentoTotal / volumeTotal) : 0,
    volumeTotal: round2(volumeTotal),
    faturamentoTotal: round2(faturamentoTotal),
    volumeQ1: round2(volumeQ1),
    volumeQ2: round2(volumeQ2),
    faturamentoQ1: round2(faturamentoQ1),
    faturamentoQ2: round2(faturamentoQ2),
    variacaoVolumeQ2: variacaoPct(volumeQ2, volumeQ1),
    vendas: bruto.reduce((s, r) => s + r.vendas, 0),
    unidades,
    mediaPorUnidade: unidades > 0 ? round2(volumeTotal / unidades) : 0,
    faturamentoMedioPorUnidade: unidades > 0 ? round2(faturamentoTotal / unidades) : 0,
    top3: {
      nomes: top.map(r => r.cliente).join(" + "),
      volume: round2(volumeTop),
      faturamento: round2(faturamentoTop),
      share: volumeTotal > 0 ? volumeTop / volumeTotal : 0,
    },
    linhas: bruto.map(row => ({
      clienteId: row.clienteId,
      cliente: row.cliente,
      q1: round2(row.q1),
      q2: round2(row.q2),
      totalUn: round2(row.totalUn),
      faturamentoQ1: round2(row.faturamentoQ1),
      faturamentoQ2: round2(row.faturamentoQ2),
      faturamento: round2(row.faturamento),
      vendas: row.vendas,
      share: volumeTotal > 0 ? row.totalUn / volumeTotal : 0,
    })),
  };
}
