/**
 * Diagnóstico: categorias das baixas a receber nos últimos 13 dias de jul e ago/2026.
 * npx tsx scripts/debug-ainda-entra-categorias.ts
 */
import "dotenv/config";
import {
  buscarBaixasReceberPorPeriodoPagamento,
  fetchCatalogoCategorias,
  idsCategoriasReceitaVendas,
} from "../server/financeiroContaAzulFluxo";
import { ehReceitaVendasCaixa } from "../shared/financeiroProjecaoDesembolso";
import { inicioDiaAmericaSp, fimDiaAmericaSp } from "../shared/comercial/periodo-america-sp";

const PROJETO_ID = Number(process.env.DEBUG_PROJETO_ID || 1);

function boundsUltimosN(mesYm: string, n: number) {
  const [y, m] = mesYm.split("-").map(Number);
  const diasNoMes = new Date(y, m, 0).getDate();
  const diaInicio = diasNoMes - n + 1;
  return {
    inicio: inicioDiaAmericaSp(`${mesYm}-${String(diaInicio).padStart(2, "0")}`),
    fim: fimDiaAmericaSp(`${mesYm}-${String(diasNoMes).padStart(2, "0")}`),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function dumpMes(mesYm: string) {
  const b = boundsUltimosN(mesYm, 13);
  console.log(`\n=== ${mesYm} últimos 13 dias (${b.inicio.toISOString()} → ${b.fim.toISOString()}) ===`);
  const baixas = await buscarBaixasReceberPorPeriodoPagamento(
    b.inicio,
    b.fim,
    PROJETO_ID,
  );
  const porCat = new Map<
    string,
    { total: number; qtd: number; dre: string | null; exemplos: string[] }
  >();
  let bruto = 0;
  let vendas = 0;
  for (const p of baixas) {
    const pago = Number(p.valorPago || 0);
    if (pago <= 0) continue;
    bruto += pago;
    const cat = (p.categoria || "(sem categoria)").trim();
    const dre = p.entradaDre ?? null;
    const cur = porCat.get(cat) ?? {
      total: 0,
      qtd: 0,
      dre,
      exemplos: [],
    };
    cur.total += pago;
    cur.qtd += 1;
    cur.dre = dre ?? cur.dre;
    if (cur.exemplos.length < 2) {
      cur.exemplos.push((p.descricao || "").slice(0, 60));
    }
    porCat.set(cat, cur);
    if (
      ehReceitaVendasCaixa({
        descricao: p.descricao,
        rubrica: p.categoria,
        entradaDre: p.entradaDre,
      })
    ) {
      vendas += pago;
    }
  }
  const rows = [...porCat.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [cat, info] of rows) {
    console.log(
      `  R$ ${round2(info.total).toFixed(2).padStart(12)} | n=${String(info.qtd).padStart(3)} | DRE=${info.dre ?? "null"} | ${cat}`,
    );
    for (const ex of info.exemplos) console.log(`      · ${ex}`);
  }
  console.log(`  TOTAL bruto: R$ ${round2(bruto)}`);
  console.log(`  TOTAL filtro ehReceitaVendasCaixa: R$ ${round2(vendas)}`);
  return { bruto: round2(bruto), vendas: round2(vendas) };
}

async function main() {
  const catalogo = await fetchCatalogoCategorias();
  const ids = idsCategoriasReceitaVendas(catalogo);
  console.log(`Catálogo categorias: ${catalogo.size} keys`);
  console.log(`IDs RECEITA_OPERACIONAL_BRUTA: ${ids.length}`);
  const dres = new Map<string, number>();
  for (const [k, c] of catalogo) {
    if (k.startsWith("nome:")) continue;
    const d = c.entrada_dre || "(vazio)";
    dres.set(d, (dres.get(d) || 0) + 1);
  }
  console.log("DRE no catálogo:", Object.fromEntries(dres));
  const nomesVenda = [...catalogo.entries()]
    .filter(
      ([k, c]) =>
        !k.startsWith("nome:") &&
        (c.entrada_dre || "").toUpperCase() === "RECEITA_OPERACIONAL_BRUTA",
    )
    .map(([, c]) => c.nome)
    .filter(Boolean);
  console.log("Nomes cat. receita operacional:", nomesVenda.slice(0, 30));

  const a = await dumpMes("2026-08");
  const j = await dumpMes("2026-07");
  const media =
    a.vendas > 0 && j.vendas > 0
      ? round2((a.vendas + j.vendas) / 2)
      : a.vendas || j.vendas;
  console.log(`\nMédia filtro vendas jul/ago: R$ ${media}`);
  console.log(
    `Média bruto jul/ago: R$ ${
      a.bruto > 0 && j.bruto > 0
        ? round2((a.bruto + j.bruto) / 2)
        : a.bruto || j.bruto
    }`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
