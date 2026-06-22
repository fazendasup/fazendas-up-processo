import { TRPCError } from "@trpc/server";
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
