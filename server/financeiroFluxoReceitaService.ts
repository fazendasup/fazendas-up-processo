import {
  diaIsoAmericaSp,
  inicioDiaAmericaSp,
  fimDiaAmericaSp,
} from "@shared/comercial/periodo-america-sp";
import { calcularPagamentoDiaTerceiro } from "@shared/terceirosPagamento";
import {
  eventosSaidasDeParcelas,
  eventosVendasDeParcelas,
  montarFluxoReceita,
  type EventoCaixaFluxo,
  type FluxoReceitaResultado,
} from "@shared/financeiroFluxoReceita";
import type { ParcelaBaseProjecao } from "@shared/financeiroProjecaoDesembolso";
import type { ParcelaFinanceiraNorm } from "@shared/financeiroCfoInsights";
import {
  buscarBaixasPagarPorPeriodoPagamento,
  buscarBaixasReceberPorPeriodoPagamento,
} from "./financeiroContaAzulFluxo";
import { listRegistrosAdmin } from "./terceirosDb";

function toBase(p: ParcelaFinanceiraNorm): ParcelaBaseProjecao {
  const original = p.categoriaOriginal?.trim() || null;
  const atual = p.categoria?.trim() || null;
  const categorias = Array.from(
    new Set(
      [...(p.categorias ?? []), atual, original]
        .map(s => (s ?? "").trim())
        .filter(Boolean),
    ),
  );
  return {
    id: p.id,
    descricao: p.descricao,
    fornecedor: p.contraparte,
    clienteId: p.clienteId ?? null,
    rubrica: atual,
    rubricaOriginal: original,
    rubricaEditadaLocal:
      !!original &&
      !!atual &&
      original.toLowerCase() !== atual.toLowerCase(),
    categorias: categorias.length ? categorias : undefined,
    entradaDre: p.entradaDre?.trim() || null,
    valor: p.valor,
    valorPago: p.valorPago,
    valorEmAberto: p.valorEmAberto,
    status: p.status,
    dataVencimento: p.dataVencimento,
    dataPagamento: p.dataPagamento,
  };
}

/** Janela dos últimos `nMeses` civis até hoje (America/Sao_Paulo). */
export function janelaUltimosMesesCivis(nMeses: number, ref = new Date()): {
  inicioIso: string;
  fimIso: string;
  nMeses: number;
} {
  const fimIso = diaIsoAmericaSp(ref);
  const [y, m] = fimIso.split("-").map(Number);
  let ano = y!;
  let mes = m! - (nMeses - 1);
  while (mes <= 0) {
    mes += 12;
    ano -= 1;
  }
  const inicioIso = `${ano}-${String(mes).padStart(2, "0")}-01`;
  return { inicioIso, fimIso, nMeses };
}

export async function carregarFluxoReceita(
  projetoId: number,
  nMeses = 3,
): Promise<FluxoReceitaResultado> {
  const { inicioIso, fimIso, nMeses: n } = janelaUltimosMesesCivis(nMeses);
  const inicio = inicioDiaAmericaSp(inicioIso);
  const fim = fimDiaAmericaSp(fimIso);

  const [receberNorm, pagarNorm, terceiros] = await Promise.all([
    buscarBaixasReceberPorPeriodoPagamento(inicio, fim, projetoId),
    buscarBaixasPagarPorPeriodoPagamento(inicio, fim, projetoId),
    listRegistrosAdmin({ inicioIso, fimIso }),
  ]);

  const receber = receberNorm.map(toBase);
  const pagar = pagarNorm.map(toBase);

  const eventos: EventoCaixaFluxo[] = [
    ...eventosVendasDeParcelas(receber),
    ...eventosSaidasDeParcelas(pagar),
  ];

  // Diaristas locais pagos: usa data do pagoAt (caixa), não dataServico.
  for (const r of terceiros) {
    if (!r.pagoAt) continue;
    const dataPag = diaIsoAmericaSp(r.pagoAt);
    if (dataPag < inicioIso || dataPag > fimIso) continue;
    const pag = calcularPagamentoDiaTerceiro({
      horaEntrada: r.horaEntrada,
      horaSaida: r.horaSaida,
    });
    if (!pag || !(pag.valorTotal > 0.009)) continue;
    eventos.push({
      dataPagamento: dataPag,
      valor: pag.valorTotal,
      grupo: "diaristas",
    });
  }

  return montarFluxoReceita({
    periodoInicio: inicioIso,
    periodoFim: fimIso,
    nMeses: n,
    eventos,
  });
}
