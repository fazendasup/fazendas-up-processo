import { automacaoModuleProcedure, projetoIdFromCtx, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Dados operacionais para o painel de Automação (SCADA).
 * Mesmo payload que `fazenda.loadAll`, mas exige módulo `automacao` contratado para o projeto ativo.
 */
export const automacaoRouter = router({
  dadosOperacionais: automacaoModuleProcedure.query(async ({ ctx }) => {
    return db.loadFullFazendaData(projetoIdFromCtx(ctx));
  }),
});
