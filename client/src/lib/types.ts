// ============================================================
// Fazendas Up - Modelo de Dados
// Design: Agronomic Dashboard
// Todas as entidades persistidas via LocalStorage
// ============================================================

export type Fase = 'mudas' | 'vegetativa' | 'maturacao';

export interface FaseConfig {
  label: string;
  ecMin: number;
  ecMax: number;
  phMin: number;
  phMax: number;
  diasCiclo: number; // dias até transplante/colheita
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
    diasCiclo: 21,
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
    diasCiclo: 28,
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
    diasCiclo: 35,
    cor: 'oklch(0.62 0.18 50)',
    corLight: 'oklch(0.93 0.06 50)',
    icon: '🥬',
  },
};

export interface Torre {
  id: string;
  nome: string;
  fase: Fase;
  andares: number;
  caixaAguaId: string; // referência à caixa d'água
}

export interface CaixaAgua {
  id: string;
  nome: string;
  fase: Fase;
  torreIds: string[]; // torres atendidas
  medicoes: MedicaoCaixa[];
  aplicacoes: AplicacaoCaixa[];
}

export interface MedicaoCaixa {
  id: string;
  ec: number;
  ph: number;
  dataHora: string; // ISO string
}

export interface AplicacaoCaixa {
  id: string;
  tipo: 'sanitizante' | 'corretor_ph' | 'nutriente' | 'outro';
  produto: string;
  quantidade: string;
  dataHora: string;
}

export interface Andar {
  id: string;
  torreId: string;
  numero: number;
  variedades: string[];
  dataEntrada: string | null; // ISO string
  aplicacoes: AplicacaoAndar[];
}

export interface AplicacaoAndar {
  id: string;
  tipo: 'nutriente' | 'pesticida' | 'fertilizante' | 'outro';
  produto: string;
  quantidade: string;
  dataHora: string;
}

export interface CicloAplicacao {
  id: string;
  nome: string;
  frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'personalizada';
  diasSemana?: number[]; // 0=dom, 1=seg, ...
  intervaloDias?: number;
  produto: string;
  tipo: string;
  fasesAplicaveis: Fase[];
  alvo: 'caixa' | 'andar' | 'ambos';
  ultimaExecucao?: string; // ISO string
  ativo: boolean;
}

// Estrutura da fazenda conforme especificação
export interface FazendaData {
  torres: Torre[];
  caixasAgua: CaixaAgua[];
  andares: Andar[];
  ciclos: CicloAplicacao[];
  fasesConfig: Record<Fase, FaseConfig>;
}

// Gerar dados iniciais da fazenda
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
      dataEntrada: null,
      aplicacoes: [],
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
        dataEntrada: null,
        aplicacoes: [],
      });
    }
  }

  // 10 Torres de Maturação: 9 andares + 1 caixa compartilhada a cada 2 torres
  for (let t = 1; t <= 10; t++) {
    const caixaIndex = Math.ceil(t / 2);
    const caixaId = `ca-mat-${caixaIndex}`;
    const torreId = `t-mat-${t}`;

    // Criar caixa apenas para torres ímpares (1,3,5,7,9)
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
        dataEntrada: null,
        aplicacoes: [],
      });
    }
  }

  return {
    torres,
    caixasAgua,
    andares,
    ciclos: [],
    fasesConfig: { ...FASES_CONFIG },
  };
}
