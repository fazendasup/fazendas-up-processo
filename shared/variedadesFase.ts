/**
 * Variedades que não passam pela torre/fase vegetativa: após mudas vão direto para maturação.
 * Inclui slug conhecidos e heurística por nome (cadastros manuais).
 */

export const VARIEDADE_SLUGS_SEM_VEGETATIVA = new Set([
  "manjericao",
  "baby-leaf-beterraba",
  "baby-leaf-acelga",
]);

/** Slugs conhecidos: cultivo em torres 12×6 (baby leaf) — manjericão, baby leaf beterraba/acelga. */
export const VARIEDADE_SLUGS_BABY_LEAF_FV = new Set([
  "manjericao",
  "baby-leaf-beterraba",
  "baby-leaf-acelga",
]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * @param slug — slug da variedade no cadastro (ex.: manjericao)
 * @param nome — nome exibido (ex.: "Baby Leaf / Beterraba")
 */
export function variedadePulaVegetativa(
  slug: string | null | undefined,
  nome: string | null | undefined,
): boolean {
  const s = (slug || "").trim().toLowerCase();
  if (s && VARIEDADE_SLUGS_SEM_VEGETATIVA.has(s)) return true;

  const n = norm(nome || "");
  if (n.includes("manjericao") || n.includes("manjericão")) return true;
  if (n.includes("baby leaf") && n.includes("beterraba")) return true;
  if (n.includes("baby leaf") && n.includes("acelga")) return true;

  return false;
}

/**
 * Variedades que ocupam apenas torres com grelha 12×6 (baby leaf), não alface nas torres padrão.
 * Combinar com `torreReservadaGrelhaBabyLeaf` (client `planejamentoContinuo`) para capacidade por torre.
 */
export function variedadeEhBabyLeafFV(
  slug: string | null | undefined,
  nome: string | null | undefined,
): boolean {
  const s = (slug || "").trim().toLowerCase();
  if (s && VARIEDADE_SLUGS_BABY_LEAF_FV.has(s)) return true;

  const n = norm(nome || "");
  if (n.includes("manjeric")) return true;
  if (n.includes("baby leaf") && n.includes("beterraba")) return true;
  if (n.includes("baby leaf") && n.includes("acelga")) return true;

  return false;
}
