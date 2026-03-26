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

export const FASES_CONFIG_DEFAULT: Record<Fase, Omit<FaseConfigData, 'id'>> = {
  mudas: {
    fase: 'mudas', label: 'Mudas', ecMin: 1.0, ecMax: 1.2, phMin: 5.8, phMax: 6.2,
    cor: 'oklch(0.65 0.19 160)', corLight: 'oklch(0.92 0.08 160)', icon: '🌱',
  },
  vegetativa: {
    fase: 'vegetativa', label: 'Vegetativa', ecMin: 1.5, ecMax: 2.0, phMin: 5.5, phMax: 6.5,
    cor: 'oklch(0.55 0.14 220)', corLight: 'oklch(0.92 0.06 220)', icon: '🌿',
  },
  maturacao: {
    fase: 'maturacao', label: 'Maturação', ecMin: 2.0, ecMax: 2.5, phMin: 5.8, phMax: 6.2,
    cor: 'oklch(0.62 0.18 50)', corLight: 'oklch(0.93 0.06 50)', icon: '🥬',
  },
};
