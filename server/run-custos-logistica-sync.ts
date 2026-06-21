/**
 * Grava etapa de logística (dedupe + 10% padrão) em todas as fichas existentes.
 * Uso: pnpm custos:sync-logistica
 */
import { sincronizarLogisticaTodasFichas } from "./custosProdutoLogisticaSync";

async function main() {
  const r = await sincronizarLogisticaTodasFichas();
  console.log(
    JSON.stringify(
      {
        ok: true,
        projetos: r.projetos,
        fichas: r.total,
        atualizadas: r.atualizadas,
        deduplicadas: r.deduplicadas,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
