import { z } from "zod";
import { AcaoApi, StatusExecucaoApi } from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";

export const execucoesRouter = router({
  /** Taxa global de sucesso — evita carregar o resumo completo do dashboard em Configurações */
  resumo: comercialProcedure.query(async ({ ctx }) => {
    const totalExecucoes = await ctx.prisma!.execucaoApi.count();
    const execucoesSucesso = await ctx.prisma!.execucaoApi.count({
      where: { statusExecucao: "SUCESSO" },
    });
    const taxaSucessoApis = totalExecucoes > 0 ? execucoesSucesso / totalExecucoes : 1;
    return { totalExecucoes, execucoesSucesso, taxaSucessoApis };
  }),

  listar: comercialProcedure
    .input(
      z.object({
        acao: z.nativeEnum(AcaoApi).optional(),
        status: z.nativeEnum(StatusExecucaoApi).optional(),
        limite: z.number().min(1).max(200).default(80),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma!.execucaoApi.findMany({
        where: {
          acaoApi: input.acao,
          statusExecucao: input.status,
        },
        orderBy: { dataExecucao: "desc" },
        take: input.limite,
        include: { cliente: { select: { id: true, nome: true } } },
      }),
    ),
});
