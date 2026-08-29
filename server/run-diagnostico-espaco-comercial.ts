/**
 * Diagnóstico de espaço no MySQL comercial.
 * Uso: tsx server/run-diagnostico-espaco-comercial.ts
 *
 * A lógica de consulta vive em `server/comercial/diagnostico-espaco-comercial.ts` e é
 * compartilhada com a rota HTTP `GET /api/diagnostico/espaco-comercial`.
 */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";
import { getDiagnosticoEspacoComercial } from "./comercial/diagnostico-espaco-comercial.js";

async function main() {
  const diagnostico = await getDiagnosticoEspacoComercial();
  console.log(JSON.stringify(diagnostico.data, null, 2));
  console.log(JSON.stringify(diagnostico.counts, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getComercialPrisma().$disconnect();
  });
