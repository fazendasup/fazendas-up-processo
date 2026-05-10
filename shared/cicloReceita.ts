/**
 * Marcos do ciclo (germinação → colheita) alinhados ao planejamento e às receitas.
 * Datas em calendário local ao meio-dia (coerente com inputs type="date" + T12:00:00).
 */

export type DiasCicloReceita = {
  diasGerminacao: number;
  diasMudas: number;
  diasVegetativa: number;
  diasMaturacao: number;
};

export type MarcosCicloPlantio = {
  germinacao: Date;
  mudas: Date;
  veg: Date;
  mat: Date;
  colheita: Date;
};

function startOfLocalNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function addDaysLocalNoon(date: Date, days: number): Date {
  const x = startOfLocalNoon(date);
  x.setDate(x.getDate() + days);
  return x;
}

/** A partir do primeiro dia de germinação (semeadura / início do plano). */
export function marcosCicloDesdeGerminacao(
  germinacao: Date,
  dias: DiasCicloReceita,
  pulaVegetativa: boolean,
): MarcosCicloPlantio {
  const g = dias.diasGerminacao;
  const dm = dias.diasMudas;
  const dv = pulaVegetativa ? 0 : dias.diasVegetativa;
  const dmat = dias.diasMaturacao;
  const germ = addDaysLocalNoon(germinacao, 0);
  const mudas = addDaysLocalNoon(germ, g);
  const fimMudas = addDaysLocalNoon(mudas, dm);
  let veg: Date;
  let mat: Date;
  if (pulaVegetativa) {
    veg = fimMudas;
    mat = fimMudas;
  } else {
    veg = fimMudas;
    mat = addDaysLocalNoon(veg, dv);
  }
  const colheita = addDaysLocalNoon(mat, dmat);
  return { germinacao: germ, mudas, veg, mat, colheita };
}

/** A partir do dia previsto de colheita (retrocede germinação e transplantes). */
export function marcosCicloDesdeColheita(
  colheita: Date,
  dias: DiasCicloReceita,
  pulaVegetativa: boolean,
): MarcosCicloPlantio {
  const dmat = dias.diasMaturacao;
  const col = addDaysLocalNoon(colheita, 0);
  const mat = addDaysLocalNoon(col, -dmat);
  let veg: Date;
  let fimMudas: Date;
  if (pulaVegetativa) {
    fimMudas = mat;
    veg = mat;
  } else {
    veg = addDaysLocalNoon(mat, -dias.diasVegetativa);
    fimMudas = veg;
  }
  const mudas = addDaysLocalNoon(fimMudas, -dias.diasMudas);
  const germinacao = addDaysLocalNoon(mudas, -dias.diasGerminacao);
  return { germinacao, mudas, veg, mat, colheita: col };
}

/** Receita “base” para uma variedade: ativas primeiro; desempate pela última atualização (útil com várias receitas). */
export type ReceitaCicloRef = {
  id?: number;
  variedadeId: number;
  nome?: string | null;
  /** Driver pode devolver 0/1 em vez de boolean. */
  ativa?: boolean | null | number | string;
  updatedAt?: string | Date | null;
  diasGerminacao?: number | null;
  diasMudas?: number | null;
  diasVegetativa?: number | null;
  diasMaturacao?: number | null;
};

function receitaUpdatedAtMs(r: ReceitaCicloRef): number {
  const u = r.updatedAt;
  if (u == null) return 0;
  const t = u instanceof Date ? u.getTime() : new Date(u).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** MySQL / drivers podem devolver `ativa` como 0/1; em JS `0 !== false` é true — tratar 0 como inativa. */
export function receitaEstaAtiva(r: ReceitaCicloRef): boolean {
  const a = r.ativa;
  if (a === false || a === 0 || a === "0") return false;
  return true;
}

export function receitaCicloPrioritariaParaVariedade(
  receitas: ReceitaCicloRef[],
  variedadeId: number,
): ReceitaCicloRef | null {
  const list = receitas.filter((r) => r.variedadeId === variedadeId);
  if (!list.length) return null;
  const active = list.filter(receitaEstaAtiva);
  const pool = active.length ? active : list;
  return (
    [...pool].sort((a, b) => {
      const ta = receitaUpdatedAtMs(a);
      const tb = receitaUpdatedAtMs(b);
      if (tb !== ta) return tb - ta;
      return (b.id ?? 0) - (a.id ?? 0);
    })[0] ?? null
  );
}
