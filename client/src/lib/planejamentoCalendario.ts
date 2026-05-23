// ============================================================
// Eventos do calendário de plantio (calendário completo + filtros operacionais)
// ============================================================

export type PlanoRow = {
  id: number;
  status: string;
  /** pendente | germinando | pronto_mudas — usado para não pedir germinação de novo no dia da mudas */
  germinacaoFase?: string;
  variedadeNome: string;
  quantidadePlantas: number;
  receitaNome?: string;
  dataInicioGerminacao: Date | string;
  dataTransplantioMudas: Date | string;
  dataTransplantioVeg: Date | string;
  dataTransplantioMat: Date | string;
  dataColheitaPrevista: Date | string;
};

export type DiaEvento = {
  id: string;
  tipo: 'germinacao' | 'mudas' | 'veg' | 'mat' | 'colheita';
  rotulo: string;
  variedade: string;
  quantidade?: number;
  planoId: number;
};

type EventosPorDiaOptions = {
  /** No calendário mensal, mostrar todos os marcos do cronograma mesmo que a ação operacional já tenha avançado. */
  mostrarCronogramaCompleto?: boolean;
};

export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Data de calendário local ao meio-dia (evita YYYY-MM-DD interpretado como UTC e cair no dia anterior). */
export function parseDia(data: Date | string): Date {
  if (data instanceof Date) {
    if (Number.isNaN(data.getTime())) return data;
    return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0, 0);
  }
  const s = String(data).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d, 12, 0, 0, 0);
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return t;
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
}

const ORD_FASE: Record<string, number> = {
  germinacao: 0,
  mudas: 1,
  veg: 2,
  mat: 3,
  colheita: 4,
};

/**
 * Por dia e por plano: não exibir "Germinar" se já passou da germinação operacional
 * ou se mudas está no mesmo dia (foco na ida para mudas).
 */
function aplicarFiltroOperacionalNoDia(evs: DiaEvento[], planoPorId: Map<number, PlanoRow>): DiaEvento[] {
  const byPlano = new Map<number, DiaEvento[]>();
  for (const e of evs) {
    const g = byPlano.get(e.planoId) ?? [];
    g.push(e);
    byPlano.set(e.planoId, g);
  }
  const out: DiaEvento[] = [];
  byPlano.forEach((group) => {
    const plano = planoPorId.get(group[0].planoId);
    const hasMudas = group.some((x: DiaEvento) => x.tipo === 'mudas');
    for (const e of group) {
      if (e.tipo === 'germinacao') {
        if (plano) {
          if (plano.status === 'em_producao' || plano.status === 'colhido' || plano.status === 'cancelado') continue;
          if (plano.germinacaoFase === 'pronto_mudas') continue;
          if (hasMudas) continue;
        }
      }
      out.push(e);
    }
  });
  return out.sort((a, b) => (ORD_FASE[a.tipo] ?? 9) - (ORD_FASE[b.tipo] ?? 9) || a.variedade.localeCompare(b.variedade));
}

export function eventosPorDia(planos: PlanoRow[], options: EventosPorDiaOptions = {}): Map<string, DiaEvento[]> {
  const map = new Map<string, DiaEvento[]>();
  for (const p of planos) {
    if (p.status === 'cancelado') continue;
    const v = p.variedadeNome || 'Variedade';
    const q = p.quantidadePlantas;
    const dVeg = parseDia(p.dataTransplantioVeg);
    const dMat = parseDia(p.dataTransplantioMat);
    const vegIgualMat = dateKeyLocal(dVeg) === dateKeyLocal(dMat);

    const lista: DiaEvento[] = [
      { id: `g-${p.id}`, tipo: 'germinacao', rotulo: 'Germinar', variedade: v, quantidade: q, planoId: p.id },
      { id: `m-${p.id}`, tipo: 'mudas', rotulo: 'Transplantio para mudas', variedade: v, quantidade: q, planoId: p.id },
      ...(vegIgualMat
        ? []
        : [{ id: `vg-${p.id}`, tipo: 'veg' as const, rotulo: 'Vegetativa', variedade: v, quantidade: q, planoId: p.id }]),
      {
        id: `mt-${p.id}`,
        tipo: 'mat',
        rotulo: vegIgualMat ? 'Maturação (direto)' : 'Maturação',
        variedade: v,
        quantidade: q,
        planoId: p.id,
      },
      { id: `c-${p.id}`, tipo: 'colheita', rotulo: 'Colheita', variedade: v, quantidade: q, planoId: p.id },
    ];
    const datas: Date[] = [
      parseDia(p.dataInicioGerminacao),
      parseDia(p.dataTransplantioMudas),
      ...(vegIgualMat ? [] : [dVeg]),
      dMat,
      parseDia(p.dataColheitaPrevista),
    ];
    lista.forEach((ev, i) => {
      const key = dateKeyLocal(datas[i]);
      const cur = map.get(key) ?? [];
      cur.push(ev);
      map.set(key, cur);
    });
  }
  map.forEach((arr) => {
    arr.sort((a: DiaEvento, b: DiaEvento) => {
      const ord: Record<string, number> = {
        germinacao: 0,
        mudas: 1,
        veg: 2,
        mat: 3,
        colheita: 4,
      };
      return (ord[a.tipo] ?? 9) - (ord[b.tipo] ?? 9) || a.variedade.localeCompare(b.variedade);
    });
  });

  if (!options.mostrarCronogramaCompleto) {
    const planoPorId = new Map(planos.map((p) => [p.id, p]));
    map.forEach((arr, key) => {
      map.set(key, aplicarFiltroOperacionalNoDia(arr, planoPorId));
    });
  }
  return map;
}

const ORDEM_FASE: DiaEvento['tipo'][] = ['germinacao', 'mudas', 'veg', 'mat', 'colheita'];

/** Fases distintas presentes nos eventos, na ordem do ciclo. */
export function tiposFaseUnicosNoDia(evs: DiaEvento[]): DiaEvento['tipo'][] {
  const set = new Set(evs.map((e) => e.tipo));
  return ORDEM_FASE.filter((t) => set.has(t));
}

const FASE_RESUMO_PT: Record<DiaEvento['tipo'], string> = {
  germinacao: 'germinação',
  mudas: 'transplantio para mudas',
  veg: 'vegetativa',
  mat: 'maturação',
  colheita: 'colheita',
};

/** Marcos de calendário que são só “plantio inicial” (germinar), sem transplantio/colheita. */
export function filtrarEventosSomenteGerminacaoPlantio(evs: DiaEvento[]): DiaEvento[] {
  return evs.filter((e) => e.tipo === 'germinacao');
}

/** Texto curto para alertas (ex.: "germinação, vegetativa e colheita"). */
export function resumoFasesDoDiaPt(evs: DiaEvento[]): string {
  const tipos = tiposFaseUnicosNoDia(evs);
  const parts = tipos.map((t) => FASE_RESUMO_PT[t]);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** Chave yyyy-mm-dd do marco no calendário local (mesma base de `eventosPorDia`). */
export function dateKeyMarcoPlano(plano: PlanoRow, tipo: DiaEvento['tipo']): string {
  let d: Date;
  switch (tipo) {
    case 'germinacao':
      d = parseDia(plano.dataInicioGerminacao);
      break;
    case 'mudas':
      d = parseDia(plano.dataTransplantioMudas);
      break;
    case 'veg':
      d = parseDia(plano.dataTransplantioVeg);
      break;
    case 'mat':
      d = parseDia(plano.dataTransplantioMat);
      break;
    case 'colheita':
      d = parseDia(plano.dataColheitaPrevista);
      break;
  }
  return dateKeyLocal(d);
}

/** Garante que só entram marcos cuja data no plano coincide com o dia (evita lixo no “Hoje”). */
export function filtrarEventosDoDiaLocal(evs: DiaEvento[], planos: PlanoRow[], diaKey: string): DiaEvento[] {
  const porId = new Map(planos.map((p) => [p.id, p]));
  return evs.filter((e) => {
    const p = porId.get(e.planoId);
    if (!p) return false;
    return dateKeyMarcoPlano(p, e.tipo) === diaKey;
  });
}
