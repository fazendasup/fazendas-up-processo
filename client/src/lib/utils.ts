import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ordem estável: primeiro pelo número operacional (`numeroTorre`), depois nome. */
export function compareTorresPorExibicao(
  a: { id: string; nome: string; numeroTorre?: number },
  b: { id: string; nome: string; numeroTorre?: number },
): number {
  const na = typeof a.numeroTorre === "number" ? a.numeroTorre : Number.MAX_SAFE_INTEGER;
  const nb = typeof b.numeroTorre === "number" ? b.numeroTorre : Number.MAX_SAFE_INTEGER;
  if (na !== nb) return na - nb;
  const c = a.nome.localeCompare(b.nome, "pt-BR", { numeric: true, sensitivity: "base" });
  if (c !== 0) return c;
  return a.id.localeCompare(b.id);
}
