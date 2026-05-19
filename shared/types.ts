/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ============================================================
// Fazendas Up — Tipos Compartilhados (Frontend + Backend)
// ============================================================

export type Fase = 'mudas' | 'vegetativa' | 'maturacao';

export interface FaseConfigData {
  id: number;
  fase: string;
  label: string;
  ecMin: number;
  ecMax: number;
  phMin: number;
  phMax: number;
  cor: string;
  corLight: string;
  icon: string;
}

export interface VariedadeData {
  id: number;
  slug: string;
  nome: string;
  diasMudas: number;
  diasVegetativa: number;
  diasMaturacao: number;
  babyLeaf: boolean;
}

export interface TorreData {
  id: number;
  slug: string;
  nome: string;
  fase: string;
  numAndares: number;
  caixaAguaId: number | null;
}

export interface CaixaAguaData {
  id: number;
  slug: string;
  nome: string;
  fase: string;
}

export interface AndarData {
  id: number;
  torreId: number;
  numero: number;
  dataEntrada: Date | null;
  lavado: boolean;
  dataColheitaTotal: Date | null;
}

export interface PerfilData {
  id: number;
  andarId: number;
  perfilIndex: number;
  variedadeId: number | null;
  ativo: boolean;
}

export interface FuroData {
  id: number;
  andarId: number;
  perfilIndex: number;
  furoIndex: number;
  status: string;
  variedadeId: number | null;
}

export interface MedicaoCaixaData {
  id: number;
  caixaAguaId: number;
  ec: number;
  ph: number;
  dataHora: Date;
}

export interface AplicacaoCaixaData {
  id: number;
  caixaAguaId: number;
  tipo: string;
  produto: string;
  quantidade: string;
  dataHora: Date;
}

export interface AplicacaoAndarData {
  id: number;
  andarId: number;
  tipo: string;
  produto: string;
  quantidade: string;
  dataHora: Date;
}

export interface GerminacaoData {
  id: number;
  variedadeId: number;
  variedadeNome: string;
  quantidade: number;
  dataPlantio: Date;
  dataHora: Date;
  diasParaTransplantio: number;
  germinadas: number;
  naoGerminadas: number;
  transplantadas: number;
  status: string;
  observacoes: string | null;
}

export interface TransplantioData {
  id: number;
  dataHora: Date;
  faseOrigem: string;
  faseDestino: string;
  variedadeId: number;
  variedadeNome: string;
  quantidadeTransplantada: number;
  quantidadeDesperdicio: number;
  motivoDesperdicio: string | null;
  torreDestinoId: number | null;
  andarDestinoId: number | null;
}

export interface ManutencaoData {
  id: number;
  torreId: number;
  andarNumero: number | null;
  tipo: string;
  descricao: string;
  dataAbertura: Date;
  prazo: Date | null;
  dataConclusao: Date | null;
  solucao: string | null;
  status: string;
  lampadaIndex: number | null;
}

export interface CicloData {
  id: number;
  nome: string;
  frequencia: string;
  diasSemana: number[] | null;
  intervaloDias: number | null;
  produto: string;
  tipo: string;
  dosagem: string | null;
  fasesAplicaveis: string[];
  alvo: string;
  ultimaExecucao: Date | null;
  ativo: boolean;
}

export interface FazendaFullData {
  torres: TorreData[];
  caixasAgua: CaixaAguaData[];
  andares: AndarData[];
  perfis: PerfilData[];
  furos: FuroData[];
  medicoesCaixa: MedicaoCaixaData[];
  aplicacoesCaixa: AplicacaoCaixaData[];
  aplicacoesAndar: AplicacaoAndarData[];
  variedades: VariedadeData[];
  fasesConfig: FaseConfigData[];
  germinacao: GerminacaoData[];
  transplantios: TransplantioData[];
  manutencoes: ManutencaoData[];
  ciclos: CicloData[];
}

export const ESTRUTURA_FASE: Record<Fase, { perfis: number; furosPorPerfil: number }> = {
  mudas: { perfis: 12, furosPorPerfil: 0 },
  vegetativa: { perfis: 12, furosPorPerfil: 9 },
  maturacao: { perfis: 6, furosPorPerfil: 6 },
};

/** Patch por fase para torres com grelha física diferente do padrão FV. */
export type TorreEstruturaFasePatch = { perfis: number; furosPorPerfil: number };

/** Ex.: torres 13 e 14 com 12 perfis × 6 furos em vegetativa e maturação. */
export type TorreEstruturaOverride = Partial<Record<Fase, TorreEstruturaFasePatch>>;

/** Preset: 12 perfis × 6 furos nas fases com grelha (veg + mat). */
export const ESTRUTURA_OVERRIDE_FV_12x6: TorreEstruturaOverride = {
  vegetativa: { perfis: 12, furosPorPerfil: 6 },
  maturacao: { perfis: 12, furosPorPerfil: 6 },
};

export function parseTorreEstruturaOverrideJson(raw: string | null | undefined): TorreEstruturaOverride | null {
  if (raw == null || raw === "") return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const out: TorreEstruturaOverride = {};
    for (const f of ["mudas", "vegetativa", "maturacao"] as Fase[]) {
      const p = (o as Record<string, unknown>)[f];
      if (!p || typeof p !== "object") continue;
      const perfis = Number((p as Record<string, unknown>).perfis);
      const furosPorPerfil = Number((p as Record<string, unknown>).furosPorPerfil);
      if (!Number.isFinite(perfis) || !Number.isFinite(furosPorPerfil)) continue;
      if (perfis < 1 || perfis > 64 || furosPorPerfil < 0 || furosPorPerfil > 64) continue;
      out[f] = { perfis: Math.floor(perfis), furosPorPerfil: Math.floor(furosPorPerfil) };
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Compara dois presets (para UI: modelo padrão vs 12×6). */
export function torreEstruturaOverrideIgual(a: TorreEstruturaOverride | null | undefined, b: TorreEstruturaOverride | null | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Máximo de andares físicos por torre em projeto microverdes. */
export const MAX_ANDARES_TORRE_MICROVERDES = 6;

/** Torres microverdes: 4 bandejas por andar (`perfis`). Iluminação: estado no perfil (`cultivoStatus`), sem furos. */
export const ESTRUTURA_FASE_MICROVERDES = {
  mudas: { perfis: 4, furosPorPerfil: 0 },
  vegetativa: { perfis: 4, furosPorPerfil: 0 },
} as const;

export type ProjetoTipoOperacional = "fazenda_vertical" | "hidroponia" | "microverdes";

/** Estrutura de perfis/furos conforme tipo de projeto e fase da torre; `torreOverride` aplica torres com grelha física diferente. */
export function estruturaFaseParaProjeto(
  tipoProjeto: ProjetoTipoOperacional | string | null | undefined,
  fase: Fase,
  torreOverride?: TorreEstruturaOverride | null,
): { perfis: number; furosPorPerfil: number } {
  let base: { perfis: number; furosPorPerfil: number };
  if (tipoProjeto === "microverdes") {
    if (fase === "mudas") {
      base = {
        perfis: ESTRUTURA_FASE_MICROVERDES.mudas.perfis,
        furosPorPerfil: ESTRUTURA_FASE_MICROVERDES.mudas.furosPorPerfil,
      };
    } else {
      base = {
        perfis: ESTRUTURA_FASE_MICROVERDES.vegetativa.perfis,
        furosPorPerfil: ESTRUTURA_FASE_MICROVERDES.vegetativa.furosPorPerfil,
      };
    }
  } else {
    base = ESTRUTURA_FASE[fase];
  }
  if (!torreOverride) return base;
  const patch = torreOverride[fase];
  if (!patch) return base;
  return {
    perfis: patch.perfis ?? base.perfis,
    furosPorPerfil: patch.furosPorPerfil ?? base.furosPorPerfil,
  };
}

export const FASES_CONFIG_DEFAULT: Record<Fase, Omit<FaseConfigData, 'id'>> = {
  mudas: {
    fase: 'mudas', label: 'Mudas', ecMin: 1.0, ecMax: 1.2, phMin: 5.8, phMax: 6.2,
    cor: 'oklch(0.65 0.19 160)', corLight: 'oklch(0.92 0.08 160)', icon: '🌱',
  },
  vegetativa: {
    fase: 'vegetativa', label: 'Vegetativa', ecMin: 1.5, ecMax: 2.0, phMin: 5.5, phMax: 6.5,
    cor: 'oklch(0.60 0.15 158)', corLight: 'oklch(0.93 0.07 158)', icon: '🌿',
  },
  maturacao: {
    fase: 'maturacao', label: 'Maturação', ecMin: 2.0, ecMax: 2.5, phMin: 5.8, phMax: 6.2,
    cor: 'oklch(0.54 0.13 152)', corLight: 'oklch(0.93 0.065 152)', icon: '🥬',
  },
};
