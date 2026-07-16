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

/** Gate desativado: não bloqueia mais criação/cópia por semana anterior aberta. */
export async function assertSemanaAnteriorFechada(
  _prisma: PrismaGate,
  _dataEntrega: Date,
  _usuario?: UsuarioReparo,
): Promise<void> {
  return;
}
