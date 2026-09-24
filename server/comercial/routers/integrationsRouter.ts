import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { AcaoApi } from "../generated/prisma/index.js";
import { router, comercialProcedure, comercialRequirePerfis } from "../../_core/trpc";
import {
  buildAuthorizationUrl,
  encodeOAuthState,
  safeReturnUrlForOAuth,
} from "../integrations/conta-azul/oauth.service";
import {
  iniciarSyncContaAzulEmBackground,
  isContaAzulSyncEmAndamento,
  runContaAzulClientesSync,
} from "../integrations/conta-azul/sync.service";
import { runInteligenciaComercial } from "../services/inteligencia-comercial";

const syncCA = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL");

function detalhesSync(detalhes: unknown): {
  pedidosGravados: number | null;
  clientesComEndereco: number | null;
  inteligenciaOportunidades: number | null;
} {
  if (!detalhes || typeof detalhes !== "object") {
    return { pedidosGravados: null, clientesComEndereco: null, inteligenciaOportunidades: null };
  }
  const d = detalhes as Record<string, unknown>;
  return {
    pedidosGravados: typeof d.pedidosGravados === "number" ? d.pedidosGravados : null,
    clientesComEndereco: typeof d.clientesComEndereco === "number" ? d.clientesComEndereco : null,
    inteligenciaOportunidades:
      typeof d.inteligenciaOportunidades === "number" ? d.inteligenciaOportunidades : null,
  };
}

export const integrationsRouter = router({
  urlAutorizacaoContaAzul: comercialProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(({ ctx, input }) => {
      const safe = safeReturnUrlForOAuth(input.returnUrl);
      if (!safe) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "URL de retorno inválida. Use a mesma origem do painel (ex.: https://app.fazendasup.com.br) ou localhost em desenvolvimento.",
        });
      }
      const state = encodeOAuthState({
        n: `st_${Math.random().toString(36).slice(2)}`,
        ru: safe,
      });
      const url = buildAuthorizationUrl(ctx.comercialEnv!, state);
      return { url };
    }),

  /** Inicia sync em segundo plano — resposta imediata; acompanhe com statusSyncContaAzul. */
  sincronizarContaAzul: comercialProcedure.use(syncCA).mutation(async ({ ctx }) => {
    const r = iniciarSyncContaAzulEmBackground(ctx.prisma!, ctx.comercialEnv!, "manual", {
      forceFullClientes: true,
    });
    if (r.status === "already_running") {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Já existe uma sincronização Conta Azul em andamento. Aguarde terminar antes de iniciar outra.",
      });
    }
    return { ok: true as const, emSegundoPlano: true as const };
  }),

  sincronizarEnderecosContaAzul: comercialProcedure.use(syncCA).mutation(async ({ ctx }) => {
    return runContaAzulClientesSync(ctx.prisma!, ctx.comercialEnv!, {
      forceFullClientes: true,
    });
  }),

  statusSyncContaAzul: comercialProcedure.use(syncCA).query(async ({ ctx }) => {
    const running = isContaAzulSyncEmAndamento();
    const last = await ctx.prisma!.execucaoApi.findFirst({
      where: { acaoApi: AcaoApi.SYNC_CA },
      orderBy: { dataExecucao: "desc" },
    });
    const extra = detalhesSync(last?.detalhesExecucao);
    return {
      running,
      lastStatus: last?.statusExecucao ?? null,
      lastError: last?.mensagemErro ?? null,
      lastAt: last?.dataExecucao ?? null,
      ...extra,
    };
  }),

  aplicarInteligenciaComercial: comercialProcedure.use(syncCA).mutation(async ({ ctx }) => {
    try {
      return await runInteligenciaComercial(ctx.prisma!);
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Falha ao aplicar inteligência comercial",
      });
    }
  }),

  /** Lista/sincroniza contas financeiras para emissão de venda (boleto). */
  contasFinanceirasContaAzul: comercialProcedure.use(syncCA).query(async ({ ctx }) => {
    const { sincronizarContasFinanceirasEnvio, ensureContaAzulEnvioConfig } = await import(
      "../integrations/conta-azul/venda-outbound.service.js"
    );
    try {
      const sync = await sincronizarContasFinanceirasEnvio(ctx.prisma!, ctx.comercialEnv!);
      const cfg = await ensureContaAzulEnvioConfig(ctx.prisma!);
      return {
        contas: sync.contas,
        selecionadaId: sync.selecionadaId,
        tipoPagamentoPadrao: cfg.tipoPagamentoPadrao,
        proximoNumeroVenda: cfg.proximoNumeroVenda,
      };
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Falha ao listar contas financeiras",
      });
    }
  }),

  salvarEnvioContaAzulConfig: comercialProcedure
    .use(syncCA)
    .input(
      z.object({
        idContaFinanceira: z.string().min(1).nullable().optional(),
        nomeContaFinanceira: z.string().max(255).nullable().optional(),
        tipoPagamentoPadrao: z.string().min(3).max(64).optional(),
        proximoNumeroVenda: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ensureContaAzulEnvioConfig } = await import(
        "../integrations/conta-azul/venda-outbound.service.js"
      );
      await ensureContaAzulEnvioConfig(ctx.prisma!);
      return ctx.prisma!.contaAzulEnvioConfig.update({
        where: { id: "default" },
        data: {
          ...(input.idContaFinanceira !== undefined
            ? { idContaFinanceira: input.idContaFinanceira }
            : {}),
          ...(input.nomeContaFinanceira !== undefined
            ? { nomeContaFinanceira: input.nomeContaFinanceira }
            : {}),
          ...(input.tipoPagamentoPadrao
            ? { tipoPagamentoPadrao: input.tipoPagamentoPadrao }
            : {}),
          ...(input.proximoNumeroVenda !== undefined
            ? { proximoNumeroVenda: input.proximoNumeroVenda }
            : {}),
        },
      });
    }),
});
