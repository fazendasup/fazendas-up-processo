import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../generated/prisma/index.js";
import { calcularConciliacaoSemanal } from "./conciliacao-semanal.js";
import { fimSemana, inicioSemana, inicioSemanaGoLive, rotuloSemana } from "./semana.js";

type PrismaLike = Pick<
  PrismaClient,
  "pedidoOperacional" | "fechamentoSemanal" | "pedido" | "execucaoApi" | "regraComercialCliente"
>;

export type SemanaStatus = {
  inicio: Date;
  fim: Date;
  rotulo: string;
  totalPedidos: number;
  pendentes: number;
  entregues: number;
  cancelados: number;
  fechada: boolean;
  reaberta: boolean;
  conciliacaoPendente?: boolean;
  fechadoPorNome: string | null;
  fechadoEm: Date | null;
};

/** Computa o status de fechamento de uma semana (a partir de qualquer dia dela). */
export async function calcularStatusSemana(prisma: PrismaLike, dia: Date): Promise<SemanaStatus> {
  const inicio = inicioSemana(dia);
  const fim = fimSemana(dia);
  const [pedidos, fechamento] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { dataEntrega: { gte: inicio, lte: fim } },
      select: { status: true },
    }),
    prisma.fechamentoSemanal.findUnique({ where: { semanaInicio: inicio } }),
  ]);

  let pendentes = 0;
  let entregues = 0;
  let cancelados = 0;
  for (const p of pedidos) {
    if (p.status === "ENTREGUE") entregues++;
    else if (p.status === "CANCELADO") cancelados++;
    else pendentes++;
  }

  const reaberta = !!fechamento?.reabertoEm;
  return {
    inicio,
    fim,
    rotulo: rotuloSemana(inicio),
    totalPedidos: pedidos.length,
    pendentes,
    entregues,
    cancelados,
    fechada: !!fechamento && !reaberta,
    reaberta,
    fechadoPorNome: fechamento?.fechadoPorNome ?? null,
    fechadoEm: fechamento?.fechadoEm ?? null,
  };
}

/**
 * Primeira semana anterior à `semanaAlvoInicio` (a partir do go-live) que bloqueia
 * a criação de novos pedidos: contém pedidos e ainda tem pendência (não ENTREGUE/CANCELADO),
 * não foi explicitamente fechada ou voltou a ter conciliação pendente.
 */
export async function primeiraSemanaBloqueante(
  prisma: PrismaLike,
  semanaAlvoInicio: Date,
): Promise<SemanaStatus | null> {
  const goLiveInicio = inicioSemanaGoLive();
  if (semanaAlvoInicio.getTime() <= goLiveInicio.getTime()) return null;

  const [pedidos, fechamentos] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { dataEntrega: { gte: goLiveInicio, lt: semanaAlvoInicio } },
      select: { dataEntrega: true, status: true },
    }),
    prisma.fechamentoSemanal.findMany({
      where: { semanaInicio: { gte: goLiveInicio, lt: semanaAlvoInicio } },
    }),
  ]);
  if (pedidos.length === 0) return null;

  const fechadasMap = new Map<number, boolean>();
  for (const f of fechamentos) {
    fechadasMap.set(inicioSemana(f.semanaInicio).getTime(), !f.reabertoEm);
  }

  const porSemana = new Map<number, { total: number; pendentes: number }>();
  for (const p of pedidos) {
    const k = inicioSemana(p.dataEntrega).getTime();
    const acc = porSemana.get(k) ?? { total: 0, pendentes: 0 };
    acc.total++;
    if (p.status !== "ENTREGUE" && p.status !== "CANCELADO") acc.pendentes++;
    porSemana.set(k, acc);
  }

  const semanasOrdenadas = Array.from(porSemana.keys()).sort((a, b) => a - b);
  for (const k of semanasOrdenadas) {
    const acc = porSemana.get(k)!;
    const fechada = fechadasMap.get(k) === true;
    if (acc.total > 0 && (acc.pendentes > 0 || !fechada)) {
      return calcularStatusSemana(prisma, new Date(k));
    }
    if (acc.total > 0) {
      const semanaInicio = new Date(k);
      const conciliacao = await calcularConciliacaoSemanal(
        prisma,
        semanaInicio,
        fimSemana(semanaInicio),
      );
      if (!conciliacao.conciliado) {
        return {
          ...(await calcularStatusSemana(prisma, semanaInicio)),
          conciliacaoPendente: true,
        };
      }
    }
  }
  return null;
}

/** Lança erro se existir uma semana anterior não revisada/não fechada (bloqueio do gate). */
export async function assertSemanaAnteriorFechada(prisma: PrismaLike, dataEntrega: Date): Promise<void> {
  const semanaAlvo = inicioSemana(dataEntrega);
  const bloqueante = await primeiraSemanaBloqueante(prisma, semanaAlvo);
  if (!bloqueante) return;

  const motivo =
    bloqueante.pendentes > 0
      ? `Há ${bloqueante.pendentes} pedido(s) sem revisão (marque como entregue ou cancelado) e finalize o fechamento.`
      : bloqueante.conciliacaoPendente
        ? "Há conciliações pendentes com a Conta Azul. Corrija as divergências e feche novamente a semana."
      : "Os pedidos já estão revisados, mas a semana ainda não foi fechada. Finalize o fechamento para liberar.";

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Feche a semana de ${bloqueante.rotulo} antes de criar ou copiar pedidos de semanas seguintes. ${motivo}`,
  });
}
