/**
 * Opções para limpeza operacional por projeto (mantém variedades, receitas, ciclos, fases_config, utilizadores).
 */
export type OperationalResetClusters = {
  /**
   * Apaga torres, andares, perfis e furos (infraestrutura no sistema).
   * Para só esvaziar plantio mantendo torres, use `limparCultivoGrade`.
   */
  torresGrade: boolean;
  /**
   * Zera plantio nos perfis/furos e aplicações por andar; mantém torres, andares e grelha.
   * Ignorado se `torresGrade` estiver ativo.
   */
  limparCultivoGrade: boolean;
  /** Apaga medições e aplicações na solução; mantém o cadastro das caixas d'água */
  historicoSolucaoCaixa: boolean;
  /** Apaga o cadastro das caixas d'água (e respetivo histórico); torres ficam sem caixa até associar outra */
  removerCadastroCaixasAgua: boolean;
  germinacao: boolean;
  transplantios: boolean;
  manutencoes: boolean;
  planosPlantio: boolean;
  registrosColheita: boolean;
  tarefas: boolean;
  estoque: boolean;
  inteligenciaAlertas: boolean;
  visao: boolean;
  /** Bancadas, caixas da bancada, medições e aplicações (hidroponia) */
  bancadasHidroponia: boolean;
};

/** Limpar plantio e histórico sem remover torres nem caixas cadastradas */
export const DEFAULT_OPERATIONAL_RESET_CLUSTERS: OperationalResetClusters = {
  torresGrade: false,
  limparCultivoGrade: true,
  historicoSolucaoCaixa: true,
  removerCadastroCaixasAgua: false,
  germinacao: true,
  transplantios: true,
  manutencoes: true,
  planosPlantio: true,
  registrosColheita: true,
  tarefas: true,
  estoque: true,
  inteligenciaAlertas: true,
  visao: true,
  bancadasHidroponia: true,
};

export function hasAnyOperationalResetCluster(c: OperationalResetClusters): boolean {
  return (
    c.torresGrade ||
    c.limparCultivoGrade ||
    c.historicoSolucaoCaixa ||
    c.removerCadastroCaixasAgua ||
    c.germinacao ||
    c.transplantios ||
    c.manutencoes ||
    c.planosPlantio ||
    c.registrosColheita ||
    c.tarefas ||
    c.estoque ||
    c.inteligenciaAlertas ||
    c.visao ||
    c.bancadasHidroponia
  );
}
