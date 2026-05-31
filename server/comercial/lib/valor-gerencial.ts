import type { PrismaClient } from "../generated/prisma/index.js";
import { asNumber, type ComposicaoValorPedido } from "./composicao-valor.js";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function descontoBoletoPercentualNum(value: unknown): number {
  const n = asNumber(value);
  if (n == null || n <= 0) return 0;
  return Math.min(100, n);
}

export function calcularDescontoBoleto(valorLiquido: number, percentual: number): number {
  if (percentual <= 0 || valorLiquido <= 0) return 0;
  return round2(valorLiquido * (percentual / 100));
}

export function valorGerencialLiquido(valorLiquido: number, percentual: number): number {
  return round2(Math.max(0, valorLiquido - calcularDescontoBoleto(valorLiquido, percentual)));
}

export type ComposicaoGerencial = ComposicaoValorPedido & {
  descontoBoletoPercentual: number;
  descontoBoletoValor: number;
  valorGerencial: number;
};

export function composicaoGerencialDoPedido(
  comp: ComposicaoValorPedido,
  descontoBoletoPercentual: number,
): ComposicaoGerencial {
  const pct = descontoBoletoPercentualNum(descontoBoletoPercentual);
  const descontoBoletoValor = calcularDescontoBoleto(comp.valorLiquido, pct);
  return {
    ...comp,
    descontoBoletoPercentual: pct,
    descontoBoletoValor,
    valorGerencial: valorGerencialLiquido(comp.valorLiquido, pct),
  };
}

/** Mapa clienteId interno -> percentual de desconto em boleto. */
export async function mapDescontoBoletoPorClienteId(
  prisma: Pick<PrismaClient, "regraComercialCliente" | "cliente">,
): Promise<Map<string, number>> {
  const regras = await prisma.regraComercialCliente.findMany({
    where: { descontoBoletoPercentual: { not: null } },
    select: { contaAzulCustomerId: true, descontoBoletoPercentual: true },
  });
  if (regras.length === 0) return new Map();

  const clientes = await prisma.cliente.findMany({
    where: { externalId: { in: regras.map((r) => r.contaAzulCustomerId) } },
    select: { id: true, externalId: true },
  });

  const pctByExternal = new Map(
    regras.map((r) => [r.contaAzulCustomerId, descontoBoletoPercentualNum(r.descontoBoletoPercentual)]),
  );
  const map = new Map<string, number>();
  for (const cliente of clientes) {
    if (!cliente.externalId) continue;
    const pct = pctByExternal.get(cliente.externalId);
    if (pct != null && pct > 0) map.set(cliente.id, pct);
  }
  return map;
}

/** Mapa contaAzulCustomerId -> percentual de desconto em boleto. */
export async function mapDescontoBoletoPorContaAzul(
  prisma: Pick<PrismaClient, "regraComercialCliente">,
): Promise<Map<string, number>> {
  const regras = await prisma.regraComercialCliente.findMany({
    where: { descontoBoletoPercentual: { not: null } },
    select: { contaAzulCustomerId: true, descontoBoletoPercentual: true },
  });
  const map = new Map<string, number>();
  for (const regra of regras) {
    const pct = descontoBoletoPercentualNum(regra.descontoBoletoPercentual);
    if (pct > 0) map.set(regra.contaAzulCustomerId, pct);
  }
  return map;
}
