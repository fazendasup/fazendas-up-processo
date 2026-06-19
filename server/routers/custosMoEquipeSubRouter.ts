import { z } from "zod";
import {
  FINALIDADES_MO_EQUIPE,
  REGIMES_MO_EQUIPE,
  calcularEquipeCompleta,
  mapaCustoHoraProcessamento,
  somarMoOverheadEquipes,
  type FinalidadeMoEquipe,
  type RegimeMoEquipe,
} from "@shared/custosMoEquipe";
import {
  commercialEditorCustosProducaoProjectProcedure,
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import * as moEquipeDb from "../custosMoEquipeDb";

const regimeZ = z.enum(REGIMES_MO_EQUIPE);
const finalidadeZ = z.enum(FINALIDADES_MO_EQUIPE);

const equipeInput = z
  .object({
    id: z.number().int().positive().optional(),
    nome: z.string().min(1).max(160),
    regime: regimeZ,
    finalidade: finalidadeZ.default("processamento"),
    numPessoas: z.number().int().positive().default(1),
    horasMes: z.number().nonnegative(),
    custoMensalBase: z.number().nonnegative().optional().nullable(),
    encargosPct: z.number().min(0).max(300).optional().nullable(),
    custoMensalTotal: z.number().nonnegative().optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    ordem: z.number().int().optional(),
    ativo: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const temTotal = val.custoMensalTotal != null && val.custoMensalTotal > 0;
    const temBase = val.custoMensalBase != null && val.custoMensalBase > 0;
    if (!temTotal && !temBase) {
      ctx.addIssue({
        code: "custom",
        message: "Informe custo mensal total ou base salarial/contrato.",
      });
    }
    if (val.regime === "clt" && !temTotal && val.encargosPct == null) {
      ctx.addIssue({
        code: "custom",
        message: "CLT: informe encargos (%) sobre a base ou o custo mensal total.",
      });
    }
    if (val.finalidade === "processamento" && !(val.horasMes > 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Equipe de processamento exige horas produtivas no mês (> 0).",
      });
    }
  });

function rowToInput(row: Awaited<ReturnType<typeof moEquipeDb.listMoEquipes>>[number]) {
  return {
    id: row.id,
    nome: row.nome,
    regime: row.regime as RegimeMoEquipe,
    finalidade: row.finalidade as FinalidadeMoEquipe,
    numPessoas: row.numPessoas,
    horasMes: Number(row.horasMes),
    custoMensalBase: row.custoMensalBase != null ? Number(row.custoMensalBase) : null,
    encargosPct: row.encargosPct != null ? Number(row.encargosPct) : null,
    custoMensalTotal: row.custoMensalTotal != null ? Number(row.custoMensalTotal) : null,
    observacoes: row.observacoes,
    ordem: row.ordem,
    ativo: row.ativo,
  };
}

export const custosMoEquipeSubRouter = router({
  listar: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const rows = await moEquipeDb.listMoEquipes(pid);
    const equipes = rows.map((r) => {
      const input = rowToInput(r);
      return { ...input, calculo: calcularEquipeCompleta(input) };
    });
    const inputs = rows.map(rowToInput);
    const mapa = mapaCustoHoraProcessamento(inputs);
    return {
      equipes,
      mapaCustoHora: mapa,
      overheadMoMensal: somarMoOverheadEquipes(inputs),
    };
  }),

  salvar: commercialEditorCustosProducaoProjectProcedure
    .input(equipeInput)
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const payload = {
        projetoId: pid,
        nome: input.nome.trim(),
        regime: input.regime,
        finalidade: input.finalidade,
        numPessoas: input.numPessoas,
        horasMes: String(input.horasMes),
        custoMensalBase: input.custoMensalBase != null ? String(input.custoMensalBase) : null,
        encargosPct: input.encargosPct != null ? String(input.encargosPct) : null,
        custoMensalTotal: input.custoMensalTotal != null ? String(input.custoMensalTotal) : null,
        observacoes: input.observacoes?.trim() || null,
        ordem: input.ordem ?? 0,
        ativo: input.ativo ?? true,
      };
      let id = input.id;
      if (id) await moEquipeDb.updateMoEquipe(pid, id, payload);
      else id = await moEquipeDb.insertMoEquipe(payload);
      const rows = await moEquipeDb.listMoEquipes(pid);
      const saved = rows.find((r) => r.id === id);
      if (!saved) throw new Error("Equipe não encontrada após salvar");
      const equipeInputRow = rowToInput(saved);
      return { id, calculo: calcularEquipeCompleta(equipeInputRow) };
    }),

  excluir: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await moEquipeDb.deleteMoEquipe(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
