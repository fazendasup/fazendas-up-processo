import type { PrismaClient } from "../generated/prisma/index.js";
import {
  chavePoteMicroverde,
  isVarianteBroto,
  nomeBasePoteMicroverde,
} from "@shared/microverdesPote";
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

type ProdutoNome = { id: string; nome: string };

/**
 * Reserva por produtoId, somando Broto + Microverdes do mesmo pote.
 * Ex.: pedidos em "Beterraba / Broto" e "Beterraba / Microverdes" contam juntos.
 */
export async function reservadoPorProdutoComPotesMicroverde(
  prisma: PrismaClient,
  semanaRef: Date,
  produtos: ProdutoNome[],
): Promise<Map<string, number>> {
  const reservadoBruto = await reservadoPorProdutoNaSemana(prisma, semanaRef);
  const idsConhecidos = new Set(produtos.map(p => p.id));
  const idsReservados = [...reservadoBruto.keys()].filter(id => !idsConhecidos.has(id));

  const extras =
    idsReservados.length > 0
      ? await prisma.produtoComercial.findMany({
          where: { id: { in: idsReservados } },
          select: { id: true, nome: true },
        })
      : [];

  const chavePorId = new Map<string, string>();
  const idsPorChave = new Map<string, string[]>();

  for (const p of [...produtos, ...extras]) {
    const chave = chavePoteMicroverde(p.nome) ?? `id:${p.id}`;
    chavePorId.set(p.id, chave);
    const list = idsPorChave.get(chave) ?? [];
    list.push(p.id);
    idsPorChave.set(chave, list);
  }

  const totalPorChave = new Map<string, number>();
  for (const [id, qtd] of reservadoBruto) {
    const chave = chavePorId.get(id) ?? `id:${id}`;
    totalPorChave.set(chave, (totalPorChave.get(chave) ?? 0) + qtd);
  }

  const out = new Map<string, number>();
  for (const p of produtos) {
    const chave = chavePorId.get(p.id) ?? `id:${p.id}`;
    out.set(p.id, totalPorChave.get(chave) ?? 0);
  }
  return out;
}

type ItemEstoqueSemanal = {
  produtoId: string;
  nome: string;
  categoria: string | null;
  modoCompra: string | null;
  visivelPortal: boolean;
  estoqueLoja: number | null;
  quantidade: number | null;
  reservado: number;
  disponivel: number | null;
  atualizadoEm: Date | null;
};

function preferirCanonicoPote<T extends { nome: string; visivelPortal: boolean; quantidade: number | null }>(
  a: T,
  b: T,
): T {
  const score = (x: T) =>
    (isVarianteBroto(x.nome) ? 8 : 0) +
    (x.visivelPortal ? 4 : 0) +
    (x.quantidade != null ? 2 : 0);
  return score(a) >= score(b) ? a : b;
}

/** Colapsa Broto + Microverdes numa linha, com nome só da variedade. */
export function colapsarItensEstoqueSemanalPotes(
  itens: ItemEstoqueSemanal[],
): ItemEstoqueSemanal[] {
  const grupos = new Map<string, ItemEstoqueSemanal[]>();
  const soltos: ItemEstoqueSemanal[] = [];

  for (const item of itens) {
    const chave = chavePoteMicroverde(item.nome);
    if (!chave) {
      soltos.push(item);
      continue;
    }
    const list = grupos.get(chave) ?? [];
    list.push(item);
    grupos.set(chave, list);
  }

  const unificados: ItemEstoqueSemanal[] = [];
  for (const list of grupos.values()) {
    const canon = list.reduce((acc, cur) => preferirCanonicoPote(acc, cur));
    const base = nomeBasePoteMicroverde(canon.nome) ?? canon.nome;
    // `reservado` em cada item já veio agregado (Broto + Microverdes).
    const res = Math.max(...list.map(i => i.reservado), canon.reservado);
    const disponivel =
      canon.quantidade == null
        ? null
        : Math.round((canon.quantidade - res) * 1000) / 1000;
    unificados.push({
      ...canon,
      nome: base,
      reservado: res,
      disponivel,
      estoqueLoja: canon.estoqueLoja,
    });
  }

  return [...unificados, ...soltos];
}

/**
 * Atualiza estoqueLoja do site = max(0, planejado − reservado) para produtos
 * com capacidade cadastrada na semana. Sem linha semanal, não altera estoqueLoja.
 * Broto/Microverdes do mesmo pote compartilham a reserva.
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
  const nomes = await prisma.produtoComercial.findMany({
    where: { id: { in: ids } },
    select: { id: true, nome: true },
  });
  const reservado = await reservadoPorProdutoComPotesMicroverde(
    prisma,
    inicio,
    nomes,
  );

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
