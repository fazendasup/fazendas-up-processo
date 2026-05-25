import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  PrioridadeOportunidade,
  StatusOportunidade,
} from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";
import { prioridadeOrdenacao } from "../services/priorizacao";
import { extrairSinaisDePedidos } from "../services/classificacao-cliente";

function scoreOportunidade(o: {
  prioridade: PrioridadeOportunidade;
  valorEstimado: unknown;
  probabilidadeConversao: unknown;
}) {
  const valor = Number(o.valorEstimado ?? 0);
  const prob = Number(o.probabilidadeConversao ?? 0);
  return prioridadeOrdenacao(o.prioridade) * 1_000_000 + valor * (prob / 100);
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function pct(n: number | null): string {
  if (n == null) return "sem base comparativa";
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}

function topItens<T extends { valor: number }>(items: T[], take = 6): T[] {
  return [...items].sort((a, b) => b.valor - a.valor).slice(0, take);
}

function scoreLeitura(score: number | null) {
  if (score == null) return "Score ainda não calculado.";
  if (score >= 85)
    return "Cliente de alta atratividade: bom histórico, recorrência e/ou ticket acima da carteira.";
  if (score >= 65)
    return "Cliente saudável: há tração suficiente para abordagem comercial com critério.";
  if (score >= 40)
    return "Cliente intermediário: exige abordagem seletiva, com oferta bem alinhada ao histórico.";
  return "Cliente frágil ou inativo: priorizar recuperação antes de ampliar mix.";
}

function probabilidadeLeitura(tipo: string, prob: number, valor: number) {
  const base =
    tipo === "UPSELL"
      ? "Probabilidade puxada por recorrência, ticket e aderência dos itens já comprados."
      : tipo === "CROSS_SELL"
        ? "Probabilidade puxada por lacuna de categoria/produto comparada ao que clientes semelhantes compram."
        : tipo === "REATIVACAO"
          ? "Probabilidade puxada por histórico de compra, recência e queda/ausência recente."
          : "Probabilidade puxada por aderência inicial e baixo risco de teste.";
  return `${base} Potencial ponderado aproximado: ${money(valor * (prob / 100))}.`;
}

export const oportunidadesRouter = router({
  listar: comercialProcedure
    .input(
      z.object({
        status: z.nativeEnum(StatusOportunidade).optional(),
        prioridade: z.nativeEnum(PrioridadeOportunidade).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const lista = await ctx.prisma!.oportunidade.findMany({
        where: {
          statusOportunidade: input.status,
          prioridade: input.prioridade,
        },
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              tipo: true,
              statusRelacionamento: true,
            },
          },
        },
        orderBy: { dataCriacao: "desc" },
        take: 100,
      });

      return lista.sort(
        (a, b) =>
          scoreOportunidade(b) - scoreOportunidade(a) ||
          b.dataCriacao.getTime() - a.dataCriacao.getTime()
      );
    }),

  detalheAnalitico: comercialProcedure
    .input(z.object({ oportunidadeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const op = await ctx.prisma!.oportunidade.findUnique({
        where: { id: input.oportunidadeId },
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              tipo: true,
              statusRelacionamento: true,
              scoreComercial: true,
              tags: true,
            },
          },
        },
      });
      if (!op)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Oportunidade não encontrada",
        });

      const pedidos = await ctx.prisma!.pedido.findMany({
        where: {
          clienteId: op.clienteId,
          origemPedido: "CONTA_AZUL",
        },
        include: { itens: true },
        orderBy: { dataPedido: "desc" },
        take: 120,
      });

      const sinais = extrairSinaisDePedidos(pedidos);
      const score =
        op.cliente.scoreComercial == null
          ? null
          : Number(op.cliente.scoreComercial);
      const prob = Number(op.probabilidadeConversao ?? 0);
      const valor = Number(op.valorEstimado ?? 0);
      const ultimosPedidos = pedidos.slice(0, 8).map(p => ({
        id: p.id,
        dataPedido: p.dataPedido,
        statusPedido: p.statusPedido,
        valorLiquido: Number(p.valorLiquido ?? p.valorTotal ?? 0),
        itens: p.itens.slice(0, 6).map(i => ({
          produto: i.produto,
          categoria: i.categoria,
          quantidade: Number(i.quantidade),
          precoUnit: Number(i.precoUnit),
        })),
      }));

      const produtosTop = topItens(sinais.produtosDetalhe).map(p => ({
        nome: p.nome,
        categoria: p.categoria,
        valor: p.valor,
        quantidade: p.quantidade,
        pedidos: p.pedidos,
        participacaoValor: p.participacaoValor,
      }));
      const categoriasTop = topItens(sinais.categoriasDetalhe).map(c => ({
        nome: c.nome,
        valor: c.valor,
        quantidade: c.quantidade,
        pedidos: c.pedidos,
        participacaoValor: c.participacaoValor,
      }));

      const evidencias = [
        `${sinais.totalPedidos} venda(s) consideradas no histórico recente usado pela inteligência.`,
        `Ticket médio de ${money(sinais.ticketMedio)} e frequência aproximada de ${sinais.frequenciaPorSemana.toFixed(1)} venda(s)/semana.`,
        `Recência: ${sinais.diasSemCompra == null ? "sem compra registrada" : `${sinais.diasSemCompra} dia(s) desde a última compra`}.`,
        `Tendência 30d: ${pct(sinais.tendenciaReceitaPct)} em relação aos 30 dias anteriores.`,
        produtosTop.length
          ? `Produtos líderes: ${produtosTop
              .slice(0, 3)
              .map(p => p.nome)
              .join(", ")}.`
          : "Ainda sem itens detalhados suficientes para ranking de produtos.",
      ];

      return {
        oportunidade: {
          id: op.id,
          tipoOportunidade: op.tipoOportunidade,
          descricao: op.descricao,
          prioridade: op.prioridade,
          valorEstimado: valor,
          probabilidadeConversao: prob,
          statusOportunidade: op.statusOportunidade,
          dataCriacao: op.dataCriacao,
        },
        cliente: {
          ...op.cliente,
          scoreComercial: score,
        },
        score: {
          valor: score,
          leitura: scoreLeitura(score),
          fatores: [
            {
              nome: "Recência",
              valor:
                sinais.diasSemCompra == null
                  ? "sem compra"
                  : `${sinais.diasSemCompra} dia(s)`,
            },
            {
              nome: "Frequência",
              valor: `${sinais.frequenciaPorSemana.toFixed(1)} venda(s)/semana`,
            },
            { nome: "Ticket médio", valor: money(sinais.ticketMedio) },
            { nome: "Valor histórico", valor: money(sinais.valorTotalPeriodo) },
            {
              nome: "Diversidade",
              valor: `${sinais.diversidadeCategorias} categoria(s)`,
            },
            { nome: "Tendência 30d", valor: pct(sinais.tendenciaReceitaPct) },
          ],
        },
        probabilidade: {
          valor: prob,
          leitura: probabilidadeLeitura(op.tipoOportunidade, prob, valor),
        },
        sinais: {
          totalPedidos: sinais.totalPedidos,
          diasSemCompra: sinais.diasSemCompra,
          ticketMedio: sinais.ticketMedio,
          frequenciaPorSemana: sinais.frequenciaPorSemana,
          valorTotalPeriodo: sinais.valorTotalPeriodo,
          valorUltimos30: sinais.valorUltimos30,
          valor30Anterior: sinais.valor30Anterior,
          tendenciaReceitaPct: sinais.tendenciaReceitaPct,
          categoriaPrincipal: sinais.categoriaPrincipal,
          produtoPrincipal: sinais.produtoPrincipal,
          diversidadeCategorias: sinais.diversidadeCategorias,
        },
        mix: {
          categoriasTop,
          produtosTop,
        },
        evidencias,
        ultimosPedidos,
      };
    }),

  criarRascunhoMensagem: comercialProcedure
    .input(z.object({ oportunidadeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const op = await ctx.prisma!.oportunidade.findUnique({
        where: { id: input.oportunidadeId },
        include: { cliente: true },
      });
      if (!op)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Oportunidade não encontrada",
        });

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
