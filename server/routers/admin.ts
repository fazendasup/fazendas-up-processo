import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { projetoIdFromCtx, adminProjectProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { hasAnyOperationalResetCluster } from "../../shared/operationalReset";
import { ESTRUTURA_OVERRIDE_FV_12x6, MAX_ANDARES_TORRE_MICROVERDES } from "../../shared/types";

const operationalResetClustersSchema = z.object({
  torresGrade: z.boolean(),
  limparCultivoGrade: z.boolean(),
  historicoSolucaoCaixa: z.boolean(),
  removerCadastroCaixasAgua: z.boolean(),
  germinacao: z.boolean(),
  transplantios: z.boolean(),
  manutencoes: z.boolean(),
  planosPlantio: z.boolean(),
  registrosColheita: z.boolean(),
  tarefas: z.boolean(),
  estoque: z.boolean(),
  inteligenciaAlertas: z.boolean(),
  visao: z.boolean(),
  bancadasHidroponia: z.boolean(),
});

function resumoLimpezaOperacional(input: z.infer<typeof operationalResetClustersSchema>): string {
  const parts: string[] = [];
  const add = (cond: boolean, text: string) => {
    if (cond) parts.push(text);
  };
  add(input.torresGrade, "torres, andares, perfis e furos (infraestrutura apagada)");
  add(input.limparCultivoGrade && !input.torresGrade, "plantio na grade (torres mantidas)");
  add(input.removerCadastroCaixasAgua, "cadastro de caixas d'água");
  add(input.historicoSolucaoCaixa && !input.removerCadastroCaixasAgua, "medições e aplicações na solução");
  add(input.germinacao, "germinação");
  add(input.transplantios, "transplântios");
  if (input.torresGrade) parts.push("manutenções em torres");
  else if (input.manutencoes) parts.push("manutenções");
  add(input.planosPlantio, "planos de plantio");
  add(input.registrosColheita, "colheitas registadas");
  add(input.tarefas, "tarefas");
  add(input.estoque, "estoque");
  add(input.inteligenciaAlertas, "inteligência e alertas");
  add(input.visao, "visão computacional");
  add(input.bancadasHidroponia, "bancadas hidroponia");
  return parts.length ? `Removido: ${parts.join("; ")}.` : "";
}

export const adminRouter = router({
  seed: adminProjectProcedure.mutation(async ({ ctx }) => {
    const projetoId = projetoIdFromCtx(ctx);

    const VARIEDADES_PADRAO = [
      { slug: "alface-crespa", nome: "Alface Crespa", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
      { slug: "alface-americana", nome: "Alface Americana", diasMudas: 14, diasVegetativa: 25, diasMaturacao: 35 },
      { slug: "alface-roxa", nome: "Alface Roxa", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
      { slug: "rucula", nome: "Rúcula", diasMudas: 10, diasVegetativa: 15, diasMaturacao: 20 },
      { slug: "agriao", nome: "Agrião", diasMudas: 12, diasVegetativa: 18, diasMaturacao: 25 },
      { slug: "espinafre", nome: "Espinafre", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
      { slug: "couve", nome: "Couve", diasMudas: 18, diasVegetativa: 28, diasMaturacao: 35 },
      { slug: "manjericao", nome: "Manjericão", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
      { slug: "baby-leaf-beterraba", nome: "Baby Leaf / Beterraba", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
      { slug: "baby-leaf-acelga", nome: "Baby Leaf / Acelga", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
      { slug: "salsa", nome: "Salsa", diasMudas: 18, diasVegetativa: 25, diasMaturacao: 30 },
      { slug: "cebolinha", nome: "Cebolinha", diasMudas: 21, diasVegetativa: 28, diasMaturacao: 35 },
      { slug: "hortela", nome: "Hortelã", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
      { slug: "coentro", nome: "Coentro", diasMudas: 10, diasVegetativa: 18, diasMaturacao: 25 },
    ].map((v) => ({ ...v, projetoId }));

    const FASES_CONFIG_DATA = [
      {
        projetoId,
        fase: "mudas",
        label: "Mudas",
        ecMin: 1.0,
        ecMax: 1.2,
        phMin: 5.8,
        phMax: 6.2,
        cor: "oklch(0.65 0.19 160)",
        corLight: "oklch(0.92 0.08 160)",
        icon: "🌱",
      },
      {
        projetoId,
        fase: "vegetativa",
        label: "Vegetativa",
        ecMin: 1.5,
        ecMax: 2.0,
        phMin: 5.5,
        phMax: 6.5,
        cor: "oklch(0.60 0.15 158)",
        corLight: "oklch(0.93 0.07 158)",
        icon: "🌿",
      },
      {
        projetoId,
        fase: "maturacao",
        label: "Maturação",
        ecMin: 2.0,
        ecMax: 2.5,
        phMin: 5.8,
        phMax: 6.2,
        cor: "oklch(0.54 0.13 152)",
        corLight: "oklch(0.93 0.065 152)",
        icon: "🥬",
      },
    ];

    await db.resetAllData(projetoId);
    await db.bulkInsertVariedades(VARIEDADES_PADRAO);
    await db.bulkInsertFasesConfig(FASES_CONFIG_DATA);

    const proj = await db.getProjetoRow(projetoId);
    const mv = proj?.tipo === "microverdes";

    if (mv) {
      await db.createTorreComEstrutura({
        projetoId,
        slug: "t-germinacao-1",
        nome: "Torre Germinação 1",
        fase: "mudas",
        numAndares: MAX_ANDARES_TORRE_MICROVERDES,
        numeroTorre: 1,
      });
      for (let t = 1; t <= 4; t++) {
        await db.createTorreComEstrutura({
          projetoId,
          slug: `t-iluminacao-${t}`,
          nome: `Torre Iluminação ${t}`,
          fase: "vegetativa",
          numAndares: MAX_ANDARES_TORRE_MICROVERDES,
          numeroTorre: 1 + t,
        });
      }
    } else {
      await db.createTorreComEstrutura({
        projetoId,
        slug: "t-mudas-1",
        nome: "Torre Mudas 1",
        fase: "mudas",
        numAndares: 12,
        numeroTorre: 1,
      });

      for (let t = 1; t <= 3; t++) {
        await db.createTorreComEstrutura({
          projetoId,
          slug: `t-veg-${t}`,
          nome: `Torre Vegetativa ${t}`,
          fase: "vegetativa",
          numAndares: 12,
          numeroTorre: 1 + t,
        });
      }

      for (let t = 1; t <= 10; t++) {
        await db.createTorreComEstrutura({
          projetoId,
          slug: `t-mat-${t}`,
          nome: `Torre Maturação ${t}`,
          fase: "maturacao",
          numAndares: 9,
          numeroTorre: 4 + t,
          estruturaOverrideJson: t >= 9 ? JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6) : null,
        });
      }
    }

    return { success: true, message: "Dados iniciais criados com sucesso" };
  }),

  reset: adminProjectProcedure.mutation(async ({ ctx }) => {
    await db.resetAllData(projetoIdFromCtx(ctx));
    return { success: true, message: "Todos os dados foram removidos" };
  }),

  /** Limpeza operacional com categorias (mantém variedades, receitas e ciclos). */
  resetOperationalClusters: adminProjectProcedure
    .input(operationalResetClustersSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasAnyOperationalResetCluster(input)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione pelo menos uma categoria para limpar.",
        });
      }
      await db.resetOperationalDataByClusters(projetoIdFromCtx(ctx), input);
      const resumo = resumoLimpezaOperacional(input);
      const gradeOuTorres =
        input.torresGrade || input.limparCultivoGrade || input.historicoSolucaoCaixa || input.removerCadastroCaixasAgua;
      const plantioNoPainelPodePersistir = !input.torresGrade && !input.limparCultivoGrade;
      return {
        success: true,
        towerDataRemoved: input.torresGrade || input.limparCultivoGrade,
        gradeOuTorres,
        plantioNoPainelPodePersistir,
        message:
          "Limpeza concluída. Mantidas variedades, receitas de crescimento e ciclos de aplicação. " +
          resumo +
          (input.torresGrade || input.removerCadastroCaixasAgua
            ? " Recrie ou associe torres/caixas em Configuração se removeu infraestrutura."
            : ""),
      };
    }),

  /**
   * Recria torres + caixas padrão FV só se o projeto não tiver nenhuma torre (ex.: após limpeza que apagou infraestrutura).
   * Não restaura dados antigos nem nomes personalizados — use backup MySQL para recuperação total.
   */
  restoreFvInfrastructureIfEmpty: adminProjectProcedure.mutation(async ({ ctx }) => {
    const out = await db.ensureFvDefaultInfrastructure(projetoIdFromCtx(ctx));
    return { success: true, ...out };
  }),
});
