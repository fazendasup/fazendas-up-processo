import type { PrismaClient } from "../generated/prisma/index.js";
import { fimSemana, inicioSemana } from "./semana.js";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Soma das quantidades pedidas (não canceladas) na semana, por produto. */
export async function reservadoPorProdutoNaSemana(
  prisma: PrismaClient,
  semanaRef: Date,
  produtoIds?: string[]
): Promise<Map<string, number>> {
  const inicio = inicioSemana(semanaRef);
  const fim = fimSemana(semanaRef);
  const itens = await prisma.pedidoOperacionalItem.findMany({
    where: {
      ...(produtoIds?.length ? { produtoId: { in: produtoIds } } : {}),
      pedido: {
        status: { not: "CANCELADO" },
        dataEntrega: { gte: inicio, lte: fim },
      },
    },
    select: { produtoId: true, quantidade: true },
  });
  const map = new Map<string, number>();
  for (const it of itens) {
    map.set(it.produtoId, (map.get(it.produtoId) ?? 0) + n(it.quantidade));
  }
  return map;
}

/**
 * Atualiza estoqueLoja do site = max(0, planejado − reservado) para produtos
 * com capacidade cadastrada na semana. Sem linha semanal, não altera estoqueLoja.
 */
export async function sincronizarEstoqueLojaDaSemana(
  prisma: PrismaClient,
  semanaRef: Date,
  produtoIds?: string[]
): Promise<{ atualizados: number }> {
  const inicio = inicioSemana(semanaRef);
  const planejados = await prisma.estoqueSemanalPortal.findMany({
    where: {
      semanaInicio: inicio,
      ...(produtoIds?.length ? { produtoId: { in: produtoIds } } : {}),
    },
    select: { produtoId: true, quantidade: true },
  });
  if (planejados.length === 0) return { atualizados: 0 };

  const ids = planejados.map(p => p.produtoId);
  const reservado = await reservadoPorProdutoNaSemana(prisma, inicio, ids);

  let atualizados = 0;
  for (const row of planejados) {
    const planejado = n(row.quantidade);
    const res = reservado.get(row.produtoId) ?? 0;
    const disponivel = Math.max(0, Math.round((planejado - res) * 1000) / 1000);
    await prisma.produtoComercial.update({
      where: { id: row.produtoId },
      data: { estoqueLoja: disponivel.toFixed(3) },
    });
    atualizados += 1;
  }
  return { atualizados };
}

/** Após mudar pedidos, re-sincroniza a semana da entrega dos produtos afetados. */
export async function sincronizarEstoqueAposPedidos(
  prisma: PrismaClient,
  pedidos: Array<{ dataEntrega: Date; produtoIds: string[] }>
): Promise<void> {
  const porSemana = new Map<string, { ref: Date; ids: Set<string> }>();
  for (const p of pedidos) {
    if (!p.produtoIds.length) continue;
    const inicio = inicioSemana(p.dataEntrega);
    const key = inicio.toISOString();
    const bucket = porSemana.get(key) ?? { ref: inicio, ids: new Set<string>() };
    for (const id of p.produtoIds) bucket.ids.add(id);
    porSemana.set(key, bucket);
  }
  for (const { ref, ids } of porSemana.values()) {
    await sincronizarEstoqueLojaDaSemana(prisma, ref, [...ids]);
  }
}
