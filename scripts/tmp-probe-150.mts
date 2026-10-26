import "dotenv/config";
import { buscarParcelasReceberParaComparativo } from "../server/financeiroContaAzulFluxo";
import { ehReceitaVendasCaixa } from "../shared/financeiroProjecaoDesembolso";
import {
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const hojeIso = "2026-10-22";
const projetoId = 1;

// Outubro
const out = await buscarParcelasReceberParaComparativo(
  inicioDiaAmericaSp("2026-10-01"),
  fimDiaAmericaSp("2026-10-31"),
  projetoId,
);

// Setembro (vencidos que CA pode ainda listar)
const set = await buscarParcelasReceberParaComparativo(
  inicioDiaAmericaSp("2026-09-01"),
  fimDiaAmericaSp("2026-09-30"),
  projetoId,
);

function abertos(itens: typeof out, label: string) {
  const rows = [];
  for (const p of itens) {
    if ((p.valorEmAberto ?? 0) <= 0.009) continue;
    const venc = (p.dataVencimento ?? "").slice(0, 10);
    if (!venc || venc >= hojeIso) continue;
    rows.push({
      label,
      v: Math.round(p.valorEmAberto * 100) / 100,
      desc: (p.descricao ?? "").slice(0, 60),
      venc,
      rubrica: p.rubrica,
      cats: p.categorias,
      venda: ehReceitaVendasCaixa(p),
      dre: p.entradaDre,
      status: p.status,
    });
  }
  return rows;
}

const vencOut = abertos(out, "out");
const vencSet = abertos(set, "set");
const totOut = vencOut.reduce((s, x) => s + x.v, 0);
const hit150 = [...vencOut, ...vencSet].filter(
  x => Math.abs(x.v - 150) < 0.02 || Math.abs(x.v - 150.0) < 0.02,
);

console.log(
  JSON.stringify(
    {
      totOut: Math.round(totOut * 100) / 100,
      gapCa: Math.round((6704.15 - totOut) * 100) / 100,
      hit150,
      setOverdueStillOpen: vencSet
        .sort((a, b) => b.v - a.v)
        .slice(0, 15),
      setOverdueTot: Math.round(vencSet.reduce((s, x) => s + x.v, 0) * 100) / 100,
    },
    null,
    2,
  ),
);
process.exit(0);
