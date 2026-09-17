import { buscarParcelasPagarParaProjecao } from "./financeiroContaAzulFluxo";
import {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  listProjecaoCelulaOverrides,
  listProjecaoColunas,
  listProjecaoLinhasManuais,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
} from "./financeiroProjecaoDb";
import {
  addMonthsYm,
  mesesProjecaoPadrao,
  montarProjecaoDesembolso,
  type ParcelaBaseProjecao,
} from "@shared/financeiroProjecaoDesembolso";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";

function boundsMesYm(ym: string): { inicio: Date; fim: Date } {
  const [y, m] = ym.split("-").map(Number);
  const inicio = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

function toBase(p: ParcelaFinanceiraNorm): ParcelaBaseProjecao {
  return {
    id: p.id,
    descricao: p.descricao,
    fornecedor: p.contraparte,
    rubrica: p.categoria,
    valor: p.valor,
    valorPago: p.valorPago,
    valorEmAberto: p.valorEmAberto,
    status: p.status,
    dataVencimento: p.dataVencimento,
    dataPagamento: p.dataPagamento,
  };
}

export async function carregarProjecaoDesembolso(
  projetoId: number,
  mesInicioYm: string,
) {
  if (!/^\d{4}-\d{2}$/.test(mesInicioYm)) {
    throw new Error("Mês inicial inválido (AAAA-MM).");
  }

  const [colunasDb, linhasDb, celulasDb] = await Promise.all([
    listProjecaoColunas(projetoId),
    listProjecaoLinhasManuais(projetoId),
    listProjecaoCelulaOverrides(projetoId),
  ]);

  const colunasExtraYm = colunasDb.map(c => c.mesYm);
  const mesesPadrao = mesesProjecaoPadrao(mesInicioYm);
  const mesesGrade = Array.from(
    new Set([...mesesPadrao, ...colunasExtraYm]),
  ).sort();

  const horizonteInicio = boundsMesYm(mesesGrade[0]!).inicio;
  const horizonteFim = boundsMesYm(mesesGrade[mesesGrade.length - 1]!).fim;

  const histInicioYm = addMonthsYm(mesesPadrao[0]!, -3);
  const histInicio = boundsMesYm(histInicioYm).inicio;
  const histFim = new Date(horizonteInicio);
  histFim.setDate(histFim.getDate() - 1);

  const [parcelasHorizonte, parcelasHist] = await Promise.all([
    buscarParcelasPagarParaProjecao(horizonteInicio, horizonteFim, projetoId),
    histFim.getTime() >= histInicio.getTime()
      ? buscarParcelasPagarParaProjecao(histInicio, histFim, projetoId)
      : Promise.resolve([] as ParcelaFinanceiraNorm[]),
  ]);

  const grade = montarProjecaoDesembolso({
    mesInicioYm,
    colunasExtraYm,
    parcelas: parcelasHorizonte.map(toBase),
    historico: parcelasHist.map(toBase),
    linhasManuais: linhasDb.map(l => ({
      id: l.id,
      descricao: l.descricao,
      fornecedor: l.fornecedor,
      rubrica: l.rubrica,
      natureza: l.natureza,
    })),
    overrides: celulasDb.map(c => ({
      linhaId: c.linhaId,
      mesYm: c.mesYm,
      valorOverride:
        c.valorOverride == null ? null : Number(c.valorOverride),
      ativo: c.ativo,
    })),
  });

  return {
    mesInicioYm,
    ...grade,
    avisos: [
      "Base = somente o que foi PAGO no mês anterior (sem previsão aberta do Conta Azul).",
      "Essenciais (energia, aluguel, água, internet, folha…) já entram como projetado recorrente.",
      "Demais itens: valor sugerido — marque o checkbox se vai continuar.",
      "Total da projeção = só os 3 meses à frente (mês anterior não entra).",
      "Mês anterior = contexto executado (somente leitura).",
    ],
  };
}

export {
  addProjecaoColuna,
  insertProjecaoLinhaManual,
  removeProjecaoColuna,
  softDeleteProjecaoLinhaManual,
  upsertProjecaoCelula,
};
