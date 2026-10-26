import "dotenv/config";
import { buscarParcelasReceberParaComparativo } from "../server/financeiroContaAzulFluxo";
import { ehReceitaCaixaContaAzul } from "../shared/financeiroProjecaoDesembolso";
import {
  fimDiaAmericaSp,
  inicioDiaAmericaSp,
} from "../shared/comercial/periodo-america-sp";

const hoje = "2026-10-22";
const projetoId = 1;

const itens = await buscarParcelasReceberParaComparativo(
  inicioDiaAmericaSp("2025-01-01"),
  fimDiaAmericaSp(hoje),
  projetoId,
  { somenteVencimento: true },
);

let vencidos = 0;
let vencidosOut = 0;
let vencidosAntes = 0;
const porMes = new Map<string, number>();
for (const p of itens) {
  if (!ehReceitaCaixaContaAzul(p)) continue;
  if ((p.valorEmAberto ?? 0) <= 0.009) continue;
  const venc = (p.dataVencimento ?? "").slice(0, 10);
  if (!venc || venc >= hoje) continue;
  const v = p.valorEmAberto;
  vencidos += v;
  const ym = venc.slice(0, 7);
  porMes.set(ym, (porMes.get(ym) ?? 0) + v);
  if (ym === "2026-10") vencidosOut += v;
  else vencidosAntes += v;
}

console.log(
  JSON.stringify(
    {
      caVencidos: 6704.15,
      nossoTodosVencidosAteHoje: Math.round(vencidos * 100) / 100,
      soOutubro: Math.round(vencidosOut * 100) / 100,
      antesDeOutubro: Math.round(vencidosAntes * 100) / 100,
      porMes: [...porMes.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([m, v]) => ({ m, v: Math.round(v * 100) / 100 })),
    },
    null,
    2,
  ),
);
process.exit(0);
