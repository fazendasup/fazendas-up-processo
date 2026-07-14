import type { PrismaClient } from "../generated/prisma/index.js";
import { clientePodeAcumularPedidos } from "@shared/clientesAcumuloPedidos";

type PrismaAcumuloCleanup = Pick<PrismaClient, "regraComercialCliente">;

/**
 * Desliga `acumulaPedidos` residual fora da allowlist (Licco, Spoleto, Marinara, Novotel, Padoca).
 * Idempotente — pode rodar a cada abertura do painel de conciliação.
 */
export async function desligarAcumuloForaAllowlist(
  prisma: PrismaAcumuloCleanup,
): Promise<{ desligadas: number; mantidas: number }> {
  const regras = await prisma.regraComercialCliente.findMany({
    where: { acumulaPedidos: true },
    include: { cliente: { select: { nome: true } } },
  });

  const manterIds: string[] = [];
  const desligarIds: string[] = [];
  for (const regra of regras) {
    if (clientePodeAcumularPedidos(regra.cliente?.nome)) {
      manterIds.push(regra.contaAzulCustomerId);
    } else {
      desligarIds.push(regra.contaAzulCustomerId);
    }
  }

  if (desligarIds.length > 0) {
    await prisma.regraComercialCliente.updateMany({
      where: {
        contaAzulCustomerId: { in: desligarIds },
        acumulaPedidos: true,
      },
      data: { acumulaPedidos: false },
    });
  }

  return { desligadas: desligarIds.length, mantidas: manterIds.length };
}

/** Normaliza flag exibida/enviada pela API com a allowlist. */
export function acumulaPedidosEfetivo(
  acumulaPedidos: boolean | null | undefined,
  nomeCliente: string | null | undefined,
): boolean {
  return Boolean(acumulaPedidos) && clientePodeAcumularPedidos(nomeCliente);
}
