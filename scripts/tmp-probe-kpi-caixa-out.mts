/**
 * Compara "Entrou" do dashboard (listagem por vencimento) vs baixas por pagamento.
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { composicaoDoPedidoParaDashboard } from "../server/comercial/lib/composicao-valor";
import { classificarStatusPedido } from "../server/comercial/lib/pedido-status";
import {
  buscarBaixasReceberPorPeriodoPagamento,
  buscarParcelasReceberParaComparativo,
} from "../server/financeiroContaAzulFluxo";
import { montarComparativoReceitaMes } from "../shared/financeiroComparativoProjecao";
import {
  ehReceitaVendasCaixa,
  mesPagamentoParcela,
  valorPagoParcela,
} from "../shared/financeiroProjecaoDesembolso";
import {
  diaIsoAmericaSp,
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const mesYm = "2026-10";
const projetoId = Number(process.env.PROJETO_ID ?? 1);
const [y, m] = mesYm.split("-").map(Number);
const ultimoDia = new Date(y, m, 0).getDate();
const inicio = inicioDiaAmericaSp(`${mesYm}-01`);
const fim = fimDiaAmericaSp(
  `${mesYm}-${String(ultimoDia).padStart(2, "0")}`,
);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const [porVenc, porPag] = await Promise.all([
  buscarParcelasReceberParaComparativo(inicio, fim, projetoId),
  buscarBaixasReceberPorPeriodoPagamento(inicio, fim, projetoId),
]);

const receitaDash = montarComparativoReceitaMes({
  mesYm,
  parcelasReceberMes: porVenc,
  hojeYm: "2026-10",
  diaHoje: 22,
});

const porId = new Map(porVenc.map(p => [p.id, { ...p }]));
for (const p of porPag) {
  const prev = porId.get(p.id);
  if (!prev) {
    porId.set(p.id, { ...p });
    continue;
  }
  porId.set(p.id, {
    ...prev,
    dataPagamento: p.dataPagamento || prev.dataPagamento,
    valorPago: Math.max(Number(prev.valorPago ?? 0), Number(p.valorPago ?? 0)),
    status: p.status || prev.status,
  });
}

const receitaCorrigida = montarComparativoReceitaMes({
  mesYm,
  parcelasReceberMes: Array.from(porId.values()),
  hojeYm: "2026-10",
  diaHoje: 22,
});

const mapPag = new Map(porPag.map(p => [p.id, p]));
const idsVenc = new Set(porVenc.map(p => p.id));

let recebidoPagFiltrado = 0;
for (const p of porPag) {
  if (!ehReceitaVendasCaixa(p)) continue;
  const pago = valorPagoParcela(p);
  if (pago > 0) recebidoPagFiltrado += pago;
}

const omitidosSemDataPag = [];
for (const p of porVenc) {
  if (!ehReceitaVendasCaixa(p)) continue;
  if (p.dataPagamento) continue;
  const pago = valorPagoParcela(p);
  if (pago <= 0) continue;
  omitidosSemDataPag.push({
    id: p.id,
    desc: (p.descricao ?? "").slice(0, 50),
    pago: round2(pago),
    venc: p.dataVencimento,
    mesPagFallback: mesPagamentoParcela(p, {
      fallbackVencimentoSeQuitado: true,
    }),
    temNaBaixaPag: mapPag.has(p.id),
    pagNaBaixa: mapPag.get(p.id)?.dataPagamento ?? null,
  });
}

const soNaBaixaPag = [];
for (const p of porPag) {
  if (idsVenc.has(p.id)) continue;
  if (!ehReceitaVendasCaixa(p)) continue;
  const pago = valorPagoParcela(p);
  if (pago <= 0) continue;
  soNaBaixaPag.push({
    id: p.id,
    desc: (p.descricao ?? "").slice(0, 50),
    pago: round2(pago),
    pag: p.dataPagamento,
    venc: p.dataVencimento,
  });
}

const prisma = getComercialPrisma();
const pedidos = await prisma.pedido.findMany({
  where: {
    origemPedido: "CONTA_AZUL",
    dataPedido: { gte: inicio, lte: fim },
  },
  select: {
    statusPedido: true,
    dataPedido: true,
    valorTotal: true,
    valorBruto: true,
    valorFrete: true,
    valorDesconto: true,
    valorLiquido: true,
    composicaoDetalhada: true,
  },
});

let vendas = 0;
let orcamentos = 0;
for (const p of pedidos) {
  const cls = classificarStatusPedido(p.statusPedido);
  if (cls !== "venda" && cls !== "orcamento") continue;
  const liquido = composicaoDoPedidoParaDashboard(p).valorLiquido;
  if (!Number.isFinite(liquido) || liquido === 0) continue;
  if (cls === "venda") vendas += liquido;
  else orcamentos += liquido;
}

console.log(
  JSON.stringify(
    {
      mesYm,
      dashboardAtual: {
        recebido: receitaDash.recebido,
        aReceberNoMes: receitaDash.aReceberNoMes,
        vencido: receitaDash.vencido,
      },
      aposMesclarBaixasPagamento: {
        recebido: receitaCorrigida.recebido,
        aReceberNoMes: receitaCorrigida.aReceberNoMes,
        vencido: receitaCorrigida.vencido,
      },
      somaBaixasApiPagamento: round2(recebidoPagFiltrado),
      gapVsDash: round2(recebidoPagFiltrado - receitaDash.recebido),
      omitidosSemDataPagQtd: omitidosSemDataPag.length,
      omitidosSemDataPagTotal: round2(
        omitidosSemDataPag.reduce((s, x) => s + x.pago, 0),
      ),
      omitidosTop: omitidosSemDataPag
        .sort((a, b) => b.pago - a.pago)
        .slice(0, 8),
      soNaBaixaPagQtd: soNaBaixaPag.length,
      soNaBaixaPagTotal: round2(soNaBaixaPag.reduce((s, x) => s + x.pago, 0)),
      soNaBaixaPagTop: soNaBaixaPag
        .sort((a, b) => b.pago - a.pago)
        .slice(0, 8),
      vendasLocais: round2(vendas),
      orcamentosLocais: round2(orcamentos),
      screenshot: {
        entrou: 42445.41,
        aReceber: 12907.27,
        emAtraso: 3488.93,
        faturado: 54473.32,
        orcamentos: 26325.04,
      },
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
process.exit(0);
