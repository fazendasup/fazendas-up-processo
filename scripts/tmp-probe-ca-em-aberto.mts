/**
 * Cruza Conta Azul "Em aberto" (vencidos / a vencer) com o que o dashboard conta.
 */
import "dotenv/config";
import {
  buscarBaixasReceberPorPeriodoPagamento,
  buscarParcelasReceberParaComparativo,
} from "../server/financeiroContaAzulFluxo";
import { montarComparativoReceitaMes } from "../shared/financeiroComparativoProjecao";
import { ehReceitaVendasCaixa } from "../shared/financeiroProjecaoDesembolso";
import {
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const mesYm = "2026-10";
const hojeIso = "2026-10-22";
const projetoId = Number(process.env.PROJETO_ID ?? 1);
const [y, m] = mesYm.split("-").map(Number);
const ultimoDia = new Date(y, m, 0).getDate();
const iniMes = inicioDiaAmericaSp(`${mesYm}-01`);
const fimMes = fimDiaAmericaSp(
  `${mesYm}-${String(ultimoDia).padStart(2, "0")}`,
);
// Janela ampla como a tela CA costuma mostrar "em aberto"
const iniAmplo = inicioDiaAmericaSp("2024-01-01");
const fimAmplo = fimDiaAmericaSp("2027-12-31");

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const [receberMes, receberAmplo, baixasMes] = await Promise.all([
  buscarParcelasReceberParaComparativo(iniMes, fimMes, projetoId),
  buscarParcelasReceberParaComparativo(iniAmplo, fimAmplo, projetoId, {
    somenteVencimento: true,
  }),
  buscarBaixasReceberPorPeriodoPagamento(iniMes, fimMes, projetoId),
]);

function classificarAberto(
  itens: typeof receberMes,
  soVendas: boolean,
) {
  let vencidos = 0;
  let vencemHoje = 0;
  let aVencer = 0;
  let qtd = 0;
  for (const p of itens) {
    if (soVendas && !ehReceitaVendasCaixa(p)) continue;
    if ((p.valorEmAberto ?? 0) <= 0.009) continue;
    const venc = (p.dataVencimento ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) continue;
    qtd += 1;
    const v = p.valorEmAberto;
    if (venc < hojeIso) vencidos += v;
    else if (venc === hojeIso) vencemHoje += v;
    else aVencer += v;
  }
  return {
    qtd,
    vencidos: round2(vencidos),
    vencemHoje: round2(vencemHoje),
    aVencer: round2(aVencer),
    total: round2(vencidos + vencemHoje + aVencer),
  };
}

const dash = montarComparativoReceitaMes({
  mesYm,
  parcelasReceberMes: receberMes,
  baixasRecebidoMes: baixasMes,
  hojeYm: "2026-10",
  diaHoje: 22,
});

const dashAntigo = montarComparativoReceitaMes({
  mesYm,
  parcelasReceberMes: receberMes,
  hojeYm: "2026-10",
  diaHoje: 22,
});

console.log(
  JSON.stringify(
    {
      contaAzulScreenshot: {
        vencidos: 6704.15,
        vencemHoje: 778.66,
        aVencer: 26045.84,
        total: 33528.65,
      },
      dashboardScreenshot: {
        entrou: 42445.41,
        aReceberNoPrazo: 12907.27,
        emAtraso: 3488.93,
      },
      abertoMes_todasCats: classificarAberto(receberMes, false),
      abertoMes_soVendasFrete: classificarAberto(receberMes, true),
      abertoAmplo_todasCats: classificarAberto(receberAmplo, false),
      abertoAmplo_soVendasFrete: classificarAberto(receberAmplo, true),
      dashComBaixasPagamento: {
        recebido: dash.recebido,
        aReceberNoMes: dash.aReceberNoMes,
        vencido: dash.vencido,
      },
      dashSemBaixas: {
        recebido: dashAntigo.recebido,
        aReceberNoMes: dashAntigo.aReceberNoMes,
        vencido: dashAntigo.vencido,
      },
      qtdReceberMes: receberMes.length,
      qtdReceberAmplo: receberAmplo.length,
      qtdBaixasMes: baixasMes.length,
    },
    null,
    2,
  ),
);

process.exit(0);
