import { z } from "zod";
import { OrigemPedido, PeriodoKpi } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard, somarTotais, totaisVazios } from "../lib/composicao-valor.js";
import { classificarStatusPedido } from "../lib/pedido-status.js";
import { diaIsoAmericaSp, mesIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import { router, comercialProcedure } from "../../_core/trpc";

type SerieKpi = {
  periodo: string;
  valor_liquido: number;
  valor_bruto: number;
  frete: number;
  desconto: number;
  orcamentos: number;
  pedidos: number;
  clientes: Set<string>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
        where: {
          origemPedido: OrigemPedido.CONTA_AZUL,
          dataPedido: { gte: input.inicio, lte: input.fim },
        },
        select: {
          clienteId: true,
          valorTotal: true,
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          composicaoDetalhada: true,
          dataPedido: true,
          statusPedido: true,
        },
      });

      const composicaoVendas = totaisVazios();
      const composicaoOrcamentos = totaisVazios();
      const porCliente = new Map<string, { total: number; qtd: number; ultima: Date }>();
      const ticketMensalPorCliente = new Map<string, number>();
      const serieMap = new Map<string, SerieKpi>();
      let pedidosVenda = 0;
      let pedidosOrcamento = 0;

      for (const p of pedidos) {
        const comp = composicaoDoPedidoParaDashboard(p);
        const cls = classificarStatusPedido(p.statusPedido);
        const dia = diaIsoAmericaSp(p.dataPedido);
        const serie = serieMap.get(dia) ?? {
          periodo: dia,
          valor_liquido: 0,
          valor_bruto: 0,
          frete: 0,
          desconto: 0,
          orcamentos: 0,
          pedidos: 0,
          clientes: new Set<string>(),
        };

        if (cls === "orcamento") {
          pedidosOrcamento += 1;
          somarTotais(composicaoOrcamentos, comp);
          serie.orcamentos += comp.valorLiquido;
          serieMap.set(dia, serie);
          continue;
        }

        if (cls !== "venda") continue;

        pedidosVenda += 1;
        somarTotais(composicaoVendas, comp);
        serie.valor_liquido += comp.valorLiquido;
        serie.valor_bruto += comp.valorBruto;
        serie.frete += comp.valorFrete;
        serie.desconto += comp.valorDesconto;
        serie.pedidos += 1;
        serie.clientes.add(p.clienteId);
        serieMap.set(dia, serie);

        const acc = porCliente.get(p.clienteId) ?? { total: 0, qtd: 0, ultima: p.dataPedido };
        acc.total += comp.valorLiquido;
        acc.qtd += 1;
        if (p.dataPedido > acc.ultima) acc.ultima = p.dataPedido;
        porCliente.set(p.clienteId, acc);

        const clienteMesKey = `${p.clienteId}|${mesIsoAmericaSp(p.dataPedido)}`;
        ticketMensalPorCliente.set(clienteMesKey, (ticketMensalPorCliente.get(clienteMesKey) ?? 0) + comp.valorLiquido);
      }

      const agora = input.fim;
      let churnSinal = 0;
      for (const [, v] of Array.from(porCliente.entries())) {
        const dias = (agora.getTime() - v.ultima.getTime()) / (1000 * 60 * 60 * 24);
        if (dias > 45) churnSinal++;
      }

      const ticketsMediosPorCliente = Array.from(porCliente.values()).map((v) => (v.qtd ? v.total / v.qtd : 0));
      const ticketsMensaisPorCliente = Array.from(ticketMensalPorCliente.values());
      const valorLiquido = round2(composicaoVendas.liquido);

      return {
        clientesAtivosComprando: porCliente.size,
        pedidosVenda,
        pedidosOrcamento,
        valorLiquido,
        valorBruto: round2(composicaoVendas.bruto),
        valorFrete: round2(composicaoVendas.frete),
        valorDesconto: round2(composicaoVendas.desconto),
        valorOrcamentos: round2(composicaoOrcamentos.liquido),
        ticketMedioPedido: pedidosVenda > 0 ? round2(valorLiquido / pedidosVenda) : 0,
        ticketMedioPorClienteMes:
          ticketsMensaisPorCliente.length > 0
            ? round2(ticketsMensaisPorCliente.reduce((a, b) => a + b, 0) / ticketsMensaisPorCliente.length)
            : 0,
        ticketsMediosPorCliente,
        sinalChurnClientes: churnSinal,
        serie: Array.from(serieMap.values())
          .sort((a, b) => a.periodo.localeCompare(b.periodo))
          .map((row) => ({
            periodo: row.periodo,
            valor_liquido: round2(row.valor_liquido),
            valor_bruto: round2(row.valor_bruto),
            frete: round2(row.frete),
            desconto: round2(row.desconto),
            orcamentos: round2(row.orcamentos),
            pedidos: row.pedidos,
            clientes: row.clientes.size,
            ticket_medio: row.pedidos > 0 ? round2(row.valor_liquido / row.pedidos) : 0,
          })),
      };
    }),
});
