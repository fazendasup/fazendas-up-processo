import { z } from "zod";
import { StatusRelacionamento, type TipoCliente } from "../generated/prisma/index.js";
import {
  composicaoFromTotalApenas,
  liquidoPedido,
  pedidoComposicaoProvavelmenteIncompleta,
  somarTotais,
  totaisVazios,
  type ComposicaoValorPedido,
  type TotaisComposicao,
} from "../lib/composicao-valor.js";
import { classificarStatusPedido, pedidoContaOrcamento } from "../lib/pedido-status.js";
import { router, comercialProcedure } from "../../_core/trpc";

function diaCalendarioAmericaSp(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function composicaoDoPedido(p: {
  valorBruto: unknown;
  valorFrete: unknown;
  valorDesconto: unknown;
  valorLiquido: unknown;
  valorTotal: unknown;
  composicaoDetalhada?: unknown;
}): ComposicaoValorPedido {
  const liquido = liquidoPedido(p);
  const brutoRaw = p.valorBruto != null ? Number(p.valorBruto) : NaN;
  const frete = Number(p.valorFrete ?? 0);
  const desconto = Number(p.valorDesconto ?? 0);
  if (Number.isFinite(brutoRaw)) {
    return {
      valorBruto: brutoRaw,
      valorFrete: frete,
      valorDesconto: desconto,
      valorLiquido: liquido,
    };
  }
  return composicaoFromTotalApenas(liquido);
}

function totaisPorTipo(): Record<TipoCliente, TotaisComposicao> {
  return { RESTAURANTE: totaisVazios(), MERCADO: totaisVazios() };
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
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          composicaoDetalhada: true,
          dataPedido: true,
          statusPedido: true,
          cliente: { select: { tipo: true, id: true } },
        },
      });

      const composicaoVendas = totaisVazios();
      const composicaoOrcamentos = totaisVazios();
      const composicaoVendasPorTipo = totaisPorTipo();
      const composicaoOrcamentosPorTipo = totaisPorTipo();
      const pedidosVenda: typeof pedidos = [];
      let vendasComposicaoIncompleta = 0;

      for (const p of pedidos) {
        const comp = composicaoDoPedido(p);
        const cls = classificarStatusPedido(p.statusPedido);
        if (cls === "venda") {
          somarTotais(composicaoVendas, comp);
          somarTotais(composicaoVendasPorTipo[p.cliente.tipo], comp);
          pedidosVenda.push(p);
          if (pedidoComposicaoProvavelmenteIncompleta(p)) vendasComposicaoIncompleta++;
        } else if (cls === "orcamento") {
          somarTotais(composicaoOrcamentos, comp);
          somarTotais(composicaoOrcamentosPorTipo[p.cliente.tipo], comp);
        }
      }

      const vendasRealizadas = composicaoVendas.liquido;
      const orcamentos = composicaoOrcamentos.liquido;
      const ticketMedio = pedidosVenda.length ? vendasRealizadas / pedidosVenda.length : 0;
      const clientesDistintos = new Set(pedidosVenda.map((p) => p.clienteId)).size;

      const ticketPorCliente = new Map<string, { total: number; qtd: number }>();
      for (const p of pedidosVenda) {
        const acc = ticketPorCliente.get(p.clienteId) ?? { total: 0, qtd: 0 };
        acc.total += liquidoPedido(p);
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
          faturamento: vendasRealizadas,
          vendasRealizadas,
          orcamentos,
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
          composicaoVendas,
          composicaoOrcamentos,
          composicaoVendasPorTipo,
          composicaoOrcamentosPorTipo,
          vendasComposicaoIncompleta,
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
        select: {
          dataPedido: true,
          valorTotal: true,
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          statusPedido: true,
        },
      });

      const map = new Map<string, { vendas: number; orcamentos: number }>();
      for (const p of pedidos) {
        const d = new Date(p.dataPedido);
        const key =
          input.bucket === "week"
            ? `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`
            : diaCalendarioAmericaSp(d);
        const acc = map.get(key) ?? { vendas: 0, orcamentos: 0 };
        const liquido = liquidoPedido(p);
        const cls = classificarStatusPedido(p.statusPedido);
        if (cls === "venda") acc.vendas += liquido;
        else if (cls === "orcamento") acc.orcamentos += liquido;
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
