import type { Fase } from "@/lib/types";

/**
 * Rótulos operacionais para microverdes.
 * No BD a torre usa `mudas` (germinação) ou `vegetativa` (iluminação). Linhas antigas com `maturacao`
 * tratam-se como iluminação até serem gravadas de novo.
 */
export function labelFaseTorreMicroverdes(fase: Fase): string {
  if (fase === "mudas") return "Germinação";
  return "Iluminação";
}

/** Fases de torre permitidas em projetos microverdes (valores persistidos na API). */
export const FASES_TORRE_MICROVERDES: Fase[] = ["mudas", "vegetativa"];

/** Iluminação no painel: torre `vegetativa` ou legado `maturacao`. */
export function faseTorreMicroverdesIluminacao(fase: Fase): boolean {
  return fase === "vegetativa" || fase === "maturacao";
}

/** Agrupamento para dashboard / listagens (duas etapas físicas). */
export const AGRUPAMENTO_FASES_TORRE_MV: { id: "germinacao" | "iluminacao"; label: string; fases: Fase[] }[] = [
  { id: "germinacao", label: "Germinação", fases: ["mudas"] },
  { id: "iluminacao", label: "Iluminação", fases: ["vegetativa", "maturacao"] },
];

/** Opções de formulário (criar/editar torre em microverdes). */
export const OPCOES_FASE_TORRE_MICROVERDES: { value: Fase; label: string }[] = [
  { value: "mudas", label: "🌱 Germinação" },
  { value: "vegetativa", label: "💡 Iluminação" },
];

// ---- Linguagem operacional: bandejas (4/andar), não “perfis” da fazenda vertical ----

export const BANDEJAS_POR_ANDAR_MICROVERDES = 4;

/** Resumo da estrutura física no cartão da torre (microverdes). */
export function resumoEstruturaFisicaMicroverdes(fase: Fase): string {
  if (fase === "mudas") {
    return `${BANDEJAS_POR_ANDAR_MICROVERDES} bandejas/andar · germinação`;
  }
  return `${BANDEJAS_POR_ANDAR_MICROVERDES} bandejas/andar · iluminação`;
}

/** B1…B4 em microverdes; P1… em fazenda vertical (mesmo índice de `perfilIndex` no BD). */
export function labelPosicaoProducao(projetoTipo: string | null | undefined, perfilIndex: number): string {
  if (projetoTipo === "microverdes") return `B${perfilIndex + 1}`;
  return `P${perfilIndex + 1}`;
}

export function termoUnidadeProducao(
  projetoTipo: string | null | undefined,
): { singular: "bandeja" | "perfil"; plural: "bandejas" | "perfis" } {
  if (projetoTipo === "microverdes") return { singular: "bandeja", plural: "bandejas" };
  return { singular: "perfil", plural: "perfis" };
}

/**
 * Layout de referência (fase estufa / microverdes). Físico no chão: amplie torres/estufas no cadastro.
 */
export const LAYOUT_FASE_ESTUFA_REFERENCIA = {
  estufas: 4,
  torres: 4,
  andaresPorTorre: 6,
} as const;

/**
 * Nome amigável na UI: torres legadas vinham como "Maturação" no nome, mas a fase operacional é iluminação.
 */
export function nomeTorreExibicaoMicroverdes(torre: { nome: string; fase: Fase }): string {
  let n = torre.nome;
  if (torre.fase === "vegetativa" || torre.fase === "maturacao") {
    n = n.replace(/\bMaturação\b/gi, "Iluminação").replace(/\bMaturacao\b/gi, "Iluminação");
  } else if (torre.fase === "mudas") {
    n = n
      .replace(/\bTorre\s+Mudas\b/gi, "Torre Germinação")
      .replace(/\bMudas\b/gi, "Germinação");
  }
  return n;
}
