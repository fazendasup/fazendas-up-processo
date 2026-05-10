import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const fazendaRouter = router({
  loadAll: projectProcedure.query(async ({ ctx }) => {
    return db.loadFullFazendaData(projetoIdFromCtx(ctx));
  }),
});
