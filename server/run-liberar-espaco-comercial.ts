/**
 * Libera espaço no MySQL comercial (auditoria/logs que enchem o disco).
 * Uso:
 *   tsx server/run-liberar-espaco-comercial.ts
 *   tsx server/run-liberar-espaco-comercial.ts --emergencia
 *
 * --emergencia faz TRUNCATE de pedidos_conciliacao_eventos, execucoes_api e
 * pedidos_operacionais_auditoria (único jeito de devolver bytes ao disco com
 * innodb_file_per_table — DELETE não basta quando o volume está 100% cheio).
 */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";
import { liberarEspacoComercial } from "./comercial/lib/mysql-espaco.js";

async function main() {
  const prisma = getComercialPrisma();
  const emergencia = process.argv.includes("--emergencia");
  const antes = {
    eventos: await prisma.pedidoConciliacaoEvento.count(),
    auditoria: await prisma.pedidoOperacionalAuditoria.count(),
    execucoes: await prisma.execucaoApi.count(),
  };
  const result = await liberarEspacoComercial(prisma, { emergencia });
  const depois = {
    eventos: await prisma.pedidoConciliacaoEvento.count(),
    auditoria: await prisma.pedidoOperacionalAuditoria.count(),
    execucoes: await prisma.execucaoApi.count(),
  };
  console.log(JSON.stringify({ ok: true, emergencia, antes, depois, ...result }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getComercialPrisma().$disconnect();
  });
