import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PrioridadeOportunidade, StatusOportunidade } from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";
import { prioridadeOrdenacao } from "../services/priorizacao";

export const oportunidadesRouter = router({
  listar: comercialProcedure
    .input(
      z.object({
        status: z.nativeEnum(StatusOportunidade).optional(),
        prioridade: z.nativeEnum(PrioridadeOportunidade).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const lista = await ctx.prisma!.oportunidade.findMany({
        where: {
          statusOportunidade: input.status,
          prioridade: input.prioridade,
        },
        include: { cliente: { select: { id: true, nome: true, tipo: true, statusRelacionamento: true } } },
        orderBy: { dataCriacao: "desc" },
        take: 100,
      });

      return lista.sort(
        (a, b) => prioridadeOrdenacao(b.prioridade) - prioridadeOrdenacao(a.prioridade),
      );
    }),

  criarRascunhoMensagem: comercialProcedure
    .input(z.object({ oportunidadeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const op = await ctx.prisma!.oportunidade.findUnique({
        where: { id: input.oportunidadeId },
        include: { cliente: true },
      });
      if (!op) throw new TRPCError({ code: "NOT_FOUND", message: "Oportunidade não encontrada" });

      const sugerido = `Olá ${op.cliente.nome}, temos uma oportunidade alinhada ao seu histórico: ${op.descricao}`;

      const mensagem = await ctx.prisma!.mensagem.create({
        data: {
          clienteId: op.clienteId,
          tipoMensagem: "OFERTA",
          conteudoSugerido: sugerido,
          statusEnvio: "AGUARDANDO_APROVACAO",
          sensivel: true,
        },
      });

      return { mensagemId: mensagem.id };
    }),
});
