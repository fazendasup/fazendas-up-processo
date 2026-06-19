export type LinhaRentabilidadeCalculo = {
  id?: number;
  fichaId: number | null;
  nomeProduto: string;
  quantidade: number;
  receitaTotal: number;
  custoUnitarioManual: number | null;
  custoUnitarioFicha: number | null;
};

export type LinhaRentabilidadeResultado = {
  id?: number;
  fichaId: number | null;
  nomeProduto: string;
  quantidade: number;
  receitaTotal: number;
  custoUnitario: number | null;
  custoUnitarioFonte: "manual" | "ficha" | null;
  cmv: number | null;
  lucroBruto: number | null;
  margemBrutaPct: number | null;
  rateioOperacional: number;
  contribuicao: number | null;
  status: "lucro" | "prejuizo" | "incompleto";
};

export type RentabilidadeTotais = {
  receita: number;
  cmv: number;
  lucroBruto: number;
  custoOperacional: number;
  resultado: number;
  margemBrutaPct: number | null;
  linhasLucro: number;
  linhasPrejuizo: number;
  linhasIncompletas: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularRentabilidade(input: {
  linhas: LinhaRentabilidadeCalculo[];
  custoOperacionalTotal: number;
}): { linhas: LinhaRentabilidadeResultado[]; totais: RentabilidadeTotais } {
  const receitaTotal = input.linhas.reduce((s, l) => s + Math.max(0, l.receitaTotal), 0);
  const custoOp = Math.max(0, input.custoOperacionalTotal);

  const linhas: LinhaRentabilidadeResultado[] = input.linhas.map((l) => {
    const qtd = Math.max(0, l.quantidade);
    const receita = Math.max(0, l.receitaTotal);
    let custoUnit: number | null = null;
    let fonte: "manual" | "ficha" | null = null;

    if (l.custoUnitarioManual != null && l.custoUnitarioManual >= 0) {
      custoUnit = l.custoUnitarioManual;
      fonte = "manual";
    } else if (l.custoUnitarioFicha != null && l.custoUnitarioFicha >= 0) {
      custoUnit = l.custoUnitarioFicha;
      fonte = "ficha";
    }

    const cmv = custoUnit != null && qtd > 0 ? round2(custoUnit * qtd) : null;
    const lucroBruto = cmv != null ? round2(receita - cmv) : null;
    const margemBrutaPct =
      lucroBruto != null && receita > 0 ? round2((lucroBruto / receita) * 100) : null;
    const rateioOperacional =
      receitaTotal > 0 && receita > 0 ? round2((custoOp * receita) / receitaTotal) : 0;
    const contribuicao =
      lucroBruto != null ? round2(lucroBruto - rateioOperacional) : null;

    let status: LinhaRentabilidadeResultado["status"] = "incompleto";
    if (contribuicao != null) {
      status = contribuicao >= 0 ? "lucro" : "prejuizo";
    }

    return {
      id: l.id,
      fichaId: l.fichaId,
      nomeProduto: l.nomeProduto,
      quantidade: qtd,
      receitaTotal: round2(receita),
      custoUnitario: custoUnit,
      custoUnitarioFonte: fonte,
      cmv,
      lucroBruto,
      margemBrutaPct,
      rateioOperacional,
      contribuicao,
      status,
    };
  });

  const cmv = round2(linhas.reduce((s, l) => s + (l.cmv ?? 0), 0));
  const lucroBruto = round2(receitaTotal - cmv);
  const resultado = round2(lucroBruto - custoOp);

  return {
    linhas,
    totais: {
      receita: round2(receitaTotal),
      cmv,
      lucroBruto,
      custoOperacional: round2(custoOp),
      resultado,
      margemBrutaPct: receitaTotal > 0 ? round2((lucroBruto / receitaTotal) * 100) : null,
      linhasLucro: linhas.filter((l) => l.status === "lucro").length,
      linhasPrejuizo: linhas.filter((l) => l.status === "prejuizo").length,
      linhasIncompletas: linhas.filter((l) => l.status === "incompleto").length,
    },
  };
}

export function somarCustoOperacionalSugerido(
  rubricas: Array<{ ativo?: boolean | null; modo: string; valorMensal: unknown }>,
): number {
  let total = 0;
  for (const r of rubricas) {
    if (r.ativo === false) continue;
    if (r.modo === "rateio_projeto") continue;
    const v = Number(String(r.valorMensal ?? "").replace(",", "."));
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return Math.round(total * 100) / 100;
}
