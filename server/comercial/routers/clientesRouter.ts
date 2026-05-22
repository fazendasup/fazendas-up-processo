import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma, PrioridadeOportunidade, StatusRelacionamento, TipoCliente } from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";
import {
  calcularScoreComercialBase,
  extrairSinaisDePedidos,
  inferirStatusRelacionamento,
  sugerirTags,
} from "../services/classificacao-cliente";

function rankPrioridade(p: PrioridadeOportunidade): number {
  if (p === "ALTA") return 3;
  if (p === "MEDIA") return 2;
  return 1;
}

const selectCarteiraBase = {
  id: true,
  nome: true,
  tipo: true,
  cnpjCpf: true,
  externalId: true,
  emailPrincipal: true,
  statusRelacionamento: true,
  scoreComercial: true,
  telefoneWhatsapp: true,
  tags: true,
} as const;

function buscaCarteiraWhere(busca: string | undefined): Prisma.ClienteWhereInput {
  const b = busca?.trim();
  if (!b) return {};
  const variants = Array.from(
    new Set([b, b.toLowerCase(), b.toUpperCase(), b.charAt(0).toUpperCase() + b.slice(1).toLowerCase()]),
  ).filter((s) => s.length > 0);
  return {
    OR: variants.flatMap((v) => [
      { nome: { contains: v } },
      { cnpjCpf: { contains: v } },
      { externalId: { contains: v } },
      { emailPrincipal: { contains: v } },
    ]),
  };
}

function mesCarteiraKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export const clientesRouter = router({
  listar: comercialProcedure
    .input(
      z.object({
        busca: z.string().optional(),
        tipo: z.nativeEnum(TipoCliente).optional(),
        statusRelacionamento: z.nativeEnum(StatusRelacionamento).optional(),
        limite: z.number().min(1).max(100).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma!.cliente.findMany({
        where: {
          AND: [
            input.busca
              ? {
                  OR: [
                    { nome: { contains: input.busca } },
                    { cnpjCpf: { contains: input.busca } },
                  ],
                }
              : {},
            input.tipo ? { tipo: input.tipo } : {},
            input.statusRelacionamento ? { statusRelacionamento: input.statusRelacionamento } : {},
          ],
        },
        orderBy: { dataUltimaAtualizacao: "desc" },
        take: input.limite,
        select: {
          id: true,
          nome: true,
          tipo: true,
          cnpjCpf: true,
          statusRelacionamento: true,
          scoreComercial: true,
          telefoneWhatsapp: true,
          tags: true,
        },
      });
    }),

  /**
   * Carteira enriquecida: agregados de pedidos, oportunidades abertas, últimos movimentos e insights — para cards na UI.
   */
  listarCarteira: comercialProcedure
    .input(
      z.object({
        busca: z.string().optional(),
        tipo: z.nativeEnum(TipoCliente).optional(),
        statusRelacionamento: z.nativeEnum(StatusRelacionamento).optional(),
        limite: z.number().min(1).max(240).default(40),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clientes = await ctx.prisma!.cliente.findMany({
        where: {
          AND: [
            buscaCarteiraWhere(input.busca),
            input.tipo ? { tipo: input.tipo } : {},
            input.statusRelacionamento ? { statusRelacionamento: input.statusRelacionamento } : {},
          ],
        },
        orderBy: { dataUltimaAtualizacao: "desc" },
        take: input.limite,
        select: selectCarteiraBase,
      });

      if (clientes.length === 0) return [];

      const ids = clientes.map((c) => c.id);

      const [aggPedidos, pedidosMensalRaw, opCounts, opsRaw, pedidosRaw, interacoes] = await Promise.all([
        ctx.prisma!.pedido.groupBy({
          by: ["clienteId"],
          where: { clienteId: { in: ids } },
          _sum: { valorTotal: true },
          _count: { id: true },
          _max: { dataPedido: true },
        }),
        ctx.prisma!.pedido.findMany({
          where: { clienteId: { in: ids } },
          select: { clienteId: true, dataPedido: true, valorTotal: true },
        }),
        ctx.prisma!.oportunidade.groupBy({
          by: ["clienteId"],
          where: {
            clienteId: { in: ids },
            statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] },
          },
          _count: { id: true },
        }),
        ctx.prisma!.oportunidade.findMany({
          where: {
            clienteId: { in: ids },
            statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] },
          },
          select: {
            id: true,
            clienteId: true,
            tipoOportunidade: true,
            prioridade: true,
            valorEstimado: true,
            descricao: true,
            dataCriacao: true,
          },
        }),
        ctx.prisma!.pedido.findMany({
          where: { clienteId: { in: ids } },
          orderBy: { dataPedido: "desc" },
          take: 500,
          select: {
            id: true,
            clienteId: true,
            dataPedido: true,
            valorTotal: true,
            statusPedido: true,
          },
        }),
        ctx.prisma!.interacao.findMany({
          where: { clienteId: { in: ids } },
          orderBy: { dataInteracao: "desc" },
          take: 120,
          select: {
            clienteId: true,
            dataInteracao: true,
            resumo: true,
            tipoInteracao: true,
          },
        }),
      ]);

      const aggMap = new Map(aggPedidos.map((a) => [a.clienteId, a]));
      const opCountMap = new Map(opCounts.map((o) => [o.clienteId, o._count.id]));
      const ticketMensalMap = new Map<string, { total: number; meses: Set<string> }>();
      for (const p of pedidosMensalRaw) {
        const acc = ticketMensalMap.get(p.clienteId) ?? { total: 0, meses: new Set<string>() };
        acc.total += Number(p.valorTotal);
        acc.meses.add(mesCarteiraKey(p.dataPedido));
        ticketMensalMap.set(p.clienteId, acc);
      }

      let totalValorCarteira = 0;
      let totalMesesClienteCarteira = 0;
      for (const a of aggPedidos) {
        const mensal = ticketMensalMap.get(a.clienteId);
        totalValorCarteira += mensal?.total ?? Number(a._sum.valorTotal ?? 0);
        totalMesesClienteCarteira += mensal?.meses.size ?? 0;
      }
      const ticketMedioGlobal = totalMesesClienteCarteira > 0 ? totalValorCarteira / totalMesesClienteCarteira : 0;

      const opsSorted = [...opsRaw].sort(
        (a, b) => rankPrioridade(b.prioridade) - rankPrioridade(a.prioridade) || +b.dataCriacao - +a.dataCriacao,
      );
      const opsByCliente = new Map<string, typeof opsRaw>();
      for (const o of opsSorted) {
        const arr = opsByCliente.get(o.clienteId) ?? [];
        if (arr.length < 3) {
          arr.push(o);
          opsByCliente.set(o.clienteId, arr);
        }
      }

      const pedsByCliente = new Map<string, typeof pedidosRaw>();
      for (const p of pedidosRaw) {
        const arr = pedsByCliente.get(p.clienteId) ?? [];
        if (arr.length < 4) {
          arr.push(p);
          pedsByCliente.set(p.clienteId, arr);
        }
      }

      const interacaoPorCliente = new Map<string, (typeof interacoes)[0]>();
      for (const i of interacoes) {
        if (!interacaoPorCliente.has(i.clienteId)) interacaoPorCliente.set(i.clienteId, i);
      }

      const agora = Date.now();

      return clientes.map((c) => {
        const agg = aggMap.get(c.id);
        const mensal = ticketMensalMap.get(c.id);
        const nPed = agg?._count.id ?? 0;
        const totalValor = agg?._sum.valorTotal != null ? Number(agg._sum.valorTotal) : 0;
        const mesesComCompra = mensal?.meses.size ?? 0;
        const ticketMedio = mesesComCompra > 0 ? (mensal?.total ?? totalValor) / mesesComCompra : null;
        const ultimaCompra = agg?._max.dataPedido ?? null;
        const dias =
          ultimaCompra != null ? Math.round((agora - ultimaCompra.getTime()) / 86_400_000) : null;

        const oportunidadesAbertas = opCountMap.get(c.id) ?? 0;
        const oportunidades = (opsByCliente.get(c.id) ?? []).map((o) => ({
          id: o.id,
          tipoOportunidade: o.tipoOportunidade,
          prioridade: o.prioridade,
          valorEstimado: o.valorEstimado != null ? Number(o.valorEstimado) : null,
          descricaoResumo: o.descricao.length > 120 ? `${o.descricao.slice(0, 117)}…` : o.descricao,
          dataCriacao: o.dataCriacao,
        }));

        const ultimosPedidos = (pedsByCliente.get(c.id) ?? []).map((p) => ({
          id: p.id,
          dataPedido: p.dataPedido,
          valorTotal: Number(p.valorTotal),
          statusPedido: p.statusPedido,
        }));

        const ultimaInteracao = interacaoPorCliente.get(c.id);
        const ui = ultimaInteracao
          ? {
              dataInteracao: ultimaInteracao.dataInteracao,
              tipoInteracao: ultimaInteracao.tipoInteracao,
              resumo:
                ultimaInteracao.resumo && ultimaInteracao.resumo.length > 140
                  ? `${ultimaInteracao.resumo.slice(0, 137)}…`
                  : ultimaInteracao.resumo,
            }
          : null;

        const insights: string[] = [];
        if (c.statusRelacionamento === "EM_RISCO") {
          insights.push("Relacionamento em risco — priorizar contato ou recuperação.");
        }
        if (c.statusRelacionamento === "ESTRATEGICO") {
          insights.push("Cliente estratégico — manter ritmo de relacionamento.");
        }
        if (dias != null && dias > 45) {
          insights.push(`Sem compra há ${dias} dias.`);
        } else if (dias != null && dias > 30) {
          insights.push("Sem compra há mais de 30 dias — revisar follow-up.");
        }
        if (oportunidadesAbertas > 0) {
          insights.push(`${oportunidadesAbertas} oportunidade(s) em aberto (upsell/cross-sell).`);
        }
        if (ticketMedio != null && ticketMedioGlobal > 0 && ticketMedio >= ticketMedioGlobal * 1.12) {
          insights.push("Ticket médio acima da média geral da carteira.");
        }
        if (nPed === 0) {
          insights.push("Ainda sem pedidos sincronizados — verificar cadastro na Conta Azul.");
        }

        return {
          ...c,
          resumo: {
            totalPedidos: nPed,
            valorTotal: totalValor,
            ticketMedio,
            mesesComCompra,
            ultimaCompra,
            diasDesdeUltimaCompra: dias,
          },
          oportunidadesAbertas,
          oportunidades,
          ultimosPedidos,
          ultimaInteracao: ui,
          insights,
        };
      });
    }),

  obter360: comercialProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const cliente = await ctx.prisma!.cliente.findUnique({
      where: { id: input.id },
      include: {
        pedidos: { orderBy: { dataPedido: "desc" }, take: 25, include: { itens: true } },
        interacoes: { orderBy: { dataInteracao: "desc" }, take: 50 },
        oportunidades: { orderBy: { dataCriacao: "desc" }, take: 20 },
      },
    });

    if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

    const execucoes = await ctx.prisma!.execucaoApi.findMany({
      where: { clienteId: cliente.id },
      orderBy: { dataExecucao: "desc" },
      take: 30,
    });

    return { cliente, execucoes };
  }),

  criar: comercialProcedure
    .input(
      z.object({
        nome: z.string().min(2).max(200),
        tipo: z.nativeEnum(TipoCliente),
        cnpjCpf: z.string().max(20).optional(),
        telefoneWhatsapp: z.string().max(30).optional(),
        emailPrincipal: z.union([z.string().email(), z.literal("")]).optional(),
        statusRelacionamento: z.nativeEnum(StatusRelacionamento).default("ATIVO"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.emailPrincipal?.trim();
      const tags: Prisma.JsonArray = ["cadastro_manual"];

      const created = await ctx.prisma!.cliente.create({
        data: {
          nome: input.nome.trim(),
          tipo: input.tipo,
          cnpjCpf: input.cnpjCpf?.trim() || null,
          telefoneWhatsapp: input.telefoneWhatsapp?.trim() || null,
          emailPrincipal: email && email.length > 0 ? email : null,
          statusRelacionamento: input.statusRelacionamento,
          tags,
        },
        select: { id: true, nome: true },
      });

      return created;
    }),

  atualizarTipo: comercialProcedure
    .input(z.object({ clienteId: z.string(), tipo: z.nativeEnum(TipoCliente) }))
    .mutation(async ({ ctx, input }) => {
      const cliente = await ctx.prisma!.cliente.update({
        where: { id: input.clienteId },
        data: { tipo: input.tipo },
        select: { id: true, nome: true, tipo: true },
      });
      return cliente;
    }),

  recalcularScore: comercialProcedure.input(z.object({ clienteId: z.string() })).mutation(async ({ ctx, input }) => {
    const pedidos = await ctx.prisma!.pedido.findMany({ where: { clienteId: input.clienteId } });
    const cliente = await ctx.prisma!.cliente.findUnique({ where: { id: input.clienteId } });
    if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

    const sinais = extrairSinaisDePedidos(pedidos);
    const score = calcularScoreComercialBase(sinais);
    const status = inferirStatusRelacionamento(sinais);
    const tagsSugeridas = sugerirTags(cliente, sinais);

    const mergedTags = Array.from(new Set([...(cliente.tags as string[]), ...tagsSugeridas]));

    await ctx.prisma!.cliente.update({
      where: { id: cliente.id },
      data: {
        scoreComercial: new Prisma.Decimal(score),
        statusRelacionamento: status,
        tags: mergedTags,
      },
    });

    return { scoreComercial: score, statusRelacionamento: status, tags: mergedTags, sinais };
  }),
});
