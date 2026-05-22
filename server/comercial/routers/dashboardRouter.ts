import { z } from "zod";
import { StatusRelacionamento, TipoCliente } from "../generated/prisma/index.js";
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

function mesCalendarioAmericaSp(d: Date): string {
  return diaCalendarioAmericaSp(d).slice(0, 7);
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
  return Object.values(TipoCliente).reduce(
    (acc, tipo) => {
      acc[tipo] = totaisVazios();
      return acc;
    },
    {} as Record<TipoCliente, TotaisComposicao>,
  );
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
      const ticketPorTipo = Object.values(TipoCliente).reduce(
        (acc, tipo) => {
          acc[tipo] = { total: 0, pedidos: 0, clientes: new Set<string>(), clienteMeses: new Set<string>() };
          return acc;
        },
        {} as Record<TipoCliente, { total: number; pedidos: number; clientes: Set<string>; clienteMeses: Set<string> }>,
      );
      const ticketMensalPorCliente = new Map<string, number>();
      let vendasComposicaoIncompleta = 0;

      for (const p of pedidos) {
        const comp = composicaoDoPedido(p);
        const cls = classificarStatusPedido(p.statusPedido);
        if (cls === "venda") {
          somarTotais(composicaoVendas, comp);
          somarTotais(composicaoVendasPorTipo[p.cliente.tipo], comp);
          ticketPorTipo[p.cliente.tipo].total += comp.valorLiquido;
          ticketPorTipo[p.cliente.tipo].pedidos += 1;
          ticketPorTipo[p.cliente.tipo].clientes.add(p.clienteId);
          const clienteMesKey = `${p.clienteId}|${mesCalendarioAmericaSp(p.dataPedido)}`;
          ticketPorTipo[p.cliente.tipo].clienteMeses.add(clienteMesKey);
          ticketMensalPorCliente.set(clienteMesKey, (ticketMensalPorCliente.get(clienteMesKey) ?? 0) + comp.valorLiquido);
          pedidosVenda.push(p);
          if (pedidoComposicaoProvavelmenteIncompleta(p)) vendasComposicaoIncompleta++;
        } else if (cls === "orcamento") {
          somarTotais(composicaoOrcamentos, comp);
          somarTotais(composicaoOrcamentosPorTipo[p.cliente.tipo], comp);
        }
      }

      const vendasRealizadas = composicaoVendas.liquido;
      const orcamentos = composicaoOrcamentos.liquido;
      const clientesDistintos = new Set(pedidosVenda.map((p) => p.clienteId)).size;
      const ticketsMensais = Array.from(ticketMensalPorCliente.values());
      const ticketMedio = ticketsMensais.length > 0 ? ticketsMensais.reduce((a, b) => a + b, 0) / ticketsMensais.length : 0;
      const ticketMedioPorCliente = ticketMedio;

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
          ticketMedioPorTipo: Object.values(TipoCliente).map((tipo) => {
            const row = ticketPorTipo[tipo];
            return {
              tipo,
              total: row.total,
              pedidos: row.pedidos,
              clientes: row.clientes.size,
              mesesCliente: row.clienteMeses.size,
              ticketMedio: row.clienteMeses.size > 0 ? row.total / row.clienteMeses.size : 0,
              ticketMedioPorCliente: row.clienteMeses.size > 0 ? row.total / row.clienteMeses.size : 0,
            };
          }),
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
