// ============================================================
// Utilitários de cálculo para Fazendas Up
// Design: Agronomic Dashboard
// ============================================================

import type { Fase, FaseConfig, CicloAplicacao, CaixaAgua, Torre, Andar, FazendaData } from './types';
import { FASES_CONFIG } from './types';

/** Calcula dias decorridos desde uma data */
export function diasDecorridos(dataEntrada: string | null): number {
  if (!dataEntrada) return 0;
  const entrada = new Date(dataEntrada);
  const hoje = new Date();
  const diff = hoje.getTime() - entrada.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Calcula data prevista (transplante ou colheita) */
export function dataPrevista(dataEntrada: string | null, fase: Fase): string | null {
  if (!dataEntrada) return null;
  const config = FASES_CONFIG[fase];
  const entrada = new Date(dataEntrada);
  const prevista = new Date(entrada.getTime() + config.diasCiclo * 24 * 60 * 60 * 1000);
  return prevista.toISOString();
}

/** Retorna label da previsão baseado na fase */
export function labelPrevisao(fase: Fase): string {
  if (fase === 'maturacao') return 'Colheita';
  return 'Transplante';
}

/** Dias restantes até a previsão */
export function diasRestantes(dataEntrada: string | null, fase: Fase): number | null {
  if (!dataEntrada) return null;
  const prev = dataPrevista(dataEntrada, fase);
  if (!prev) return null;
  const hoje = new Date();
  const prevDate = new Date(prev);
  return Math.ceil((prevDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/** Verifica se EC está fora do range */
export function ecForaRange(ec: number, fase: Fase): 'baixo' | 'alto' | 'ok' {
  const config = FASES_CONFIG[fase];
  if (ec < config.ecMin) return 'baixo';
  if (ec > config.ecMax) return 'alto';
  return 'ok';
}

/** Verifica se pH está fora do range */
export function phForaRange(ph: number, fase: Fase): 'baixo' | 'alto' | 'ok' {
  const config = FASES_CONFIG[fase];
  if (ph < config.phMin) return 'baixo';
  if (ph > config.phMax) return 'alto';
  return 'ok';
}

/** Verifica se um ciclo está pendente hoje */
export function cicloPendenteHoje(ciclo: CicloAplicacao): boolean {
  if (!ciclo.ativo) return false;
  const hoje = new Date();
  const hojeDia = hoje.getDay();

  if (ciclo.frequencia === 'diaria') return true;

  if (ciclo.frequencia === 'semanal' && ciclo.diasSemana) {
    return ciclo.diasSemana.includes(hojeDia);
  }

  if (ciclo.frequencia === 'quinzenal' || ciclo.frequencia === 'mensal' || ciclo.frequencia === 'personalizada') {
    if (!ciclo.ultimaExecucao) return true;
    const ultima = new Date(ciclo.ultimaExecucao);
    const diffDias = Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
    const intervalo = ciclo.intervaloDias || (ciclo.frequencia === 'quinzenal' ? 14 : 30);
    return diffDias >= intervalo;
  }

  return false;
}

/** Conta ciclos pendentes para uma fase */
export function contarCiclosPendentes(ciclos: CicloAplicacao[], fase: Fase): number {
  return ciclos.filter(
    (c) => c.fasesAplicaveis.includes(fase) && cicloPendenteHoje(c)
  ).length;
}

/** Conta alertas de uma torre (andares com previsão vencida + ciclos pendentes) */
export function contarAlertasTorre(
  torre: Torre,
  andares: Andar[],
  ciclos: CicloAplicacao[]
): number {
  let alertas = 0;

  // Andares com previsão vencida
  const andaresTorre = andares.filter((a) => a.torreId === torre.id);
  andaresTorre.forEach((andar) => {
    if (andar.dataEntrada) {
      const restantes = diasRestantes(andar.dataEntrada, torre.fase);
      if (restantes !== null && restantes <= 0) alertas++;
    }
  });

  // Ciclos pendentes
  alertas += contarCiclosPendentes(ciclos, torre.fase);

  return alertas;
}

/** Formata data para exibição pt-BR */
export function formatarData(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formata data e hora para exibição pt-BR */
export function formatarDataHora(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Gera ID único simples */
export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** Resumo geral da fazenda */
export function resumoFazenda(data: FazendaData) {
  const totalTorres = data.torres.length;
  const totalAndares = data.andares.length;
  const andaresOcupados = data.andares.filter((a) => a.dataEntrada).length;
  const ciclosPendentes = data.ciclos.filter((c) => cicloPendenteHoje(c)).length;

  // Última medição global
  let ultimaMedicao: string | null = null;
  data.caixasAgua.forEach((ca) => {
    ca.medicoes.forEach((m) => {
      if (!ultimaMedicao || m.dataHora > ultimaMedicao) {
        ultimaMedicao = m.dataHora;
      }
    });
  });

  // Andares com previsão vencida
  let previsaoVencida = 0;
  data.andares.forEach((andar) => {
    if (andar.dataEntrada) {
      const torre = data.torres.find((t) => t.id === andar.torreId);
      if (torre) {
        const rest = diasRestantes(andar.dataEntrada, torre.fase);
        if (rest !== null && rest <= 0) previsaoVencida++;
      }
    }
  });

  return {
    totalTorres,
    totalAndares,
    andaresOcupados,
    ciclosPendentes,
    ultimaMedicao,
    previsaoVencida,
  };
}

/** Labels para tipos de aplicação */
export const TIPOS_APLICACAO_CAIXA = [
  { value: 'sanitizante', label: 'Sanitizante' },
  { value: 'corretor_ph', label: 'Corretor de pH' },
  { value: 'nutriente', label: 'Nutriente' },
  { value: 'outro', label: 'Outro' },
] as const;

export const TIPOS_APLICACAO_ANDAR = [
  { value: 'nutriente', label: 'Nutriente' },
  { value: 'pesticida', label: 'Pesticida' },
  { value: 'fertilizante', label: 'Fertilizante' },
  { value: 'outro', label: 'Outro' },
] as const;

export const VARIEDADES_COMUNS = [
  'Alface Crespa',
  'Alface Americana',
  'Alface Roxa',
  'Rúcula',
  'Agrião',
  'Espinafre',
  'Couve',
  'Manjericão',
  'Salsa',
  'Cebolinha',
  'Hortelã',
  'Coentro',
];

export const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];
