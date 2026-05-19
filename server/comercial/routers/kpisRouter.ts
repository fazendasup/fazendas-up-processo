import { z } from "zod";
import { PeriodoKpi } from "../generated/prisma/index.js";
import { pedidoContaVendaRealizada } from "../lib/pedido-status.js";
import { router, comercialProcedure } from "../../_core/trpc";

export const kpisRouter = router({
  snapshots: comercialProcedure
    .input(z.object({ periodo: z.nativeEnum(PeriodoKpi).optional(), limite: z.number().min(1).max(200).default(60) }))
    .query(({ ctx, input }) =>
      ctx.prisma!.kpiSnapshot.findMany({
        where: input.periodo ? { periodo: input.periodo } : undefined,
        orderBy: { dataReferencia: "desc" },
        take: input.limite,
      }),
    ),

  registrarSnapshot: comercialProcedure
    .input(
      z.object({
        nomeKpi: z.string().min(1),
        valor: z.number(),
        periodo: z.nativeEnum(PeriodoKpi),
        dataReferencia: z.coerce.date(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma!.kpiSnapshot.upsert({
        where: {
          nomeKpi_periodo_dataReferencia: {
            nomeKpi: input.nomeKpi,
            periodo: input.periodo,
            dataReferencia: input.dataReferencia,
          },
        },
        create: {
          nomeKpi: input.nomeKpi,
          valor: input.valor,
          periodo: input.periodo,
          dataReferencia: input.dataReferencia,
        },
        update: { valor: input.valor },
      }),
    ),

  resumoCalculado: comercialProcedure
    .input(z.object({ inicio: z.coerce.date(), fim: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const pedidos = await ctx.prisma!.pedido.findMany({
        where: { dataPedido: { gte: input.inicio, lte: input.fim } },
        select: { clienteId: true, valorTotal: true, dataPedido: true, statusPedido: true },
      });

      const pedidosVenda = pedidos.filter((p) => pedidoContaVendaRealizada(p.statusPedido));

      const porCliente = new Map<string, { total: number; qtd: number; ultima: Date }>();
      for (const p of pedidosVenda) {
        const acc = porCliente.get(p.clienteId) ?? { total: 0, qtd: 0, ultima: p.dataPedido };
        acc.total += Number(p.valorTotal);
        acc.qtd += 1;
        if (p.dataPedido > acc.ultima) acc.ultima = p.dataPedido;
        porCliente.set(p.clienteId, acc);
      }

      const agora = input.fim;
      let churnSinal = 0;
      for (const [, v] of Array.from(porCliente.entries())) {
        const dias = (agora.getTime() - v.ultima.getTime()) / (1000 * 60 * 60 * 24);
        if (dias > 45) churnSinal++;
      }

      return {
        clientesAtivosComprando: porCliente.size,
        ticketsMediosPorCliente: Array.from(porCliente.values()).map((v) =>
          v.qtd ? v.total / v.qtd : 0
        ),
        sinalChurnClientes: churnSinal,
      };
    }),
});
