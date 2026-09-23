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

function itensProdutoPage(res: ContaAzulProdutosPage | unknown[]): unknown[] {
  if (Array.isArray(res)) return expandRawProdutosPage(res);
  return expandRawProdutosPage(
    res.items ?? res.itens ?? res.produtos ?? res.data ?? [],
  );
}

function semAcentos(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function variantesBusca(busca: string): string[] {
  const t = busca.trim();
  if (!t) return [];
  const out = new Set<string>([t]);
  const sem = semAcentos(t);
  if (sem !== t) out.add(sem);
  const primeiro = t.split(/\s+/)[0];
  if (primeiro && primeiro.length >= 2) out.add(primeiro);
  return Array.from(out);
}

type FetchOpts = { busca?: string; sku?: string };

/**
 * Consulta pontual mínima (sem ordenação) — evita 400 por params que a API
 * rejeita em alguns tenants e facilita achar produto novo por SKU/nome.
 */
async function fetchProdutosPontual(
  http: AxiosInstance,
  opts: FetchOpts,
): Promise<{ itens: ContaAzulProdutoResumo[]; avisos: string[] }> {
  const avisos: string[] = [];
  const porId = new Map<string, ContaAzulProdutoResumo>();

  const tentativas: Array<Record<string, string>> = [];
  if (opts.sku?.trim()) {
    tentativas.push({ sku: opts.sku.trim(), tamanho_pagina: "50", pagina: "1" });
    tentativas.push({
      busca: opts.sku.trim(),
      tamanho_pagina: "50",
      pagina: "1",
    });
  }
  for (const b of variantesBusca(opts.busca ?? "")) {
    tentativas.push({ busca: b, tamanho_pagina: "50", pagina: "1" });
    tentativas.push({
      busca: b,
      status: "ATIVO",
      tamanho_pagina: "50",
      pagina: "1",
    });
  }

  for (const params of tentativas) {
    const qs = new URLSearchParams(params);
    const path = `/v1/produtos?${qs.toString()}`;
    try {
      const res = await contaAzulGet<ContaAzulProdutosPage | unknown[]>(
        http,
        path,
      );
      const batch = itensProdutoPage(res);
      for (const raw of batch) {
        const mapped = mapProdutoContaAzulItem(raw);
        if (mapped) porId.set(mapped.id, mapped);
        else {
          const tip =
            raw && typeof raw === "object"
              ? String((raw as { tipo?: unknown }).tipo ?? "?")
              : "?";
          avisos.push(`Item ignorado no mapper (tipo=${tip}) em ${path}`);
        }
      }
      if (porId.size > 0) break;
      avisos.push(`API 0 itens: ${path}`);
    } catch (e) {
      avisos.push(
        `Falha ${path}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { itens: Array.from(porId.values()), avisos };
}

async function fetchProdutosCatalogoCompleto(
  http: AxiosInstance,
): Promise<{ itens: ContaAzulProdutoResumo[]; avisos: string[] }> {
  const avisos: string[] = [];
  const porId = new Map<string, ContaAzulProdutoResumo>();
  const tamanho = 50;
  const maxPaginas = 200;

  for (const status of ["ATIVO", "INATIVO"] as const) {
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const qs = new URLSearchParams({
        pagina: String(pagina),
        tamanho_pagina: String(tamanho),
        status,
      });
      const path = `/v1/produtos?${qs.toString()}`;
      try {
        const res = await contaAzulGet<ContaAzulProdutosPage | unknown[]>(
          http,
          path,
        );
        const batch = itensProdutoPage(res);
        for (const raw of batch) {
          const mapped = mapProdutoContaAzulItem(raw, status);
          if (mapped) porId.set(mapped.id, mapped);
        }
        if (batch.length === 0) break;
        if (batch.length < tamanho) break;
      } catch (e) {
        avisos.push(
          `Falha ${path}: ${e instanceof Error ? e.message : String(e)}`,
        );
        break;
      }
    }
  }

  if (porId.size === 0 && avisos.length > 0) {
    throw new Error(
      `Não foi possível consultar produtos no Conta Azul. ${avisos.slice(0, 3).join(" | ")}`,
    );
  }

  return { itens: Array.from(porId.values()), avisos };
}

export async function fetchTodosProdutosContaAzul(
  http: AxiosInstance,
  opts?: FetchOpts,
): Promise<{ itens: ContaAzulProdutoResumo[]; avisos: string[] }> {
  if (opts?.busca || opts?.sku) {
    return fetchProdutosPontual(http, opts);
  }
  return fetchProdutosCatalogoCompleto(http);
}

async function nomeDisponivelOuAlternativo(
  prisma: PrismaClient,
  nomeDesejado: string,
  opts: { excluirId?: string; codigo?: string | null; idCa?: string },
): Promise<string> {
  const ocupado = await prisma.produtoComercial.findFirst({
    where: {
      nome: nomeDesejado,
      ...(opts.excluirId ? { id: { not: opts.excluirId } } : {}),
    },
    select: { id: true },
  });
  if (!ocupado) return nomeDesejado.slice(0, 191);
  const alt = (
    opts.codigo
      ? `${nomeDesejado} (${opts.codigo})`
      : opts.idCa
        ? `${nomeDesejado} · ${opts.idCa.slice(0, 8)}`
        : `${nomeDesejado} · ${Date.now().toString(36)}`
  ).slice(0, 191);
  const altOcupado = await prisma.produtoComercial.findFirst({
    where: {
      nome: alt,
      ...(opts.excluirId ? { id: { not: opts.excluirId } } : {}),
    },
    select: { id: true },
  });
  if (!altOcupado) return alt;
  return `${nomeDesejado.slice(0, 160)} · ${opts.idCa?.slice(0, 8) ?? Date.now().toString(36)}`.slice(
    0,
    191,
  );
}

async function upsertProdutoCatalogo(
  prisma: PrismaClient,
  item: ContaAzulProdutoResumo,
  agora: Date,
): Promise<"novo" | "atualizado" | "ignorado"> {
  const status = (item.status ?? "").toUpperCase();
  const inativoNoCa =
    status.length > 0 && status !== "ATIVO" && status !== "ACTIVE";

  const existenteCa = await prisma.produtoComercial.findUnique({
    where: { contaAzulProdutoId: item.id },
  });
  if (existenteCa) {
    const nome = await nomeDisponivelOuAlternativo(prisma, item.nome, {
      excluirId: existenteCa.id,
      codigo: item.codigo,
      idCa: item.id,
    });
    try {
      await prisma.produtoComercial.update({
        where: { id: existenteCa.id },
        data: {
          nome,
          sku: item.codigo,
          statusContaAzul: item.status,
          precoBase:
            item.valorVenda == null
              ? null
              : new Prisma.Decimal(item.valorVenda),
          sincronizadoEm: agora,
          ...(inativoNoCa ? { ativo: false, importadoOperacao: false } : {}),
        },
      });
      return "atualizado";
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Último recurso: atualiza sem mexer no nome.
        await prisma.produtoComercial.update({
          where: { id: existenteCa.id },
          data: {
            sku: item.codigo,
            statusContaAzul: item.status,
            precoBase:
              item.valorVenda == null
                ? null
                : new Prisma.Decimal(item.valorVenda),
            sincronizadoEm: agora,
            ...(inativoNoCa ? { ativo: false, importadoOperacao: false } : {}),
          },
        });
        return "atualizado";
      }
      throw e;
    }
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
    const nome = await nomeDisponivelOuAlternativo(prisma, item.nome, {
      excluirId: legado.id,
      codigo: item.codigo,
      idCa: item.id,
    });
    try {
      await prisma.produtoComercial.update({
        where: { id: legado.id },
        data: {
          nome,
          sku: item.codigo,
          statusContaAzul: item.status,
          precoBase:
            item.valorVenda == null
              ? null
              : new Prisma.Decimal(item.valorVenda),
          sincronizadoEm: agora,
          contaAzulProdutoId: item.id,
          ativo: false,
          importadoOperacao: false,
        },
      });
      return "atualizado";
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        logger.warn(
          { produtoId: item.id, nome: item.nome, legadoId: legado.id },
          "Conflito ao vincular produto legado Conta Azul",
        );
        return "ignorado";
      }
      throw e;
    }
  }

  const nomeCreate = await nomeDisponivelOuAlternativo(prisma, item.nome, {
    codigo: item.codigo,
    idCa: item.id,
  });
  try {
    await prisma.produtoComercial.create({
      data: {
        nome: nomeCreate,
        sku: item.codigo,
        statusContaAzul: item.status,
        precoBase:
          item.valorVenda == null
            ? null
            : new Prisma.Decimal(item.valorVenda),
        sincronizadoEm: agora,
        contaAzulProdutoId: item.id,
        ativo: false,
        importadoOperacao: false,
      },
    });
    return "novo";
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      logger.warn(
        { produtoId: item.id, nome: item.nome },
        "Conflito ao criar produto Conta Azul",
      );
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
  amostraNomes: string[];
  avisos: string[];
};

let syncCatalogoProdutosEmAndamento: Promise<SincronizarCatalogoProdutosResult> | null =
  null;

export function isSyncCatalogoProdutosEmAndamento(): boolean {
  return syncCatalogoProdutosEmAndamento != null;
}

export type IniciarSyncCatalogoProdutosResult =
  | { status: "started"; emSegundoPlano: true }
  | { status: "already_running"; emSegundoPlano: true };

export async function sincronizarCatalogoProdutosContaAzul(
  prisma: PrismaClient,
  env: Env,
  opts?: FetchOpts,
): Promise<SincronizarCatalogoProdutosResult> {
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error(
      "Integração Conta Azul não configurada ou token inválido.",
    );
  }

  const http = createContaAzulHttp(env, cred.accessToken);
  const { itens, avisos } = await fetchTodosProdutosContaAzul(http, opts);
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
    avisos: avisos.slice(0, 8),
  };
}

export async function sincronizarCatalogoProdutosContaAzulExclusivo(
  prisma: PrismaClient,
  env: Env,
  opts?: FetchOpts,
): Promise<SincronizarCatalogoProdutosResult> {
  // Não reutiliza promise de outra busca — espera a anterior e roda com os opts pedidos.
  const prev = syncCatalogoProdutosEmAndamento;
  if (prev) {
    try {
      await prev;
    } catch {
      /* ignore */
    }
  }

  const execucao = sincronizarCatalogoProdutosContaAzul(prisma, env, opts);
  syncCatalogoProdutosEmAndamento = execucao;
  try {
    const resultado = await execucao;
    logger.info(
      { resultado, opts },
      "Catálogo de produtos Conta Azul sincronizado.",
    );
    return resultado;
  } catch (err) {
    logger.error(
      { err, opts },
      "Falha ao sincronizar catálogo de produtos Conta Azul.",
    );
    throw err;
  } finally {
    if (syncCatalogoProdutosEmAndamento === execucao) {
      syncCatalogoProdutosEmAndamento = null;
    }
  }
}

/** @deprecated Prefira sincronizarCatalogoProdutosContaAzulExclusivo. */
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
    throw new Error(
      "Nenhum produto do catálogo Conta Azul encontrado para importar.",
    );
  }

  const elegiveis = produtos.filter(p => {
    const st = (p.statusContaAzul ?? "").toUpperCase();
    return st === "ATIVO" || st === "ACTIVE" || !st;
  });
  const ignoradosInativosCa = produtos.length - elegiveis.length;
  if (elegiveis.length === 0) {
    throw new Error(
      "Nenhum dos produtos selecionados está ATIVO no Conta Azul. Não é possível ativar na operação.",
    );
  }

  await prisma.produtoComercial.updateMany({
    where: { id: { in: elegiveis.map(p => p.id) } },
    data: { importadoOperacao: true, ativo: true },
  });

  return { importados: elegiveis.length, ignoradosInativosCa };
}

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
