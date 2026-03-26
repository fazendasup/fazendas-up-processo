// ============================================================
// Fazendas Up - Modelo de Dados v3
// Mudanças: variedade por perfil, mudas sem furos (perfis abertos),
// colheita só na maturação, removido diasCiclo de FaseConfig
// ============================================================

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
    cor: 'oklch(0.55 0.14 220)',
    corLight: 'oklch(0.92 0.06 220)',
    icon: '🌿',
  },
  maturacao: {
    label: 'Maturação',
    ecMin: 2.0,
    ecMax: 2.5,
    phMin: 5.8,
    phMax: 6.2,
    cor: 'oklch(0.62 0.18 50)',
    corLight: 'oklch(0.93 0.06 50)',
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
}

export const VARIEDADES_PADRAO: VariedadeConfig[] = [
  { id: 'alface-crespa', nome: 'Alface Crespa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
  { id: 'alface-americana', nome: 'Alface Americana', diasMudas: 14, diasVegetativa: 25, diasMaturacao: 35 },
  { id: 'alface-roxa', nome: 'Alface Roxa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
  { id: 'rucula', nome: 'Rúcula', diasMudas: 10, diasVegetativa: 15, diasMaturacao: 20 },
  { id: 'agriao', nome: 'Agrião', diasMudas: 12, diasVegetativa: 18, diasMaturacao: 25 },
  { id: 'espinafre', nome: 'Espinafre', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
  { id: 'couve', nome: 'Couve', diasMudas: 18, diasVegetativa: 28, diasMaturacao: 35 },
  { id: 'manjericao', nome: 'Manjericão', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
  { id: 'salsa', nome: 'Salsa', diasMudas: 18, diasVegetativa: 25, diasMaturacao: 30 },
  { id: 'cebolinha', nome: 'Cebolinha', diasMudas: 21, diasVegetativa: 28, diasMaturacao: 35 },
  { id: 'hortela', nome: 'Hortelã', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
  { id: 'coentro', nome: 'Coentro', diasMudas: 10, diasVegetativa: 18, diasMaturacao: 25 },
];

// ---- Perfis e Furos ----
// Mudas: perfis abertos (espuma fenólica), sem furos individuais
// Vegetativa/Maturação: 6 perfis x 6 furos = 36 plantas por andar
export type FuroStatus = 'vazio' | 'plantado' | 'colhido';

export interface Furo {
  perfilIndex: number; // 0-5
  furoIndex: number;   // 0-5
  status: FuroStatus;
  variedadeId?: string;
}

// Perfil com variedade própria (para suportar múltiplas variedades por andar)
export interface PerfilData {
  perfilIndex: number; // 0-5
  variedadeId?: string;
  ativo: boolean; // se o perfil está em uso
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
}

// ---- Manutenção ----
export type ManutencaoTipo = 'vazamento_injetor' | 'vazamento_coletor' | 'lampada_queimada' | 'outro';
export type ManutencaoStatus = 'aberta' | 'em_andamento' | 'concluida';

export interface Manutencao {
  id: string;
  torreId: string;
  andarNumero?: number;
  tipo: ManutencaoTipo;
  descricao: string;
  dataAbertura: string;
  prazo?: string;
  dataConclusao?: string;
  solucao?: string;
  status: ManutencaoStatus;
  lampadaIndex?: number; // 0-4 para lâmpadas (5 por andar)
}

export const MANUTENCAO_TIPOS = [
  { value: 'vazamento_injetor', label: 'Vazamento Tubo Injetor' },
  { value: 'vazamento_coletor', label: 'Vazamento Tubo Coletor' },
  { value: 'lampada_queimada', label: 'Lâmpada Queimada' },
  { value: 'outro', label: 'Outro' },
] as const;

// ---- Torres ----
export interface Torre {
  id: string;
  nome: string;
  fase: Fase;
  andares: number;
  caixaAguaId: string;
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
  dataHora: string;
}

export interface AplicacaoCaixa {
  id: string;
  tipo: 'sanitizante' | 'corretor_ph' | 'nutriente' | 'outro';
  produto: string;
  quantidade: string;
  dataHora: string;
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
  fasesAplicaveis: Fase[];
  alvo: 'caixa' | 'andar' | 'ambos';
  ultimaExecucao?: string;
  ativo: boolean;
}

// ---- Dados da Fazenda ----
export interface FazendaData {
  torres: Torre[];
  caixasAgua: CaixaAgua[];
  andares: Andar[];
  ciclos: CicloAplicacao[];
  fasesConfig: Record<Fase, FaseConfig>;
  variedades: VariedadeConfig[];
  germinacao: LoteGerminacao[];
  transplantios: RegistroTransplantio[];
  manutencoes: Manutencao[];
}

// ---- Gerar perfis iniciais ----
export function gerarPerfisIniciais(): PerfilData[] {
  return Array.from({ length: 6 }, (_, i) => ({
    perfilIndex: i,
    ativo: false,
  }));
}

// ---- Gerar furos iniciais para um andar (6 perfis x 6 furos) ----
export function gerarFurosIniciais(): Furo[] {
  const furos: Furo[] = [];
  for (let p = 0; p < 6; p++) {
    for (let f = 0; f < 6; f++) {
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
      furos: gerarFurosIniciais(),
      perfis: gerarPerfisIniciais(),
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
        furos: gerarFurosIniciais(),
        perfis: gerarPerfisIniciais(),
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
        furos: gerarFurosIniciais(),
        perfis: gerarPerfisIniciais(),
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
    germinacao: [],
    transplantios: [],
    manutencoes: [],
  };
}
