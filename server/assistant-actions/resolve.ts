import { TRPCError } from "@trpc/server";
import type { ModuloContratavel } from "@shared/const";
import * as db from "../db";
import { findAndar, findTorre, findVariedade, labelTorre, normalizeRef, type TorreRefInput } from "./lookup";

export function isResolveError(r: unknown): r is { error: string } {
  return (
    typeof r === "object" &&
    r != null &&
    "error" in r &&
    typeof (r as { error: unknown }).error === "string"
  );
}

export type ResolvedTorreAndar = {
  torre: NonNullable<ReturnType<typeof findTorre>>;
  andar: NonNullable<ReturnType<typeof findAndar>>;
};

export async function resolveTorreAndar(
  projetoId: number,
  torreRef: TorreRefInput,
  andarNumero: number,
): Promise<ResolvedTorreAndar | { error: string }> {
  const [torres, andares] = await Promise.all([db.getAllTorres(projetoId), db.getAllAndares(projetoId)]);
  const torre = findTorre(torres, torreRef);
  if (!torre) return { error: "Torre não encontrada. Informe fase e número (ex.: mudas 1)." };
  const andar = findAndar(andares, torre.id, andarNumero);
  if (!andar) return { error: `Andar ${andarNumero} não encontrado em ${labelTorre(torre)}.` };
  return { torre, andar };
}

export async function resolveVariedade(
  projetoId: number,
  ref: { id?: number; nomeParcial?: string },
): Promise<{ variedade: Awaited<ReturnType<typeof db.getAllVariedades>>[number] } | { error: string }> {
  const variedades = await db.getAllVariedades(projetoId);
  const v = findVariedade(variedades, ref);
  if (!v) return { error: "Variedade não encontrada." };
  return { variedade: v };
}

export async function resolveCaixa(
  projetoId: number,
  ref: { id?: number; nomeParcial?: string },
): Promise<{ caixa: Awaited<ReturnType<typeof db.getAllCaixasAgua>>[number] } | { error: string }> {
  const caixas = await db.getAllCaixasAgua(projetoId);
  if (ref.id != null) {
    const c = caixas.find((x) => x.id === ref.id);
    if (c) return { caixa: c };
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = caixas.filter((c) => normalizeRef(c.nome).includes(q));
    if (matches.length === 1) return { caixa: matches[0]! };
    const exact = matches.find((c) => normalizeRef(c.nome) === q);
    if (exact) return { caixa: exact };
    if (matches.length > 1) return { error: "Várias caixas correspondem; seja mais específico." };
  }
  if (caixas.length === 1) return { caixa: caixas[0]! };
  return { error: "Caixa d'água não encontrada." };
}

export async function resolveBancada(
  projetoId: number,
  ref: { id?: number; nomeParcial?: string },
): Promise<{ bancada: Awaited<ReturnType<typeof db.getAllBancadas>>[number] } | { error: string }> {
  const bancadas = await db.getAllBancadas(projetoId);
  if (ref.id != null) {
    const b = bancadas.find((x) => x.id === ref.id);
    if (b) return { bancada: b };
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = bancadas.filter((b) => normalizeRef(b.nome).includes(q));
    if (matches.length === 1) return { bancada: matches[0]! };
    if (matches.length > 1) return { error: "Várias bancadas correspondem." };
  }
  return { error: "Bancada não encontrada." };
}

export async function resolvePlano(
  projetoId: number,
  ref: { id?: number; variedadeNome?: string },
): Promise<{ plano: Awaited<ReturnType<typeof db.getAllPlanosPlantio>>[number] } | { error: string }> {
  const planos = await db.getAllPlanosPlantio(projetoId);
  if (ref.id != null) {
    const p = planos.find((x) => x.id === ref.id);
    if (p) return { plano: p };
  }
  if (ref.variedadeNome?.trim()) {
    const q = ref.variedadeNome.toLowerCase();
    const matches = planos.filter((p) => (p.variedadeNome ?? "").toLowerCase().includes(q));
    const ativos = matches.filter((p) => p.status !== "colhido" && p.status !== "cancelado");
    const pool = ativos.length > 0 ? ativos : matches;
    if (pool.length === 1) return { plano: pool[0]! };
    if (pool.length > 1) return { error: "Vários planos correspondem; use id do plano." };
  }
  return { error: "Plano de plantio não encontrado." };
}

export async function resolveManutencao(
  projetoId: number,
  ref: { id?: number },
): Promise<{ manutencao: Awaited<ReturnType<typeof db.getAllManutencoes>>[number] } | { error: string }> {
  if (ref.id == null) return { error: "Informe o id da manutenção." };
  const list = await db.getAllManutencoes(projetoId);
  const m = list.find((x) => x.id === ref.id);
  if (!m) return { error: "Manutenção não encontrada." };
  return { manutencao: m };
}

export async function resolveGerminacao(
  projetoId: number,
  ref: { id?: number; variedadeNome?: string },
): Promise<{ lote: Awaited<ReturnType<typeof db.getAllGerminacao>>[number] } | { error: string }> {
  const list = await db.getAllGerminacao(projetoId);
  if (ref.id != null) {
    const g = list.find((x) => x.id === ref.id);
    if (g) return { lote: g };
  }
  if (ref.variedadeNome?.trim()) {
    const q = ref.variedadeNome.toLowerCase();
    const matches = list.filter((g) => (g.variedadeNome ?? "").toLowerCase().includes(q));
    if (matches.length === 1) return { lote: matches[0]! };
  }
  return { error: "Lote de germinação não encontrado." };
}

export async function resolveReceita(
  projetoId: number,
  ref: { id?: number; nomeParcial?: string },
): Promise<{ receita: Awaited<ReturnType<typeof db.getAllReceitas>>[number] } | { error: string }> {
  const receitas = await db.getAllReceitas(projetoId);
  if (ref.id != null) {
    const r = receitas.find((x) => x.id === ref.id);
    if (r) return { receita: r };
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = receitas.filter((r) => normalizeRef(r.nome).includes(q));
    if (matches.length === 1) return { receita: matches[0]! };
  }
  return { error: "Receita não encontrada." };
}

export async function resolveCiclo(
  projetoId: number,
  ref: { id?: number; nomeParcial?: string },
): Promise<{ ciclo: Awaited<ReturnType<typeof db.getAllCiclos>>[number] } | { error: string }> {
  const ciclos = await db.getAllCiclos(projetoId);
  if (ref.id != null) {
    const c = ciclos.find((x) => x.id === ref.id);
    if (c) return { ciclo: c };
  }
  if (ref.nomeParcial?.trim()) {
    const q = normalizeRef(ref.nomeParcial);
    const matches = ciclos.filter((c) => normalizeRef(c.nome).includes(q));
    if (matches.length === 1) return { ciclo: matches[0]! };
  }
  return { error: "Ciclo não encontrado." };
}

export async function resolveTorre(
  projetoId: number,
  ref: TorreRefInput & { id?: number },
): Promise<{ torre: Awaited<ReturnType<typeof db.getAllTorres>>[number] } | { error: string }> {
  const torres = await db.getAllTorres(projetoId);
  if (ref.id != null) {
    const t = torres.find((x) => x.id === ref.id);
    if (t) return { torre: t };
  }
  const t = findTorre(torres, ref);
  if (t) return { torre: t };
  return { error: "Torre não encontrada." };
}

export async function resolveAlerta(
  projetoId: number,
  ref: { id?: number; tituloParcial?: string },
): Promise<{ alerta: Awaited<ReturnType<typeof db.getAllAlerts>>[number] } | { error: string }> {
  const list = await db.getAllAlerts(projetoId);
  if (ref.id != null) {
    const a = list.find((x) => x.id === ref.id);
    if (a) return { alerta: a };
  }
  if (ref.tituloParcial?.trim()) {
    const q = ref.tituloParcial.toLowerCase();
    const matches = list.filter((a) => (a.titulo ?? "").toLowerCase().includes(q));
    if (matches.length === 1) return { alerta: matches[0]! };
  }
  return { error: "Alerta não encontrado." };
}

export function requireProjetoTipo(
  tipo: string | null,
  expected: "fazenda_vertical" | "hidroponia" | "microverdes",
) {
  if (tipo !== expected) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Esta operação só está disponível para projetos do tipo ${expected}.`,
    });
  }
}

/** Torres / andares / perfis / furos — fazenda vertical e microverdes. */
export function requireProjetoComTorres(tipo: string | null) {
  if (tipo !== "fazenda_vertical" && tipo !== "microverdes") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Esta operação só está disponível em projetos com torres (fazenda vertical ou microverdes).",
    });
  }
}

export function requireModulo(
  modulos: Record<ModuloContratavel, boolean> | null | undefined,
  modulo: ModuloContratavel,
) {
  if (!modulos?.[modulo]) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Módulo não contratado neste projeto." });
  }
}

export function torreRefFromArgs(args: Record<string, unknown>, prefix = ""): TorreRefInput {
  const p = prefix ? `${prefix}_` : "";
  const nomeRaw = args[`${p}torre_nome`];
  return {
    fase: String(args[`${p}torre_fase`] ?? args[`${p}fase`] ?? ""),
    numeroTorre: Number(args[`${p}torre_numero`] ?? args[`${p}numero`]),
    nomeParcial: typeof nomeRaw === "string" ? nomeRaw : undefined,
  };
}
