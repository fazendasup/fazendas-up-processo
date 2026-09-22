/**
 * Fluxo de caixa orientado pela receita de vendas (baixas a receber).
 * Usa o ritmo dos últimos N meses para sugerir quando pagar fixos,
 * diaristas e fornecedores sem estourar a entrada típica.
 */

import {
  ehDespesaEssencialRecorrente,
  ehReceitaVendasCaixa,
  type ParcelaBaseProjecao,
} from "./financeiroProjecaoDesembolso";

export type GrupoSaidaFluxo =
  | "fixos"
  | "diaristas"
  | "fornecedores"
  | "outros";

export type EventoCaixaFluxo = {
  dataPagamento: string;
  valor: number;
  grupo: "vendas" | GrupoSaidaFluxo;
};

export type RitmoDiaMes = {
  dia: number;
  valorTotal: number;
  valorMedioPorMes: number;
  pctDoMes: number;
  pctAcumulado: number;
};

export type RitmoDiaSemana = {
  weekday: number;
  label: string;
  valorTotal: number;
  pct: number;
};

export type JanelaPagamentoSugerida = {
  grupo: "fixos" | "diaristas" | "fornecedores";
  diaMesSugerido: number | null;
  weekdaySugerido: number | null;
  quando: string;
  mediaMensal: number;
  pctDaReceitaMedia: number;
};

export type SerieMensalFluxoReceita = {
  mesYm: string;
  entradasVendas: number;
  saidasFixos: number;
  saidasDiaristas: number;
  saidasFornecedores: number;
  saidasOutros: number;
  saidasTotal: number;
  saldo: number;
};

export type FluxoReceitaResultado = {
  periodoInicio: string;
  periodoFim: string;
  nMeses: number;
  totalEntradasVendas: number;
  mediaMensalVendas: number;
  porDiaMes: RitmoDiaMes[];
  porDiaSemana: RitmoDiaSemana[];
  saidas: Record<
    GrupoSaidaFluxo,
    { total: number; mediaMensal: number }
  >;
  cobertura: {
    mediaEntradas: number;
    mediaSaidasOperacionais: number;
    saldoMedio: number;
    pctCobertura: number;
  };
  janelas: JanelaPagamentoSugerida[];
  serieMensal: SerieMensalFluxoReceita[];
};

const LABELS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function weekdayFromYmd(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return 0;
  return new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  ).getUTCDay();
}

export function diaDoMesFromYmd(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return 1;
  return Number(m[3]);
}

export function mesYmFromYmd(ymd: string): string {
  return ymd.trim().slice(0, 7);
}

/** Heurística: diarista / terceiro variável (não fixo). */
export function ehSaidaDiaristaOuTerceiroVariavel(
  descricao: string | null | undefined,
  rubrica?: string | null,
  fornecedor?: string | null,
): boolean {
  const d = [descricao, rubrica, fornecedor]
    .map(s =>
      (s ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
  if (!d) return false;
  if (/\b(prestador|fornecedor|servico)\s+fixo\b/.test(d)) return false;
  return (
    /\bdiarista/.test(d) ||
    /\bterceir(o|a|os|as)\b/.test(d) ||
    /\bprestador(es)?\b/.test(d) ||
    /\bjornada\b/.test(d) ||
    /\bmao\s+de\s+obra\s+(temporaria|avulsa|diaria)\b/.test(d)
  );
}

/** Folha, utilidades e prestador fixo — sem insumos/compras. */
function ehSaidaFixoCaixa(
  descricao: string | null | undefined,
  rubrica?: string | null,
  fornecedor?: string | null,
): boolean {
  const d = [descricao, rubrica, fornecedor]
    .map(s =>
      (s ?? "")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
  if (!d) return false;
  if (
    /\b(aluguel|locacao|energia|eletrica|eletricidade|luz|agua|esgoto|gas|internet|banda[\s-]?larga|telefone|celular|telecom|condominio|iptu|seguro|folha(\s+de\s+pagamento)?|salarios?|remuneracao|holerite|pro[\s-]?labore|adiantamento\s+salarial|plano\s+(de\s+)?saude|vale[\s-]*(transporte|refeicao|alimentacao)|contabil(idade)?|software|assinatura|saas|hospedagem|dominio|limpeza|conservacao|seguranca|vigilancia|manutencao(\s+predial)?|contador|escritorio\s+contabil)\b/.test(
      d,
    )
  ) {
    return true;
  }
  return (
    /\b(prestador|fornecedor|servico)\s+fixo\b/.test(d) ||
    /\bfixo\s+(mensal|terceir)/.test(d) ||
    /\b(pj|mei)\s+fix[oa]\b/.test(d)
  );
}

export function classificarSaidaFluxo(
  p: Pick<ParcelaBaseProjecao, "descricao" | "rubrica" | "fornecedor">,
): GrupoSaidaFluxo {
  if (
    ehSaidaDiaristaOuTerceiroVariavel(p.descricao, p.rubrica, p.fornecedor)
  ) {
    return "diaristas";
  }
  if (ehSaidaFixoCaixa(p.descricao, p.rubrica, p.fornecedor)) {
    return "fixos";
  }
  const forn = (p.fornecedor ?? "").trim();
  if (forn) return "fornecedores";
  const rub = (p.rubrica ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const desc = (p.descricao ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (
    /\b(insumo|material|fornecedor|compra|mercadoria|embalagem|semente|substrato|legume|folhosa)\b/.test(
      `${rub} ${desc}`,
    )
  ) {
    return "fornecedores";
  }
  // Recorrente operacional (energia já foi fixo) → demais essenciais CA
  if (ehDespesaEssencialRecorrente(p.descricao, p.rubrica, p.fornecedor)) {
    return "fornecedores";
  }
  return "outros";
}

/**
 * Primeiro dia do mês em que o % acumulado de entradas atinge o alvo.
 * Se nunca atingir, devolve o dia de maior entrada.
 */
export function diaMesParaCobertura(
  porDiaMes: RitmoDiaMes[],
  alvoPctAcumulado: number,
): number {
  for (const row of porDiaMes) {
    if (row.pctAcumulado + 1e-9 >= alvoPctAcumulado) return row.dia;
  }
  let best = porDiaMes[0]?.dia ?? 5;
  let bestVal = -1;
  for (const row of porDiaMes) {
    if (row.valorTotal > bestVal) {
      bestVal = row.valorTotal;
      best = row.dia;
    }
  }
  return best;
}

export function weekdayComMaiorEntrada(
  porDiaSemana: RitmoDiaSemana[],
): number {
  let best = 5; // sexta
  let bestVal = -1;
  for (const row of porDiaSemana) {
    if (row.valorTotal > bestVal) {
      bestVal = row.valorTotal;
      best = row.weekday;
    }
  }
  return best;
}

export function montarFluxoReceita(input: {
  periodoInicio: string;
  periodoFim: string;
  nMeses: number;
  eventos: EventoCaixaFluxo[];
}): FluxoReceitaResultado {
  const nMeses = Math.max(1, input.nMeses);
  const vendas = input.eventos.filter(e => e.grupo === "vendas" && e.valor > 0);
  const totalEntradasVendas = round2(
    vendas.reduce((s, e) => s + e.valor, 0),
  );
  const mediaMensalVendas = round2(totalEntradasVendas / nMeses);

  const porDiaRaw = new Map<number, number>();
  for (let d = 1; d <= 31; d++) porDiaRaw.set(d, 0);
  for (const e of vendas) {
    const dia = diaDoMesFromYmd(e.dataPagamento);
    porDiaRaw.set(dia, (porDiaRaw.get(dia) ?? 0) + e.valor);
  }
  let acum = 0;
  const porDiaMes: RitmoDiaMes[] = [];
  for (let d = 1; d <= 31; d++) {
    const valorTotal = round2(porDiaRaw.get(d) ?? 0);
    const pctDoMes =
      totalEntradasVendas > 0
        ? round2((valorTotal / totalEntradasVendas) * 100)
        : 0;
    acum = round2(acum + pctDoMes);
    porDiaMes.push({
      dia: d,
      valorTotal,
      valorMedioPorMes: round2(valorTotal / nMeses),
      pctDoMes,
      pctAcumulado: Math.min(100, acum),
    });
  }

  const porSemanaRaw = new Map<number, number>();
  for (let w = 0; w <= 6; w++) porSemanaRaw.set(w, 0);
  for (const e of vendas) {
    const w = weekdayFromYmd(e.dataPagamento);
    porSemanaRaw.set(w, (porSemanaRaw.get(w) ?? 0) + e.valor);
  }
  const porDiaSemana: RitmoDiaSemana[] = [];
  for (let w = 0; w <= 6; w++) {
    const valorTotal = round2(porSemanaRaw.get(w) ?? 0);
    porDiaSemana.push({
      weekday: w,
      label: LABELS_SEMANA[w]!,
      valorTotal,
      pct:
        totalEntradasVendas > 0
          ? round2((valorTotal / totalEntradasVendas) * 100)
          : 0,
    });
  }

  const saidasTotais: Record<GrupoSaidaFluxo, number> = {
    fixos: 0,
    diaristas: 0,
    fornecedores: 0,
    outros: 0,
  };
  for (const e of input.eventos) {
    if (e.grupo === "vendas" || e.valor <= 0) continue;
    saidasTotais[e.grupo] = round2(saidasTotais[e.grupo] + e.valor);
  }
  const saidas = {
    fixos: {
      total: saidasTotais.fixos,
      mediaMensal: round2(saidasTotais.fixos / nMeses),
    },
    diaristas: {
      total: saidasTotais.diaristas,
      mediaMensal: round2(saidasTotais.diaristas / nMeses),
    },
    fornecedores: {
      total: saidasTotais.fornecedores,
      mediaMensal: round2(saidasTotais.fornecedores / nMeses),
    },
    outros: {
      total: saidasTotais.outros,
      mediaMensal: round2(saidasTotais.outros / nMeses),
    },
  };

  const mediaSaidasOperacionais = round2(
    saidas.fixos.mediaMensal +
      saidas.diaristas.mediaMensal +
      saidas.fornecedores.mediaMensal,
  );
  const saldoMedio = round2(mediaMensalVendas - mediaSaidasOperacionais);
  const pctCobertura =
    mediaSaidasOperacionais > 0.009
      ? round2((mediaMensalVendas / mediaSaidasOperacionais) * 100)
      : mediaMensalVendas > 0
        ? 999
        : 0;

  const pctFixos =
    mediaMensalVendas > 0
      ? (saidas.fixos.mediaMensal / mediaMensalVendas) * 100
      : 0;
  const pctDiaristas =
    mediaMensalVendas > 0
      ? (saidas.diaristas.mediaMensal / mediaMensalVendas) * 100
      : 0;
  const alvoFixos = Math.min(90, Math.max(20, pctFixos + 5));
  const alvoFornecedores = Math.min(
    95,
    Math.max(alvoFixos + 10, alvoFixos + pctDiaristas + 15),
  );

  const diaFixos = diaMesParaCobertura(porDiaMes, alvoFixos);
  const diaFornecedores = diaMesParaCobertura(porDiaMes, alvoFornecedores);
  const wdDiaristas = weekdayComMaiorEntrada(porDiaSemana);

  const janelas: JanelaPagamentoSugerida[] = [
    {
      grupo: "fixos",
      diaMesSugerido: diaFixos,
      weekdaySugerido: null,
      quando: `A partir do dia ${diaFixos}`,
      mediaMensal: saidas.fixos.mediaMensal,
      pctDaReceitaMedia:
        mediaMensalVendas > 0
          ? round2((saidas.fixos.mediaMensal / mediaMensalVendas) * 100)
          : 0,
    },
    {
      grupo: "diaristas",
      diaMesSugerido: null,
      weekdaySugerido: wdDiaristas,
      quando: `${LABELS_SEMANA[wdDiaristas]}s (semanal)`,
      mediaMensal: saidas.diaristas.mediaMensal,
      pctDaReceitaMedia:
        mediaMensalVendas > 0
          ? round2((saidas.diaristas.mediaMensal / mediaMensalVendas) * 100)
          : 0,
    },
    {
      grupo: "fornecedores",
      diaMesSugerido: diaFornecedores,
      weekdaySugerido: null,
      quando: `A partir do dia ${diaFornecedores}`,
      mediaMensal: saidas.fornecedores.mediaMensal,
      pctDaReceitaMedia:
        mediaMensalVendas > 0
          ? round2(
              (saidas.fornecedores.mediaMensal / mediaMensalVendas) * 100,
            )
          : 0,
    },
  ];

  const mesesMap = new Map<string, SerieMensalFluxoReceita>();
  const ensureMes = (ym: string): SerieMensalFluxoReceita => {
    let row = mesesMap.get(ym);
    if (!row) {
      row = {
        mesYm: ym,
        entradasVendas: 0,
        saidasFixos: 0,
        saidasDiaristas: 0,
        saidasFornecedores: 0,
        saidasOutros: 0,
        saidasTotal: 0,
        saldo: 0,
      };
      mesesMap.set(ym, row);
    }
    return row;
  };
  for (const e of input.eventos) {
    if (!e.dataPagamento || e.valor <= 0) continue;
    const row = ensureMes(mesYmFromYmd(e.dataPagamento));
    if (e.grupo === "vendas") row.entradasVendas += e.valor;
    else if (e.grupo === "fixos") row.saidasFixos += e.valor;
    else if (e.grupo === "diaristas") row.saidasDiaristas += e.valor;
    else if (e.grupo === "fornecedores") row.saidasFornecedores += e.valor;
    else row.saidasOutros += e.valor;
  }
  const serieMensal = Array.from(mesesMap.values())
    .sort((a, b) => a.mesYm.localeCompare(b.mesYm))
    .map(r => {
      const saidasTotal = round2(
        r.saidasFixos +
          r.saidasDiaristas +
          r.saidasFornecedores +
          r.saidasOutros,
      );
      return {
        ...r,
        entradasVendas: round2(r.entradasVendas),
        saidasFixos: round2(r.saidasFixos),
        saidasDiaristas: round2(r.saidasDiaristas),
        saidasFornecedores: round2(r.saidasFornecedores),
        saidasOutros: round2(r.saidasOutros),
        saidasTotal,
        saldo: round2(r.entradasVendas - saidasTotal),
      };
    });

  return {
    periodoInicio: input.periodoInicio,
    periodoFim: input.periodoFim,
    nMeses,
    totalEntradasVendas,
    mediaMensalVendas,
    porDiaMes,
    porDiaSemana,
    saidas,
    cobertura: {
      mediaEntradas: mediaMensalVendas,
      mediaSaidasOperacionais,
      saldoMedio,
      pctCobertura,
    },
    janelas,
    serieMensal,
  };
}

/** Filtra baixas a receber de vendas e monta eventos de entrada. */
export function eventosVendasDeParcelas(
  parcelas: ParcelaBaseProjecao[],
): EventoCaixaFluxo[] {
  const out: EventoCaixaFluxo[] = [];
  for (const p of parcelas) {
    if (!ehReceitaVendasCaixa(p)) continue;
    const data = p.dataPagamento?.trim() || null;
    if (!data) continue;
    const valor = p.valorPago > 0 ? p.valorPago : p.valor;
    if (!(valor > 0.009)) continue;
    out.push({ dataPagamento: data, valor, grupo: "vendas" });
  }
  return out;
}

export function eventosSaidasDeParcelas(
  parcelas: ParcelaBaseProjecao[],
): EventoCaixaFluxo[] {
  const out: EventoCaixaFluxo[] = [];
  for (const p of parcelas) {
    const data = p.dataPagamento?.trim() || null;
    if (!data) continue;
    const valor = p.valorPago > 0 ? p.valorPago : p.valor;
    if (!(valor > 0.009)) continue;
    out.push({
      dataPagamento: data,
      valor,
      grupo: classificarSaidaFluxo(p),
    });
  }
  return out;
}
