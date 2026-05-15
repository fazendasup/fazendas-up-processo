import {
  contarPlantasMudasFv,
  perfisMudasParaLiberar,
  plantasPorPerfilMudas,
} from "@shared/plantasPorPerfil";
import { resolverFaseDestinoTransplantio } from "@shared/transplantioDestino";
import { variedadePulaVegetativa } from "@shared/variedadesFase";
import { projetoIdFromCtx, fazendaVerticalProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { syncPlanoFromTransplantio } from "../planoOperacaoSync";

async function assertAndarAtivo(projetoId: number, andarId: number) {
  const andar = await db.getAndarById(projetoId, andarId);
  if (!andar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
  const torre = await db.getTorreById(projetoId, andar.torreId);
  if (!torre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
  if (torre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A torre está desativada e não aceita operações" });
  }
  return { andar, torre };
}

async function plantasPorPerfilMudasDoAndar(
  projetoId: number,
  origemVariedadeId: number,
  origemPerfis: { ativo: boolean; receitaId?: number | null }[],
): Promise<number> {
  const comReceita = origemPerfis.find((p) => p.ativo && p.receitaId);
  if (comReceita?.receitaId) {
    const rec = await db.getReceitaById(projetoId, comReceita.receitaId);
    if (rec?.densidadePorPerfil && rec.densidadePorPerfil > 0) {
      return rec.densidadePorPerfil;
    }
  }
  const lista = await db.getReceitasByVariedadeId(projetoId, origemVariedadeId);
  const ativa = lista.find((r) => r.ativa) ?? lista[0];
  if (ativa?.densidadePorPerfil && ativa.densidadePorPerfil > 0) {
    return ativa.densidadePorPerfil;
  }
  return plantasPorPerfilMudas(null);
}

export const andaresRouter = router({
  list: fazendaVerticalProcedure.query(async ({ ctx }) => {
    return db.getAllAndares(projetoIdFromCtx(ctx));
  }),
  listByTorre: fazendaVerticalProcedure
    .input(z.object({ torreId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAndaresByTorreId(projetoIdFromCtx(ctx), input.torreId);
    }),
  getById: fazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAndarById(projetoIdFromCtx(ctx), input.id);
    }),
  update: fazendaVerticalProcedure
    .input(
      z.object({
        id: z.number(),
        dataEntrada: z.date().nullable().optional(),
        lavado: z.boolean().optional(),
        dataColheitaTotal: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await assertAndarAtivo(projetoIdFromCtx(ctx), id);
      await db.updateAndar(projetoIdFromCtx(ctx), id, data);
      return { success: true };
    }),
  clearAndar: fazendaVerticalProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertAndarAtivo(projetoIdFromCtx(ctx), input.id);
      await db.updateAndar(projetoIdFromCtx(ctx), input.id, { dataEntrada: null, lavado: true, dataColheitaTotal: null });
      await db.resetPerfisByAndarId(projetoIdFromCtx(ctx), input.id);
      await db.resetFurosByAndarId(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
  moverPerfil: fazendaVerticalProcedure
    .input(
      z.object({
        origemAndarId: z.number(),
        perfilIndex: z.number(),
        destinoAndarId: z.number(),
        destinoPerfilIndex: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const origemAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.origemAndarId);
      const destinoAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.destinoAndarId);
      if (!origemAndar || !destinoAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
      const origemTorre = await db.getTorreById(projetoIdFromCtx(ctx), origemAndar.torreId);
      const destinoTorre = await db.getTorreById(projetoIdFromCtx(ctx), destinoAndar.torreId);
      if (!origemTorre || !destinoTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
      if (origemTorre.ativa === false || destinoTorre.ativa === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível mover entre torres desativadas" });
      }
      if (origemTorre.fase !== destinoTorre.fase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Movimentação só é permitida entre torres da mesma fase" });
      }
      await db.moverPerfil(
        projetoIdFromCtx(ctx),
        input.origemAndarId,
        input.perfilIndex,
        input.destinoAndarId,
        input.destinoPerfilIndex,
      );
      return { success: true };
    }),
  moverAndar: fazendaVerticalProcedure
    .input(
      z.object({
        origemAndarId: z.number(),
        destinoAndarId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const origemAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.origemAndarId);
      const destinoAndar = await db.getAndarById(projetoIdFromCtx(ctx), input.destinoAndarId);
      if (!origemAndar || !destinoAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
      const origemTorre = await db.getTorreById(projetoIdFromCtx(ctx), origemAndar.torreId);
      const destinoTorre = await db.getTorreById(projetoIdFromCtx(ctx), destinoAndar.torreId);
      if (!origemTorre || !destinoTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
      if (origemTorre.ativa === false || destinoTorre.ativa === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível mover entre torres desativadas" });
      }
      if (origemTorre.fase !== destinoTorre.fase) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Movimentação só é permitida entre torres da mesma fase" });
      }
      await db.moverTodosPerfilAndar(projetoIdFromCtx(ctx), input.origemAndarId, input.destinoAndarId);
      return { success: true };
    }),

  transplantarDistribuido: fazendaVerticalProcedure
    .input(
      z.object({
        andarOrigemId: z.number(),
        destinos: z
          .array(
            z.object({
              andarDestinoId: z.number(),
              quantidade: z.number().int().min(1),
            }),
          )
          .min(1),
        observacoes: z.string().optional(),
        /** Só para origem em mudas: permite ir direto para maturação (ex.: baby leaf) ou forçar vegetativa. */
        faseDestino: z.enum(["vegetativa", "maturacao"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const pid = projetoIdFromCtx(ctx);
      const origemAndar = await db.getAndarById(pid, input.andarOrigemId);
      if (!origemAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar de origem não encontrado" });
      const origemTorre = await db.getTorreById(pid, origemAndar.torreId);
      if (!origemTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre de origem não encontrada" });
      if (origemTorre.ativa === false) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Torre de origem desativada" });
      }

      const faseOrigem = origemTorre.fase;
      if (faseOrigem !== "mudas" && faseOrigem !== "vegetativa") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível transplantar a partir desta fase" });
      }

      const totalSolicitado = input.destinos.reduce((s, d) => s + d.quantidade, 0);

      const origemPerfis = await db.getPerfisByAndarId(pid, input.andarOrigemId);
      const origemFuros = await db.getFurosByAndarId(pid, input.andarOrigemId);

      const origemVariedadeId =
        origemPerfis.find((p) => p.ativo && p.variedadeId)?.variedadeId ??
        origemPerfis.find((p) => p.variedadeId)?.variedadeId ??
        null;
      if (!origemVariedadeId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Origem sem variedade definida. Defina a variedade antes de transplantar." });
      }
      const vRow = await db.getVariedadeById(pid, origemVariedadeId);
      if (!vRow) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Variedade da origem não encontrada no cadastro." });
      }

      const projeto = await db.getProjetoRow(pid);
      const pulaVeg = variedadePulaVegetativa(vRow.slug, vRow.nome);
      if (faseOrigem === "vegetativa" && input.faseDestino && input.faseDestino !== "maturacao") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A partir da vegetativa o destino é sempre maturação.",
        });
      }
      const faseDestino = resolverFaseDestinoTransplantio(faseOrigem, {
        pulaVegetativa: pulaVeg,
        faseDestinoInformada: input.faseDestino ?? null,
        projetoTipo: projeto?.tipo ?? null,
      });

      const plantasPorPerfilMudasVal =
        faseOrigem === "mudas"
          ? await plantasPorPerfilMudasDoAndar(pid, origemVariedadeId, origemPerfis)
          : 0;

      const origemDisponivel =
        faseOrigem === "mudas"
          ? contarPlantasMudasFv(
              origemPerfis.filter((p) => p.ativo).length,
              plantasPorPerfilMudasVal,
            )
          : origemFuros.filter((f) => f.status === "plantado").length;

      if (totalSolicitado > origemDisponivel) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Quantidade solicitada (${totalSolicitado}) maior que disponível na origem (${origemDisponivel}).`,
        });
      }

      for (const d of input.destinos) {
        const destAndar = await db.getAndarById(pid, d.andarDestinoId);
        if (!destAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar destino não encontrado" });
        const destTorre = await db.getTorreById(pid, destAndar.torreId);
        if (!destTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre destino não encontrada" });
        if (destTorre.ativa === false) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Torre destino desativada" });
        }
        if (destTorre.fase !== faseDestino) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Destino deve estar na próxima fase (não pode ser a mesma fase)." });
        }
        const destPerfis = await db.getPerfisByAndarId(pid, d.andarDestinoId);
        const destFuros = await db.getFurosByAndarId(pid, d.andarDestinoId);
        /** Só `vazio` recebe transplantio; `colhido` continua ocupando até liberar. */
        const nVazios =
          destFuros.length > 0
            ? destFuros.filter((f) => f.status === "vazio").length
            : destPerfis.filter((p) => !p.ativo).length;
        if (d.quantidade > nVazios) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Destino sem furos vazios suficientes: andar ${destAndar.numero ?? destAndar.id} (${nVazios} vazios, solicitado ${d.quantidade}).`,
          });
        }
      }

      const variedadeNome = vRow.nome || String(origemVariedadeId);

      for (const d of input.destinos) {
        const destAndar = await db.getAndarById(pid, d.andarDestinoId);
        const destTorre = destAndar ? await db.getTorreById(pid, destAndar.torreId) : null;
        if (!destAndar || !destTorre) continue;

        const destFuros = await db.getFurosByAndarId(pid, d.andarDestinoId);
        const vazios = destFuros.filter((f) => f.status === "vazio").slice(0, d.quantidade);
        await db.batchUpdateFuros(
          pid,
          d.andarDestinoId,
          vazios.map((f) => ({
            perfilIndex: f.perfilIndex,
            furoIndex: f.furoIndex,
            status: "plantado",
            variedadeId: origemVariedadeId,
          })),
        );

        const perfisAfetados = Array.from(new Set(vazios.map((f) => f.perfilIndex)));
        await db.batchUpdatePerfis(
          pid,
          d.andarDestinoId,
          perfisAfetados.map((perfilIndex) => ({
            perfilIndex,
            ativo: true,
            variedadeId: origemVariedadeId,
          })),
        );

        if (!destAndar.dataEntrada) {
          await db.updateAndar(pid, d.andarDestinoId, { dataEntrada: new Date() });
        }

        await db.createTransplantio({
          projetoId: pid,
          dataHora: new Date(),
          torreOrigemId: origemTorre.id,
          andarOrigemId: origemAndar.id,
          faseOrigem,
          faseDestino,
          variedadeId: origemVariedadeId,
          variedadeNome,
          quantidadeTransplantada: d.quantidade,
          quantidadeDesperdicio: 0,
          torreDestinoId: destTorre.id,
          andarDestinoId: d.andarDestinoId,
          observacoes: input.observacoes ?? null,
          executadoPorId: ctx.user!.id,
          executadoPorNome: ctx.user!.name || "Usuário",
        });
      }

      if (faseOrigem === "mudas") {
        const nPerfisLiberar = perfisMudasParaLiberar(totalSolicitado, plantasPorPerfilMudasVal);
        const ativos = origemPerfis
          .filter((p) => p.ativo)
          .sort((a, b) => a.perfilIndex - b.perfilIndex)
          .slice(0, nPerfisLiberar);
        await db.batchUpdatePerfis(
          pid,
          input.andarOrigemId,
          ativos.map((p) => ({
            perfilIndex: p.perfilIndex,
            ativo: false,
            variedadeId: null,
            dataEntrada: null,
          })),
        );
      } else {
        const plantados = origemFuros
          .filter((f) => f.status === "plantado")
          .sort((a, b) => (b.perfilIndex - a.perfilIndex) || (b.furoIndex - a.furoIndex))
          .slice(0, totalSolicitado);
        await db.batchUpdateFuros(
          pid,
          input.andarOrigemId,
          plantados.map((f) => ({
            perfilIndex: f.perfilIndex,
            furoIndex: f.furoIndex,
            status: "vazio",
            variedadeId: null,
          })),
        );

        const furosPos = await db.getFurosByAndarId(pid, input.andarOrigemId);
        const perfisPos = await db.getPerfisByAndarId(pid, input.andarOrigemId);
        const perfisComPlanta = new Set<number>(furosPos.filter((f) => f.status === "plantado").map((f) => f.perfilIndex));
        const perfisParaLimpar = perfisPos
          .filter((p) => p.ativo && !perfisComPlanta.has(p.perfilIndex))
          .map((p) => ({
            perfilIndex: p.perfilIndex,
            ativo: false,
            variedadeId: null,
            dataEntrada: null,
          }));
        if (perfisParaLimpar.length > 0) {
          await db.batchUpdatePerfis(pid, input.andarOrigemId, perfisParaLimpar);
        }
        if (perfisComPlanta.size === 0) {
          await db.updateAndar(pid, input.andarOrigemId, { dataEntrada: null });
        }
      }

      await syncPlanoFromTransplantio(pid, origemVariedadeId, faseOrigem, faseDestino, totalSolicitado);

      return { success: true, total: totalSolicitado, faseOrigem, faseDestino };
    }),
});
