import type { PendingAssistantAction } from "@shared/assistant-actions";
import { filtrarPlanosPrioridadeSomenteGerminacaoPlantio } from "@shared/planosPlantioOperacao";
import { randomUUID } from "crypto";
import * as db from "../db";
import type { AssistantPreviewCtx } from "./preview";
import { labelTorre } from "./lookup";
import {
  resolveAlerta,
  resolveBancada,
  resolveCaixa,
  resolveGerminacao,
  resolveManutencao,
  resolvePlano,
  isResolveError,
  resolveTorreAndar,
  resolveVariedade,
  torreRefFromArgs,
} from "./resolve";

function action(type: PendingAssistantAction["type"], summary: string, params: Record<string, unknown>) {
  return { action: { id: randomUUID(), type, summary, params } };
}

export async function previewLiberarAndar(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  const summary = [
    "**Liberar andar (pós-colheita/limpeza)**",
    `- ${labelTorre(r.torre)} — andar **${r.andar.numero}**`,
    `- Zera perfis e furos deste andar e marca como lavado (não apaga histórico de colheitas/transplantios).`,
  ].join("\n");
  return action("liberar_andar", summary, { andarId: r.andar.id });
}

export async function previewRegistrarColheita(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  let variedadeId: number | null = null;
  let variedadeNome: string | null = null;
  if (args.variedade_nome || args.variedade_id) {
    const v = await resolveVariedade(ctx.projetoId, {
      id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
      nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
    });
    if (isResolveError(v)) return { error: v.error };
    variedadeId = v.variedade.id;
    variedadeNome = v.variedade.nome;
  }
  const qtd = Number(args.quantidade_plantas ?? 0);
  if (!Number.isFinite(qtd) || qtd < 1) return { error: "Informe quantidade_plantas." };
  const summary = [
    "**Registar colheita**",
    `- ${labelTorre(r.torre)} — andar **${r.andar.numero}**`,
    `- ${qtd} plantas${variedadeNome ? ` — **${variedadeNome}**` : ""}`,
    args.peso_gramas != null ? `- Peso: ${args.peso_gramas} g` : null,
    args.qualidade ? `- Qualidade: ${args.qualidade}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return action("registrar_colheita", summary, {
    torreId: r.torre.id,
    andarId: r.andar.id,
    variedadeId,
    variedadeNome,
    dataColheita: new Date(),
    quantidadePlantas: qtd,
    pesoTotalGramas: typeof args.peso_gramas === "number" ? args.peso_gramas : null,
    qualidade: typeof args.qualidade === "string" ? args.qualidade : undefined,
    destino: typeof args.destino === "string" ? args.destino : null,
    observacoes: typeof args.observacoes === "string" ? args.observacoes : null,
  });
}

export async function previewRegistrarAplicacaoAndar(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  const tipo = String(args.tipo ?? "");
  const produto = String(args.produto ?? "");
  const quantidade = String(args.quantidade ?? "");
  if (!tipo || !produto || !quantidade) return { error: "Informe tipo, produto e quantidade." };
  const summary = `**Aplicação no andar**\n- ${labelTorre(r.torre)} andar ${r.andar.numero}\n- ${produto} (${tipo}): ${quantidade}`;
  return action("registrar_aplicacao_andar", summary, {
    andarId: r.andar.id,
    tipo,
    produto,
    quantidade,
    dataHora: new Date(),
  });
}

export async function previewRegistrarMedicaoCaixa(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const c = await resolveCaixa(ctx.projetoId, {
    id: typeof args.caixa_id === "number" ? args.caixa_id : undefined,
    nomeParcial: typeof args.caixa_nome === "string" ? args.caixa_nome : undefined,
  });
  if (isResolveError(c)) return { error: c.error };
  const ph = Number(args.ph);
  const ec = Number(args.ec);
  const temperaturaAgua = Number(args.temperatura_agua);
  if (!Number.isFinite(ph) || !Number.isFinite(ec) || !Number.isFinite(temperaturaAgua)) {
    return { error: "Informe ph, ec e temperatura_agua." };
  }
  const summary = `**Medição caixa d'água**\n- **${c.caixa.nome}**\n- pH **${ph}**, EC **${ec}**, temp. água **${temperaturaAgua}°C**`;
  return action("registrar_medicao_caixa", summary, {
    caixaAguaId: c.caixa.id,
    ph,
    ec,
    temperaturaAgua,
    dataHora: new Date(),
  });
}

export async function previewRegistrarAplicacaoCaixa(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const c = await resolveCaixa(ctx.projetoId, {
    id: typeof args.caixa_id === "number" ? args.caixa_id : undefined,
    nomeParcial: typeof args.caixa_nome === "string" ? args.caixa_nome : undefined,
  });
  if (isResolveError(c)) return { error: c.error };
  const tipo = String(args.tipo ?? "");
  const produto = String(args.produto ?? "");
  const quantidade = String(args.quantidade ?? "");
  if (!tipo || !produto || !quantidade) return { error: "Informe tipo, produto e quantidade." };
  const summary = `**Aplicação na solução (caixa)**\n- **${c.caixa.nome}**\n- ${produto}: ${quantidade}`;
  return action("registrar_aplicacao_caixa", summary, {
    caixaAguaId: c.caixa.id,
    tipo,
    produto,
    quantidade,
    dataHora: new Date(),
  });
}

export async function previewCriarManutencao(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const { findTorre } = await import("./lookup");
  const torres = await (await import("../db")).getAllTorres(ctx.projetoId);
  const t = findTorre(torres, torreRefFromArgs(args));
  if (!t) return { error: "Torre não encontrada." };
  const torreId = t.id;
  const tipo = String(args.tipo ?? "outro");
  const descricao = String(args.descricao ?? "");
  if (!descricao.trim()) return { error: "Informe descricao da manutenção." };
  const summary = [
    "**Abrir manutenção**",
    `- Torre id ${torreId}${typeof args.andar_numero === "number" ? ` — andar ${args.andar_numero}` : ""}`,
    `- ${tipo}: ${descricao.slice(0, 120)}`,
  ].join("\n");
  return action("criar_manutencao", summary, {
    torreId,
    andarNumero: typeof args.andar_numero === "number" ? args.andar_numero : undefined,
    tipo,
    descricao,
    dataAbertura: new Date(),
    prazo: args.prazo ? new Date(String(args.prazo)) : undefined,
    lampadaIndex: typeof args.lampada_index === "number" ? args.lampada_index : undefined,
  });
}

export async function previewConcluirManutencao(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const m = await resolveManutencao(ctx.projetoId, { id: Number(args.manutencao_id) });
  if (isResolveError(m)) return { error: m.error };
  const summary = `**Concluir manutenção #${m.manutencao.id}**\n- ${m.manutencao.tipo}: ${m.manutencao.descricao.slice(0, 100)}`;
  return action("concluir_manutencao", summary, {
    id: m.manutencao.id,
    solucao: typeof args.solucao === "string" ? args.solucao : null,
  });
}

export async function previewCriarGerminacao(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const v = await resolveVariedade(ctx.projetoId, {
    id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
    nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(v)) return { error: v.error };
  const qtd = Number(args.quantidade ?? 0);
  if (qtd < 1) return { error: "Informe quantidade." };
  const summary = `**Novo lote germinação**\n- **${v.variedade.nome}** — ${qtd} sementes/bandejas`;
  return action("criar_germinacao", summary, {
    variedadeId: v.variedade.id,
    variedadeNome: v.variedade.nome,
    quantidade: qtd,
    dataPlantio: new Date(),
    dataHora: new Date(),
    diasParaTransplantio: Number(args.dias_para_transplantio ?? 1),
    observacoes: typeof args.observacoes === "string" ? args.observacoes : undefined,
  });
}

export async function previewAtualizarGerminacao(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const g = await resolveGerminacao(ctx.projetoId, {
    id: typeof args.lote_id === "number" ? args.lote_id : undefined,
    variedadeNome: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(g)) return { error: g.error };
  const summary = `**Atualizar germinação #${g.lote.id}** (${g.lote.variedadeNome})`;
  return action("atualizar_germinacao", summary, {
    id: g.lote.id,
    germinadas: typeof args.germinadas === "number" ? args.germinadas : undefined,
    naoGerminadas: typeof args.nao_germinadas === "number" ? args.nao_germinadas : undefined,
    transplantadas: typeof args.transplantadas === "number" ? args.transplantadas : undefined,
    status: typeof args.status === "string" ? args.status : undefined,
    observacoes: typeof args.observacoes === "string" ? args.observacoes : null,
  });
}

export async function previewContagemGerminacaoPlano(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const p = await resolvePlano(ctx.projetoId, {
    id: typeof args.plano_id === "number" ? args.plano_id : undefined,
    variedadeNome: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(p)) return { error: p.error };
  const germ = Number(args.germinadas ?? 0);
  const nao = Number(args.nao_germinadas ?? 0);
  const summary = `**Contagem germinação (plano)**\n- **${p.plano.variedadeNome}** — germinadas: **${germ}**, não: **${nao}**`;
  return action("contagem_germinacao_plano", summary, { id: p.plano.id, germinadas: germ, naoGerminadas: nao });
}

export async function previewMarcarGerminacaoProntaPlano(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const p = await resolvePlano(ctx.projetoId, {
    id: typeof args.plano_id === "number" ? args.plano_id : undefined,
    variedadeNome: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(p)) return { error: p.error };
  const summary = `**Bandeja pronta para mudas**\n- Plano **${p.plano.variedadeNome}** (id ${p.plano.id})`;
  return action("marcar_germinacao_pronta_plano", summary, { id: p.plano.id });
}

export async function previewAdiarTarefa(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const id = Number(args.tarefa_id);
  if (!id) return { error: "Informe tarefa_id." };
  const horas = Number(args.horas ?? 24);
  const summary = `**Adiar tarefa #${id}** — +${horas}h`;
  return action("adiar_tarefa", summary, { tarefaId: id, horas });
}

export async function previewCriarTarefa(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const titulo = String(args.titulo ?? "").trim();
  if (!titulo) return { error: "Informe titulo." };
  let torreId: number | null = null;
  if (args.torre_fase && args.torre_numero) {
    const { findTorre } = await import("./lookup");
    const torres = await (await import("../db")).getAllTorres(ctx.projetoId);
    const t = findTorre(torres, torreRefFromArgs(args));
    if (t) torreId = t.id;
  }
  const summary = `**Criar tarefa**\n- **${titulo}**${torreId ? ` (torre id ${torreId})` : ""}`;
  return action("criar_tarefa", summary, {
    titulo,
    descricao: typeof args.descricao === "string" ? args.descricao : null,
    tipo: typeof args.tipo === "string" ? args.tipo : "outro",
    prioridade: typeof args.prioridade === "string" ? args.prioridade : "media",
    dataVencimento: new Date(),
    torreId,
    andarNumero: typeof args.andar_numero === "number" ? args.andar_numero : null,
  });
}

export async function previewMoverPerfil(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const orig = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args, "origem"), Number(args.origem_andar_numero));
  if ("error" in orig) return orig;
  const dest = await resolveTorreAndar(
    ctx.projetoId,
    torreRefFromArgs(args, "destino"),
    Number(args.destino_andar_numero),
  );
  if ("error" in dest) return dest;
  const pi = Number(args.perfil_index ?? 1) - 1;
  const pd = Number(args.destino_perfil_index ?? 1) - 1;
  const summary = `**Mover perfil P${pi + 1}**\n- ${labelTorre(orig.torre)} A${orig.andar.numero} → ${labelTorre(dest.torre)} A${dest.andar.numero} P${pd + 1}`;
  return action("mover_perfil", summary, {
    origemAndarId: orig.andar.id,
    perfilIndex: pi,
    destinoAndarId: dest.andar.id,
    destinoPerfilIndex: pd,
  });
}

export async function previewMoverAndar(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const orig = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args, "origem"), Number(args.origem_andar_numero));
  if ("error" in orig) return orig;
  const dest = await resolveTorreAndar(
    ctx.projetoId,
    torreRefFromArgs(args, "destino"),
    Number(args.destino_andar_numero),
  );
  if ("error" in dest) return dest;
  const summary = `**Mover andar inteiro**\n- ${labelTorre(orig.torre)} A${orig.andar.numero} → ${labelTorre(dest.torre)} A${dest.andar.numero}`;
  return action("mover_andar", summary, { origemAndarId: orig.andar.id, destinoAndarId: dest.andar.id });
}

export async function previewAtualizarFurosLote(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  const status = String(args.status ?? "plantado");
  let variedadeId: number | null = null;
  if (args.variedade_nome || args.variedade_id) {
    const v = await resolveVariedade(ctx.projetoId, {
      id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
      nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
    });
    if (isResolveError(v)) return { error: v.error };
    variedadeId = v.variedade.id;
  }
  const perfilIndex = Number(args.perfil_index ?? 1) - 1;
  const furoInicio = Number(args.furo_inicio ?? 1) - 1;
  const furoFim = Number(args.furo_fim ?? args.furo_inicio ?? 1) - 1;
  const updates: { perfilIndex: number; furoIndex: number; status: string; variedadeId: number | null }[] = [];
  for (let f = furoInicio; f <= furoFim; f++) {
    updates.push({ perfilIndex, furoIndex: f, status, variedadeId });
  }
  const summary = `**Atualizar furos**\n- ${labelTorre(r.torre)} A${r.andar.numero} P${perfilIndex + 1} furos ${furoInicio + 1}–${furoFim + 1} → **${status}**`;
  return action("atualizar_furos_lote", summary, { andarId: r.andar.id, updates });
}

export async function previewEsvaziarFurosAndar(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  const summary = `**Esvaziar furos do andar**\n- ${labelTorre(r.torre)} — andar **${r.andar.numero}** (todos vazios)`;
  return action("esvaziar_furos_andar", summary, { andarId: r.andar.id });
}

export async function previewAtivarTodosPerfisAndar(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const r = await resolveTorreAndar(ctx.projetoId, torreRefFromArgs(args), Number(args.andar_numero));
  if ("error" in r) return r;
  const v = await resolveVariedade(ctx.projetoId, {
    id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
    nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
  });
  if (isResolveError(v)) return { error: v.error };
  const summary = `**Plantar andar (todos os perfis)**\n- ${labelTorre(r.torre)} A${r.andar.numero} — **${v.variedade.nome}**`;
  return action("ativar_todos_perfis_andar", summary, {
    andarId: r.andar.id,
    variedadeId: v.variedade.id,
    dataEntrada: new Date(),
  });
}

export async function previewAtualizarAlerta(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const a = await resolveAlerta(ctx.projetoId, {
    id: typeof args.alerta_id === "number" ? args.alerta_id : undefined,
    tituloParcial: typeof args.titulo_parcial === "string" ? args.titulo_parcial : undefined,
  });
  if (isResolveError(a)) return { error: a.error };
  const status = args.status as "lido" | "em_andamento" | "resolvido";
  if (!status || !["lido", "em_andamento", "resolvido"].includes(status)) {
    return { error: "status deve ser lido, em_andamento ou resolvido." };
  }
  const summary = `**Alerta inteligência → ${status}**\n- #${a.alerta.id}: ${a.alerta.titulo}`;
  return action("atualizar_alerta_inteligencia", summary, {
    id: a.alerta.id,
    status,
    observacao: typeof args.observacao === "string" ? args.observacao : undefined,
  });
}

export async function previewBancadaPlantio(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const b = await resolveBancada(ctx.projetoId, {
    id: typeof args.bancada_id === "number" ? args.bancada_id : undefined,
    nomeParcial: typeof args.bancada_nome === "string" ? args.bancada_nome : undefined,
  });
  if (isResolveError(b)) return { error: b.error };
  let plantioVariedadeId: number | null = null;
  if (args.variedade_nome || args.variedade_id) {
    const v = await resolveVariedade(ctx.projetoId, {
      id: typeof args.variedade_id === "number" ? args.variedade_id : undefined,
      nomeParcial: typeof args.variedade_nome === "string" ? args.variedade_nome : undefined,
    });
    if (isResolveError(v)) return { error: v.error };
    plantioVariedadeId = v.variedade.id;
  }
  const summary = `**Plantio bancada (hidroponia)**\n- **${b.bancada.nome}**${plantioVariedadeId ? ` — variedade id ${plantioVariedadeId}` : " — limpar plantio"}`;
  return action("bancada_atualizar_plantio", summary, {
    bancadaId: b.bancada.id,
    plantioVariedadeId,
    plantioDataEntrada: plantioVariedadeId ? new Date() : null,
    plantioPrevisaoColheita: null,
  });
}

/**
 * Mesma fila que "Germinação / plantio inicial" no painel Hoje: planos `planejado` onde o próximo passo é iniciar germinação.
 * Não confundir com `concluir_tarefas` (tabela tarefas).
 */
export async function previewIniciarGerminacaoPlanos(
  ctx: AssistantPreviewCtx,
  args: Record<string, unknown>,
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const todos = await db.getAllPlanosPlantio(ctx.projetoId);
  const ref = new Date();
  const filaGerminacao = filtrarPlanosPrioridadeSomenteGerminacaoPlantio(todos as any[], ref).filter(
    (p: { status: string }) => p.status === "planejado",
  );

  let selecionados: { id: number; variedadeNome?: string | null; quantidadePlantas?: number | null }[];

  const idsArg = Array.isArray(args.plano_ids) ? args.plano_ids : undefined;
  if (idsArg && idsArg.length > 0) {
    const idSet = new Set(idsArg.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
    selecionados = [];
    for (const id of Array.from(idSet)) {
      const plano = await db.getPlanoPlantioById(ctx.projetoId, id);
      if (!plano) return { error: `Plano #${id} não encontrado.` };
      if (plano.status !== "planejado") {
        return { error: `Plano #${id} não está em planejado (está \`${plano.status}\`); só é possível iniciar germinação a partir de planejado.` };
      }
      selecionados.push(plano);
    }
  } else {
    selecionados = [...filaGerminacao];
    const vnome = typeof args.variedade_nome === "string" ? args.variedade_nome.trim().toLowerCase() : "";
    if (vnome) {
      selecionados = selecionados.filter((p) => (p.variedadeNome ?? "").toLowerCase().includes(vnome));
    }
    const limite = Math.min(typeof args.limite === "number" && args.limite > 0 ? args.limite : 25, 25);
    selecionados = selecionados.slice(0, limite);
  }

  if (selecionados.length === 0) {
    return {
      error:
        "Nenhum plano em **planejado** na fila de germinação/plantio inicial com esses critérios. " +
        "O painel Plantio lista **planos de plantio**, não a tabela de tarefas — peça **iniciar germinação** ou use o número do plano (ex. #383). " +
        "Se precisar concluir linhas da lista de **tarefas** (checklist), use preparar_concluir_tarefas.",
    };
  }

  const linhas = selecionados.map(
    (p) =>
      `  • **${p.variedadeNome ?? "—"}** — #${p.id} (${p.quantidadePlantas ?? "—"} plantas) → **em germinação**`,
  );
  const summary = [
    `**Iniciar germinação** (${selecionados.length} plano(s) em planejado)`,
    ...linhas,
    filaGerminacao.length > selecionados.length && !idsArg?.length
      ? `\n_(+${filaGerminacao.length - selecionados.length} na fila não incluídos; ajuste variedade_nome ou plano_ids)_`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return action("iniciar_germinacao_planos", summary, { planoIds: selecionados.map((p) => p.id) });
}
