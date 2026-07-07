/** Verifica índice de retenção e aplica purge de eventos de conciliação. */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";
import {
  liberarEspacoEventosConciliacao,
  limparEventosConciliacaoAntigos,
} from "./comercial/lib/conciliacao-eventos-retencao.js";

async function aplicarVinculoMultiploSePendente(prisma: ReturnType<typeof getComercialPrisma>) {
  const indexes = await prisma.$queryRawUnsafe<
    Array<{ Key_name: string; Non_unique: bigint | number }>
  >(`SHOW INDEX FROM pedidos_operacionais WHERE Column_name = 'pedido_conta_azul_id'`);

  const hasUnique = indexes.some((i) => i.Key_name === "pedidos_operacionais_pedido_conta_azul_id_key");
  const hasNonUnique = indexes.some((i) => i.Key_name === "pedidos_operacionais_pedido_conta_azul_id_idx");
  if (!hasUnique || hasNonUnique) return;

  console.log("Aplicando vinculo_multiplo_acumulo (drop FK + índice único)...");
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`pedidos_operacionais\` DROP FOREIGN KEY \`pedidos_operacionais_pedido_conta_azul_id_fkey\``,
  );
  await prisma.$executeRawUnsafe(
    `DROP INDEX \`pedidos_operacionais_pedido_conta_azul_id_key\` ON \`pedidos_operacionais\``,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX \`pedidos_operacionais_pedido_conta_azul_id_idx\` ON \`pedidos_operacionais\`(\`pedido_conta_azul_id\`)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`pedidos_operacionais\`
      ADD CONSTRAINT \`pedidos_operacionais_pedido_conta_azul_id_fkey\`
      FOREIGN KEY (\`pedido_conta_azul_id\`) REFERENCES \`pedidos\`(\`id\`)
      ON DELETE SET NULL ON UPDATE CASCADE`,
  );
}

async function main() {
  const prisma = getComercialPrisma();
  const emergencia = process.argv.includes("--emergencia");

  await aplicarVinculoMultiploSePendente(prisma);

  const idxEventos = await prisma.$queryRawUnsafe<Array<{ Key_name: string }>>(
    `SHOW INDEX FROM pedidos_conciliacao_eventos WHERE Key_name = 'pedidos_conciliacao_eventos_criado_em_idx'`,
  );
  if (idxEventos.length === 0) {
    console.log("Criando índice criado_em em pedidos_conciliacao_eventos...");
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX \`pedidos_conciliacao_eventos_criado_em_idx\` ON \`pedidos_conciliacao_eventos\`(\`criado_em\`)`,
      );
    } catch (err) {
      console.warn("Índice criado_em não criado (pode já existir ou tabela cheia):", err);
    }
  }

  const totalAntes = await prisma.pedidoConciliacaoEvento.count();
  let removidos = 0;
  if (emergencia) {
    removidos = await liberarEspacoEventosConciliacao(prisma, 100_000);
  } else {
    ({ removidos } = await limparEventosConciliacaoAntigos(prisma));
  }
  const totalDepois = await prisma.pedidoConciliacaoEvento.count();

  console.log(
    JSON.stringify({ ok: true, emergencia, totalAntes, removidos, totalDepois }, null, 2),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getComercialPrisma().$disconnect();
  });
