import { z } from "zod";
import {
  FINALIDADES_MO_EQUIPE,
  REGIMES_MO_EQUIPE,
  calcularEquipeCompleta,
  mapaCustoHoraProcessamento,
  somarMoOverheadEquipes,
} from "@shared/custosMoEquipe";
import {
  commercialEditorCustosProducaoProjectProcedure,
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import * as moEquipeDb from "../custosMoEquipeDb";
import { mapMoEquipeRowToInput } from "../moEquipeMapper";
import {
  observacoesOperadorPj,
  operadoresPjPadrao,
} from "@shared/custosMoEquipeOperadoresPj";
import { colaboradoresFolha052026 } from "@shared/custosMoEquipeFolha052026";

const regimeZ = z.enum(REGIMES_MO_EQUIPE);
const finalidadeZ = z.enum(FINALIDADES_MO_EQUIPE);

const equipeInput = z
  .object({
    id: z.number().int().positive().optional(),
    nome: z.string().min(1).max(160),
    cargo: z.string().max(120).optional().nullable(),
    codigoFolha: z.string().max(32).optional().nullable(),
    regime: regimeZ,
    finalidade: finalidadeZ.default("processamento"),
    numPessoas: z.number().int().positive().default(1),
    horasMes: z.number().nonnegative(),
    custoMensalBase: z.number().nonnegative().optional().nullable(),
    encargosPct: z.number().min(0).max(300).optional().nullable(),
    custoMensalTotal: z.number().nonnegative().optional().nullable(),
    liquidoMensal: z.number().nonnegative().optional().nullable(),
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

export const custosMoEquipeSubRouter = router({
  listar: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const [rows, config, modo] = await Promise.all([
      moEquipeDb.listMoEquipes(pid),
      moEquipeDb.getMoConfig(pid),
      moEquipeDb.getModoCustoMoEquipe(pid),
    ]);
    const inputs = rows.map(mapMoEquipeRowToInput);
    const equipes = inputs.map((input) => ({
      ...input,
      ordem: rows.find((r) => r.id === input.id)?.ordem ?? 0,
      calculo: calcularEquipeCompleta(input, modo),
    }));
    return {
      equipes,
      mapaCustoHora: mapaCustoHoraProcessamento(inputs, modo),
      overheadMoMensal: somarMoOverheadEquipes(inputs, modo),
      overheadMoEmpregador: somarMoOverheadEquipes(inputs, "empregador"),
      overheadMoLiquido: somarMoOverheadEquipes(inputs, "liquido"),
      config,
      modoCusto: modo,
    };
  }),

  salvarConfig: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ usarLiquidoDesembolso: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      await moEquipeDb.setMoConfig(pid, input.usarLiquidoDesembolso);
      return moEquipeDb.getMoConfig(pid);
    }),

  salvar: commercialEditorCustosProducaoProjectProcedure
    .input(equipeInput)
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const modo = await moEquipeDb.getModoCustoMoEquipe(pid);
      const payload = {
        projetoId: pid,
        nome: input.nome.trim(),
        cargo: input.cargo?.trim() || null,
        codigoFolha: input.codigoFolha?.trim() || null,
        regime: input.regime,
        finalidade: input.finalidade,
        numPessoas: input.numPessoas,
        horasMes: String(input.horasMes),
        custoMensalBase: input.custoMensalBase != null ? String(input.custoMensalBase) : null,
        encargosPct: input.encargosPct != null ? String(input.encargosPct) : null,
        custoMensalTotal: input.custoMensalTotal != null ? String(input.custoMensalTotal) : null,
        liquidoMensal: input.liquidoMensal != null ? String(input.liquidoMensal) : null,
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
      return { id, calculo: calcularEquipeCompleta(mapMoEquipeRowToInput(saved), modo) };
    }),

  excluir: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await moEquipeDb.deleteMoEquipe(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),

  cadastrarOperadoresPjPadrao: commercialEditorCustosProducaoProjectProcedure.mutation(
    async ({ ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const existentes = await moEquipeDb.listMoEquipes(pid);
      const nomesExistentes = new Set(existentes.map((e) => e.nome.trim().toLowerCase()));
      const templates = operadoresPjPadrao();

      let inseridos = 0;
      let ignorados = 0;
      const nomes: string[] = [];

      for (let idx = 0; idx < templates.length; idx++) {
        const t = templates[idx]!;
        if (nomesExistentes.has(t.nome.toLowerCase())) {
          ignorados += 1;
          continue;
        }
        const indice = idx + 1;
        await moEquipeDb.insertMoEquipe({
          projetoId: pid,
          nome: t.nome,
          regime: t.regime,
          finalidade: t.finalidade,
          numPessoas: t.numPessoas,
          horasMes: String(t.horasMes),
          custoMensalBase: String(t.custoMensalBase),
          encargosPct: null,
          custoMensalTotal: String(t.custoMensalTotal),
          liquidoMensal: t.liquidoMensal != null ? String(t.liquidoMensal) : null,
          observacoes: observacoesOperadorPj(indice),
          ordem: indice,
          ativo: true,
        });
        inseridos += 1;
        nomes.push(t.nome);
        nomesExistentes.add(t.nome.toLowerCase());
      }

      return { inseridos, ignorados, nomes, custoMensalPorOperador: templates[0]?.custoMensalTotal ?? 0 };
    },
  ),

  importarFolha052026: commercialEditorCustosProducaoProjectProcedure.mutation(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const existentes = await moEquipeDb.listMoEquipes(pid);
    const porCodigo = new Map(
      existentes.filter((e) => e.codigoFolha).map((e) => [e.codigoFolha as string, e]),
    );
    const porNome = new Map(existentes.map((e) => [e.nome.trim().toLowerCase(), e]));

    let inseridos = 0;
    let atualizados = 0;

    for (const c of colaboradoresFolha052026()) {
      const prev = porCodigo.get(c.codigoFolha) ?? porNome.get(c.nome.trim().toLowerCase());
      const payload = {
        projetoId: pid,
        nome: c.nome,
        cargo: c.cargo,
        codigoFolha: c.codigoFolha,
        regime: c.regime,
        finalidade: c.finalidade,
        numPessoas: c.numPessoas,
        horasMes: String(c.horasMes),
        custoMensalBase: c.custoMensalBase != null ? String(c.custoMensalBase) : null,
        encargosPct: null,
        custoMensalTotal: c.custoMensalTotal != null ? String(c.custoMensalTotal) : null,
        liquidoMensal: c.liquidoMensal != null ? String(c.liquidoMensal) : null,
        observacoes: c.observacoes ?? null,
        ordem: Number(c.codigoFolha),
        ativo: true,
      };

      if (prev) {
        await moEquipeDb.updateMoEquipe(pid, prev.id, payload);
        atualizados += 1;
      } else {
        await moEquipeDb.insertMoEquipe(payload);
        inseridos += 1;
      }
    }

    return { inseridos, atualizados, total: colaboradoresFolha052026().length };
  }),
});
