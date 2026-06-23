import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../generated/prisma/index.js";
import {
  repararConciliacaoSemana,
  usuarioReparo,
  type ResultadoReparoConciliacaoSemana,
} from "./conciliacao-semana-reparo.js";
import {
  primeiraSemanaBloqueante,
  type SemanaStatus,
} from "./fechamento.js";
import { inicioSemana } from "./semana.js";

type PrismaGate = Pick<
  PrismaClient,
  | "pedidoOperacional"
  | "fechamentoSemanal"
  | "pedido"
  | "execucaoApi"
  | "regraComercialCliente"
>;

type UsuarioReparo = { id: string; nome: string };

/** Repara vínculos da semana bloqueante e recalcula o gate (evita UI/cópia dessincronizados). */
export async function obterBloqueioSemanaComReparo(
  prisma: PrismaGate,
  semanaAlvoInicio: Date,
  usuario?: UsuarioReparo,
): Promise<{
  bloqueio: SemanaStatus | null;
  reparo: ResultadoReparoConciliacaoSemana | null;
}> {
  const bloqueioInicial = await primeiraSemanaBloqueante(prisma, semanaAlvoInicio);
  if (!bloqueioInicial) {
    return { bloqueio: null, reparo: null };
  }

  const reparo = await repararConciliacaoSemana(
    prisma as PrismaClient,
    bloqueioInicial.inicio,
    bloqueioInicial.fim,
    usuario ?? usuarioReparo(),
  );
  const bloqueio = await primeiraSemanaBloqueante(prisma, semanaAlvoInicio);
  return { bloqueio, reparo };
}

/** Lança erro se existir semana anterior bloqueando novos pedidos (com reparo automático antes). */
export async function assertSemanaAnteriorFechada(
  prisma: PrismaGate,
  dataEntrega: Date,
  usuario?: UsuarioReparo,
): Promise<void> {
  const semanaAlvo = inicioSemana(dataEntrega);
  const { bloqueio: bloqueante } = await obterBloqueioSemanaComReparo(
    prisma,
    semanaAlvo,
    usuario,
  );
  if (!bloqueante) return;

  const motivo =
    bloqueante.pendentes > 0
      ? `Há ${bloqueante.pendentes} pedido(s) sem revisão (marque como entregue ou cancelado) e finalize o fechamento.`
      : bloqueante.conciliacaoPendente
        ? "Há conciliações pendentes com a Conta Azul. Corrija as divergências ou use «Fechar sem conciliar» na tela de Pedidos."
        : "Os pedidos já estão revisados, mas a semana ainda não foi fechada. Finalize o fechamento para liberar.";

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Feche a semana de ${bloqueante.rotulo} antes de criar ou copiar pedidos de semanas seguintes. ${motivo}`,
  });
}
