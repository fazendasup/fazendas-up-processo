import { parseAssistantActionParams, type AssistantActionType } from "@shared/assistant-actions";
import { ESTRUTURA_OVERRIDE_FV_12x6, MAX_ANDARES_TORRE_MICROVERDES } from "@shared/types";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import type { InsertPlanoPlantio } from "../../drizzle/schema";
import { assertAdminExecute } from "../assistant-actions/admin-guard";
import type { ExecuteActionsCtx } from "../assistant-actions/execute";
import { requireProjetoComTorres, requireProjetoTipo } from "../assistant-actions/resolve";
import * as db from "../db";

const ADMIN_TYPES = new Set<AssistantActionType>([
  "avancar_status_plano",
  "atualizar_plano_plantio",
  "deslocar_datas_planos_variedade",
  "criar_variedade",
  "atualizar_variedade",
  "criar_receita",
  "atualizar_receita",
  "criar_ciclo",
  "atualizar_ciclo",
  "criar_torre",
  "atualizar_torre",
  "toggle_torre_ativa",
  "criar_caixa_agua",
  "criar_bancada",
  "atualizar_bancada",
  "upsert_fase_config",
]);

export function isAdminAssistantAction(type: AssistantActionType): boolean {
  return ADMIN_TYPES.has(type);
}

export async function runAdminAssistantAction(
  ctx: ExecuteActionsCtx,
  type: AssistantActionType,
  params: unknown,
): Promise<string> {
  assertAdminExecute(ctx.isAdmin);
  const pid = ctx.projetoId;

  switch (type) {
    case "avancar_status_plano": {
      const p = parseAssistantActionParams("avancar_status_plano", params);
      const plano = await db.getPlanoPlantioById(pid, p.id);
      if (!plano) throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      if (p.novoStatus === "em_producao") {
        if (plano.status !== "em_germinacao") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O plano precisa estar em germinação." });
        }
        if (plano.germinacaoFase !== "pronto_mudas") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Marque a germinação como pronta para mudas antes de avançar para produção.",
          });
        }
      }
      const patch: Record<string, unknown> = { status: p.novoStatus };
      if (p.novoStatus === "em_germinacao" && plano.germinacaoFase === "pendente") {
        patch.germinacaoFase = "germinando";
      }
      await db.updatePlanoPlantio(pid, p.id, patch as Partial<InsertPlanoPlantio>);
      return `Plano avançado para ${p.novoStatus}.`;
    }
    case "atualizar_plano_plantio": {
      const { id, ...data } = parseAssistantActionParams("atualizar_plano_plantio", params);
      await db.updatePlanoPlantio(pid, id, data);
      return "Plano actualizado.";
    }
    case "deslocar_datas_planos_variedade": {
      const p = parseAssistantActionParams("deslocar_datas_planos_variedade", params);
      const todos = await db.getAllPlanosPlantio(pid);
      const alvo = todos.filter(
        (pl) => pl.variedadeId === p.variedadeId && pl.status !== "colhido" && pl.status !== "cancelado",
      );
      for (const pl of alvo) {
        await db.updatePlanoPlantio(pid, pl.id, {
          dataInicioGerminacao: addDays(new Date(pl.dataInicioGerminacao), p.dias),
          dataTransplantioMudas: addDays(new Date(pl.dataTransplantioMudas), p.dias),
          dataTransplantioVeg: addDays(new Date(pl.dataTransplantioVeg), p.dias),
          dataTransplantioMat: addDays(new Date(pl.dataTransplantioMat), p.dias),
          dataColheitaPrevista: addDays(new Date(pl.dataColheitaPrevista), p.dias),
        });
      }
      return `${alvo.length} plano(s) deslocado(s) ${p.dias} dia(s).`;
    }
    case "criar_variedade": {
      const p = parseAssistantActionParams("criar_variedade", params);
      const slug = `${p.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
      await db.createVariedade({
        projetoId: pid,
        slug,
        nome: p.nome,
        diasMudas: p.diasMudas ?? 14,
        diasVegetativa: p.diasVegetativa ?? 21,
        diasMaturacao: p.diasMaturacao ?? 28,
      });
      return `Variedade ${p.nome} criada.`;
    }
    case "atualizar_variedade": {
      const { id, ...data } = parseAssistantActionParams("atualizar_variedade", params);
      await db.updateVariedade(pid, id, data);
      return "Variedade actualizada.";
    }
    case "criar_receita": {
      const p = parseAssistantActionParams("criar_receita", params);
      await db.createReceita({
        ...p,
        projetoId: pid,
        criadoPorId: ctx.userId,
        criadoPorNome: ctx.userName,
      });
      await db.syncPerfisReceitaIdParaVariedade(pid, p.variedadeId);
      await db.syncVariedadeDiasFromReceitaPrioritaria(pid, p.variedadeId);
      return `Receita ${p.nome} criada.`;
    }
    case "atualizar_receita": {
      const { id, ...data } = parseAssistantActionParams("atualizar_receita", params);
      const antes = await db.getReceitaById(pid, id);
      await db.updateReceita(pid, id, data);
      const depois = await db.getReceitaById(pid, id);
      if (depois?.variedadeId != null) await db.syncPerfisReceitaIdParaVariedade(pid, depois.variedadeId);
      if (antes?.variedadeId != null && antes.variedadeId !== depois?.variedadeId) {
        await db.syncPerfisReceitaIdParaVariedade(pid, antes.variedadeId);
      }
      return "Receita actualizada.";
    }
    case "criar_ciclo": {
      const p = parseAssistantActionParams("criar_ciclo", params);
      await db.createCiclo({ ...p, projetoId: pid, alvo: p.alvo ?? "caixa", ativo: p.ativo ?? true });
      return `Ciclo ${p.nome} criado.`;
    }
    case "atualizar_ciclo": {
      const { id, ...data } = parseAssistantActionParams("atualizar_ciclo", params);
      await db.updateCiclo(pid, id, data);
      return "Ciclo actualizado.";
    }
    case "criar_torre": {
      requireProjetoComTorres(ctx.projetoTipo);
      const p = parseAssistantActionParams("criar_torre", params);
      const proj = await db.getProjetoRow(pid);
      const maxAndares = proj?.tipo === "microverdes" ? MAX_ANDARES_TORRE_MICROVERDES : 99;
      const numAndares = Math.min(p.numAndares ?? 10, maxAndares);
      const numeroTorre = p.numeroTorre ?? (await db.getNextNumeroTorre(pid));
      const clash = await db.getTorreByProjetoNumero(pid, numeroTorre);
      if (clash) {
        throw new TRPCError({ code: "CONFLICT", message: `Já existe torre n.º ${numeroTorre}.` });
      }
      let estruturaOverrideJson: string | null = null;
      if (proj?.tipo !== "microverdes" && p.modeloEstrutura === "fv_12x6" && p.fase !== "mudas") {
        estruturaOverrideJson = JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6);
      }
      const slug = `${p.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
      await db.createTorreComEstrutura({
        projetoId: pid,
        slug,
        nome: p.nome,
        fase: p.fase,
        numAndares,
        caixaAguaId: p.caixaAguaId,
        numeroTorre,
        estruturaOverrideJson,
      });
      return `Torre ${p.nome} criada (n.º ${numeroTorre}).`;
    }
    case "atualizar_torre": {
      requireProjetoComTorres(ctx.projetoTipo);
      const p = parseAssistantActionParams("atualizar_torre", params);
      const { id, modeloEstrutura, ...updates } = p;
      if (modeloEstrutura && updates.fase !== "mudas") {
        await db.updateTorre(pid, id, {
          ...updates,
          estruturaOverrideJson:
            modeloEstrutura === "fv_12x6" ? JSON.stringify(ESTRUTURA_OVERRIDE_FV_12x6) : null,
        });
      } else {
        await db.updateTorre(pid, id, updates);
      }
      if (updates.numAndares != null) {
        await db.syncTorreAndaresToNumAndares(pid, id, updates.numAndares);
      }
      return "Torre actualizada.";
    }
    case "toggle_torre_ativa": {
      requireProjetoComTorres(ctx.projetoTipo);
      const p = parseAssistantActionParams("toggle_torre_ativa", params);
      const row = await db.toggleTorreAtiva(pid, p.id);
      return `Torre ${row?.nome ?? p.id} — agora ${row?.ativa === false ? "inactiva" : "activa"}.`;
    }
    case "criar_caixa_agua": {
      const p = parseAssistantActionParams("criar_caixa_agua", params);
      const slug =
        p.slug ||
        `${p.nome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now().toString(36)}`;
      await db.createCaixaAgua({ ...p, slug, projetoId: pid });
      return `Caixa ${p.nome} criada.`;
    }
    case "criar_bancada": {
      requireProjetoTipo(ctx.projetoTipo, "hidroponia");
      const p = parseAssistantActionParams("criar_bancada", params);
      await db.createBancadaWithDefaults(pid, {
        nome: p.nome,
        fase: p.fase,
        quantidadeCaixas: p.quantidadeCaixas ?? 1,
      });
      return `Bancada ${p.nome} criada.`;
    }
    case "atualizar_bancada": {
      requireProjetoTipo(ctx.projetoTipo, "hidroponia");
      const { id, quantidadeCaixas, ...rest } = parseAssistantActionParams("atualizar_bancada", params);
      await db.updateBancada(pid, id, rest);
      if (quantidadeCaixas != null) {
        await db.syncCaixasBancadaForBancada(pid, id, quantidadeCaixas);
      }
      return "Bancada actualizada.";
    }
    case "upsert_fase_config": {
      const p = parseAssistantActionParams("upsert_fase_config", params);
      await db.upsertFaseConfig({ ...p, projetoId: pid });
      return `Configuração da fase ${p.fase} guardada.`;
    }
    default:
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Acção admin desconhecida." });
  }
}
