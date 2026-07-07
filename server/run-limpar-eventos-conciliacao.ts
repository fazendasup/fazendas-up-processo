/**
 * Libera espaço em pedidos_conciliacao_eventos (auditoria de conciliação).
 * Uso: tsx server/run-limpar-eventos-conciliacao.ts [--dias=90] [--emergencia]
 */
import { getComercialPrisma } from "./comercial/db.js";
import {
  liberarEspacoEventosConciliacao,
  limparEventosConciliacaoAntigos,
  RETENCAO_EVENTOS_CONCILIACAO_DIAS,
} from "./comercial/lib/conciliacao-eventos-retencao.js";

function parseDias(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--dias="));
  if (!flag) return RETENCAO_EVENTOS_CONCILIACAO_DIAS;
  const n = Number(flag.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : RETENCAO_EVENTOS_CONCILIACAO_DIAS;
}

async function main() {
  const prisma = getComercialPrisma();
  const emergencia = process.argv.includes("--emergencia");
  const dias = parseDias(process.argv);

  const totalAntes = await prisma.pedidoConciliacaoEvento.count();
  let removidos = 0;

  if (emergencia) {
    removidos = await liberarEspacoEventosConciliacao(prisma, 100_000);
  } else {
    ({ removidos } = await limparEventosConciliacaoAntigos(prisma, { dias }));
  }

  const totalDepois = await prisma.pedidoConciliacaoEvento.count();
  console.log(
    JSON.stringify(
      {
        ok: true,
        modo: emergencia ? "emergencia" : "retencao",
        dias: emergencia ? null : dias,
        removidos,
        totalAntes,
        totalDepois,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getComercialPrisma();
    await prisma.$disconnect();
  });
