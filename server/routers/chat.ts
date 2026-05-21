import { confirmAssistantActionsInputSchema } from "@shared/assistant-actions";
import { isOperationalAdminRole } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import { projetoIdFromCtx, projectProcedure, router } from "../_core/trpc";
import { executeAssistantActions } from "../assistant-actions/execute";
import { runFarmAssistantChat } from "../chat-assistant";
import { classificarStatusPedido } from "../comercial/lib/pedido-status";
import { getComercialPrisma } from "../comercial/db";
import { buildCompactFazendaSnapshotMarkdown } from "../chat-context";
import * as db from "../db";
import { projetarEstoque } from "../../shared/estoque";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(16_000),
});

function inicioMesAtualLocal(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDiaAtualLocal(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

async function buildEstoqueAssistantResumo(pid: number, enabled: boolean) {
  if (!enabled) return null;
  const rows = await db.getAllEstoqueItens(pid);
  return rows.map((row) => {
    const quantidadeTotal =
      row.unidadeTipo === "g" || row.unidadeTipo === "ml" ? row.quantidadeTotal / 1000 : row.quantidadeTotal;
    const usoPorEvento = row.unidadeTipo === "g" || row.unidadeTipo === "ml" ? row.usoPorEvento / 1000 : row.usoPorEvento;
    const nivelMinimo =
      row.nivelMinimo != null && (row.unidadeTipo === "g" || row.unidadeTipo === "ml")
        ? row.nivelMinimo / 1000
        : row.nivelMinimo;
    const unidadeTipo = row.unidadeTipo === "g" ? "kg" : row.unidadeTipo === "ml" ? "l" : row.unidadeTipo;
    const p = projetarEstoque({
      quantidadeTotal,
      usoPorEvento,
      frequenciaDias: row.frequenciaDias,
      prazoEntregaDias: row.prazoEntregaDias,
      diasMargemCompra: row.diasMargemCompra,
      nivelMinimo,
    });
    return {
      nome: row.nome,
      categoria: row.categoria,
      quantidadeTotal,
      unidadeTipo,
      status: p.status,
      diasAteEsgotar: p.diasAteEsgotar,
      fornecedor: row.fornecedor,
    };
  });
}

async function buildComercialAssistantResumo(enabled: boolean) {
  if (!enabled) return null;
  try {
    const prisma = getComercialPrisma();
    const inicio = inicioMesAtualLocal();
    const fim = fimDiaAtualLocal();
    const [clientes, pedidosMes, oportunidadesAbertas, mensagensPendentes, ultimaSync] = await Promise.all([
      prisma.cliente.findMany({ select: { tipo: true } }),
      prisma.pedido.findMany({
        where: { dataPedido: { gte: inicio, lte: fim } },
        select: {
          statusPedido: true,
          valorBruto: true,
          valorFrete: true,
          valorDesconto: true,
          valorLiquido: true,
          valorTotal: true,
        },
      }),
      prisma.oportunidade.count({ where: { statusOportunidade: { in: ["ABERTA", "EM_CONTATO"] } } }),
      prisma.mensagem.count({ where: { statusEnvio: "AGUARDANDO_APROVACAO" } }),
      prisma.execucaoApi.findFirst({ where: { acaoApi: "SYNC_CA" }, orderBy: { dataExecucao: "desc" } }),
    ]);

    const clientesPorTipo: Record<string, number> = {};
    for (const c of clientes) clientesPorTipo[c.tipo] = (clientesPorTipo[c.tipo] ?? 0) + 1;

    const pedidosMesPorStatus: Record<string, number> = {};
    let vendasMesLiquido = 0;
    let vendasMesBruto = 0;
    let vendasMesFrete = 0;
    let vendasMesDesconto = 0;
    for (const p of pedidosMes) {
      pedidosMesPorStatus[p.statusPedido] = (pedidosMesPorStatus[p.statusPedido] ?? 0) + 1;
      if (classificarStatusPedido(p.statusPedido) !== "venda") continue;
      const bruto = Number(p.valorBruto ?? p.valorTotal ?? 0);
      const frete = Number(p.valorFrete ?? 0);
      const desconto = Number(p.valorDesconto ?? 0);
      const liquido = Number(p.valorLiquido ?? p.valorTotal ?? Math.max(0, bruto + frete - desconto));
      vendasMesBruto += bruto;
      vendasMesFrete += frete;
      vendasMesDesconto += desconto;
      vendasMesLiquido += liquido;
    }

    return {
      disponivel: true as const,
      clientesTotal: clientes.length,
      clientesPorTipo,
      pedidosMes: pedidosMes.length,
      vendasMesLiquido,
      vendasMesBruto,
      vendasMesFrete,
      vendasMesDesconto,
      pedidosMesPorStatus,
      oportunidadesAbertas,
      mensagensPendentes,
      ultimaSyncContaAzul: ultimaSync?.dataExecucao?.toISOString() ?? null,
      statusUltimaSyncContaAzul: ultimaSync?.statusExecucao ?? null,
    };
  } catch (err) {
    return {
      disponivel: false as const,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export const chatRouter = router({
  /** Indica se o servidor tem chave OpenAI (sem expor segredos). */
  assistantStatus: projectProcedure.query(() => ({
    configured: Boolean(ENV.openAiApiKey?.trim()),
  })),

  sendMessage: projectProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema).min(1).max(40),
        useWebSearch: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.openAiApiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Assistente não configurado: defina OPENAI_API_KEY no ambiente do servidor.",
        });
      }

      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const [data, bancadas, estoqueItens, comercial] = await Promise.all([
        db.loadFullFazendaData(pid),
        db.getAllBancadas(pid),
        buildEstoqueAssistantResumo(pid, Boolean(ctx.projetoModulos?.estoque)),
        buildComercialAssistantResumo(Boolean(ctx.projetoModulos?.comercial)),
      ]);

      const resumoOperacionalMarkdown = buildCompactFazendaSnapshotMarkdown(data, {
        projetoId: pid,
        projetoNome: projeto?.nome ?? `Projeto ${pid}`,
        bancadas,
        estoqueItens,
        comercial,
      });

      const messages = input.messages.map((m) => ({
        role: m.role,
        content: m.content.trim(),
      }));

      try {
        const result = await runFarmAssistantChat({
          resumoOperacionalMarkdown,
          messages,
          useWebSearch: Boolean(input.useWebSearch),
          operationCtx: {
            projetoId: pid,
            projetoTipo: projeto?.tipo ?? null,
            isAdmin: isOperationalAdminRole(ctx.user.role),
          },
        });
        return {
          reply: result.reply,
          modelUsed: result.modelUsed,
          webSearchUsed: result.webSearchUsed,
          pendingActions: result.pendingActions,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/OPENAI_API_KEY/i.test(msg)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: msg,
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
        });
      }
    }),

  /** Executa ações preparadas pelo assistente (após confirmação do usuário). */
  confirmActions: projectProcedure
    .input(confirmAssistantActionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
      }
      const pid = projetoIdFromCtx(ctx);
      const projeto = await db.getProjetoRow(pid);
      const { results } = await executeAssistantActions(
        {
          projetoId: pid,
          projetoTipo: projeto?.tipo ?? null,
          projetoModulos: ctx.projetoModulos,
          isAdmin: isOperationalAdminRole(ctx.user.role),
          userId: ctx.user.id,
          userName: ctx.user.name || "Usuário",
        },
        input.actions,
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0 && failed.length === results.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: failed.map((f) => f.message).join(" | "),
        });
      }
      return { results };
    }),
});
