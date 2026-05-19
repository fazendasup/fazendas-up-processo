import { z } from "zod";
import { StatusRelacionamento } from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";

function diaCalendarioAmericaSp(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export const dashboardRouter = router({
  resumo: comercialProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pedidos = await ctx.prisma!.pedido.findMany({
        where: { dataPedido: { gte: input.inicio, lte: input.fim } },
        select: {
          id: true,
          clienteId: true,
          valorTotal: true,
          dataPedido: true,
          cliente: { select: { tipo: true, id: true } },
        },
      });

      const faturamento = pedidos.reduce((s, p) => s + Number(p.valorTotal), 0);
      const ticketMedio = pedidos.length ? faturamento / pedidos.length : 0;
      const clientesDistintos = new Set(pedidos.map((p) => p.clienteId)).size;

      const faturamentoPorTipo = { RESTAURANTE: 0 as number, MERCADO: 0 as number };
      for (const p of pedidos) {
        faturamentoPorTipo[p.cliente.tipo] += Number(p.valorTotal);
      }

      const ticketPorCliente = new Map<string, { total: number; qtd: number }>();
      for (const p of pedidos) {
        const acc = ticketPorCliente.get(p.clienteId) ?? { total: 0, qtd: 0 };
        acc.total += Number(p.valorTotal);
        acc.qtd += 1;
        ticketPorCliente.set(p.clienteId, acc);
      }
      const tickets = Array.from(ticketPorCliente.values()).map((v) => (v.qtd ? v.total / v.qtd : 0));
      const ticketMedioPorCliente =
        tickets.length > 0 ? tickets.reduce((a, b) => a + b, 0) / tickets.length : 0;

      const clientesEmRisco = await ctx.prisma!.cliente.count({
        where: { statusRelacionamento: StatusRelacionamento.EM_RISCO },
      });

      const clientesAtivos = await ctx.prisma!.cliente.count({
        where: { statusRelacionamento: StatusRelacionamento.ATIVO },
      });

      const oportunidadesAbertas = await ctx.prisma!.oportunidade.count({
        where: { statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] } },
      });

      const oportunidadesPorTipo = await ctx.prisma!.oportunidade.groupBy({
        by: ["tipoOportunidade"],
        where: { statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] } },
        _count: { id: true },
      });

      const topOportunidades = await ctx.prisma!.oportunidade.findMany({
        where: { statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] } },
        orderBy: [{ prioridade: "desc" }, { dataCriacao: "desc" }],
        take: 5,
        include: { cliente: { select: { id: true, nome: true, tipo: true } } },
      });

      const potencialOportunidades = await ctx.prisma!.oportunidade.aggregate({
        where: { statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] } },
        _sum: { valorEstimado: true },
      });

      const mensagensPendentes = await ctx.prisma!.mensagem.count({
        where: { statusEnvio: "AGUARDANDO_APROVACAO" },
      });

      const ultimasExecucoes = await ctx.prisma!.execucaoApi.findMany({
        orderBy: { dataExecucao: "desc" },
        take: 8,
      });

      const totalExecucoes = await ctx.prisma!.execucaoApi.count();
      const execucoesSucesso = await ctx.prisma!.execucaoApi.count({ where: { statusExecucao: "SUCESSO" } });
      const taxaSucessoApis = totalExecucoes > 0 ? execucoesSucesso / totalExecucoes : 1;

      return {
        periodo: { inicio: input.inicio, fim: input.fim },
        kpis: {
          faturamento,
          ticketMedio,
          ticketMedioPorCliente,
          pedidos: pedidos.length,
          clientesComPedido: clientesDistintos,
          clientesAtivos,
          clientesEmRisco,
          oportunidadesAbertas,
          potencialOportunidades: Number(potencialOportunidades._sum.valorEstimado ?? 0),
          mensagensPendentes,
          faturamentoPorTipo,
          taxaSucessoApis,
        },
        oportunidadesPorTipo: oportunidadesPorTipo.map((o) => ({
          tipo: o.tipoOportunidade,
          total: o._count.id,
        })),
        topOportunidades: topOportunidades.map((o) => ({
          id: o.id,
          tipo: o.tipoOportunidade,
          descricao: o.descricao,
          valorEstimado: o.valorEstimado ? Number(o.valorEstimado) : null,
          prioridade: o.prioridade,
          cliente: o.cliente,
        })),
        ultimasExecucoes,
      };
    }),

  serieFaturamento: comercialProcedure
    .input(z.object({ inicio: z.coerce.date(), fim: z.coerce.date(), bucket: z.enum(["day", "week"]).default("day") }))
    .query(async ({ ctx, input }) => {
      const pedidos = await ctx.prisma!.pedido.findMany({
        where: { dataPedido: { gte: input.inicio, lte: input.fim } },
        select: { dataPedido: true, valorTotal: true },
      });

      const map = new Map<string, number>();
      for (const p of pedidos) {
        const d = new Date(p.dataPedido);
        const key =
          input.bucket === "week"
            ? `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
            : diaCalendarioAmericaSp(d);
        map.set(key, (map.get(key) ?? 0) + Number(p.valorTotal));
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([periodo, valor]) => ({ periodo, valor }));
    }),
});
