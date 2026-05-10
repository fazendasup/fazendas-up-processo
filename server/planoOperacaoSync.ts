/**
 * Mantém o plano de plantio alinhado à operação na torre / germinação.
 * Regra: um ciclo por vez por variedade — FIFO por dataInicioGerminacao (mais antigo primeiro).
 */

import type { PlanoPlantio } from "../drizzle/schema";
import * as db from "./db";

function isTerminal(status: string): boolean {
  return status === "colhido" || status === "cancelado";
}

/** Planos não encerrados da variedade, mais antigo primeiro (FIFO). */
export async function listPlanosAbertosPorVariedade(
  projetoId: number,
  variedadeId: number,
): Promise<PlanoPlantio[]> {
  const planos = await db.getAllPlanosPlantio(projetoId);
  return planos
    .filter((p) => p.variedadeId === variedadeId && !isTerminal(p.status))
    .sort(
      (a, b) =>
        new Date(a.dataInicioGerminacao).getTime() -
          new Date(b.dataInicioGerminacao).getTime() || Number(a.id) - Number(b.id),
    );
}

/**
 * Transplantio: bandeja→torre mudas (germinacao→mudas) ou mudas→veg/mat.
 * Encerra germinação no plano e marca em produção no próximo ciclo planejado/em_germinacao (FIFO).
 */
export async function syncPlanoFromTransplantio(
  projetoId: number,
  variedadeId: number,
  faseOrigem: string,
  faseDestino: string,
  quantidadeTransplantada: number,
): Promise<void> {
  if (quantidadeTransplantada <= 0) return;

  const sobeProducao =
    (faseOrigem === "germinacao" && faseDestino === "mudas") ||
    (faseOrigem === "mudas" &&
      (faseDestino === "vegetativa" || faseDestino === "maturacao"));

  if (!sobeProducao) return;

  const sorted = await listPlanosAbertosPorVariedade(projetoId, variedadeId);
  const alvo = sorted.find((p) => p.status === "planejado" || p.status === "em_germinacao");
  if (!alvo) return;

  const transplantadasGerminacao = (alvo.transplantadasGerminacao ?? 0) + quantidadeTransplantada;
  await db.updatePlanoPlantio(projetoId, alvo.id, {
    status: "em_producao",
    germinacaoFase: "pronto_mudas",
    transplantadasGerminacao,
  });
}

/** Registro de colheita: marca o plano em produção mais antigo da variedade como colhido. */
export async function syncPlanoFromColheita(
  projetoId: number,
  variedadeId: number | null | undefined,
): Promise<void> {
  if (variedadeId == null) return;
  const sorted = await listPlanosAbertosPorVariedade(projetoId, variedadeId);
  const alvo = sorted.find((p) => p.status === "em_producao");
  if (!alvo) return;
  await db.updatePlanoPlantio(projetoId, alvo.id, { status: "colhido" });
}

/** Primeira contagem germinadas/não germ. no plano ainda «planejado» → entra em germinação ativa. */
export async function syncPlanoAposContagemGerminacao(
  projetoId: number,
  planoId: number,
  statusAntes: string,
): Promise<void> {
  if (statusAntes !== "planejado") return;
  await db.updatePlanoPlantio(projetoId, planoId, {
    status: "em_germinacao",
    germinacaoFase: "germinando",
  });
}

/** Novo lote no módulo Germinação → amarra ao próximo plano «planejado» da mesma variedade. */
export async function syncPlanoAoCriarLoteGerminacao(projetoId: number, variedadeId: number): Promise<void> {
  const sorted = await listPlanosAbertosPorVariedade(projetoId, variedadeId);
  const alvo = sorted.find((p) => p.status === "planejado");
  if (!alvo) return;
  await db.updatePlanoPlantio(projetoId, alvo.id, {
    status: "em_germinacao",
    germinacaoFase: "germinando",
  });
}
