import type { PrismaClient } from "../generated/prisma/index.js";
import { calcularConciliacaoSemanal } from "./conciliacao-semanal.js";
import {
  fimSemana,
  inicioSemana,
  inicioSemanaGoLive,
  rotuloSemana,
  semanaAnteriorInicio,
  semanaIgnoraConciliacaoFechamento,
} from "./semana.js";

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
  conciliacaoIgnoradaNoFechamento?: boolean;
  fechadoPorNome: string | null;
  fechadoEm: Date | null;
};

function snapshotFechamento(fechamento: { snapshot: unknown } | null | undefined) {
  return (fechamento?.snapshot ?? null) as {
    conciliacaoIgnoradaNoFechamento?: boolean;
  } | null;
}

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
  const snap = snapshotFechamento(fechamento);
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
    conciliacaoIgnoradaNoFechamento:
      snap?.conciliacaoIgnoradaNoFechamento === true,
    fechadoPorNome: fechamento?.fechadoPorNome ?? null,
    fechadoEm: fechamento?.fechadoEm ?? null,
  };
}

/** Verifica se uma semana específica impede novos pedidos na semana seguinte. */
export async function semanaBloqueiaNovosPedidos(
  prisma: PrismaLike,
  semanaInicio: Date,
): Promise<SemanaStatus | null> {
  const status = await calcularStatusSemana(prisma, semanaInicio);
  if (status.totalPedidos === 0) return null;

  if (status.pendentes > 0 || !status.fechada) {
    return status;
  }

  if (semanaIgnoraConciliacaoFechamento(semanaInicio)) {
    return null;
  }

  if (status.conciliacaoIgnoradaNoFechamento) {
    return null;
  }

  const conciliacao = await calcularConciliacaoSemanal(
    prisma,
    semanaInicio,
    fimSemana(semanaInicio),
  );
  if (!conciliacao.conciliado) {
    return { ...status, conciliacaoPendente: true };
  }
  return null;
}

/**
 * Semana que bloqueia a criação de pedidos na semana alvo: apenas a **semana passada**
 * (imediata anterior), não semanas mais antigas desde o go-live.
 */
export async function primeiraSemanaBloqueante(
  prisma: PrismaLike,
  semanaAlvoInicio: Date,
): Promise<SemanaStatus | null> {
  const goLiveInicio = inicioSemanaGoLive();
  if (semanaAlvoInicio.getTime() <= goLiveInicio.getTime()) return null;

  const semanaPrevInicio = semanaAnteriorInicio(semanaAlvoInicio);
  if (semanaPrevInicio.getTime() < goLiveInicio.getTime()) return null;

  return semanaBloqueiaNovosPedidos(prisma, semanaPrevInicio);
}

export { assertSemanaAnteriorFechada } from "./fechamento-gate.js";
