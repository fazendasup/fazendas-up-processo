import type * as db from "../db";

export type TorreRow = Awaited<ReturnType<typeof db.getAllTorres>>[number];
export type AndarRow = Awaited<ReturnType<typeof db.getAllAndares>>[number];
export type VariedadeRow = Awaited<ReturnType<typeof db.getAllVariedades>>[number];

export function normalizeRef(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const FASE_ALIASES: Record<string, string> = {
  muda: "mudas",
  mudas: "mudas",
  vegetativa: "vegetativa",
  veg: "vegetativa",
  vegetativo: "vegetativa",
  maturacao: "maturacao",
  maturação: "maturacao",
  mat: "maturacao",
};

export function parseFaseRef(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const n = normalizeRef(raw);
  return FASE_ALIASES[n] ?? n;
}

export type TorreRefInput = {
  fase?: string | null;
  numeroTorre?: number | null;
  nomeParcial?: string | null;
};

/** Resolve torre por fase + número, ou por nome parcial. */
export function findTorre(torres: TorreRow[], ref: TorreRefInput): TorreRow | null {
  const fase = parseFaseRef(ref.fase);
  let pool = torres.filter((t) => t.ativa !== false);
  if (fase) pool = pool.filter((t) => t.fase === fase);
  if (ref.numeroTorre != null && Number.isFinite(ref.numeroTorre)) {
    const byNum = pool.filter((t) => t.numeroTorre === ref.numeroTorre);
    if (byNum.length === 1) return byNum[0]!;
    if (byNum.length > 1) return byNum[0]!;
    const global = torres.filter((t) => t.ativa !== false && t.numeroTorre === ref.numeroTorre);
    if (global.length === 1) return global[0]!;
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = pool.filter((t) => normalizeRef(t.nome).includes(q));
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) {
      const exact = matches.find((t) => normalizeRef(t.nome) === q);
      return exact ?? matches[0]!;
    }
  }
  if (fase && ref.numeroTorre != null) {
    const m = pool.find((t) => t.numeroTorre === ref.numeroTorre);
    if (m) return m;
  }
  return null;
}

export function findAndar(andares: AndarRow[], torreId: number, numeroAndar: number): AndarRow | null {
  const matches = andares.filter((a) => a.torreId === torreId && a.numero === numeroAndar);
  return matches[0] ?? null;
}

export function findVariedade(variedades: VariedadeRow[], ref: { id?: number; nomeParcial?: string }): VariedadeRow | null {
  if (ref.id != null) {
    return variedades.find((v) => v.id === ref.id) ?? null;
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = variedades.filter((v) => normalizeRef(v.nome).includes(q));
    if (matches.length === 1) return matches[0]!;
    const exact = matches.find((v) => normalizeRef(v.nome) === q);
    return exact ?? matches[0] ?? null;
  }
  return null;
}

export function labelTorre(t: TorreRow): string {
  return `${t.nome} (fase ${t.fase}, nº ${t.numeroTorre})`;
}

/** Reparte `total` entre destinos respeitando capacidade máxima de cada um. */
export function repartirQuantidades(total: number, caps: number[]): number[] {
  const n = caps.length;
  if (n === 0) return [];
  const out = new Array<number>(n).fill(0);
  let remaining = total;
  let guard = 0;
  while (remaining > 0 && guard < total * n * 2) {
    guard++;
    let moved = false;
    for (let i = 0; i < n; i++) {
      if (out[i]! < caps[i]!) {
        out[i]!++;
        remaining--;
        moved = true;
        if (remaining <= 0) break;
      }
    }
    if (!moved) break;
  }
  return out;
}
