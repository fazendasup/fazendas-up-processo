import { Prisma, type PrismaClient } from "../../generated/prisma/index.js";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import { contaAzulGet, createContaAzulHttp } from "./conta-azul.client";
import { mapProdutoContaAzulItem, type ContaAzulProdutoResumo } from "./mappers";
import { ensureValidAccessToken } from "./sync.service";
import type { AxiosInstance } from "axios";

type ContaAzulProdutosPage = {
  items?: unknown[];
  itens?: unknown[];
  produtos?: unknown[];
  data?: unknown[];
  totalItems?: number;
  total_items?: number;
  total_itens?: number;
};

type ProdutosEndpoint = "/v1/produtos" | "/v1/produto/busca";

function buildProdutosPath(
  endpoint: ProdutosEndpoint,
  pagina: number,
  tamanhoPagina: number,
  opts?: { status?: "ATIVO" | "INATIVO"; busca?: string; sku?: string },
): string {
  const qs = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: String(tamanhoPagina),
    campo_ordenacao: "NOME",
    direcao_ordenacao: "ASC",
  });
  if (opts?.status) qs.set("status", opts.status);
  if (opts?.busca?.trim()) qs.set("busca", opts.busca.trim());
  if (opts?.sku?.trim()) qs.set("sku", opts.sku.trim());
  return `${endpoint}?${qs.toString()}`;
}

function itensProdutoPage(res: ContaAzulProdutosPage | unknown[]): unknown[] {
  if (Array.isArray(res)) return expandRawProdutosPage(res);
  return expandRawProdutosPage(
    res.items ?? res.itens ?? res.produtos ?? res.data ?? [],
  );
}

/** Inclui o item pai e cada variação (`produtos_variacao`) como produto próprio. */
function expandRawProdutosPage(batch: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const raw of batch) {
    if (!raw || typeof raw !== "object") continue;
    out.push(raw);
    const vars = (raw as Record<string, unknown>).produtos_variacao;
    if (Array.isArray(vars)) {
      for (const v of vars) {
        if (v && typeof v === "object") out.push(v);
      }
    }
  }
  return out;
}

function semAcentos(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function variantesBuscaContaAzul(busca: string): string[] {
  const t = busca.trim();
  if (!t) return [];
  const out = new Set<string>();
  out.add(t);
  const sem = semAcentos(t);
  if (sem !== t) out.add(sem);
  const primeiro = t.split(/\s+/)[0];
  if (primeiro && primeiro.length >= 2) out.add(primeiro);
  if (/^[A-Za-z0-9._-]{2,40}$/.test(t)) out.add(t);
  return Array.from(out);
}

async function fetchProdutosContaAzulPorEndpoint(
  http: AxiosInstance,
  endpoint: ProdutosEndpoint,
  opts?: { busca?: string; sku?: string },
): Promise<ContaAzulProdutoResumo[]> {
  const tamanho = 100;
  const maxPaginas = 200;
  const porId = new Map<string, ContaAzulProdutoResumo>();

  // Busca pontual: 1 passada sem filtro de status (API filtra por nome/SKU).
  // Catálogo completo: ATIVO + INATIVO (evita 3× paginação / rate limit).
  const statusList: Array<"ATIVO" | "INATIVO" | undefined> =
    opts?.busca || opts?.sku
      ? [undefined, "ATIVO"]
      : ["ATIVO", "INATIVO"];

  for (const status of statusList) {
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const path = buildProdutosPath(endpoint, pagina, tamanho, {
        status,
        busca: opts?.busca,
        sku: opts?.sku,
      });
      let res: ContaAzulProdutosPage | unknown[];
      try {
        res = await contaAzulGet<ContaAzulProdutosPage | unknown[]>(http, path);
      } catch (e) {
        logger.warn(
          { endpoint, pagina, status, err: e },
          "Falha em página de produtos Conta Azul; seguindo.",
        );
        break;
      }
      const batch = itensProdutoPage(res);
      for (const raw of batch) {
        const mapped = mapProdutoContaAzulItem(
          raw,
          status === "ATIVO" || status === "INATIVO" ? status : undefined,
        );
        if (mapped) porId.set(mapped.id, mapped);
      }
      if (batch.length === 0) break;
      if (batch.length < tamanho) break;
    }
  }

  return Array.from(porId.values());
}

export async function fetchTodosProdutosContaAzul(
  http: AxiosInstance,
  opts?: { busca?: string; sku?: string },
): Promise<ContaAzulProdutoResumo[]> {
  const endpoints: ProdutosEndpoint[] = ["/v1/produtos", "/v1/produto/busca"];
  const erros: string[] = [];
  const porId = new Map<string, ContaAzulProdutoResumo>();

  const consultas: Array<{ busca?: string; sku?: string }> =
    opts?.busca || opts?.sku
      ? [
          ...(opts.sku ? [{ sku: opts.sku }] : []),
          ...variantesBuscaContaAzul(opts.busca ?? opts.sku ?? "").map(b => ({
            busca: b,
          })),
        ]
      : [{}];

  for (const consulta of consultas) {
    for (const endpoint of endpoints) {
      try {
        const itens = await fetchProdutosContaAzulPorEndpoint(
          http,
          endpoint,
          consulta.busca || consulta.sku ? consulta : undefined,
        );
        for (const item of itens) porId.set(item.id, item);
        if (itens.length === 0) {
          logger.warn(
            { endpoint, ...consulta },
            "Endpoint de produtos Conta Azul retornou zero itens; tentando fallback se disponível.",
          );
        }
      } catch (e) {
        erros.push(`${endpoint}: ${e instanceof Error ? e.message : String(e)}`);
        logger.warn(
          { endpoint, err: e },
          "Falha ao sincronizar produtos Conta Azul por endpoint; tentando fallback.",
        );
      }
    }
    // Busca pontual: se já achou algo, não precisa esgotar todas as variantes.
    if ((opts?.busca || opts?.sku) && porId.size > 0) break;
  }

  if (porId.size === 0 && erros.length > 0 && !opts?.busca && !opts?.sku) {
    throw new Error(
      `Não foi possível consultar produtos no Conta Azul. ${erros.join(" | ")}`,
    );
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
    const status = (item.status ?? "").toUpperCase();
    const inativoNoCa = status.length > 0 && status !== "ATIVO" && status !== "ACTIVE";
    await prisma.produtoComercial.update({
      where: { id: existenteCa.id },
      data: {
        nome: dataBase.nome,
        sku: dataBase.sku,
        statusContaAzul: dataBase.statusContaAzul,
        precoBase: dataBase.precoBase,
        sincronizadoEm: dataBase.sincronizadoEm,
        // Produto inativo no Conta Azul não pode permanecer ativo na operação.
        ...(inativoNoCa ? { ativo: false, importadoOperacao: false } : {}),
      },
    });
    return "atualizado";
  }

  const legado = await prisma.produtoComercial.findFirst({
    where: {
      contaAzulProdutoId: null,
      OR: [
        { nome: item.nome },
        ...(item.codigo ? [{ sku: item.codigo }] : []),
      ],
    },
  });
  if (legado) {
    await prisma.produtoComercial.update({
      where: { id: legado.id },
      data: {
        ...dataBase,
        ativo: false,
        importadoOperacao: false,
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
      const conflito = await prisma.produtoComercial.findFirst({
        where: {
          OR: [
            { nome: item.nome },
            ...(item.codigo ? [{ sku: item.codigo }] : []),
          ],
        },
      });
      if (
        conflito &&
        (conflito.contaAzulProdutoId == null ||
          conflito.contaAzulProdutoId === item.id)
      ) {
        const status = (item.status ?? "").toUpperCase();
        const inativoNoCa =
          status.length > 0 && status !== "ATIVO" && status !== "ACTIVE";
        await prisma.produtoComercial.update({
          where: { id: conflito.id },
          data: {
            ...dataBase,
            ...(inativoNoCa ? { ativo: false, importadoOperacao: false } : {}),
          },
        });
        return "atualizado";
      }

      // Nome/SKU já ligados a outro id Conta Azul: grava com nome disambiguado.
      const nomeAlt = (
        item.codigo
          ? `${item.nome} (${item.codigo})`
          : `${item.nome} · ${item.id.slice(0, 8)}`
      ).slice(0, 191);
      try {
        await prisma.produtoComercial.create({
          data: {
            ...dataBase,
            nome: nomeAlt,
            ativo: false,
            importadoOperacao: false,
          },
        });
        logger.warn(
          {
            produtoId: item.id,
            nomeOriginal: item.nome,
            nomeAlt,
            conflitoId: conflito?.id,
            conflitoCaId: conflito?.contaAzulProdutoId,
          },
          "Produto Conta Azul gravado com nome alternativo por conflito de unique",
        );
        return "novo";
      } catch (e2) {
        logger.warn(
          {
            produtoId: item.id,
            nome: item.nome,
            conflitoId: conflito?.id,
            conflitoCaId: conflito?.contaAzulProdutoId,
            err: e2,
          },
          "Conflito de nome/sku ao sincronizar produto Conta Azul",
        );
        return "ignorado";
      }
    }
    throw e;
  }
}

export type SincronizarCatalogoProdutosResult = {
  recebidos: number;
  novos: number;
  atualizados: number;
  ignorados: number;
  /** Amostra de nomes trazidos da API (p/ diagnóstico na UI). */
  amostraNomes: string[];
};

let syncCatalogoProdutosEmAndamento: Promise<SincronizarCatalogoProdutosResult> | null = null;

export function isSyncCatalogoProdutosEmAndamento(): boolean {
  return syncCatalogoProdutosEmAndamento != null;
}

export type IniciarSyncCatalogoProdutosResult =
  | { status: "started"; emSegundoPlano: true }
  | { status: "already_running"; emSegundoPlano: true };

export async function sincronizarCatalogoProdutosContaAzul(
  prisma: PrismaClient,
  env: Env,
  opts?: { busca?: string; sku?: string },
): Promise<SincronizarCatalogoProdutosResult> {
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error("Integração Conta Azul não configurada ou token inválido.");
  }

  const http = createContaAzulHttp(env, cred.accessToken);
  const itens = await fetchTodosProdutosContaAzul(http, opts);
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

  return {
    recebidos: itens.length,
    novos,
    atualizados,
    ignorados,
    amostraNomes: itens.slice(0, 12).map(i => i.nome),
  };
}

/**
 * Garante uma única execução por processo. Aguarda o resultado (não fire-and-forget),
 * para o botão da UI reportar erro/contagem reais.
 */
export async function sincronizarCatalogoProdutosContaAzulExclusivo(
  prisma: PrismaClient,
  env: Env,
  opts?: { busca?: string; sku?: string },
): Promise<SincronizarCatalogoProdutosResult> {
  if (syncCatalogoProdutosEmAndamento) {
    return syncCatalogoProdutosEmAndamento;
  }
  const execucao = sincronizarCatalogoProdutosContaAzul(prisma, env, opts);
  syncCatalogoProdutosEmAndamento = execucao;
  try {
    const resultado = await execucao;
    logger.info({ resultado, opts }, "Catálogo de produtos Conta Azul sincronizado.");
    return resultado;
  } catch (err) {
    logger.error({ err, opts }, "Falha ao sincronizar catálogo de produtos Conta Azul.");
    throw err;
  } finally {
    if (syncCatalogoProdutosEmAndamento === execucao) {
      syncCatalogoProdutosEmAndamento = null;
    }
  }
}

/** @deprecated Prefira sincronizarCatalogoProdutosContaAzulExclusivo (aguarda resultado). */
export function iniciarSincronizacaoCatalogoProdutosEmBackground(
  prisma: PrismaClient,
  env: Env,
): IniciarSyncCatalogoProdutosResult {
  if (syncCatalogoProdutosEmAndamento) {
    return { status: "already_running", emSegundoPlano: true };
  }
  void sincronizarCatalogoProdutosContaAzulExclusivo(prisma, env);
  return { status: "started", emSegundoPlano: true };
}

export async function importarProdutosParaOperacao(
  prisma: PrismaClient,
  produtoIds: string[],
): Promise<{ importados: number; ignoradosInativosCa: number }> {
  const unicos = Array.from(new Set(produtoIds.filter(Boolean)));
  if (unicos.length === 0) return { importados: 0, ignoradosInativosCa: 0 };

  const produtos = await prisma.produtoComercial.findMany({
    where: { id: { in: unicos }, contaAzulProdutoId: { not: null } },
    select: { id: true, statusContaAzul: true, nome: true },
  });
  if (produtos.length === 0) {
    throw new Error("Nenhum produto do catálogo Conta Azul encontrado para importar.");
  }

  const elegiveis = produtos.filter(p => {
    const st = (p.statusContaAzul ?? "").toUpperCase();
    return st === "ATIVO" || st === "ACTIVE";
  });
  const ignoradosInativosCa = produtos.length - elegiveis.length;
  if (elegiveis.length === 0) {
    throw new Error(
      "Nenhum dos produtos selecionados está ATIVO no Conta Azul (status ausente conta como não elegível). Não é possível ativar na operação.",
    );
  }

  await prisma.produtoComercial.updateMany({
    where: { id: { in: elegiveis.map(p => p.id) } },
    data: { importadoOperacao: true, ativo: true },
  });

  return { importados: elegiveis.length, ignoradosInativosCa };
}

/**
 * Desativa na operação produtos que estão INATIVOS no Conta Azul
 * (corrigindo importações em massa que forçavam ativo=true).
 */
export async function desativarProdutosInativosNoContaAzul(
  prisma: PrismaClient,
): Promise<{ desativados: number; ids: string[]; nomes: string[] }> {
  const todos = await prisma.produtoComercial.findMany({
    where: {
      contaAzulProdutoId: { not: null },
      OR: [{ ativo: true }, { importadoOperacao: true }],
    },
    select: {
      id: true,
      nome: true,
      statusContaAzul: true,
      ativo: true,
      importadoOperacao: true,
    },
  });

  const alvos = todos.filter(p => {
    const st = (p.statusContaAzul ?? "").toUpperCase();
    return st.length > 0 && st !== "ATIVO" && st !== "ACTIVE";
  });

  if (alvos.length === 0) {
    return { desativados: 0, ids: [], nomes: [] };
  }

  await prisma.produtoComercial.updateMany({
    where: { id: { in: alvos.map(p => p.id) } },
    data: { ativo: false, importadoOperacao: false },
  });

  return {
    desativados: alvos.length,
    ids: alvos.map(p => p.id),
    nomes: alvos.map(p => p.nome),
  };
}
