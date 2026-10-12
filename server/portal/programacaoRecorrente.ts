import { addCalendarDays, entregaPermitida, isBusinessDay, todayYmd } from "./portalCalendario";

/** Segunda a sexta. Sábado, domingo e feriado de Manaus não entram na rota. */
export const DIAS_RECORRENCIA = [1, 2, 3, 4, 5] as const;

export const ENTREGAS_POR_DIA = 4;

export type ItemProgramado = {
  produtoId: string;
  quantidade: number;
};

export type DiaProgramado = {
  diaSemana: number;
  itens: ItemProgramado[];
};

export function diaDaData(ymd: string): number {
  const [ano, mes, dia] = ymd.split("-").map(Number);
  return new Date(Date.UTC(ano, (mes ?? 1) - 1, dia ?? 1)).getUTCDay();
}

export function validarProgramacao(dias: DiaProgramado[]): string | null {
  if (dias.length < 1) return "Escolha ao menos um dia da semana.";
  if (dias.length > DIAS_RECORRENCIA.length) return "A recorrência cabe de segunda a sexta.";
  const vistos = new Set<number>();
  for (const dia of dias) {
    if (!DIAS_RECORRENCIA.includes(dia.diaSemana as (typeof DIAS_RECORRENCIA)[number])) {
      return "A entrega recorrente é de segunda a sexta.";
    }
    if (vistos.has(dia.diaSemana)) return "Cada dia da semana entra uma vez.";
    vistos.add(dia.diaSemana);
    if (dia.itens.length < 1) return "Cada dia marcado precisa ter ao menos um produto.";
    if (dia.itens.length > 40) return "Cada dia aceita até 40 produtos.";
    const produtos = new Set<string>();
    for (const item of dia.itens) {
      if (!item.produtoId) return "Escolha o produto.";
      if (produtos.has(item.produtoId)) return "O mesmo produto entra uma vez em cada dia.";
      produtos.add(item.produtoId);
      if (!Number.isFinite(item.quantidade) || item.quantidade <= 0 || item.quantidade > 9999) {
        return "Informe a quantidade de cada produto.";
      }
    }
  }
  return null;
}

/** Próximas datas úteis daquele dia da semana, a partir da antecedência da loja. Feriado é pulado. */
export function proximasDatasDoDia(diaSemana: number, now = new Date(), quantidade = ENTREGAS_POR_DIA): string[] {
  const datas: string[] = [];
  let cursor = todayYmd(now);
  const limite = addCalendarDays(cursor, 70);
  while (datas.length < quantidade && cursor <= limite) {
    if (diaDaData(cursor) === diaSemana && isBusinessDay(cursor) && entregaPermitida(cursor, now)) {
      datas.push(cursor);
    }
    cursor = addCalendarDays(cursor, 1);
  }
  return datas;
}

export function ocorrenciasDaProgramacao(dias: number[], now = new Date(), quantidade = ENTREGAS_POR_DIA) {
  return dias
    .flatMap((diaSemana) => proximasDatasDoDia(diaSemana, now, quantidade).map((data) => ({ data, diaSemana })))
    .sort((a, b) => a.data.localeCompare(b.data));
}
