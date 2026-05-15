// ============================================================
// Regras partilhadas: lista "prioridade" do plantio e resumo operacional
// (Planejamento — modo simples + página Hoje + snapshot do assistente)
// ============================================================

export function startOfLocalDayTime(d: Date | string): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function ymdLocalKey(d: Date | string): string {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isPlanoOperacional(p: { status: string }) {
  return p.status !== "colhido" && p.status !== "cancelado";
}

export function isPlanoAtrasado(p: { status: string; dataColheitaPrevista: Date | string }, hojeStart: number) {
  if (!isPlanoOperacional(p)) return false;
  return startOfLocalDayTime(p.dataColheitaPrevista) < hojeStart;
}

export function isPlanoMarcoHoje(p: { status: string }, hojeYmd: string) {
  if (!isPlanoOperacional(p)) return false;
  const any = p as Record<string, unknown>;
  const datas = [
    any.dataInicioGerminacao,
    any.dataTransplantioMudas,
    any.dataTransplantioVeg,
    any.dataTransplantioMat,
    any.dataColheitaPrevista,
  ];
  return datas.some((d) => typeof d !== "undefined" && d !== null && ymdLocalKey(d as Date | string) === hojeYmd);
}

/**
 * Contagem da bandeja (taxa de germinação) só em plano já em germinação, no dia do transplantio
 * mudas → vegetativa (`dataTransplantioVeg`), inclusive quando coincide com a maturação no calendário.
 */
export function exibirContagemGerminacaoNoTransplantioVegOuMat(
  plano: {
    status: string;
    dataTransplantioVeg: Date | string;
  },
  hojeYmd: string,
): boolean {
  if (plano.status === "cancelado" || plano.status === "colhido") return false;
  if (plano.status !== "em_germinacao") return false;
  const veg = ymdLocalKey(plano.dataTransplantioVeg);
  if (!veg) return false;
  return hojeYmd === veg;
}

export function formatDatePlano(d: Date | string | null): string {
  if (!d) return "-";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Uma linha para o operador: o que importa agora. */
export function resumoOperacaoPlano(plano: Record<string, unknown>, hojeYmd: string): string {
  const st = plano.status as string;
  if (st === "colhido" || st === "cancelado") return "";
  if (st === "planejado") {
    return "Próximo passo: iniciar germinação quando a bandeja estiver no processo.";
  }
  if (st === "em_germinacao") {
    const fg = (plano.germinacaoFase as string) || "pendente";
    if (exibirContagemGerminacaoNoTransplantioVegOuMat(plano as any, hojeYmd)) {
      if (fg === "pronto_mudas") {
        return "Bandeja pronta — passe o plano para produção após o transplantio.";
      }
      return "Hoje: registe a taxa de germinação e marque a bandeja como pronta (um único passo).";
    }
    const dVeg = plano.dataTransplantioVeg as Date | string;
    return `Contagem da bandeja no dia ${formatDatePlano(dVeg)} (transplantio mudas → vegetativa).`;
  }
  if (st === "em_producao") {
    return `Em cultivo — colheita prevista ${formatDatePlano(plano.dataColheitaPrevista as Date | string)}.`;
  }
  return "";
}

/**
 * Planos cuja acção operacional é só germinação/início (marco `dataInicioGerminacao`),
 * sem transplantios nem colheita no mesmo dia.
 */
export function filtrarPlanosSomenteGerminacaoPlantio(planos: any[], refDate: Date = new Date()): any[] {
  const hojeYmd = ymdLocalKey(refDate);
  const hojeStart = startOfLocalDayTime(refDate);
  return planos.filter((p: any) => {
    if (!isPlanoOperacional(p)) return false;
    if (p.status === "em_producao") return false;
    if (ymdLocalKey(p.dataInicioGerminacao) === hojeYmd) return true;
    if (p.status === "planejado" && startOfLocalDayTime(p.dataInicioGerminacao) < hojeStart) return true;
    return false;
  });
}

/** Mesma ordenação de prioridade, mas só linhas de germinação/plantio inicial. */
export function filtrarPlanosPrioridadeSomenteGerminacaoPlantio(planos: any[], refDate: Date = new Date()): any[] {
  const ids = new Set(filtrarPlanosSomenteGerminacaoPlantio(planos, refDate).map((p: any) => p.id));
  return filtrarPlanosPrioridadeOperacao(planos, refDate).filter((p: any) => ids.has(p.id));
}

export function filtrarPlanosPrioridadeOperacao(planos: any[], refDate: Date = new Date()): any[] {
  const hojeStart = startOfLocalDayTime(refDate);
  const hojeYmd = ymdLocalKey(refDate);
  const list = planos.filter((p: any) => isPlanoAtrasado(p, hojeStart) || isPlanoMarcoHoje(p, hojeYmd));
  return [...list].sort((a: any, b: any) => {
    const aA = isPlanoAtrasado(a, hojeStart);
    const bA = isPlanoAtrasado(b, hojeStart);
    const aH = !aA && isPlanoMarcoHoje(a, hojeYmd);
    const bH = !bA && isPlanoMarcoHoje(b, hojeYmd);
    const ra = aA ? 0 : aH ? 1 : 2;
    const rb = bA ? 0 : bH ? 1 : 2;
    if (ra !== rb) return ra - rb;
    const ca = new Date(a.dataColheitaPrevista).getTime();
    const cb = new Date(b.dataColheitaPrevista).getTime();
    if (ra === 0) return ca - cb;
    return ca - cb;
  });
}
