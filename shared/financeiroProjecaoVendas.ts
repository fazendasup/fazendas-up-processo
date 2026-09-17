/**
 * Projeção de vendas no restante do mês com base na média dos 2 meses anteriores.
 * Orçamentos: até dia 15 contam no mês; após dia 15, no mês seguinte (cautela acumula).
 */
import { addMonthsYm } from "./financeiroProjecaoDesembolso";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function diasNoMesYm(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export type StatusPedidoVendaOrcamento = "venda" | "orcamento";

/**
 * Mês de competência para o comparativo de vendas.
 * - venda: mês civil de `dataPedido`
 * - orçamento: dia ≤ 15 → mesmo mês; dia > 15 → mês seguinte
 */
export function mesCompetenciaVendaOrcamento(
  dataPedidoIso: string,
  status: StatusPedidoVendaOrcamento,
): string {
  const ym = dataPedidoIso.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  if (status === "venda") return ym;
  const day = Number(dataPedidoIso.slice(8, 10));
  if (!Number.isFinite(day) || day <= 15) return ym;
  return addMonthsYm(ym, 1);
}

export type PedidoCompetenciaInput = {
  dataPedidoIso: string;
  status: StatusPedidoVendaOrcamento;
  valorLiquido: number;
};

/** Soma valor líquido por mês de competência (venda + orçamento com regra dia 15). */
export function agregarVendasPorCompetencia(
  pedidos: PedidoCompetenciaInput[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of pedidos) {
    if (!Number.isFinite(p.valorLiquido) || p.valorLiquido === 0) continue;
    const mes = mesCompetenciaVendaOrcamento(p.dataPedidoIso, p.status);
    map.set(mes, round2((map.get(mes) ?? 0) + p.valorLiquido));
  }
  return map;
}

export type ProjecaoVendasRestanteMes = {
  /** Média do líquido de vendas dos 2 meses anteriores. */
  mediaVendas2m: number;
  /** Média da média diária dos 2 meses (líquido / dias do mês). */
  mediaDiaria2m: number;
  mesesMedia2m: [string, string];
  diasNoMes: number;
  diasPassados: number;
  diasRestantes: number;
  /** Vendas líquidas já registradas no mês (até hoje, se mês atual). */
  vendasJaNoMes: number;
  /** Quanto ainda deve entrar: mediaDiaria2m × diasRestantes. */
  aindaEntraProjetado: number;
  /** vendasJaNoMes + aindaEntraProjetado. */
  projecaoMesTotal: number;
};

/**
 * @param mesYm mês de referência do comparativo
 * @param hojeYm mês civil atual (America/SP), ex. 2026-09
 * @param diaHoje dia do mês atual (1–31) em America/SP
 */
export function montarProjecaoVendasRestanteMes(input: {
  mesYm: string;
  hojeYm: string;
  diaHoje: number;
  vendasMesAtual: number;
  vendasMesAnterior1: number;
  vendasMesAnterior2: number;
  mesAnterior1Ym: string;
  mesAnterior2Ym: string;
}): ProjecaoVendasRestanteMes {
  const d1 = diasNoMesYm(input.mesAnterior1Ym);
  const d2 = diasNoMesYm(input.mesAnterior2Ym);
  const diaria1 = d1 > 0 ? input.vendasMesAnterior1 / d1 : 0;
  const diaria2 = d2 > 0 ? input.vendasMesAnterior2 / d2 : 0;
  const tem1 = input.vendasMesAnterior1 > 0;
  const tem2 = input.vendasMesAnterior2 > 0;
  const n = (tem1 ? 1 : 0) + (tem2 ? 1 : 0);
  const mediaDiaria2m =
    n > 0
      ? round2(((tem1 ? diaria1 : 0) + (tem2 ? diaria2 : 0)) / n)
      : 0;
  const mediaVendas2m =
    n > 0
      ? round2(
          ((tem1 ? input.vendasMesAnterior1 : 0) +
            (tem2 ? input.vendasMesAnterior2 : 0)) /
            n,
        )
      : 0;

  const diasNoMes = diasNoMesYm(input.mesYm);
  let diasPassados: number;
  let diasRestantes: number;
  let vendasJaNoMes = round2(input.vendasMesAtual);

  if (input.mesYm < input.hojeYm) {
    // Mês passado: já fechou
    diasPassados = diasNoMes;
    diasRestantes = 0;
  } else if (input.mesYm > input.hojeYm) {
    // Mês futuro: nada vendido ainda; projeta o mês inteiro pela média diária
    diasPassados = 0;
    diasRestantes = diasNoMes;
    vendasJaNoMes = 0;
  } else {
    // Mês corrente
    const dia = Math.min(Math.max(1, Math.floor(input.diaHoje)), diasNoMes);
    diasPassados = dia;
    diasRestantes = Math.max(0, diasNoMes - dia);
  }

  const aindaEntraProjetado = round2(mediaDiaria2m * diasRestantes);
  const projecaoMesTotal = round2(vendasJaNoMes + aindaEntraProjetado);

  return {
    mediaVendas2m,
    mediaDiaria2m,
    mesesMedia2m: [input.mesAnterior2Ym, input.mesAnterior1Ym],
    diasNoMes,
    diasPassados,
    diasRestantes,
    vendasJaNoMes,
    aindaEntraProjetado,
    projecaoMesTotal,
  };
}
