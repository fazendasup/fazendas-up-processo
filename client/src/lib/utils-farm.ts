// ============================================================
// Utilitários de cálculo para Fazendas Up v3
// Mudanças: ciclo apenas por variedade, contagem de plantas
// adaptada para mudas (perfis abertos) vs vegetativa/maturação (furos)
// ============================================================

import type { Fase, FaseConfig, CicloAplicacao, Torre, Andar, FazendaData, VariedadeConfig, Manutencao } from './types';
import { FASES_CONFIG } from './types';

// ---- Dias de ciclo por variedade ----

/** Retorna dias de ciclo para uma variedade em uma fase. Retorna 0 se não encontrar. */
export function diasCicloVariedade(
  variedadeId: string | undefined,
  fase: Fase,
  variedades: VariedadeConfig[],
): number {
  if (variedadeId) {
    const v = variedades.find((vr) => vr.id === variedadeId);
    if (v) {
      if (fase === 'mudas') return v.diasMudas;
      if (fase === 'vegetativa') return v.diasVegetativa;
      return v.diasMaturacao;
    }
  }
  return 0; // sem variedade definida, sem previsão
}

/** Calcula dias decorridos desde uma data */
export function diasDecorridos(dataEntrada: string | null): number {
  if (!dataEntrada) return 0;
  const entrada = new Date(dataEntrada);
  const hoje = new Date();
  const diff = hoje.getTime() - entrada.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Calcula data prevista usando ciclo por variedade */
export function dataPrevista(
  dataEntrada: string | null,
  fase: Fase,
  variedadeId?: string,
  variedades?: VariedadeConfig[],
): string | null {
  if (!dataEntrada) return null;
  const dias = diasCicloVariedade(variedadeId, fase, variedades || []);
  if (dias <= 0) return null; // sem variedade = sem previsão
  const entrada = new Date(dataEntrada);
  const prevista = new Date(entrada.getTime() + dias * 24 * 60 * 60 * 1000);
  return prevista.toISOString();
}

/** Retorna label da previsão baseado na fase */
export function labelPrevisao(fase: Fase): string {
  if (fase === 'maturacao') return 'Colheita';
  return 'Transplante';
}

/** Dias restantes até a previsão */
export function diasRestantes(
  dataEntrada: string | null,
  fase: Fase,
  variedadeId?: string,
  variedades?: VariedadeConfig[],
): number | null {
  if (!dataEntrada) return null;
  const prev = dataPrevista(dataEntrada, fase, variedadeId, variedades);
  if (!prev) return null;
  const hoje = new Date();
  const prevDate = new Date(prev);
  return Math.ceil((prevDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/** Verifica se EC está fora do range */
export function ecForaRange(ec: number, fase: Fase, fasesConfig?: Record<Fase, FaseConfig>): 'baixo' | 'alto' | 'ok' {
  const config = fasesConfig?.[fase] || FASES_CONFIG[fase];
  if (ec < config.ecMin) return 'baixo';
  if (ec > config.ecMax) return 'alto';
  return 'ok';
}

/** Verifica se pH está fora do range */
export function phForaRange(ph: number, fase: Fase, fasesConfig?: Record<Fase, FaseConfig>): 'baixo' | 'alto' | 'ok' {
  const config = fasesConfig?.[fase] || FASES_CONFIG[fase];
  if (ph < config.phMin) return 'baixo';
  if (ph > config.phMax) return 'alto';
  return 'ok';
}

// ---- Ciclos (com fix: verificar se já executou HOJE) ----

/** Verifica se um ciclo está pendente hoje */
export function cicloPendenteHoje(ciclo: CicloAplicacao): boolean {
  if (!ciclo.ativo) return false;
  const hoje = new Date();
  const hojeDia = hoje.getDay();

  // Verificar se já foi executado hoje
  if (ciclo.ultimaExecucao) {
    const ultima = new Date(ciclo.ultimaExecucao);
    const mesmodia =
      ultima.getFullYear() === hoje.getFullYear() &&
      ultima.getMonth() === hoje.getMonth() &&
      ultima.getDate() === hoje.getDate();
    if (mesmodia) return false;
  }

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

// ---- Contagem de plantas ----

/** Conta plantas ativas em um andar (status 'plantado') */
export function contarPlantasAndar(andar: Andar, fase?: Fase): number {
  // Para mudas: contar perfis ativos
  if (fase === 'mudas') {
    return (andar.perfis || []).filter((p) => p.ativo).length;
  }
  // Para vegetativa/maturação: contar furos plantados
  if (!andar.furos) return 0;
  return andar.furos.filter((f) => f.status === 'plantado').length;
}

/** Conta plantas colhidas em um andar (só faz sentido na maturação) */
export function contarColhidasAndar(andar: Andar): number {
  if (!andar.furos) return 0;
  return andar.furos.filter((f) => f.status === 'colhido').length;
}

/** Conta furos vazios em um andar */
export function contarVaziosAndar(andar: Andar, fase?: Fase): number {
  if (fase === 'mudas') {
    return 6 - (andar.perfis || []).filter((p) => p.ativo).length;
  }
  if (!andar.furos) return 36;
  return andar.furos.filter((f) => f.status === 'vazio').length;
}

/** Verifica se andar precisa de lavagem pós-colheita */
export function andarPrecisaLavagem(andar: Andar): boolean {
  if (!andar.dataColheitaTotal) return false;
  return !andar.lavado;
}

/** Obtém a variedade principal de um perfil */
export function variedadePerfil(andar: Andar, perfilIndex: number): string | undefined {
  const perfil = (andar.perfis || []).find((p) => p.perfilIndex === perfilIndex);
  return perfil?.variedadeId;
}

/** Obtém a variedade principal do andar (a mais comum entre os perfis) */
export function variedadePrincipalAndar(andar: Andar): string | undefined {
  const perfis = andar.perfis || [];
  const ativos = perfis.filter((p) => p.ativo && p.variedadeId);
  if (ativos.length === 0) return andar.variedadeIds?.[0];
  // Retorna a mais frequente
  const counts: Record<string, number> = {};
  ativos.forEach((p) => {
    if (p.variedadeId) counts[p.variedadeId] = (counts[p.variedadeId] || 0) + 1;
  });
  let maxId = ativos[0].variedadeId;
  let maxCount = 0;
  Object.entries(counts).forEach(([id, count]) => {
    if (count > maxCount) { maxId = id; maxCount = count; }
  });
  return maxId;
}

/** Conta alertas de uma torre */
export function contarAlertasTorre(
  torre: Torre,
  andares: Andar[],
  ciclos: CicloAplicacao[],
  variedades?: VariedadeConfig[],
  _fasesConfig?: Record<Fase, FaseConfig>,
  manutencoes?: Manutencao[]
): number {
  let alertas = 0;
  const andaresTorre = andares.filter((a) => a.torreId === torre.id);

  andaresTorre.forEach((andar) => {
    if (andar.dataEntrada) {
      const varId = variedadePrincipalAndar(andar);
      const restantes = diasRestantes(andar.dataEntrada, torre.fase, varId, variedades);
      if (restantes !== null && restantes <= 0) alertas++;
    }
    if (andarPrecisaLavagem(andar)) alertas++;
  });

  alertas += contarCiclosPendentes(ciclos, torre.fase);

  if (manutencoes) {
    alertas += manutencoes.filter(
      (m) => m.torreId === torre.id && m.status !== 'concluida'
    ).length;
  }

  return alertas;
}

// ---- KPIs ----

export interface FazendaKPIs {
  totalPlantas: number;
  plantasEmProcesso: number;
  plantasProntasColheita: number;
  plantasColhidas: number;
  taxaOcupacao: number;
  taxaGerminacao: number;
  totalDesperdicio: number;
  taxaDesperdicio: number;
  totalGerminando: number;
  totalTransplantios: number;
  manutencoesAbertas: number;
  manutencoesVencidas: number;
  andaresLavagemPendente: number;
}

export function calcularKPIs(data: FazendaData): FazendaKPIs {
  let totalPlantas = 0;
  let plantasEmProcesso = 0;
  let plantasProntasColheita = 0;
  let plantasColhidas = 0;
  let andaresLavagemPendente = 0;

  data.andares.forEach((andar) => {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) return;

    const plantadas = contarPlantasAndar(andar, torre.fase);
    totalPlantas += plantadas;

    // Colhidas só na maturação
    if (torre.fase === 'maturacao') {
      const colhidas = contarColhidasAndar(andar);
      plantasColhidas += colhidas;

      if (andar.dataEntrada) {
        const varId = variedadePrincipalAndar(andar);
        const rest = diasRestantes(andar.dataEntrada, torre.fase, varId, data.variedades);
        if (rest !== null && rest <= 0) {
          plantasProntasColheita += plantadas;
        } else {
          plantasEmProcesso += plantadas;
        }
      } else {
        plantasEmProcesso += plantadas;
      }
    } else {
      plantasEmProcesso += plantadas;
    }

    if (andarPrecisaLavagem(andar)) andaresLavagemPendente++;
  });

  // Capacidade: mudas=6 perfis/andar, vegetativa/maturação=36 furos/andar
  let capacidadeTotal = 0;
  data.andares.forEach((andar) => {
    const torre = data.torres.find((t) => t.id === andar.torreId);
    if (!torre) return;
    capacidadeTotal += torre.fase === 'mudas' ? 6 : 36;
  });
  const taxaOcupacao = capacidadeTotal > 0 ? (totalPlantas / capacidadeTotal) * 100 : 0;

  // Germinação
  const totalGerminando = data.germinacao.filter((g) => g.status === 'germinando').length;
  let totalSementes = 0;
  let totalGerminadas = 0;
  data.germinacao.forEach((g) => {
    totalSementes += g.quantidade;
    totalGerminadas += g.germinadas;
  });
  const taxaGerminacao = totalSementes > 0 ? (totalGerminadas / totalSementes) * 100 : 0;

  // Desperdício
  let totalDesperdicio = 0;
  let totalTransplantadas = 0;
  data.transplantios.forEach((t) => {
    totalDesperdicio += t.quantidadeDesperdicio;
    totalTransplantadas += t.quantidadeTransplantada + t.quantidadeDesperdicio;
  });
  const taxaDesperdicio = totalTransplantadas > 0 ? (totalDesperdicio / totalTransplantadas) * 100 : 0;

  // Manutenção
  const manutencoesAbertas = data.manutencoes.filter((m) => m.status !== 'concluida').length;
  const hoje = new Date();
  const manutencoesVencidas = data.manutencoes.filter((m) => {
    if (m.status === 'concluida') return false;
    if (!m.prazo) return false;
    return new Date(m.prazo) < hoje;
  }).length;

  return {
    totalPlantas,
    plantasEmProcesso,
    plantasProntasColheita,
    plantasColhidas,
    taxaOcupacao: Math.round(taxaOcupacao * 10) / 10,
    taxaGerminacao: Math.round(taxaGerminacao * 10) / 10,
    totalDesperdicio,
    taxaDesperdicio: Math.round(taxaDesperdicio * 10) / 10,
    totalGerminando,
    totalTransplantios: data.transplantios.length,
    manutencoesAbertas,
    manutencoesVencidas,
    andaresLavagemPendente,
  };
}

// ---- Resumo da fazenda ----

export function resumoFazenda(data: FazendaData) {
  const totalTorres = data.torres.length;
  const totalAndares = data.andares.length;
  const andaresOcupados = data.andares.filter((a) => a.dataEntrada).length;
  const ciclosPendentes = data.ciclos.filter((c) => cicloPendenteHoje(c)).length;

  let ultimaMedicao: string | null = null;
  data.caixasAgua.forEach((ca) => {
    ca.medicoes.forEach((m) => {
      if (!ultimaMedicao || m.dataHora > ultimaMedicao) {
        ultimaMedicao = m.dataHora;
      }
    });
  });

  let previsaoVencida = 0;
  data.andares.forEach((andar) => {
    if (andar.dataEntrada) {
      const torre = data.torres.find((t) => t.id === andar.torreId);
      if (torre) {
        const varId = variedadePrincipalAndar(andar);
        const rest = diasRestantes(andar.dataEntrada, torre.fase, varId, data.variedades);
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

// ---- Formatação ----

export function formatarData(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ---- Constantes ----

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
  'Alface Crespa', 'Alface Americana', 'Alface Roxa', 'Rúcula',
  'Agrião', 'Espinafre', 'Couve', 'Manjericão',
  'Salsa', 'Cebolinha', 'Hortelã', 'Coentro',
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

export const MOTIVOS_DESPERDICIO = [
  { value: 'nao_germinou', label: 'Não germinou' },
  { value: 'morta', label: 'Planta morta' },
  { value: 'doente', label: 'Planta doente' },
  { value: 'dano_mecanico', label: 'Dano mecânico' },
  { value: 'outro', label: 'Outro' },
];
