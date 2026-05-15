import { contarPlantasMudasFv, plantasPorPerfilMudas } from "@shared/plantasPorPerfil";
import type { PendingAssistantAction } from "@shared/assistant-actions";
import { resolverFaseDestinoTransplantio, type FaseDestinoTransplantioFv } from "@shared/transplantioDestino";
import { variedadePulaVegetativa } from "@shared/variedadesFase";
import { randomUUID } from "crypto";
import * as db from "../db";
import {
  findAndar,
  findTorre,
  findVariedade,
  labelTorre,
  repartirQuantidades,
  type AndarRow,
  type TorreRow,
} from "./lookup";

export type AssistantPreviewCtx = {
  projetoId: number;
  projetoTipo: string | null;
  isAdmin?: boolean;
};

function startOfLocalDayMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

async function plantasPorPerfilMudasDoAndar(
  projetoId: number,
  origemVariedadeId: number,
  origemPerfis: { ativo: boolean; receitaId?: number | null }[],
): Promise<number> {
  const comReceita = origemPerfis.find((p) => p.ativo && p.receitaId);
  if (comReceita?.receitaId) {
    const rec = await db.getReceitaById(projetoId, comReceita.receitaId);
    if (rec?.densidadePorPerfil && rec.densidadePorPerfil > 0) return rec.densidadePorPerfil;
  }
  const lista = await db.getReceitasByVariedadeId(projetoId, origemVariedadeId);
  const ativa = lista.find((r) => r.ativa) ?? lista[0];
  if (ativa?.densidadePorPerfil && ativa.densidadePorPerfil > 0) return ativa.densidadePorPerfil;
  return plantasPorPerfilMudas(null);
}

function contarVaziosDestino(
  destPerfis: { ativo: boolean }[],
  destFuros: { status: string }[],
): number {
  if (destFuros.length > 0) return destFuros.filter((f) => f.status === "vazio").length;
  return destPerfis.filter((p) => !p.ativo).length;
}

export async function previewTransplantio(
  ctx: AssistantPreviewCtx,
  input: {
    torreOrigem: { fase?: string; numeroTorre?: number; nomeParcial?: string };
    andarOrigemNumero: number;
    torreDestino: { fase?: string; numeroTorre?: number; nomeParcial?: string };
    andaresDestinoNumeros: number[];
    faseDestino?: FaseDestinoTransplantioFv;
    quantidadesPorAndar?: { andarNumero: number; quantidade: number }[];
    observacoes?: string;
  },
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const pid = ctx.projetoId;
  const [torres, andares] = await Promise.all([db.getAllTorres(pid), db.getAllAndares(pid)]);

  const torreOrigem = findTorre(torres, input.torreOrigem);
  if (!torreOrigem) return { error: "Torre de origem não encontrada. Informe fase e número (ex.: mudas 1)." };

  const andarOrigem = findAndar(andares, torreOrigem.id, input.andarOrigemNumero);
  if (!andarOrigem) {
    return { error: `Andar ${input.andarOrigemNumero} não encontrado em ${labelTorre(torreOrigem)}.` };
  }

  const torreDestino = findTorre(torres, input.torreDestino);
  if (!torreDestino) return { error: "Torre de destino não encontrada." };

  const destinosAndares: AndarRow[] = [];
  for (const num of input.andaresDestinoNumeros) {
    const a = findAndar(andares, torreDestino.id, num);
    if (!a) return { error: `Andar destino ${num} não encontrado em ${labelTorre(torreDestino)}.` };
    destinosAndares.push(a);
  }

  const origemPerfis = await db.getPerfisByAndarId(pid, andarOrigem.id);
  const origemFuros = await db.getFurosByAndarId(pid, andarOrigem.id);
  const origemVariedadeId =
    origemPerfis.find((p) => p.ativo && p.variedadeId)?.variedadeId ??
    origemPerfis.find((p) => p.variedadeId)?.variedadeId ??
    null;
  if (!origemVariedadeId) {
    return { error: "Andar de origem sem variedade definida. Defina a variedade antes de transplantar." };
  }
  const vRow = await db.getVariedadeById(pid, origemVariedadeId);
  if (!vRow) return { error: "Variedade da origem não encontrada." };

  const faseOrigem = torreOrigem.fase;
  if (faseOrigem !== "mudas" && faseOrigem !== "vegetativa") {
    return { error: "Só é possível transplantar a partir de mudas ou vegetativa." };
  }

  const pulaVeg = variedadePulaVegetativa(vRow.slug, vRow.nome);
  const faseDestino = resolverFaseDestinoTransplantio(faseOrigem, {
    pulaVegetativa: pulaVeg,
    faseDestinoInformada: input.faseDestino ?? null,
    projetoTipo: ctx.projetoTipo,
  });

  if (torreDestino.fase !== faseDestino) {
    return {
      error: `Torre destino está em fase "${torreDestino.fase}"; esperado "${faseDestino}" para este transplantio.`,
    };
  }

  const plantasPorPerfil =
    faseOrigem === "mudas" ? await plantasPorPerfilMudasDoAndar(pid, origemVariedadeId, origemPerfis) : 0;
  const origemDisponivel =
    faseOrigem === "mudas"
      ? contarPlantasMudasFv(origemPerfis.filter((p) => p.ativo).length, plantasPorPerfil)
      : origemFuros.filter((f) => f.status === "plantado").length;

  if (origemDisponivel <= 0) {
    return { error: "Não há plantas disponíveis no andar de origem." };
  }

  const caps: number[] = [];
  for (const a of destinosAndares) {
    const destPerfis = await db.getPerfisByAndarId(pid, a.id);
    const destFuros = await db.getFurosByAndarId(pid, a.id);
    caps.push(contarVaziosDestino(destPerfis, destFuros));
  }

  const qtyMap = new Map(
    (input.quantidadesPorAndar ?? []).map((q) => [q.andarNumero, q.quantidade]),
  );

  let quantidades: number[];
  if (qtyMap.size > 0) {
    quantidades = destinosAndares.map((a) => {
      const q = qtyMap.get(a.numero);
      return q != null && q > 0 ? q : 0;
    });
    const soma = quantidades.reduce((s, n) => s + n, 0);
    if (soma <= 0) return { error: "Informe quantidades válidas por andar destino." };
    if (soma > origemDisponivel) {
      return { error: `Soma (${soma}) maior que disponível na origem (${origemDisponivel}).` };
    }
    for (let i = 0; i < destinosAndares.length; i++) {
      if (quantidades[i]! > caps[i]!) {
        return {
          error: `Andar ${destinosAndares[i]!.numero}: capacidade ${caps[i]}, solicitado ${quantidades[i]}.`,
        };
      }
    }
  } else {
    quantidades = repartirQuantidades(origemDisponivel, caps);
    const soma = quantidades.reduce((s, n) => s + n, 0);
    if (soma < origemDisponivel) {
      return {
        error: `Capacidade insuficiente nos andares destino (cabe ${soma} de ${origemDisponivel} plantas).`,
      };
    }
  }

  const destinos = destinosAndares.map((a, i) => ({
    andarDestinoId: a.id,
    quantidade: quantidades[i]!,
  }));

  const linhas = destinosAndares.map(
    (a, i) => `  • ${labelTorre(torreDestino)} — andar ${a.numero}: **${quantidades[i]}** plantas`,
  );

  const summary = [
    `**Transplantio** (${faseOrigem} → ${faseDestino})`,
    `- Origem: ${labelTorre(torreOrigem)} — andar **${andarOrigem.numero}** (${origemDisponivel} plantas disponíveis, variedade **${vRow.nome}**)`,
    `- Destinos:`,
    ...linhas,
    `- Total a mover: **${destinos.reduce((s, d) => s + d.quantidade, 0)}** plantas`,
    input.observacoes?.trim() ? `- Observações: ${input.observacoes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    action: {
      id: randomUUID(),
      type: "transplantar_distribuido",
      summary,
      params: {
        andarOrigemId: andarOrigem.id,
        destinos,
        observacoes: input.observacoes?.trim() || undefined,
        ...(faseOrigem === "mudas" ? { faseDestino: input.faseDestino ?? faseDestino } : {}),
      },
    },
  };
}

export async function previewConcluirTarefas(
  ctx: AssistantPreviewCtx,
  input: {
    escopo: "hoje_e_atrasadas" | "hoje" | "atrasadas" | "por_titulo";
    tituloContem?: string;
    tipos?: string[];
    limite?: number;
  },
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const tarefas = await db.getAllTarefas(ctx.projetoId);
  const hoje = startOfLocalDayMs(new Date());
  const limite = Math.min(input.limite ?? 40, 40);

  let pool = tarefas.filter((t) => t.status === "pendente" || t.status === "em_andamento");

  if (input.escopo === "hoje") {
    pool = pool.filter((t) => startOfLocalDayMs(new Date(t.dataVencimento)) === hoje);
  } else if (input.escopo === "atrasadas") {
    pool = pool.filter((t) => startOfLocalDayMs(new Date(t.dataVencimento)) < hoje);
  } else if (input.escopo === "hoje_e_atrasadas") {
    pool = pool.filter((t) => startOfLocalDayMs(new Date(t.dataVencimento)) <= hoje);
  }

  if (input.tipos?.length) {
    const tipos = new Set(input.tipos.map((x) => x.toLowerCase()));
    pool = pool.filter((t) => tipos.has((t.tipo ?? "").toLowerCase()));
  }

  if (input.tituloContem?.trim()) {
    const q = input.tituloContem.toLowerCase();
    pool = pool.filter((t) => (t.titulo ?? "").toLowerCase().includes(q));
  }

  if (input.escopo === "por_titulo" && !input.tituloContem?.trim()) {
    return { error: "Para escopo por_titulo, informe tituloContem." };
  }

  const selecionadas = pool.slice(0, limite);
  if (selecionadas.length === 0) {
    return { error: "Nenhuma tarefa pendente encontrada com esses critérios." };
  }

  const linhas = selecionadas.map((t) => `  • [${t.tipo}] ${t.titulo} (venc. ${new Date(t.dataVencimento).toLocaleDateString("pt-BR")})`);
  const summary = [
    `**Concluir ${selecionadas.length} tarefa(s)**`,
    ...linhas,
    pool.length > selecionadas.length
      ? `\n_(+${pool.length - selecionadas.length} não incluídas; limite ${limite})_`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    action: {
      id: randomUUID(),
      type: "concluir_tarefas",
      summary,
      params: { tarefaIds: selecionadas.map((t) => t.id) },
    },
  };
}

export async function previewMarcarAndarLavado(
  ctx: AssistantPreviewCtx,
  input: {
    torre: { fase?: string; numeroTorre?: number; nomeParcial?: string };
    andarNumero: number;
  },
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const [torres, andares] = await Promise.all([db.getAllTorres(ctx.projetoId), db.getAllAndares(ctx.projetoId)]);
  const torre = findTorre(torres, input.torre);
  if (!torre) return { error: "Torre não encontrada." };
  const andar = findAndar(andares, torre.id, input.andarNumero);
  if (!andar) return { error: `Andar ${input.andarNumero} não encontrado.` };

  const summary = `**Marcar andar lavado/liberado**\n- ${labelTorre(torre)} — andar **${andar.numero}**`;

  return {
    action: {
      id: randomUUID(),
      type: "marcar_andar_lavado",
      summary,
      params: { andarId: andar.id },
    },
  };
}

export async function previewAtualizarPerfis(
  ctx: AssistantPreviewCtx,
  input: {
    torre: { fase?: string; numeroTorre?: number; nomeParcial?: string };
    andarNumero: number;
    perfilIndices: number[];
    variedade?: { id?: number; nomeParcial?: string };
    ativo?: boolean;
  },
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const pid = ctx.projetoId;
  const [torres, andares, variedades] = await Promise.all([
    db.getAllTorres(pid),
    db.getAllAndares(pid),
    db.getAllVariedades(pid),
  ]);
  const torre = findTorre(torres, input.torre);
  if (!torre) return { error: "Torre não encontrada." };
  if (torre.fase !== "mudas") {
    return { error: "Atualização em lote de perfis via assistente está disponível para torres de mudas." };
  }
  const andar = findAndar(andares, torre.id, input.andarNumero);
  if (!andar) return { error: `Andar ${input.andarNumero} não encontrado.` };

  let variedadeId: number | null | undefined;
  if (input.variedade) {
    const v = findVariedade(variedades, input.variedade);
    if (!v) return { error: "Variedade não encontrada." };
    variedadeId = v.id;
  }

  const ativo = input.ativo ?? true;
  const updates = input.perfilIndices.map((perfilIndex) => ({
    perfilIndex,
    ativo,
    ...(variedadeId !== undefined ? { variedadeId } : {}),
    ...(ativo ? { dataEntrada: new Date() } : {}),
  }));

  const vNome =
    variedadeId != null ? variedades.find((v) => v.id === variedadeId)?.nome ?? String(variedadeId) : "—";

  const summary = [
    `**Atualizar perfis (plantio)**`,
    `- ${labelTorre(torre)} — andar **${andar.numero}**`,
    `- Perfis: ${input.perfilIndices.map((i) => `P${i + 1}`).join(", ")}`,
    `- Variedade: **${vNome}**; ativo: **${ativo ? "sim" : "não"}**`,
  ].join("\n");

  return {
    action: {
      id: randomUUID(),
      type: "atualizar_perfis",
      summary,
      params: { andarId: andar.id, updates },
    },
  };
}

export async function previewMarcarCicloExecutado(
  ctx: AssistantPreviewCtx,
  input: { cicloId?: number; nomeParcial?: string },
): Promise<{ action: PendingAssistantAction } | { error: string }> {
  const ciclos = await db.getAllCiclos(ctx.projetoId);
  let ciclo = input.cicloId != null ? ciclos.find((c) => c.id === input.cicloId) : undefined;
  if (!ciclo && input.nomeParcial?.trim()) {
    const q = input.nomeParcial.toLowerCase();
    const matches = ciclos.filter((c) => c.nome.toLowerCase().includes(q));
    ciclo = matches.length === 1 ? matches[0] : matches.find((c) => c.nome.toLowerCase() === q) ?? matches[0];
  }
  if (!ciclo) return { error: "Ciclo não encontrado." };

  const summary = `**Marcar ciclo executado**\n- **${ciclo.nome}** (${ciclo.produto}) — registo com data/hora atual`;

  return {
    action: {
      id: randomUUID(),
      type: "marcar_ciclo_executado",
      summary,
      params: { cicloId: ciclo.id, ultimaExecucao: new Date() },
    },
  };
}
