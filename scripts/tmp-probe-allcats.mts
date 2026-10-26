import "dotenv/config";
import { buscarParcelasReceberParaComparativo } from "../server/financeiroContaAzulFluxo";
import {
  ehReceitaCaixaContaAzul,
  ehReceitaVendasCaixa,
} from "../shared/financeiroProjecaoDesembolso";
import {
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const hoje = "2026-10-22";
const itens = await buscarParcelasReceberParaComparativo(
  inicioDiaAmericaSp("2026-10-01"),
  fimDiaAmericaSp("2026-10-31"),
  1,
  { somenteVencimento: true },
);

let v = 0,
  h = 0,
  a = 0,
  vv = 0,
  hv = 0,
  av = 0;
for (const p of itens) {
  if ((p.valorEmAberto ?? 0) <= 0.009) continue;
  const venc = (p.dataVencimento ?? "").slice(0, 10);
  if (!venc) continue;
  if (!ehReceitaCaixaContaAzul(p)) continue;
  const venda = ehReceitaVendasCaixa(p);
  if (venc < hoje) {
    v += p.valorEmAberto;
    if (venda) vv += p.valorEmAberto;
  } else if (venc === hoje) {
    h += p.valorEmAberto;
    if (venda) hv += p.valorEmAberto;
  } else {
    a += p.valorEmAberto;
    if (venda) av += p.valorEmAberto;
  }
}

console.log(
  JSON.stringify(
    {
      all: {
        vencidos: +v.toFixed(2),
        hoje: +h.toFixed(2),
        aVencer: +a.toFixed(2),
        total: +(v + h + a).toFixed(2),
      },
      vendas: {
        vencidos: +vv.toFixed(2),
        hoje: +hv.toFixed(2),
        aVencer: +av.toFixed(2),
        total: +(vv + hv + av).toFixed(2),
      },
      ca: {
        vencidos: 6704.15,
        hoje: 778.66,
        aVencer: 26045.84,
        total: 33528.65,
      },
    },
    null,
    2,
  ),
);
process.exit(0);
