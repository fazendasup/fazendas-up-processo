// Alinha dashboard e página Hoje: só tarefas operacionais com vencimento hoje ou atrasadas.

export function startOfLocalDayMs(d: Date | string): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Pendente ou em andamento, com data de vencimento no dia atual ou no passado (mesma regra que Hoje). */
export function filtroTarefasParaHoje<T extends { status: string; dataVencimento: Date | string }>(
  lista: T[],
): T[] {
  const hoje = startOfLocalDayMs(new Date());
  return lista.filter((t) => {
    if (t.status !== 'pendente' && t.status !== 'em_andamento') return false;
    const v = startOfLocalDayMs(new Date(t.dataVencimento));
    return v <= hoje;
  });
}

/** Separa tarefas já filtradas por “hoje ou atrasadas” em vencimento = hoje vs dias anteriores. */
export function partitionTarefasHojeVsAtrasadas<T extends { dataVencimento: Date | string }>(
  lista: T[],
): { paraHoje: T[]; atrasadas: T[] } {
  const limite = startOfLocalDayMs(new Date());
  const paraHoje: T[] = [];
  const atrasadas: T[] = [];
  for (const t of lista) {
    const v = startOfLocalDayMs(new Date(t.dataVencimento));
    if (v === limite) paraHoje.push(t);
    else if (v < limite) atrasadas.push(t);
  }
  return { paraHoje, atrasadas };
}
