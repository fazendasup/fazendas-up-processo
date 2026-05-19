import { z } from "zod";
import { StatusRelacionamento } from "../generated/prisma/index.js";
import {
  classificarStatusPedido,
  pedidoContaOrcamento,
  pedidoContaVendaRealizada,
} from "../lib/pedido-status.js";
import { router, comercialProcedure } from "../../_core/trpc";

function diaCalendarioAmericaSp(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type PedidoValor = {
  valorTotal: unknown;
  statusPedido: string;
  clienteId: string;
};

function somarPorClassificacao(pedidos: PedidoValor[]) {
  let vendasRealizadas = 0;
  let orcamentos = 0;
  let cancelados = 0;
  let outros = 0;
  const pedidosVenda: typeof pedidos = [];

  for (const p of pedidos) {
    const valor = Number(p.valorTotal);
    const cls = classificarStatusPedido(p.statusPedido);
    if (cls === "venda") {
      vendasRealizadas += valor;
      pedidosVenda.push(p);
    } else if (cls === "orcamento") {
      orcamentos += valor;
    } else if (cls === "cancelado") {
      cancelados += valor;
    } else {
      outros += valor;
    }
  }

  return { vendasRealizadas, orcamentos, cancelados, outros, pedidosVenda };
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
          statusPedido: true,
          cliente: { select: { tipo: true, id: true } },
        },
      });

      const { vendasRealizadas, orcamentos, cancelados, outros, pedidosVenda } =
        somarPorClassificacao(pedidos);

      const faturamento = vendasRealizadas;
      const ticketMedio = pedidosVenda.length ? vendasRealizadas / pedidosVenda.length : 0;
      const clientesDistintos = new Set(pedidosVenda.map((p) => p.clienteId)).size;

      const faturamentoPorTipo = { RESTAURANTE: 0 as number, MERCADO: 0 as number };
      const orcamentoPorTipo = { RESTAURANTE: 0 as number, MERCADO: 0 as number };
      for (const p of pedidos) {
        const valor = Number(p.valorTotal);
        if (pedidoContaVendaRealizada(p.statusPedido)) {
          faturamentoPorTipo[p.cliente.tipo] += valor;
        } else if (pedidoContaOrcamento(p.statusPedido)) {
          orcamentoPorTipo[p.cliente.tipo] += valor;
        }
      }

      const ticketPorCliente = new Map<string, { total: number; qtd: number }>();
      for (const p of pedidosVenda) {
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
          vendasRealizadas,
          orcamentos,
          cancelados,
          outros,
          ticketMedio,
          ticketMedioPorCliente,
          pedidos: pedidosVenda.length,
          pedidosOrcamento: pedidos.filter((p) => pedidoContaOrcamento(p.statusPedido)).length,
          clientesComPedido: clientesDistintos,
          clientesAtivos,
          clientesEmRisco,
          oportunidadesAbertas,
          potencialOportunidades: Number(potencialOportunidades._sum.valorEstimado ?? 0),
          mensagensPendentes,
          faturamentoPorTipo,
          orcamentoPorTipo,
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
        select: { dataPedido: true, valorTotal: true, statusPedido: true },
      });

      const map = new Map<string, { vendas: number; orcamentos: number }>();
      for (const p of pedidos) {
        const d = new Date(p.dataPedido);
        const key =
          input.bucket === "week"
            ? `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
            : diaCalendarioAmericaSp(d);
        const acc = map.get(key) ?? { vendas: 0, orcamentos: 0 };
        const valor = Number(p.valorTotal);
        const cls = classificarStatusPedido(p.statusPedido);
        if (cls === "venda") acc.vendas += valor;
        else if (cls === "orcamento") acc.orcamentos += valor;
        map.set(key, acc);
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([periodo, v]) => ({
          periodo,
          valor: v.vendas,
          vendas: v.vendas,
          orcamentos: v.orcamentos,
        }));
    }),
});
