import { Prisma, type PrismaClient } from "../../generated/prisma/index.js";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import { contaAzulGet, createContaAzulHttp } from "./conta-azul.client";
import { mapProdutoContaAzulItem, type ContaAzulProdutoResumo } from "./mappers";
import { ensureValidAccessToken } from "./sync.service";
import type { AxiosInstance } from "axios";

type ContaAzulProdutosPage = {
  items?: unknown[];
  totalItems?: number;
};

function buildProdutosPath(pagina: number, tamanhoPagina: number, status?: "ATIVO" | "INATIVO"): string {
  const qs = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: String(tamanhoPagina),
    campo_ordenacao: "NOME",
    direcao_ordenacao: "ASC",
  });
  if (status) qs.set("status", status);
  return `/v1/produtos?${qs.toString()}`;
}

export async function fetchTodosProdutosContaAzul(http: AxiosInstance): Promise<ContaAzulProdutoResumo[]> {
  const tamanho = 200;
  const maxPaginas = 200;
  const porId = new Map<string, ContaAzulProdutoResumo>();

  for (const status of ["ATIVO", "INATIVO"] as const) {
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const path = buildProdutosPath(pagina, tamanho, status);
      const res = await contaAzulGet<ContaAzulProdutosPage>(http, path);
      const batch = res.items ?? [];
      for (const raw of batch) {
        const mapped = mapProdutoContaAzulItem(raw);
        if (mapped) porId.set(mapped.id, mapped);
      }
      if (batch.length === 0) break;
      if (batch.length < tamanho) break;
      if (typeof res.totalItems === "number" && pagina * tamanho >= res.totalItems) break;
    }
  }

  return Array.from(porId.values());
}

async function upsertProdutoCatalogo(
  prisma: PrismaClient,
  item: ContaAzulProdutoResumo,
  agora: Date,
): Promise<"novo" | "atualizado" | "ignorado"> {
  const dataBase = {
    nome: item.nome,
    sku: item.codigo,
    statusContaAzul: item.status,
    precoBase: item.valorVenda == null ? null : new Prisma.Decimal(item.valorVenda),
    sincronizadoEm: agora,
    contaAzulProdutoId: item.id,
  };

  const existenteCa = await prisma.produtoComercial.findUnique({
    where: { contaAzulProdutoId: item.id },
  });
  if (existenteCa) {
    await prisma.produtoComercial.update({
      where: { id: existenteCa.id },
      data: {
        nome: dataBase.nome,
        sku: dataBase.sku,
        statusContaAzul: dataBase.statusContaAzul,
        precoBase: dataBase.precoBase,
        sincronizadoEm: dataBase.sincronizadoEm,
      },
    });
    return "atualizado";
  }

  const legado = await prisma.produtoComercial.findFirst({
    where: { nome: item.nome, contaAzulProdutoId: null },
  });
  if (legado) {
    await prisma.produtoComercial.update({
      where: { id: legado.id },
      data: {
        ...dataBase,
        importadoOperacao: legado.importadoOperacao || legado.ativo,
      },
    });
    return "atualizado";
  }

  try {
    await prisma.produtoComercial.create({
      data: {
        ...dataBase,
        ativo: false,
        importadoOperacao: false,
      },
    });
    return "novo";
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      logger.warn({ produtoId: item.id, nome: item.nome }, "Conflito de nome ao sincronizar produto Conta Azul");
      return "ignorado";
    }
    throw e;
  }
}

export type SincronizarCatalogoProdutosResult = {
  recebidos: number;
  novos: number;
  atualizados: number;
  ignorados: number;
};

export async function sincronizarCatalogoProdutosContaAzul(
  prisma: PrismaClient,
  env: Env,
): Promise<SincronizarCatalogoProdutosResult> {
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) throw new Error("Integração Conta Azul não configurada ou token inválido.");

  const http = createContaAzulHttp(env, cred.accessToken);
  const itens = await fetchTodosProdutosContaAzul(http);
  const agora = new Date();
  let novos = 0;
  let atualizados = 0;
  let ignorados = 0;

  for (const item of itens) {
    const resultado = await upsertProdutoCatalogo(prisma, item, agora);
    if (resultado === "novo") novos++;
    else if (resultado === "atualizado") atualizados++;
    else ignorados++;
  }

  return { recebidos: itens.length, novos, atualizados, ignorados };
}

export async function importarProdutosParaOperacao(
  prisma: PrismaClient,
  produtoIds: string[],
): Promise<{ importados: number }> {
  const unicos = Array.from(new Set(produtoIds.filter(Boolean)));
  if (unicos.length === 0) return { importados: 0 };

  const produtos = await prisma.produtoComercial.findMany({
    where: { id: { in: unicos }, contaAzulProdutoId: { not: null } },
    select: { id: true },
  });
  if (produtos.length === 0) throw new Error("Nenhum produto do catálogo Conta Azul encontrado para importar.");

  await prisma.produtoComercial.updateMany({
    where: { id: { in: produtos.map((p) => p.id) } },
    data: { importadoOperacao: true, ativo: true },
  });

  return { importados: produtos.length };
}
