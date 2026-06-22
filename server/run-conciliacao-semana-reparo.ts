/**
 * Repara vínculos de conciliação da semana (acumuladores + sugestões) e recalcula divergências.
 * Uso: tsx server/run-conciliacao-semana-reparo.ts [YYYY-MM-DD]
 * Sem data: semana 15/06–21/06/2026 (segunda da semana passada em relação a 22/06/2026).
 */
import { getComercialPrisma } from "./comercial/db.js";
import { repararConciliacaoSemana } from "./comercial/lib/conciliacao-semana-reparo.js";
import { fimSemana, inicioSemana } from "./comercial/lib/semana.js";

async function main() {
  const arg = process.argv[2];
  const ref = arg ? new Date(`${arg}T12:00:00`) : new Date(2026, 5, 22, 12, 0, 0);
  const inicio = inicioSemana(ref);
  inicio.setDate(inicio.getDate() - 7);
  const fim = fimSemana(inicio);

  const prisma = getComercialPrisma();
  const usuario = { id: "sistema-reparo", nome: "Reparo conciliação semanal" };

  const r = await repararConciliacaoSemana(prisma, inicio, fim, usuario);

  console.log(
    JSON.stringify(
      {
        ok: r.conciliacao.conciliado,
        semana: `${inicio.toISOString().slice(0, 10)} → ${fim.toISOString().slice(0, 10)}`,
        vinculosMultiplos: r.vinculosMultiplos,
        vinculosSimples: r.vinculosSimples,
        acumulaHabilitados: r.acumulaHabilitados,
        resumo: r.conciliacao.resumo,
        pendentes: r.pendentes.map((c) => ({
          cliente: c.clienteNome,
          status: c.status,
          pedidos: `${c.operacional.pedidos}/${c.contaAzul.pedidos}`,
          unidades: `${c.operacional.unidades}/${c.contaAzul.unidades}`,
          valor: `${c.operacional.valorEstimado.toFixed(2)}/${c.contaAzul.valorLiquido.toFixed(2)}`,
        })),
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  process.exit(r.conciliacao.conciliado ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
