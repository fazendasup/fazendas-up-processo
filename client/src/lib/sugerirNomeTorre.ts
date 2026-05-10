import { labelFaseTorreMicroverdes } from "@/lib/microverdesPhases";
import type { Fase, FaseConfig, Torre } from "@/lib/types";
import { FASES_CONFIG } from "@/lib/types";

/** Maior número extraído dos nomes das torres na fase (heurística: todos os grupos de dígitos). */
export function proximoNumeroTorreNaFase(fase: Fase, torres: Pick<Torre, "nome" | "fase">[]): number {
  const same = torres.filter((t) => t.fase === fase);
  let max = 0;
  for (const t of same) {
    const nums = t.nome.match(/\d+/g);
    if (!nums) continue;
    for (const g of nums) {
      const v = parseInt(g, 10);
      if (v > max) max = v;
    }
  }
  return max + 1;
}

/** Padrão ex.: "Torre Maturação 14" — editável no formulário. */
export function sugerirNomeNovaTorre(
  fase: Fase,
  torres: Pick<Torre, "nome" | "fase">[],
  isMicroverdes: boolean,
  fasesConfig: Partial<Record<Fase, FaseConfig>> | null | undefined,
): string {
  const label = isMicroverdes
    ? labelFaseTorreMicroverdes(fase)
    : fasesConfig?.[fase]?.label ?? FASES_CONFIG[fase].label;
  const n = proximoNumeroTorreNaFase(fase, torres);
  return `Torre ${label} ${n}`;
}

/** Maior número operacional já usado no projeto (único por torre). */
export function maxNumeroTorreOperacional(torres: Pick<Torre, "numeroTorre">[]): number {
  let m = 0;
  for (const t of torres) {
    if (typeof t.numeroTorre === "number" && t.numeroTorre > m) m = t.numeroTorre;
  }
  return m;
}

/** Próximo número livre para nova torre (obrigatório no cadastro). */
export function proximoNumeroTorreOperacional(torres: Pick<Torre, "numeroTorre">[]): number {
  return maxNumeroTorreOperacional(torres) + 1;
}
