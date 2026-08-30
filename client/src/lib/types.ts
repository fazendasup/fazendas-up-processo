// ============================================================
// Fazendas Up - Modelo de Dados v3
// Mudanças: variedade por perfil, mudas sem furos (perfis abertos),
// colheita só na maturação, removido diasCiclo de FaseConfig
// ============================================================

import { ESTRUTURA_OVERRIDE_FV_12x6, estruturaFaseParaProjeto, type TorreEstruturaOverride } from '@shared/types';

export type Fase = 'mudas' | 'vegetativa' | 'maturacao';

export interface FaseConfig {
  label: string;
  ecMin: number;
  ecMax: number;
  phMin: number;
  phMax: number;
  cor: string;
  corLight: string;
  icon: string;
}

export const FASES_CONFIG: Record<Fase, FaseConfig> = {
  mudas: {
    label: 'Mudas',
    ecMin: 1.0,
    ecMax: 1.2,
    phMin: 5.8,
    phMax: 6.2,
    cor: 'oklch(0.65 0.19 160)',
    corLight: 'oklch(0.92 0.08 160)',
    icon: '🌱',
  },
  vegetativa: {
    label: 'Vegetativa',
    ecMin: 1.5,
    ecMax: 2.0,
    phMin: 5.5,
    phMax: 6.5,
    /** Mesma base verde que mudas; matiz ligeiramente diferente para distinguir fases. */
    cor: 'oklch(0.60 0.15 158)',
    corLight: 'oklch(0.93 0.07 158)',
    icon: '🌿',
  },
  maturacao: {
    label: 'Maturação',
    ecMin: 2.0,
    ecMax: 2.5,
    phMin: 5.8,
    phMax: 6.2,
    cor: 'oklch(0.54 0.13 152)',
    corLight: 'oklch(0.93 0.065 152)',
    icon: '🥬',
  },
};

// ---- Variedades com ciclo por fase ----
export interface VariedadeConfig {
  id: string;
  nome: string;
  diasMudas: number;
  diasVegetativa: number;
  diasMaturacao: number;
  /** Torres 12×6: 2 células/furo em veg/mat. */
  babyLeaf?: boolean;
  /** Id numérico no BD (para escolher receita base em `data.receitas`). */
  variedadeDbId?: number;
}

export const VARIEDADES_PADRAO: VariedadeConfig[] = [
  { id: 'alface-crespa', nome: 'Alface Crespa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
  { id: 'alface-americana', nome: 'Alface Americana', diasMudas: 14, diasVegetativa: 25, diasMaturacao: 35 },
  { id: 'alface-roxa', nome: 'Alface Roxa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
  { id: 'rucula', nome: 'Rúcula', diasMudas: 10, diasVegetativa: 15, diasMaturacao: 20 },
  { id: 'agriao', nome: 'Agrião', diasMudas: 12, diasVegetativa: 18, diasMaturacao: 25 },
  { id: 'espinafre', nome: 'Espinafre', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
  { id: 'couve', nome: 'Couve', diasMudas: 18, diasVegetativa: 28, diasMaturacao: 35 },
  { id: 'manjericao', nome: 'Manjericão', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28, babyLeaf: true },
  {
    id: 'baby-leaf-beterraba',
    nome: 'Baby Leaf / Beterraba',
    diasMudas: 14,
    diasVegetativa: 21,
    diasMaturacao: 28,
    babyLeaf: true,
  },
  { id: 'salsa', nome: 'Salsa', diasMudas: 18, diasVegetativa: 25, diasMaturacao: 30 },
  { id: 'cebolinha', nome: 'Cebolinha', diasMudas: 21, diasVegetativa: 28, diasMaturacao: 35 },
  { id: 'hortela', nome: 'Hortelã', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
  { id: 'coentro', nome: 'Coentro', diasMudas: 10, diasVegetativa: 18, diasMaturacao: 25 },
];

// ---- Configuração de perfis/furos por fase ----
// Mudas: 12 perfis abertos (espuma fenólica), sem furos individuais
// Vegetativa: 12 perfis x 9 furos = 108 plantas por andar
// Maturação: 6 perfis x 6 furos = 36 plantas por andar
export const ESTRUTURA_FASE: Record<Fase, { perfis: number; furosPorPerfil: number }> = {
  mudas: { perfis: 12, furosPorPerfil: 0 },
  vegetativa: { perfis: 12, furosPorPerfil: 9 },
  maturacao: { perfis: 6, furosPorPerfil: 6 },
};

export type FuroStatus = 'vazio' | 'plantado' | 'colhido';

export interface Furo {
  perfilIndex: number; // 0-based
  furoIndex: number;   // 0-based
  status: FuroStatus;
  variedadeId?: string;
  loteId?: number | null;
}

// Perfil com variedade própria (para suportar múltiplas variedades por andar)
export interface PerfilData {
  perfilIndex: number; // 0-based
  loteId?: number | null;
  variedadeId?: string;
  ativo: boolean; // se o perfil está em uso
  dataEntrada?: string | null; // data de entrada individual do perfil
  /** FV mudas: quantidade real colocada neste perfil. Sem valor = fallback operacional legado. */
  quantidadePlantas?: number | null;
  /** Espelho no BD da receita priorizada da variedade (sincronizado ao salvar receita / mudar variedade). */
  receitaId?: number | null;
  /** Microverdes iluminação: cultivo por bandeja (sem furos). */
  cultivoStatus?: 'vazio' | 'plantado' | 'colhido' | null;
}

// ---- Germinação (pré-mudas) ----
export interface LoteGerminacao {
  id: string;
  variedadeId: string;
  variedadeNome: string;
  quantidade: number;
  dataPlantio: string; // ISO
  dataHora: string;    // ISO - data/hora exata do plantio
  diasParaTransplantio: number; // padrão 1 dia (24h) antes de ir para mudas
  germinadas: number;
  naoGerminadas: number;
  transplantadas: number;
  status: 'germinando' | 'pronto' | 'transplantado';
  observacoes?: string;
  executadoPorNome?: string;
  /** `plano` = derivado do plano de plantio (receita); `cadastro` = módulo legado só germinação */
  fonte?: 'plano' | 'cadastro';
}

// ---- Registro de Transplantio ----
export interface RegistroTransplantio {
  id: string;
  dataHora: string;
  faseOrigem: 'germinacao' | Fase;
  faseDestino: Fase;
  variedadeId: string;
  variedadeNome: string;
  quantidadeTransplantada: number;
  quantidadeDesperdicio: number;
  motivoDesperdicio?: string; // 'nao_germinou' | 'morta' | 'doente' | 'outro'
  torreDestinoId?: string;
  andarDestinoId?: string;
  executadoPorNome?: string;
}

// ---- Manutenção ----
export type ManutencaoTipo = string;
export type ManutencaoStatus = 'aberta' | 'em_andamento' | 'concluida';

export interface Manutencao {
  id: string;
  /** Slug da torre (fazenda vertical / microverdes). Vazio quando a manutenção é de bancada. */
  torreId: string;
  /** Id numérico da bancada (hidroponia de bancada). Indefinido quando a manutenção é de torre. */
  bancadaId?: number;
  andarNumero?: number;
  tipo: ManutencaoTipo;
  descricao: string;
  dataAbertura: string;
  prazo?: string;
  dataConclusao?: string;
  solucao?: string;
  status: ManutencaoStatus;
  lampadaIndex?: number; // 0-4 para lâmpadas (5 por andar)
  abertoPorNome?: string;
  concluidoPorNome?: string;
}

/** Tipos de manutenção de fazenda vertical / microverdes (estrutura de torres e iluminação). */
export const MANUTENCAO_TIPOS = [
  { value: 'vazamento_injetor', label: 'Vazamento Tubo Injetor' },
  { value: 'vazamento_coletor', label: 'Vazamento Tubo Coletor' },
  { value: 'lampada_queimada', label: 'Lâmpada Queimada' },
  { value: 'outro', label: 'Outro' },
] as const;

/** Tipos de manutenção de hidroponia de bancada (bombas, solução nutritiva, sensores etc.). */
export const MANUTENCAO_TIPOS_HIDROPONIA = [
  { value: 'bomba', label: 'Bomba / recalque' },
  { value: 'vazamento', label: 'Vazamento / encanamento' },
  { value: 'sensor_ecph', label: 'Sensor de EC/pH' },
  { value: 'aeracao', label: 'Aeração / oxigenação' },
  { value: 'reservatorio', label: "Reservatório / caixa d'água" },
  { value: 'eletrica', label: 'Elétrica / energia' },
  { value: 'limpeza', label: 'Limpeza / higienização' },
  { value: 'solucao_nutritiva', label: 'Solução nutritiva' },
  { value: 'estrutura_bancada', label: 'Estrutura da bancada' },
  { value: 'outro', label: 'Outro' },
] as const;

/** Resolve o rótulo de um tipo de manutenção em qualquer um dos catálogos (torre ou bancada). */
export function labelTipoManutencao(tipo: string): string {
  const todos = [...MANUTENCAO_TIPOS, ...MANUTENCAO_TIPOS_HIDROPONIA];
  return todos.find((t) => t.value === tipo)?.label || tipo;
}

// ---- Torres ----
export interface Torre {
  id: string;
  nome: string;
  fase: Fase;
  andares?: number;
  numAndares?: number;
  /** Número operacional fixo por projeto (único); ordenação do dashboard e relatórios — não depende do nome. */
  numeroTorre: number;
  /** Override da grelha física (ex.: 12×6 em veg/mat). */
  estruturaOverride?: TorreEstruturaOverride | null;
  caixaAguaId?: string;
  ativa?: boolean;
}

/** Dashboard lista só torres ativas; MySQL pode devolver 0/1 em `ativa`. */
export function torreEstaAtivaNoDashboard(t: { ativa?: boolean | number | null }): boolean {
  if (t.ativa === false || t.ativa === 0) return false;
  return true;
}

// ---- Caixas d'Água ----
export interface CaixaAgua {
  id: string;
  nome: string;
  fase: Fase;
  torreIds: string[];
  medicoes: MedicaoCaixa[];
  aplicacoes: AplicacaoCaixa[];
}

export interface MedicaoCaixa {
  id: string;
  ec: number;
  ph: number;
  /** Temperatura da água (°C). */
  temperaturaAgua?: number;
  dataHora: string;
  executadoPorNome?: string;
}

export interface AplicacaoCaixa {
  id: string;
  tipo: 'sanitizante' | 'corretor_ph' | 'nutriente' | 'outro';
  produto: string;
  quantidade: string;
  dataHora: string;
  executadoPorNome?: string;
}

// ---- Andares ----
export interface Andar {
  id: string;
  torreId: string;
  numero: number;
  variedades: string[]; // nomes (legacy, mantido para compatibilidade)
  variedadeIds: string[]; // IDs das variedades
  dataEntrada: string | null;
  aplicacoes: AplicacaoAndar[];
  // Sistema de perfis/furos 6x6 (vegetativa/maturação)
  furos: Furo[];
  // Dados por perfil (variedade por perfil)
  perfis: PerfilData[];
  // Pós-colheita
  lavado: boolean;
  dataColheitaTotal?: string;
}

export interface AplicacaoAndar {
  id: string;
  tipo: 'nutriente' | 'pesticida' | 'fertilizante' | 'outro';
  produto: string;
  quantidade: string;
  dataHora: string;
  executadoPorNome?: string;
}

// ---- Ciclos ----
export interface CicloAplicacao {
  id: string;
  nome: string;
  frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'personalizada';
  diasSemana?: number[];
  intervaloDias?: number;
  produto: string;
  tipo: string;
  dosagem?: string;
  fasesAplicaveis: Fase[];
  alvo: 'caixa' | 'andar' | 'ambos';
  /** Data de início do agendamento (YYYY-MM-DD ou ISO). */
  dataInicio?: string;
  ultimaExecucao?: string;
  ultimoExecutorNome?: string;
  ativo: boolean;
}

/** Receitas de crescimento tal como vêm do servidor (`receitas_crescimento`) — fonte de verdade dos dias por fase. */
export interface ReceitaCrescimentoResumo {
  id: number;
  nome: string;
  variedadeId: number;
  diasGerminacao: number;
  diasMudas: number;
  diasVegetativa: number;
  diasMaturacao: number;
  ativa: boolean;
  updatedAt: string | null;
}

export interface EstoqueBackupItem {
  id: number;
  categoria: string;
  nome: string;
  quantidadeTotal: number;
  unidadeTipo: string;
  usoPorEvento: number;
  frequenciaDias: number;
  prazoEntregaDias: number;
  diasMargemCompra: number;
  nivelMinimo: number | null;
  precoUnitario: number | null;
  fornecedor: string | null;
  observacoes: string | null;
  consumoAplicadoAte: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ---- Dados da Fazenda ----
export interface FazendaData {
  /** Tipo do projeto ativo (vem do servidor em `fazenda.loadAll`). */
  projetoTipo?: string | null;
  torres: Torre[];
  caixasAgua: CaixaAgua[];
  andares: Andar[];
  ciclos: CicloAplicacao[];
  fasesConfig: Record<Fase, FaseConfig>;
  variedades: VariedadeConfig[];
  /** Catálogo real do projeto (BD); `variedades[].dias*` vêm da receita base fundida no servidor. */
  receitas: ReceitaCrescimentoResumo[];
  /** Slug da variedade → id numérico no BD (sempre que existir em `raw.variedades`); prazos não dependem só de bater linha em `variedades[]`). */
  variedadeDbIdBySlug: Record<string, number>;
  germinacao: LoteGerminacao[];
  transplantios: RegistroTransplantio[];
  manutencoes: Manutencao[];
  estoqueItens: EstoqueBackupItem[];
}

// ---- Gerar perfis iniciais por fase ----
export function gerarPerfisIniciais(fase: Fase = 'maturacao', projetoTipo?: string | null): PerfilData[] {
  const numPerfis = estruturaFaseParaProjeto(projetoTipo, fase).perfis;
  return Array.from({ length: numPerfis }, (_, i) => ({
    perfilIndex: i,
    ativo: false,
    ...(projetoTipo === 'microverdes' && fase !== 'mudas' ? { cultivoStatus: 'vazio' as const } : {}),
  }));
}

// ---- Gerar furos iniciais por fase ----
export function gerarFurosIniciais(fase: Fase = 'maturacao', projetoTipo?: string | null): Furo[] {
  const { perfis, furosPorPerfil } = estruturaFaseParaProjeto(projetoTipo, fase);
  if (furosPorPerfil === 0) return []; // mudas não tem furos
  const furos: Furo[] = [];
  for (let p = 0; p < perfis; p++) {
    for (let f = 0; f < furosPorPerfil; f++) {
      furos.push({ perfilIndex: p, furoIndex: f, status: 'vazio' });
    }
  }
  return furos;
}

// ---- Gerar dados iniciais da fazenda ----
export function gerarDadosIniciais(): FazendaData {
  const torres: Torre[] = [];
  const caixasAgua: CaixaAgua[] = [];
  const andares: Andar[] = [];

  // 1 Torre de Mudas: 12 andares + 1 caixa d'água dedicada
  const caixaMudas: CaixaAgua = {
    id: 'ca-mudas-1',
    nome: 'Caixa Mudas',
    fase: 'mudas',
    torreIds: ['t-mudas-1'],
    medicoes: [],
    aplicacoes: [],
  };
  caixasAgua.push(caixaMudas);

  torres.push({
    id: 't-mudas-1',
    nome: 'Torre Mudas 1',
    fase: 'mudas',
    andares: 12,
    numeroTorre: 1,
    caixaAguaId: 'ca-mudas-1',
  });

  for (let a = 1; a <= 12; a++) {
    andares.push({
      id: `a-mudas-1-${a}`,
      torreId: 't-mudas-1',
      numero: a,
      variedades: [],
      variedadeIds: [],
      dataEntrada: null,
      aplicacoes: [],
      furos: gerarFurosIniciais('mudas'),
      perfis: gerarPerfisIniciais('mudas'),
      lavado: true,
    });
  }

  // 3 Torres Vegetativas: 12 andares + 1 caixa d'água dedicada cada
  for (let t = 1; t <= 3; t++) {
    const caixaId = `ca-veg-${t}`;
    const torreId = `t-veg-${t}`;

    caixasAgua.push({
      id: caixaId,
      nome: `Caixa Vegetativa ${t}`,
      fase: 'vegetativa',
      torreIds: [torreId],
      medicoes: [],
      aplicacoes: [],
    });

    torres.push({
      id: torreId,
      nome: `Torre Vegetativa ${t}`,
      fase: 'vegetativa',
      andares: 12,
      numeroTorre: 1 + t,
      caixaAguaId: caixaId,
    });

    for (let a = 1; a <= 12; a++) {
      andares.push({
        id: `a-veg-${t}-${a}`,
        torreId,
        numero: a,
        variedades: [],
        variedadeIds: [],
        dataEntrada: null,
        aplicacoes: [],
        furos: gerarFurosIniciais('vegetativa'),
        perfis: gerarPerfisIniciais('vegetativa'),
        lavado: true,
      });
    }
  }

  // 10 Torres de Maturação: 9 andares + 1 caixa compartilhada a cada 2 torres
  for (let t = 1; t <= 10; t++) {
    const caixaIndex = Math.ceil(t / 2);
    const caixaId = `ca-mat-${caixaIndex}`;
    const torreId = `t-mat-${t}`;

    if (t % 2 === 1) {
      const torreParId = `t-mat-${t + 1}`;
      caixasAgua.push({
        id: caixaId,
        nome: `Caixa Maturação ${caixaIndex}`,
        fase: 'maturacao',
        torreIds: [torreId, torreParId],
        medicoes: [],
        aplicacoes: [],
      });
    }

    torres.push({
      id: torreId,
      nome: `Torre Maturação ${t}`,
      fase: 'maturacao',
      andares: 9,
      numeroTorre: 4 + t,
      ...(t >= 9 ? { estruturaOverride: ESTRUTURA_OVERRIDE_FV_12x6 } : {}),
      caixaAguaId: caixaId,
    });

    for (let a = 1; a <= 9; a++) {
      andares.push({
        id: `a-mat-${t}-${a}`,
        torreId,
        numero: a,
        variedades: [],
        variedadeIds: [],
        dataEntrada: null,
        aplicacoes: [],
        furos: gerarFurosIniciais('maturacao'),
        perfis: gerarPerfisIniciais('maturacao'),
        lavado: true,
      });
    }
  }

  return {
    torres,
    caixasAgua,
    andares,
    ciclos: [],
    fasesConfig: { ...FASES_CONFIG },
    variedades: [...VARIEDADES_PADRAO],
    receitas: [],
    variedadeDbIdBySlug: {},
    germinacao: [],
    transplantios: [],
    manutencoes: [],
    estoqueItens: [],
  };
}
