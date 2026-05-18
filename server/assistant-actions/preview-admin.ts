import type { PendingAssistantAction } from "@shared/assistant-actions";
import { randomUUID } from "crypto";
import { adminOnlyPreview } from "./admin-guard";
import type { AssistantPreviewCtx } from "./preview";
import {
  isResolveError,
  resolveBancada,
  resolveCiclo,
  resolvePlano,
  resolveReceita,
  resolveTorre,
  resolveVariedade,
  torreRefFromArgs,
} from "./resolve";

function adminAction(type: PendingAssistantAction["type"], summary: string, params: Record<string, unknown>) {
  return { action: { id: randomUUID(), type, summary: `[Admin] ${summary}`, params } };
}

function gate(ctx: AssistantPreviewCtx): { error: string } | null {
  return adminOnlyPreview(Boolean(ctx.isAdmin));
}

export async function previewAvancarStatusPlano(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const p = await resolvePlano(ctx.projetoId, {
    id: typeof args.plano_id === "number" ? args.plano_id : undefined,
    variedadeNome: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(p)) return { error: p.error };
  const novoStatus = args.novo_status as "em_germinacao" | "em_producao" | "colhido" | "cancelado";
  if (!novoStatus) return { error: "Informe novo_status." };
  const summary = `Avançar plano **${p.plano.variedadeNome}** (id ${p.plano.id})\n- De \`${p.plano.status}\` → **${novoStatus}**`;
  return adminAction("avancar_status_plano", summary, { id: p.plano.id, novoStatus });
}

export async function previewAtualizarPlanoPlantio(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const p = await resolvePlano(ctx.projetoId, {
    id: typeof args.plano_id === "number" ? args.plano_id : undefined,
    variedadeNome: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(p)) return { error: p.error };
  const patch: Record<string, unknown> = { id: p.plano.id };
  if (typeof args.status === "string") patch.status = args.status;
  if (typeof args.observacoes === "string") patch.observacoes = args.observacoes;
  if (typeof args.quantidade_plantas === "number") patch.quantidadePlantas = args.quantidade_plantas;
  if (args.germinacao_fase === "pendente" || args.germinacao_fase === "germinando" || args.germinacao_fase === "pronto_mudas") {
    patch.germinacaoFase = args.germinacao_fase;
  }
  const summary = `Atualizar plano **${p.plano.variedadeNome}** (id ${p.plano.id})`;
  return adminAction("atualizar_plano_plantio", summary, patch);
}

export async function previewDeslocarDatasPlanosVariedade(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const v = await resolveVariedade(ctx.projetoId, {
    id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
    nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(v)) return { error: v.error };
  const dias = Number(args.dias);
  if (!Number.isFinite(dias) || dias === 0) return { error: "Informe dias (positivo ou negativo, ≠ 0)." };
  const summary = `Deslocar datas dos planos ativos de **${v.variedade.nome}** em **${dias}** dia(s)`;
  return adminAction("deslocar_datas_planos_variedade", summary, { variedadeId: v.variedade.id, dias });
}

export async function previewCriarVariedade(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  if (!nome) return { error: "Informe nome da variedade." };
  const summary = `Criar variedade **${nome}**`;
  return adminAction("criar_variedade", summary, {
    nome,
    diasMudas: typeof args.dias_mudas === "number" ? args.dias_mudas : undefined,
    diasVegetativa: typeof args.dias_vegetativa === "number" ? args.dias_vegetativa : undefined,
    diasMaturacao: typeof args.dias_maturacao === "number" ? args.dias_maturacao : undefined,
  });
}

export async function previewAtualizarVariedade(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const v = await resolveVariedade(ctx.projetoId, {
    id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
    nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(v)) return { error: v.error };
  const summary = `Atualizar variedade **${v.variedade.nome}** (id ${v.variedade.id})`;
  return adminAction("atualizar_variedade", summary, {
    id: v.variedade.id,
    nome: typeof args.novo_nome === "string" ? args.novo_nome : undefined,
    diasMudas: typeof args.dias_mudas === "number" ? args.dias_mudas : undefined,
    diasVegetativa: typeof args.dias_vegetativa === "number" ? args.dias_vegetativa : undefined,
    diasMaturacao: typeof args.dias_maturacao === "number" ? args.dias_maturacao : undefined,
  });
}

export async function previewCriarReceita(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  if (!nome) return { error: "Informe nome da receita." };
  const v = await resolveVariedade(ctx.projetoId, {
    id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
    nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(v)) return { error: v.error };
  const summary = `Criar receita **${nome}** para variedade **${v.variedade.nome}**`;
  return adminAction("criar_receita", summary, {
    nome,
    variedadeId: v.variedade.id,
    diasMudas: typeof args.dias_mudas === "number" ? args.dias_mudas : undefined,
    diasVegetativa: typeof args.dias_vegetativa === "number" ? args.dias_vegetativa : undefined,
    diasMaturacao: typeof args.dias_maturacao === "number" ? args.dias_maturacao : undefined,
    densidadePorPerfil: typeof args.densidade_por_perfil === "number" ? args.densidade_por_perfil : undefined,
  });
}

export async function previewAtualizarReceita(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const r = await resolveReceita(ctx.projetoId, {
    id: typeof args.receita_id === "number" ? args.receita_id : undefined,
    nomeParcial: typeof args.receita_nome === "string" ? args.receita_nome : undefined,
  });
  if (isResolveError(r)) return { error: r.error };
  const summary = `Atualizar receita **${r.receita.nome}** (id ${r.receita.id})`;
  return adminAction("atualizar_receita", summary, {
    id: r.receita.id,
    nome: typeof args.nome === "string" ? args.nome : undefined,
    diasMudas: typeof args.dias_mudas === "number" ? args.dias_mudas : undefined,
    diasVegetativa: typeof args.dias_vegetativa === "number" ? args.dias_vegetativa : undefined,
    diasMaturacao: typeof args.dias_maturacao === "number" ? args.dias_maturacao : undefined,
    densidadePorPerfil: typeof args.densidade_por_perfil === "number" ? args.densidade_por_perfil : undefined,
    ativa: typeof args.ativa === "boolean" ? args.ativa : undefined,
  });
}

export async function previewCriarCiclo(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  const produto = String(args.produto ?? "").trim();
  if (!nome || !produto) return { error: "Informe nome e produto do ciclo." };
  const fases = Array.isArray(args.fases_aplicaveis) ? (args.fases_aplicaveis as string[]) : ["mudas", "vegetativa", "maturacao"];
  const summary = `Criar ciclo **${nome}** — ${produto} (${args.frequencia ?? "diaria"})`;
  return adminAction("criar_ciclo", summary, {
    nome,
    produto,
    tipo: String(args.tipo ?? "nutriente"),
    frequencia: String(args.frequencia ?? "diaria"),
    fasesAplicaveis: fases,
    dosagem: typeof args.dosagem === "string" ? args.dosagem : undefined,
    alvo: typeof args.alvo === "string" ? args.alvo : "caixa",
    ativo: args.ativo !== false,
  });
}

export async function previewAtualizarCiclo(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const c = await resolveCiclo(ctx.projetoId, {
    id: typeof args.ciclo_id === "number" ? args.ciclo_id : undefined,
    nomeParcial: typeof args.ciclo_nome === "string" ? args.ciclo_nome : undefined,
  });
  if (isResolveError(c)) return { error: c.error };
  const summary = `Atualizar ciclo **${c.ciclo.nome}** (id ${c.ciclo.id})`;
  return adminAction("atualizar_ciclo", summary, {
    id: c.ciclo.id,
    nome: typeof args.nome === "string" ? args.nome : undefined,
    produto: typeof args.produto === "string" ? args.produto : undefined,
    tipo: typeof args.tipo === "string" ? args.tipo : undefined,
    frequencia: typeof args.frequencia === "string" ? args.frequencia : undefined,
    dosagem: typeof args.dosagem === "string" ? args.dosagem : null,
    ativo: typeof args.ativo === "boolean" ? args.ativo : undefined,
  });
}

export async function previewCriarTorre(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  const fase = args.fase as "mudas" | "vegetativa" | "maturacao";
  if (!nome || !fase) return { error: "Informe nome e fase da torre." };
  const summary = `Criar torre **${nome}** — fase **${fase}** (${args.num_andares ?? 10} andares)`;
  return adminAction("criar_torre", summary, {
    nome,
    fase,
    numAndares: typeof args.num_andares === "number" ? args.num_andares : 10,
    numeroTorre: typeof args.numero_torre === "number" ? args.numero_torre : undefined,
    modeloEstrutura: args.modelo_estrutura === "fv_12x6" ? "fv_12x6" : "padrao",
  });
}

export async function previewAtualizarTorre(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const t = await resolveTorre(ctx.projetoId, {
    id: typeof args.torre_id === "number" ? args.torre_id : undefined,
    ...torreRefFromArgs(args),
  });
  if (isResolveError(t)) return { error: t.error };
  const summary = `Atualizar torre **${t.torre.nome}** (id ${t.torre.id})`;
  return adminAction("atualizar_torre", summary, {
    id: t.torre.id,
    nome: typeof args.nome === "string" ? args.nome : undefined,
    fase: args.fase as "mudas" | "vegetativa" | "maturacao" | undefined,
    numAndares: typeof args.num_andares === "number" ? args.num_andares : undefined,
    numeroTorre: typeof args.numero_torre === "number" ? args.numero_torre : undefined,
    modeloEstrutura: args.modelo_estrutura === "fv_12x6" ? "fv_12x6" : args.modelo_estrutura === "padrao" ? "padrao" : undefined,
  });
}

export async function previewToggleTorreAtiva(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const t = await resolveTorre(ctx.projetoId, {
    id: typeof args.torre_id === "number" ? args.torre_id : undefined,
    ...torreRefFromArgs(args),
  });
  if (isResolveError(t)) return { error: t.error };
  const summary = `Alternar ativa/inativa — torre **${t.torre.nome}** (atualmente ${t.torre.ativa === false ? "inativa" : "ativa"})`;
  return adminAction("toggle_torre_ativa", summary, { id: t.torre.id });
}

export async function previewCriarCaixaAgua(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  const fase = args.fase as "mudas" | "vegetativa" | "maturacao";
  if (!nome || !fase) return { error: "Informe nome e fase da caixa." };
  const summary = `Criar caixa d'água **${nome}** — fase **${fase}**`;
  return adminAction("criar_caixa_agua", summary, {
    nome,
    fase,
    slug: typeof args.slug === "string" ? args.slug : undefined,
  });
}

export async function previewCriarBancada(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const nome = String(args.nome ?? "").trim();
  const fase = args.fase as "mudas" | "vegetativa" | "maturacao";
  if (!nome || !fase) return { error: "Informe nome e fase da bancada." };
  const summary = `Criar bancada **${nome}** — fase **${fase}**`;
  return adminAction("criar_bancada", summary, {
    nome,
    fase,
    quantidadeCaixas: typeof args.quantidade_caixas === "number" ? args.quantidade_caixas : 1,
  });
}

export async function previewAtualizarBancada(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const b = await resolveBancada(ctx.projetoId, {
    id: typeof args.bancada_id === "number" ? args.bancada_id : undefined,
    nomeParcial: typeof args.bancada_nome === "string" ? args.bancada_nome : undefined,
  });
  if (isResolveError(b)) return { error: b.error };
  const summary = `Atualizar bancada **${b.bancada.nome}** (id ${b.bancada.id})`;
  return adminAction("atualizar_bancada", summary, {
    id: b.bancada.id,
    nome: typeof args.nome === "string" ? args.nome : undefined,
    fase: args.fase as "mudas" | "vegetativa" | "maturacao" | undefined,
    quantidadeCaixas: typeof args.quantidade_caixas === "number" ? args.quantidade_caixas : undefined,
    status: args.status as "ativa" | "inativa" | "manutencao" | undefined,
  });
}

export async function previewUpsertFaseConfig(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const denied = gate(ctx);
  if (denied) return denied;
  const fase = String(args.fase ?? "").trim();
  const label = String(args.label ?? fase).trim();
  if (!fase) return { error: "Informe fase (mudas, vegetativa, maturacao)." };
  const summary = `Configurar fase **${label}** — EC ${args.ec_min}–${args.ec_max}, pH ${args.ph_min}–${args.ph_max}`;
  return adminAction("upsert_fase_config", summary, {
    fase,
    label,
    ecMin: Number(args.ec_min),
    ecMax: Number(args.ec_max),
    phMin: Number(args.ph_min),
    phMax: Number(args.ph_max),
    cor: String(args.cor ?? "#22c55e"),
    corLight: String(args.cor_light ?? "#86efac"),
    icon: String(args.icon ?? "leaf"),
  });
}
