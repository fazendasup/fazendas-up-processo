import "dotenv/config";
import { buscarParcelasReceberParaComparativo } from "../server/financeiroContaAzulFluxo";
import { ehReceitaVendasCaixa } from "../shared/financeiroProjecaoDesembolso";
import {
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const mesYm = "2026-10";
const hojeIso = "2026-10-22";
const projetoId = 1;
const ini = inicioDiaAmericaSp(`${mesYm}-01`);
const fim = fimDiaAmericaSp(`${mesYm}-31`);
const itens = await buscarParcelasReceberParaComparativo(ini, fim, projetoId);

const vencidos = [];
for (const p of itens) {
  if ((p.valorEmAberto ?? 0) <= 0.009) continue;
  const venc = (p.dataVencimento ?? "").slice(0, 10);
  if (venc && venc < hojeIso) {
    vencidos.push({
      id: p.id,
      v: Math.round(p.valorEmAberto * 100) / 100,
      desc: (p.descricao ?? "").slice(0, 70),
      rubrica: p.rubrica,
      cats: p.categorias,
      venda: ehReceitaVendasCaixa(p),
      venc,
      status: p.status,
      forn: (p.fornecedor ?? "").slice(0, 40),
    });
  }
}
vencidos.sort((a, b) => b.v - a.v);
const tot = vencidos.reduce((s, x) => s + x.v, 0);
const totV = vencidos.filter(x => x.venda).reduce((s, x) => s + x.v, 0);
const naoVenda = vencidos.filter(x => !x.venda);
console.log(
  JSON.stringify(
    {
      tot: Math.round(tot * 100) / 100,
      totVendas: Math.round(totV * 100) / 100,
      gapVsCa: Math.round((6704.15 - tot) * 100) / 100,
      naoVendaTot: Math.round(naoVenda.reduce((s, x) => s + x.v, 0) * 100) / 100,
      naoVenda,
      topVendas: vencidos.filter(x => x.venda).slice(0, 10),
    },
    null,
    2,
  ),
);
process.exit(0);
