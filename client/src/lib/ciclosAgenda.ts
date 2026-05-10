// Alinha contagens do dashboard com o cartão de ciclos da agenda do dia.

import type { CicloAplicacao } from '@/lib/types';
import { cicloPendenteHoje } from '@/lib/utils-farm';
import { filtroTarefasParaHoje, startOfLocalDayMs } from '@/lib/tarefasHoje';

export type TarefaBaseParaCiclo = {
  id: number;
  tipo: string;
  status: string;
  dataVencimento: Date | string;
  cicloId?: number | null;
  titulo?: string | null;
  descricao?: string | null;
};

export type LinhaCicloOperacao<T extends TarefaBaseParaCiclo> = {
  key: string;
  cicloNumId: number | null;
  ciclo: CicloAplicacao | null;
  tarefa: T | null;
};

function cicloNumericId(c: CicloAplicacao): number {
  return Number(String(c.id).replace(/^c-/, ''));
}

/** Mesma união que `HojeAgendaPanel`: ciclos pendentes hoje + tarefas automáticas tipo ciclo. */
export function linhasCicloOperacaoHoje<T extends TarefaBaseParaCiclo>(
  ciclos: CicloAplicacao[],
  todasTarefas: T[],
): LinhaCicloOperacao<T>[] {
  const tarefasHoje = filtroTarefasParaHoje(todasTarefas);
  const ciclosHoje = ciclos.filter((c) => cicloPendenteHoje(c));
  const tarefasCicloHoje = tarefasHoje.filter((t) => t.tipo === 'ciclo');

  const map = new Map<string, LinhaCicloOperacao<T>>();

  for (const c of ciclosHoje) {
    const nid = cicloNumericId(c);
    const t = tarefasCicloHoje.find((x) => x.cicloId === nid) ?? null;
    map.set(`c-${nid}`, { key: `c-${nid}`, cicloNumId: nid, ciclo: c, tarefa: t });
  }

  for (const t of tarefasCicloHoje) {
    const cid = t.cicloId;
    if (cid != null) {
      const cicloFull = ciclos.find((c) => cicloNumericId(c) === cid) ?? null;
      if (cicloFull && !cicloPendenteHoje(cicloFull)) continue;
      const k = `c-${cid}`;
      if (map.has(k)) map.get(k)!.tarefa = t;
      else map.set(k, { key: k, cicloNumId: cid, ciclo: cicloFull, tarefa: t });
    } else {
      const k = `t-${t.id}`;
      map.set(k, { key: k, cicloNumId: null, ciclo: null, tarefa: t });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const nameA = a.ciclo?.nome ?? a.tarefa?.titulo ?? '';
    const nameB = b.ciclo?.nome ?? b.tarefa?.titulo ?? '';
    return nameA.localeCompare(nameB, 'pt-BR');
  });
}

export function partitionLinhasCicloAtrasadasVsHoje<T extends TarefaBaseParaCiclo>(
  linhas: LinhaCicloOperacao<T>[],
): { atrasadas: LinhaCicloOperacao<T>[]; paraHoje: LinhaCicloOperacao<T>[] } {
  const limite = startOfLocalDayMs(new Date());
  const atrasadas: LinhaCicloOperacao<T>[] = [];
  const paraHoje: LinhaCicloOperacao<T>[] = [];
  for (const l of linhas) {
    const t = l.tarefa;
    if (t && (t.status === 'pendente' || t.status === 'em_andamento')) {
      const v = startOfLocalDayMs(new Date(t.dataVencimento));
      if (v < limite) atrasadas.push(l);
      else paraHoje.push(l);
    } else {
      paraHoje.push(l);
    }
  }
  return { atrasadas, paraHoje };
}

export function contarCiclosAplicacaoAtrasados<T extends TarefaBaseParaCiclo>(
  ciclos: CicloAplicacao[],
  todasTarefas: T[],
): number {
  const linhas = linhasCicloOperacaoHoje(ciclos, todasTarefas);
  return partitionLinhasCicloAtrasadasVsHoje(linhas).atrasadas.length;
}
