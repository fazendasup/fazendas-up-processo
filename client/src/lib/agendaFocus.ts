/**
 * Foco do modal da agenda ao abrir a partir de um alerta no dashboard.
 * Cada chip deve passar o valor correspondente para mostrar só essas atividades.
 */
export type AgendaFocus =
  | 'full'
  | 'ciclos'
  | 'plantio'
  /** Perfis prontos na torre (lista torre/andar → link para o andar) */
  | 'colheita'
  | 'lavagem'
  | 'manutencao'
  | 'transplantio'
  | 'medicao'
  /** Ciclos + tarefas (hoje e atrasadas), sem plantio no calendário */
  | 'tarefas'
  /** Só tarefas com vencimento no dia atual */
  | 'tarefas_hoje'
  /** Só tarefas com vencimento antes de hoje */
  | 'tarefas_atrasadas'
  | 'outro';

const TITLES: Record<AgendaFocus, string> = {
  full: 'Agenda do dia',
  ciclos: 'Ciclos de aplicação',
  plantio: 'Plantio',
  colheita: 'Perfis prontos — abrir na torre',
  lavagem: 'Lavagem de bandejas',
  manutencao: 'Manutenções',
  transplantio: 'Transplantio',
  medicao: 'Medições',
  tarefas: 'Tarefas e ciclos',
  tarefas_hoje: 'Tarefas para hoje',
  tarefas_atrasadas: 'Tarefas atrasadas',
  outro: 'Outras tarefas',
};

export function agendaModalTitle(focus: AgendaFocus): string {
  return TITLES[focus] ?? TITLES.full;
}

export function agendaModalHint(focus: AgendaFocus): string {
  if (focus === 'full') {
    return 'Germinação/planos, ciclos e tarefas (para hoje e atrasadas separadas). Use Feito, Adiar ou Cancelar.';
  }
  if (focus === 'colheita') {
    return 'Toque num andar para abrir essa torre já com o andar seleccionado.';
  }
  return 'Itens deste alerta. Use Feito, Adiar ou Cancelar em cada tarefa.';
}
