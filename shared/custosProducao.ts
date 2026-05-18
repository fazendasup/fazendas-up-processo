/** Custos de produção por variedade — grupos e cálculo de R$/planta. */

export const GRUPOS_CUSTO_PRODUCAO = [
  "insumos_sementes",
  "insumos_substrato",
  "insumos_nutricao",
  "insumos_defensivos",
  "insumos_embalagem",
  "energia",
  "agua",
  "mao_de_obra",
  "manutencao",
  "depreciacao",
  "logistica",
  "financeiro_impostos",
  "overhead",
  "outros",
] as const;

export type GrupoCustoProducao = (typeof GRUPOS_CUSTO_PRODUCAO)[number];

export const LABEL_GRUPO_CUSTO_PRODUCAO: Record<GrupoCustoProducao, string> = {
  insumos_sementes: "Insumos — sementes / mudas",
  insumos_substrato: "Insumos — substrato / bandejas",
  insumos_nutricao: "Insumos — nutrição e soluções",
  insumos_defensivos: "Insumos — defensivos / biológicos",
  insumos_embalagem: "Insumos — embalagem / rótulos",
  energia: "Energia (luz, clima, bombas)",
  agua: "Água e tratamento",
  mao_de_obra: "Mão de obra direta",
  manutencao: "Manutenção e consumíveis",
  depreciacao: "Depreciação / uso de estrutura",
  logistica: "Logística e transporte",
  financeiro_impostos: "Impostos, taxas, financiamento",
  overhead: "Overhead / administrativo rateado",
  outros: "Outros",
};

export const MODOS_CUSTO_PRODUCAO = ["calculado", "por_planta", "por_ciclo", "mensal_rateio", "rateio_projeto"] as const;
export type ModoCustoProducao = (typeof MODOS_CUSTO_PRODUCAO)[number];

export const LABEL_MODO_CUSTO_PRODUCAO: Record<ModoCustoProducao, string> = {
  calculado: "Calculado: preço da unidade de compra × consumo por planta",
  por_planta: "Valor fixo por planta (R$)",
  por_ciclo: "Custo total do ciclo ÷ plantas no ciclo",
  mensal_rateio: "Valor mensal ÷ plantas estimadas no mês (não reparte entre variedades)",
  rateio_projeto:
    "Valor mensal repartido entre variedades (ocupação ou colheita na janela)",
};

/** Como repartir rubricas `rateio_projeto` entre variedades. */
export const RATEIO_METODOS_CUSTOS = ["igual", "capacidade", "colheita_kg", "colheita_plantas"] as const;
export type RateioMetodoCustos = (typeof RATEIO_METODOS_CUSTOS)[number];

export const LABEL_RATEIO_METODO_CUSTOS: Record<RateioMetodoCustos, string> = {
  igual: "Igual por variedade (25% cada se forem 4, etc.)",
  capacidade: "Pela ocupação atual: plantas em furos com status «plantado»",
  colheita_kg: "Pelo peso colhido na janela (gramas) — reflete a realidade vendida",
  colheita_plantas: "Pelo nº de plantas colhidas registradas na janela",
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type CustoProducaoLinhaCampos = {
  modo: ModoCustoProducao;
  precoReferencia: unknown;
  quantidadePorPlanta: unknown;
  valorPorPlanta: unknown;
  valorPorCiclo: unknown;
  plantasPorCicloEstimado: number | null;
  valorMensal: unknown;
  plantasMesEstimativa: number | null;
  ativo?: boolean;
};

export type CustoPorPlantaResultado = {
  valor: number | null;
  detalhe: string;
};

/** Custo em R$ por planta para uma linha; null se dados insuficientes ou inativo. */
export function custoPorPlantaLinha(row: CustoProducaoLinhaCampos): CustoPorPlantaResultado {
  if (row.ativo === false) return { valor: null, detalhe: "Linha inativa" };

  const pr = toNum(row.precoReferencia);
  const q = toNum(row.quantidadePorPlanta);
  const vPl = toNum(row.valorPorPlanta);
  const vCic = toNum(row.valorPorCiclo);
  const vMes = toNum(row.valorMensal);

  switch (row.modo) {
    case "rateio_projeto":
      return {
        valor: null,
        detalhe: "Rateio entre variedades — o valor entra no total de cada variedade conforme o método escolhido.",
      };
    case "calculado": {
      if (pr == null || q == null) return { valor: null, detalhe: "Informe preço e quantidade por planta" };
      const v = pr * q;
      return { valor: v, detalhe: `${pr} × ${q}` };
    }
    case "por_planta": {
      if (vPl == null) return { valor: null, detalhe: "Informe valor por planta" };
      return { valor: vPl, detalhe: "Fixo" };
    }
    case "por_ciclo": {
      if (vCic == null || !row.plantasPorCicloEstimado || row.plantasPorCicloEstimado <= 0) {
        return { valor: null, detalhe: "Informe valor do ciclo e plantas por ciclo (> 0)" };
      }
      return { valor: vCic / row.plantasPorCicloEstimado, detalhe: `${vCic} ÷ ${row.plantasPorCicloEstimado} plantas` };
    }
    case "mensal_rateio": {
      if (vMes == null || !row.plantasMesEstimativa || row.plantasMesEstimativa <= 0) {
        return { valor: null, detalhe: "Informe valor mensal e plantas no mês (> 0)" };
      }
      return { valor: vMes / row.plantasMesEstimativa, detalhe: `${vMes}/mês ÷ ${row.plantasMesEstimativa} plantas` };
    }
    default:
      return { valor: null, detalhe: "Modo desconhecido" };
  }
}

export type DadosVariedadeRateio = {
  plantasOcupadas: number;
  kgColheitaPeriodo: number;
  plantasColhidasPeriodo: number;
};

/** Pesos não normalizados; se a soma for 0, todas as variedades recebem peso 1. */
export function pesosRateioPorVariedade(
  metodo: RateioMetodoCustos,
  variedadeIds: number[],
  dados: Map<number, DadosVariedadeRateio>,
): Map<number, number> {
  const out = new Map<number, number>();
  for (const id of variedadeIds) {
    const d = dados.get(id) ?? {
      plantasOcupadas: 0,
      kgColheitaPeriodo: 0,
      plantasColhidasPeriodo: 0,
    };
    let w = 1;
    switch (metodo) {
      case "capacidade":
        w = Math.max(0, d.plantasOcupadas);
        break;
      case "colheita_kg":
        w = Math.max(0, d.kgColheitaPeriodo);
        break;
      case "colheita_plantas":
        w = Math.max(0, d.plantasColhidasPeriodo);
        break;
      case "igual":
      default:
        w = 1;
    }
    out.set(id, w);
  }
  const soma = Array.from(out.values()).reduce((a, b) => a + b, 0);
  if (soma <= 0) {
    for (const id of variedadeIds) out.set(id, 1);
  }
  return out;
}

/** Reparte `valorTotal` pelos pesos (ex.: rubrica mensal em R$). */
export function alocarValorPorPesos(valorTotal: number, pesos: Map<number, number>): Map<number, number> {
  const soma = Array.from(pesos.values()).reduce((a, b) => a + b, 0);
  const alocado = new Map<number, number>();
  if (soma <= 0 || valorTotal <= 0) return alocado;
  for (const [id, w] of Array.from(pesos.entries())) {
    alocado.set(id, (valorTotal * w) / soma);
  }
  return alocado;
}
