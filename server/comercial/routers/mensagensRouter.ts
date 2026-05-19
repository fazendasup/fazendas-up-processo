import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { AcaoApi, StatusEnvioMensagem, StatusExecucaoApi } from "../generated/prisma/index.js";
import type { Prisma } from "../generated/prisma/index.js";
import { router, comercialProcedure } from "../../_core/trpc";
import { podeAprovarMensagens } from "../rbac";
import { enviarMensagemWhatsApp } from "../integrations/manychat/manychat.client";
import { sendMail } from "../lib/mail";

export const mensagensRouter = router({
  fila: comercialProcedure
    .input(
      z.object({
        status: z.nativeEnum(StatusEnvioMensagem).optional(),
        /** Abas da UI: pendentes (fila), rascunhos ou histórico (enviadas/aprovadas/falhas). */
        aba: z.enum(["pendentes", "rascunhos", "historico"]).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      let where: Prisma.MensagemWhereInput;
      if (input.aba === "historico") {
        where = { statusEnvio: { in: ["ENVIADA", "FALHA", "APROVADA"] } };
      } else if (input.aba === "rascunhos") {
        where = { statusEnvio: "RASCUNHO" };
      } else if (input.aba === "pendentes") {
        where = { statusEnvio: "AGUARDANDO_APROVACAO" };
      } else if (input.status) {
        where = { statusEnvio: input.status };
      } else {
        where = { statusEnvio: "AGUARDANDO_APROVACAO" };
      }

      return ctx.prisma!.mensagem.findMany({
        where,
        orderBy: { dataCriacao: "desc" },
        take: 100,
        include: { cliente: { select: { id: true, nome: true, telefoneWhatsapp: true } }, aprovador: true },
      });
    }),

  salvarRascunho: comercialProcedure
    .input(
      z.object({
        clienteId: z.string(),
        tipo: z.enum(["POS_VENDA", "OFERTA", "REATIVACAO", "INFORMATIVO"]),
        texto: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma!.mensagem.create({
        data: {
          clienteId: input.clienteId,
          tipoMensagem: input.tipo,
          conteudoSugerido: input.texto,
          conteudoFinal: input.texto,
          statusEnvio: "RASCUNHO",
        },
      }),
    ),

  submeterAprovacao: comercialProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const msg = await ctx.prisma!.mensagem.findUnique({ where: { id: input.id } });
    if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });
    return ctx.prisma!.mensagem.update({
      where: { id: input.id },
      data: { statusEnvio: "AGUARDANDO_APROVACAO", sensivel: true },
    });
  }),

  editar: comercialProcedure
    .input(z.object({ id: z.string(), texto: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma!.mensagem.update({
        where: { id: input.id },
        data: { conteudoFinal: input.texto },
      });
    }),

  aprovarEEnviar: comercialProcedure
    .input(z.object({ id: z.string(), agendarPara: z.coerce.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!podeAprovarMensagens(ctx.comercialUsuario!.perfil)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aprovar" });
      }

      const msg = await ctx.prisma!.mensagem.findUnique({
        where: { id: input.id },
        include: { cliente: true },
      });
      if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });

      const started = Date.now();
      const textoFinal = msg.conteudoFinal ?? msg.conteudoSugerido;

      if (input.agendarPara) {
        await ctx.prisma!.mensagem.update({
          where: { id: msg.id },
          data: { statusEnvio: "APROVADA", aprovadorId: ctx.comercialUsuario!.id, dataAprovacao: new Date(), agendadoPara: input.agendarPara },
        });
        return { status: "agendada" as const, agendadoPara: input.agendarPara };
      }

      await ctx.prisma!.mensagem.update({
        where: { id: msg.id },
        data: { statusEnvio: "APROVADA", aprovadorId: ctx.comercialUsuario!.id, dataAprovacao: new Date() },
      });

      try {
        const subscriberId = msg.cliente.telefoneWhatsapp ?? msg.cliente.id;
        await enviarMensagemWhatsApp(ctx.comercialEnv!, { subscriberId, texto: textoFinal });
        await ctx.prisma!.mensagem.update({
          where: { id: msg.id },
          data: { statusEnvio: "ENVIADA", dataEnvio: new Date() },
        });
        await ctx.prisma!.execucaoApi.create({
          data: {
            acaoApi: AcaoApi.ENVIO_MC,
            statusExecucao: StatusExecucaoApi.SUCESSO,
            clienteId: msg.clienteId,
            detalhesExecucao: { mensagemId: msg.id, canal: "MANYCHAT" },
            duracaoMs: Date.now() - started,
          },
        });
      } catch (e) {
        await ctx.prisma!.mensagem.update({ where: { id: msg.id }, data: { statusEnvio: "FALHA" } });
        await ctx.prisma!.execucaoApi.create({
          data: {
            acaoApi: AcaoApi.ENVIO_MC,
            statusExecucao: StatusExecucaoApi.FALHA,
            clienteId: msg.clienteId,
            detalhesExecucao: { mensagemId: msg.id },
            mensagemErro: e instanceof Error ? e.message : "erro",
            duracaoMs: Date.now() - started,
          },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao enviar via ManyChat" });
      }

      await sendMail(
        ctx.comercialEnv!,
        ctx.comercialUsuario!.email,
        "Mensagem aprovada e enviada",
        `Mensagem ${msg.id} enviada para cliente ${msg.cliente.nome}.`,
      );

      return { status: "enviada" as const };
    }),

  rejeitar: comercialProcedure
    .input(z.object({ id: z.string(), justificativa: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      if (!podeAprovarMensagens(ctx.comercialUsuario!.perfil)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      }
      return ctx.prisma!.mensagem.update({
        where: { id: input.id },
        data: { statusEnvio: "RASCUNHO", justificativaRejeicao: input.justificativa },
      });
    }),
});
