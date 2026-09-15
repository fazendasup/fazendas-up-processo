import { z } from "zod";
import {
  custosProducaoModuleProcedure,
  router,
} from "../_core/trpc";
import { analisarFinanceiroCfoContaAzul } from "../financeiroContaAzulFluxo";

export const financeiroCfoRouter = router({
  /** Análise CFO: fluxo, setores, oportunidades e plano de ações (Conta Azul). */
  analise: custosProducaoModuleProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
      }),
    )
    .query(async ({ input }) => {
      const inicio = new Date(input.inicio);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(input.fim);
      fim.setHours(23, 59, 59, 999);
      if (fim.getTime() < inicio.getTime()) {
        throw new Error("Período inválido: fim antes do início.");
      }
      const dias =
        (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      if (dias > 120) {
        throw new Error("Período máximo de 120 dias por análise.");
      }
      return analisarFinanceiroCfoContaAzul(inicio, fim);
    }),
});
