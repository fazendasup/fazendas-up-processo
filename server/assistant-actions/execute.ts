import {
  parseAssistantActionParams,
  type AssistantActionType,
  type PendingAssistantAction,
} from "@shared/assistant-actions";
import type { ModuloContratavel } from "@shared/const";
import { receitaCicloPrioritariaParaVariedade } from "@shared/cicloReceita";
import { TRPCError } from "@trpc/server";
import type { InsertPerfil, InsertPlanoPlantio } from "../../drizzle/schema";
import * as db from "../db";
import { runTransplantarDistribuido } from "../operacoes/transplantarDistribuido";
import {
  syncPlanoAoCriarLoteGerminacao,
  syncPlanoAposContagemGerminacao,
  syncPlanoFromColheita,
} from "../planoOperacaoSync";
import { requireModulo, requireProjetoComTorres, requireProjetoTipo } from "./resolve";
import { isAdminAssistantAction, runAdminAssistantAction } from "../operacoes/adminAssistantExecute";

export type ExecuteActionsCtx = {
  projetoId: number;
  projetoTipo: string | null;
  projetoModulos: Record<ModuloContratavel, boolean> | null;
  isAdmin: boolean;
  userId: number;
  userName: string;
};

export type ExecuteActionResult = {
  id: string;
  type: AssistantActionType;
  ok: boolean;
  message: string;
};

async function assertAndarAtivo(projetoId: number, andarId: number) {
  const andar = await db.getAndarById(projetoId, andarId);
  if (!andar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar não encontrado" });
  const torre = await db.getTorreById(projetoId, andar.torreId);
  if (!torre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre não encontrada" });
  if (torre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A torre está desativada e não aceita operações" });
  }
}

export async function executeAssistantAction(
  ctx: ExecuteActionsCtx,
  action: PendingAssistantAction,
): Promise<ExecuteActionResult> {
  const base = { id: action.id, type: action.type };
  const pid = ctx.projetoId;

  try {
    if (isAdminAssistantAction(action.type)) {
      const msg = await runAdminAssistantAction(ctx, action.type, action.params);
      return { ...base, ok: true, message: msg };
    }

    switch (action.type) {
      case "transplantar_distribuido": {
        const p = parseAssistantActionParams("transplantar_distribuido", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarOrigemId);
        for (const d of p.destinos) await assertAndarAtivo(pid, d.andarDestinoId);
        const res = await runTransplantarDistribuido(
          { projetoId: pid, userId: ctx.userId, userName: ctx.userName },
          p,
        );
        return {
          ...base,
          ok: true,
          message: `Transplantio concluído (${res.total} plantas, ${res.faseOrigem} → ${res.faseDestino}).`,
        };
      }
      case "concluir_tarefas": {
        const p = parseAssistantActionParams("concluir_tarefas", action.params);
        let n = 0;
        for (const id of p.tarefaIds) {
          const t = await db.getTarefaById(pid, id);
          if (!t || t.status === "concluida" || t.status === "cancelada") continue;
          await db.concluirTarefa(pid, id, ctx.userId, ctx.userName);
          n++;
        }
        return { ...base, ok: true, message: `${n} tarefa(s) concluída(s).` };
      }
      case "marcar_andar_lavado": {
        const p = parseAssistantActionParams("marcar_andar_lavado", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.updateAndar(pid, p.andarId, { lavado: true, dataColheitaTotal: new Date() });
        return { ...base, ok: true, message: "Andar marcado como lavado." };
      }
      case "atualizar_perfis": {
        const p = parseAssistantActionParams("atualizar_perfis", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        const receitas = await db.getAllReceitas(pid);
        const enriched = p.updates.map((u) => {
          const row: Partial<InsertPerfil> & { perfilIndex: number } = { ...u };
          if (u.variedadeId != null) {
            row.receitaId = receitaCicloPrioritariaParaVariedade(receitas, u.variedadeId)?.id ?? null;
          } else if (u.variedadeId === null) row.receitaId = null;
          return row;
        });
        await db.batchUpdatePerfis(pid, p.andarId, enriched);
        return { ...base, ok: true, message: `${p.updates.length} perfil(is) atualizado(s).` };
      }
      case "marcar_ciclo_executado": {
        const p = parseAssistantActionParams("marcar_ciclo_executado", action.params);
        await db.updateCiclo(pid, p.cicloId, {
          ultimaExecucao: p.ultimaExecucao ?? new Date(),
          ultimoExecutorId: ctx.userId,
          ultimoExecutorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Ciclo marcado como executado." };
      }
      case "liberar_andar": {
        const p = parseAssistantActionParams("liberar_andar", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.updateAndar(pid, p.andarId, { dataEntrada: null, lavado: true, dataColheitaTotal: null });
        await db.resetPerfisByAndarId(pid, p.andarId);
        await db.resetFurosByAndarId(pid, p.andarId);
        return { ...base, ok: true, message: "Andar liberado (lavado e cultivo zerado)." };
      }
      case "registrar_colheita": {
        const p = parseAssistantActionParams("registrar_colheita", action.params);
        await db.createRegistroColheita({
          ...p,
          projetoId: pid,
          executadoPorId: ctx.userId,
          executadoPorNome: ctx.userName,
        });
        await syncPlanoFromColheita(pid, p.variedadeId ?? null);
        return { ...base, ok: true, message: "Colheita registrada." };
      }
      case "registrar_aplicacao_andar": {
        const p = parseAssistantActionParams("registrar_aplicacao_andar", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.createAplicacaoAndar({
          ...p,
          projetoId: pid,
          executadoPorId: ctx.userId,
          executadoPorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Aplicação no andar registrada." };
      }
      case "registrar_medicao_caixa": {
        const p = parseAssistantActionParams("registrar_medicao_caixa", action.params);
        const caixa = await db.getCaixaAguaById(pid, p.caixaAguaId);
        if (!caixa) throw new TRPCError({ code: "NOT_FOUND", message: "Caixa não encontrada" });
        await db.createMedicaoCaixa({
          ...p,
          projetoId: pid,
          executadoPorId: ctx.userId,
          executadoPorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Medição da caixa registrada." };
      }
      case "registrar_aplicacao_caixa": {
        const p = parseAssistantActionParams("registrar_aplicacao_caixa", action.params);
        const caixa = await db.getCaixaAguaById(pid, p.caixaAguaId);
        if (!caixa) throw new TRPCError({ code: "NOT_FOUND", message: "Caixa não encontrada" });
        await db.createAplicacaoCaixa({
          ...p,
          projetoId: pid,
          executadoPorId: ctx.userId,
          executadoPorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Aplicação na caixa registrada." };
      }
      case "criar_manutencao": {
        const p = parseAssistantActionParams("criar_manutencao", action.params);
        await db.createManutencao({
          ...p,
          projetoId: pid,
          abertoPorId: ctx.userId,
          abertoPorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Manutenção aberta." };
      }
      case "concluir_manutencao": {
        const p = parseAssistantActionParams("concluir_manutencao", action.params);
        await db.updateManutencao(pid, p.id, {
          status: "concluida",
          dataConclusao: new Date(),
          solucao: p.solucao ?? null,
          concluidoPorId: ctx.userId,
          concluidoPorNome: ctx.userName,
        });
        return { ...base, ok: true, message: "Manutenção concluída." };
      }
      case "criar_germinacao": {
        const p = parseAssistantActionParams("criar_germinacao", action.params);
        await db.createGerminacao({
          ...p,
          projetoId: pid,
          executadoPorId: ctx.userId,
          executadoPorNome: ctx.userName,
        });
        await syncPlanoAoCriarLoteGerminacao(pid, p.variedadeId);
        return { ...base, ok: true, message: "Lote de germinação criado." };
      }
      case "atualizar_germinacao": {
        const p = parseAssistantActionParams("atualizar_germinacao", action.params);
        const { id, ...data } = p;
        await db.updateGerminacao(pid, id, data);
        return { ...base, ok: true, message: "Germinação atualizada." };
      }
      case "contagem_germinacao_plano": {
        const p = parseAssistantActionParams("contagem_germinacao_plano", action.params);
        const plano = await db.getPlanoPlantioById(pid, p.id);
        if (!plano) throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
        if (p.germinadas + p.naoGerminadas > plano.quantidadePlantas) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Soma excede quantidade do plano" });
        }
        const statusAntes = plano.status;
        await db.updatePlanoPlantio(pid, p.id, { germinadas: p.germinadas, naoGerminadas: p.naoGerminadas });
        await syncPlanoAposContagemGerminacao(pid, p.id, statusAntes);
        return { ...base, ok: true, message: "Contagem de germinação registrada no plano." };
      }
      case "marcar_germinacao_pronta_plano": {
        const p = parseAssistantActionParams("marcar_germinacao_pronta_plano", action.params);
        const plano = await db.getPlanoPlantioById(pid, p.id);
        if (!plano) throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
        await db.updatePlanoPlantio(pid, p.id, { germinacaoFase: "pronto_mudas" });
        return { ...base, ok: true, message: "Germinação marcada como pronta para mudas." };
      }
      case "adiar_tarefa": {
        const p = parseAssistantActionParams("adiar_tarefa", action.params);
        const tarefa = await db.getTarefaById(pid, p.tarefaId);
        if (!tarefa) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
        const nova = new Date();
        nova.setHours(nova.getHours() + p.horas);
        await db.updateTarefa(pid, p.tarefaId, { dataVencimento: nova });
        return { ...base, ok: true, message: `Tarefa adiada ${p.horas}h.` };
      }
      case "criar_tarefa": {
        const p = parseAssistantActionParams("criar_tarefa", action.params);
        await db.createTarefa({ ...p, projetoId: pid });
        return { ...base, ok: true, message: "Tarefa criada." };
      }
      case "mover_perfil": {
        const p = parseAssistantActionParams("mover_perfil", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await db.moverPerfil(pid, p.origemAndarId, p.perfilIndex, p.destinoAndarId, p.destinoPerfilIndex);
        return { ...base, ok: true, message: "Perfil movido." };
      }
      case "mover_andar": {
        const p = parseAssistantActionParams("mover_andar", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await db.moverTodosPerfilAndar(pid, p.origemAndarId, p.destinoAndarId);
        return { ...base, ok: true, message: "Andar movido." };
      }
      case "atualizar_furos_lote": {
        const p = parseAssistantActionParams("atualizar_furos_lote", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.batchUpdateFuros(pid, p.andarId, p.updates);
        return { ...base, ok: true, message: `${p.updates.length} furo(s) atualizado(s).` };
      }
      case "esvaziar_furos_andar": {
        const p = parseAssistantActionParams("esvaziar_furos_andar", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.setAllFurosOfAndar(pid, p.andarId, { status: "vazio", variedadeId: null });
        return { ...base, ok: true, message: "Furos do andar esvaziados." };
      }
      case "ativar_todos_perfis_andar": {
        const p = parseAssistantActionParams("ativar_todos_perfis_andar", action.params);
        requireProjetoComTorres(ctx.projetoTipo);
        await assertAndarAtivo(pid, p.andarId);
        await db.setAllPerfisOfAndar(pid, p.andarId, {
          variedadeId: p.variedadeId,
          ativo: true,
          dataEntrada: p.dataEntrada ?? new Date(),
        });
        return { ...base, ok: true, message: "Todos os perfis do andar ativados com a variedade." };
      }
      case "atualizar_alerta_inteligencia": {
        requireModulo(ctx.projetoModulos, "inteligencia");
        const p = parseAssistantActionParams("atualizar_alerta_inteligencia", action.params);
        if (p.status === "lido") {
          await db.updateAlert(pid, p.id, {
            status: "lido",
            lidoPorId: ctx.userId,
            lidoPorNome: ctx.userName,
          });
          await db.createAlertEvent({
            projetoId: pid,
            alertaId: p.id,
            eventoTipo: "lido",
            usuarioId: ctx.userId,
            usuarioNome: ctx.userName,
          });
        } else if (p.status === "em_andamento") {
          await db.updateAlert(pid, p.id, { status: "em_andamento" });
          await db.createAlertEvent({
            projetoId: pid,
            alertaId: p.id,
            eventoTipo: "em_andamento",
            usuarioId: ctx.userId,
            usuarioNome: ctx.userName,
            observacao: p.observacao,
          });
        } else {
          await db.updateAlert(pid, p.id, {
            status: "resolvido",
            resolvidoPorId: ctx.userId,
            resolvidoPorNome: ctx.userName,
          });
          await db.createAlertEvent({
            projetoId: pid,
            alertaId: p.id,
            eventoTipo: "resolvido",
            usuarioId: ctx.userId,
            usuarioNome: ctx.userName,
            observacao: p.observacao,
          });
        }
        return { ...base, ok: true, message: `Alerta marcado como ${p.status}.` };
      }
      case "bancada_atualizar_plantio": {
        requireProjetoTipo(ctx.projetoTipo, "hidroponia");
        const p = parseAssistantActionParams("bancada_atualizar_plantio", action.params);
        const row = await db.getBancadaById(pid, p.bancadaId);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Bancada não encontrada" });
        await db.updateBancada(pid, p.bancadaId, {
          plantioVariedadeId: p.plantioVariedadeId,
          plantioDataEntrada: p.plantioDataEntrada,
          plantioPrevisaoColheita: p.plantioPrevisaoColheita,
        });
        return { ...base, ok: true, message: "Plantio da bancada atualizado." };
      }
      case "iniciar_germinacao_planos": {
        const p = parseAssistantActionParams("iniciar_germinacao_planos", action.params);
        let n = 0;
        for (const id of p.planoIds) {
          const plano = await db.getPlanoPlantioById(pid, id);
          if (!plano) throw new TRPCError({ code: "NOT_FOUND", message: `Plano ${id} não encontrado` });
          if (plano.status !== "planejado") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Plano #${id} não está em planejado (status atual: ${plano.status}).`,
            });
          }
          const patch: Record<string, unknown> = { status: "em_germinacao" };
          if (plano.germinacaoFase === "pendente") patch.germinacaoFase = "germinando";
          await db.updatePlanoPlantio(pid, id, patch as Partial<InsertPlanoPlantio>);
          n++;
        }
        return { ...base, ok: true, message: `${n} plano(s) passaram para em germinação.` };
      }
      default:
        return { ...base, ok: false, message: "Tipo de ação desconhecido." };
    }
  } catch (err) {
    const msg = err instanceof TRPCError ? err.message : err instanceof Error ? err.message : String(err);
    return { ...base, ok: false, message: msg };
  }
}

export async function executeAssistantActions(
  ctx: ExecuteActionsCtx,
  actions: PendingAssistantAction[],
): Promise<{ results: ExecuteActionResult[] }> {
  const results: ExecuteActionResult[] = [];
  for (const action of actions) {
    results.push(await executeAssistantAction(ctx, action));
  }
  return { results };
}
