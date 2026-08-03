import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TipoMensagem } from "../generated/prisma/index.js";
import { router, comercialProcedure, comercialRequirePerfis } from "../../_core/trpc";
import { liberarEspacoComercial } from "../lib/mysql-espaco.js";

const adminOuGerente = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL");

export const configRouter = router({
  listarTemplates: comercialProcedure.use(adminOuGerente).query(({ ctx }) =>
    ctx.prisma!.templateMensagem.findMany({ orderBy: { criadoEm: "desc" } }),
  ),

  criarTemplate: comercialProcedure
    .use(adminOuGerente)
    .input(
      z.object({
        nome: z.string().min(2),
        tipo: z.nativeEnum(TipoMensagem),
        corpo: z.string().min(5),
      }),
    )
    .mutation(({ ctx, input }) => ctx.prisma!.templateMensagem.create({ data: input })),

  listarRegras: comercialProcedure.use(adminOuGerente).query(({ ctx }) =>
    ctx.prisma!.regraClassificacao.findMany({ where: { ativo: true } }),
  ),

  salvarRegra: comercialProcedure
    .use(adminOuGerente)
    .input(
      z.object({
        id: z.string().optional(),
        nome: z.string().min(2),
        payload: z.record(z.string(), z.unknown()),
        ativo: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.prisma!.regraClassificacao.update({
          where: { id: input.id },
          data: { nome: input.nome, payload: input.payload as any, ativo: input.ativo },
        });
      }
      return ctx.prisma!.regraClassificacao.create({
        data: { nome: input.nome, payload: input.payload as any, ativo: input.ativo },
      });
    }),

  listarUsuarios: comercialProcedure.use(comercialRequirePerfis("ADMIN")).query(({ ctx }) =>
    ctx.prisma!.usuario.findMany({
      select: { id: true, nome: true, email: true, perfil: true, status: true, dataCadastro: true },
      orderBy: { dataCadastro: "desc" },
    }),
  ),

  convidarUsuario: comercialProcedure
    .use(comercialRequirePerfis("ADMIN"))
    .input(
      z.object({
        nome: z.string().min(2),
        email: z.string().email(),
        perfil: z.enum(["VENDEDOR", "PROMOTER", "LIDER_COLHEITA", "GERENTE_COMERCIAL", "COMERCIAL", "OPERACOES", "LOGISTICA", "ADMIN"]),
        senhaTemporaria: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma!.usuario.findUnique({ where: { email: input.email } });
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado" });

      const { hashPassword } = await import("../lib/password");
      const senhaHash = await hashPassword(input.senhaTemporaria);

      return ctx.prisma!.usuario.create({
        data: {
          nome: input.nome,
          email: input.email,
          perfil: input.perfil,
          senhaHash,
          status: "ATIVO",
        },
        select: { id: true, email: true, perfil: true },
      });
    }),

  /** Emergência MySQL 1114 — TRUNCATE de logs/auditoria para devolver disco ao SO. */
  liberarEspacoMysql: comercialProcedure
    .use(comercialRequirePerfis("ADMIN"))
    .input(z.object({ emergencia: z.boolean().default(true) }).optional())
    .mutation(async ({ ctx, input }) => {
      const result = await liberarEspacoComercial(ctx.prisma!, {
        emergencia: input?.emergencia ?? true,
      });
      return { ok: true, ...result };
    }),
});
