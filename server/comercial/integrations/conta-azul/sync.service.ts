import { AcaoApi, StatusExecucaoApi } from "../../generated/prisma/index.js";
import type { PrismaClient } from "../../generated/prisma/index.js";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import { createContaAzulHttp, contaAzulGet } from "./conta-azul.client";
import {
  mapClienteUpsert,
  mapPedidoCreate,
  mapPessoaApiItem,
  mapPessoaFromVendaClienteEmbutido,
  pessoaItemTemPerfilCliente,
  extrairNumeroVendaContaAzul,
  mapVendaBuscaItem,
  mapVendaItensResponse,
  parseDataVendaContaAzul,
  type ContaAzulPedidoItemPayload,
  type ContaAzulProdutoCategoriaLookup,
  type ContaAzulPessoasListResponse,
} from "./mappers";
import { refreshAccessToken } from "./oauth.service";
import { runInteligenciaComercial } from "../../services/inteligencia-comercial";
import { processarConciliacaoAposSyncVenda } from "../../lib/conciliacao-pedidos.js";
import {
  composicaoFromTotalApenas,
  composicaoFromVendaBuscaItem,
  composicaoFromVendaDetalhe,
  extrairMetadadosVendaDetalhe,
  normalizarComposicao,
  pedidoPrecisaEnriquecerComposicao,
  precisaDetalheComposicao,
  vendaDetalheDeveSerIgnorada,
  type ComposicaoValorPedido,
} from "../../lib/composicao-valor.js";
import type { AxiosInstance } from "axios";
import {
  contaAzulSyncDetailBudget,
  type ContaAzulSyncMode,
} from "./conta-azul-sync-detail-budget";

export async function ensureValidAccessToken(prisma: PrismaClient, env: Env) {
  const cred = await prisma.integrationCredential.findUnique({
    where: { provider: "CONTA_AZUL" },
  });
  if (!cred?.accessToken) return null;
  if (!cred.expiresAt || cred.expiresAt.getTime() > Date.now() + 60_000)
    return cred;
  if (!cred.refreshToken) return cred;

  const refreshed = await refreshAccessToken(env, cred.refreshToken);
  const expiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;

  return prisma.integrationCredential.update({
    where: { provider: "CONTA_AZUL" },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? cred.refreshToken,
      expiresAt,
      metadata: {
        ...(typeof cred.metadata === "object" && cred.metadata
          ? (cred.metadata as Record<string, unknown>)
          : {}),
        tokenType: refreshed.token_type ?? "Bearer",
      },
    },
  });
}

/** API Conta Azul: data_alteracao_de + data_alteracao_ate (ISO 8601); intervalo máximo 365 dias. */
const MS_365_DIAS = 365 * 24 * 60 * 60 * 1000;

/** Doc: "ISO 8601, São Paulo/GMT-3". `toISOString()` (UTC/Z) costuma gerar 400/500 no filtro. */
function formatContaAzulDataAlteracao(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === t)?.value ?? "00";
  const y = get("year");
  const mo = get("month").padStart(2, "0");
  const day = get("day").padStart(2, "0");
  const h = get("hour").padStart(2, "0");
  const mi = get("minute").padStart(2, "0");
  const s = get("second").padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}:${s}-03:00`;
}

function buildPessoasPath(cursor: string | null, pagina = 1, tamanhoPagina = 100): string {
  const qs = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: String(tamanhoPagina),
    tipo_ordenacao: "NOME",
    ordem_ordenacao: "ASC",
    /** Doc Conta Azul: evita misturar fornecedor/transportadora na carteira comercial. */
    tipo_perfil: "Cliente",
  });
  // Incremental: enviar o par de datas; só "data_alteracao_de" costuma gerar HTTP 400.
  if (cursor && /^\d{4}-\d{2}-\d{2}T/.test(cursor)) {
    const ate = new Date();
    let deMs = Date.parse(cursor);
    if (!Number.isNaN(deMs)) {
      const ateMs = ate.getTime();
      if (deMs > ateMs) deMs = ateMs - 60_000;
      if (ateMs - deMs > MS_365_DIAS) {
        deMs = ateMs - MS_365_DIAS + 1000;
      }
      qs.set("data_alteracao_de", formatContaAzulDataAlteracao(new Date(deMs)));
      qs.set("data_alteracao_ate", formatContaAzulDataAlteracao(ate));
    }
  }
  return `/v1/pessoas?${qs.toString()}`;
}

function pessoasPathUsaFiltroData(path: string): boolean {
  return path.includes("data_alteracao_de=");
}

async function fetchTodasPessoas(
  http: AxiosInstance,
  cursor: string | null,
): Promise<ContaAzulPessoasListResponse> {
  const tamanho = 100;
  const maxPaginas = 100;
  const items: NonNullable<ContaAzulPessoasListResponse["items"]> = [];
  let total: number | undefined;

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const path = buildPessoasPath(cursor, pagina, tamanho);
    let res: ContaAzulPessoasListResponse;
    try {
      res = await contaAzulGet<ContaAzulPessoasListResponse>(http, path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const podeTentarSemFiltro =
        pessoasPathUsaFiltroData(path) &&
        /\bConta Azul \((400|500|502|503)\)/.test(msg);
      if (podeTentarSemFiltro) {
        logger.warn(
          { err: e },
          "Conta Azul GET /v1/pessoas com filtro de data falhou; repetindo sem data_alteracao_*"
        );
        return fetchTodasPessoas(http, null);
      }
      throw e;
    }

    const batch = res.items ?? [];
    items.push(...batch);
    total = res.totalItems ?? res.total_items ?? res.total_itens ?? total;
    if (batch.length === 0) break;
    if (batch.length < tamanho) break;
    if (typeof total === "number" && items.length >= total) break;
  }

  return { items, totalItems: total ?? items.length };
}

async function enriquecerPessoasComEnderecoDetalhado(
  http: AxiosInstance,
  rawItems: NonNullable<ContaAzulPessoasListResponse["items"]>,
): Promise<NonNullable<ContaAzulPessoasListResponse["items"]>> {
  const out: NonNullable<ContaAzulPessoasListResponse["items"]> = [];
  for (const raw of rawItems) {
    const mapped = mapPessoaApiItem(raw);
    if (mapped.endereco || !raw.id) {
      out.push(raw);
      continue;
    }
    try {
      const detalhe = await contaAzulGet<NonNullable<ContaAzulPessoasListResponse["items"]>[number]>(
        http,
        `/v1/pessoas/${encodeURIComponent(raw.id)}`
      );
      const enderecoDetalhe = mapPessoaApiItem(detalhe).endereco;
      out.push(enderecoDetalhe ? { ...raw, endereco: enderecoDetalhe } : raw);
    } catch (e) {
      logger.warn(
        { pessoaId: raw.id, err: e instanceof Error ? e.message : String(e) },
        "Conta Azul: detalhe da pessoa indisponível para endereço"
      );
      out.push(raw);
    }
  }
  return out;
}

async function upsertClientesContaAzul(
  prisma: PrismaClient,
  rawItems: NonNullable<ContaAzulPessoasListResponse["items"]>,
): Promise<{ clientesProcessados: number; clientesComEndereco: number; maxAlteracao: string | null }> {
  let clientesComEndereco = 0;
  let clientesProcessados = 0;
  let maxAlteracao: string | null = null;

  for (const raw of rawItems) {
    if (!pessoaItemTemPerfilCliente(raw)) {
      logger.debug(
        { id: raw.id, nome: raw.nome, perfis: raw.perfis },
        "Pessoa ignorada (sem perfil Cliente)"
      );
      continue;
    }
    const p = mapPessoaApiItem(raw);
    if (!p.id) continue;
    const data = mapClienteUpsert(p);
    if (data.endereco) clientesComEndereco++;
    clientesProcessados++;
    await prisma.cliente.upsert({
      where: { externalId: p.id },
      create: { ...data, externalId: p.id },
      update: {
        nome: data.nome,
        cnpjCpf: data.cnpjCpf,
        ...(data.endereco ? { endereco: data.endereco } : {}),
        emailPrincipal: data.emailPrincipal,
        telefoneWhatsapp: data.telefoneWhatsapp,
        contatoPrincipal: data.contatoPrincipal,
      },
    });

    if (raw.data_alteracao) {
      if (!maxAlteracao || raw.data_alteracao > maxAlteracao)
        maxAlteracao = raw.data_alteracao;
    }
  }

  return { clientesProcessados, clientesComEndereco, maxAlteracao };
}

/** data_inicio/fim como calendário America/Sao_Paulo (evita deslocar dia vs UTC). */
function formatDataCalendarioSp(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function vendasBuscaRange(dias: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - dias);
  return { start, end };
}

function buildVendasBuscaPath(
  pagina: number,
  dias: number,
  tamanhoPagina: number
): string {
  const { start, end } = vendasBuscaRange(dias);
  const qs = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: String(tamanhoPagina),
    campo_ordenado_descendente: "DATA",
    data_inicio: formatDataCalendarioSp(start),
    data_fim: formatDataCalendarioSp(end),
  });
  return `/v1/venda/busca?${qs.toString()}`;
}

type ResolveComposicaoCtx = {
  detailBudget: { remaining: number };
};

type ResolveComposicaoResult = {
  composicao: ComposicaoValorPedido;
  composicaoDetalhada: boolean;
  ignorar?: boolean;
  statusPedido?: string;
  itens?: ContaAzulPedidoItemPayload[];
};

export type { ContaAzulSyncMode } from "./conta-azul-sync-detail-budget";

async function fetchComposicaoDetalheVenda(
  http: AxiosInstance,
  vendaId: string,
  totalFallback: number,
  ctx: ResolveComposicaoCtx
): Promise<ResolveComposicaoResult | null> {
  if (ctx.detailBudget.remaining <= 0) return null;
  ctx.detailBudget.remaining--;
  try {
    const detail = await contaAzulGet<unknown>(
      http,
      `/v1/venda/${encodeURIComponent(vendaId)}`
    );
    const meta = extrairMetadadosVendaDetalhe(detail);
    if (vendaDetalheDeveSerIgnorada(meta)) {
      return {
        composicao: composicaoFromTotalApenas(0),
        composicaoDetalhada: true,
        ignorar: true,
      };
    }
    const fromDetail =
      meta.composicao ??
      normalizarComposicao(composicaoFromVendaDetalhe(detail), totalFallback);
    return {
      composicao: fromDetail ?? composicaoFromTotalApenas(totalFallback),
      composicaoDetalhada: Boolean(fromDetail),
      statusPedido: meta.situacaoNome ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(
      { vendaId, err: msg },
      "Conta Azul: detalhe da venda indisponível"
    );
    if (/\(429\)/.test(msg)) ctx.detailBudget.remaining = 0;
    return null;
  }
}

async function fetchItensVenda(
  http: AxiosInstance,
  vendaId: string,
  ctx: ResolveComposicaoCtx,
  catalogoProdutos: ContaAzulProdutoCategoriaLookup[]
): Promise<ContaAzulPedidoItemPayload[] | null> {
  if (ctx.detailBudget.remaining <= 0) return null;
  ctx.detailBudget.remaining--;
  try {
    const raw = await contaAzulGet<unknown>(
      http,
      `/v1/venda/${encodeURIComponent(vendaId)}/itens`
    );
    return mapVendaItensResponse(raw, catalogoProdutos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(
      { vendaId, err: msg },
      "Conta Azul: itens da venda indisponíveis"
    );
    if (/\(429\)/.test(msg)) ctx.detailBudget.remaining = 0;
    return null;
  }
}

/** Segunda passagem: pedidos já gravos só com total (sem frete/desconto no banco). */
async function enriquecerComposicaoPedidosPendentes(
  prisma: PrismaClient,
  http: AxiosInstance,
  ctx: ResolveComposicaoCtx,
  catalogoProdutos: ContaAzulProdutoCategoriaLookup[]
): Promise<number> {
  if (ctx.detailBudget.remaining <= 0) return 0;

  const candidatos = await prisma.pedido.findMany({
    where: {
      externalId: { not: null },
      origemPedido: "CONTA_AZUL",
    },
    select: {
      id: true,
      externalId: true,
      valorTotal: true,
      valorBruto: true,
      valorFrete: true,
      valorDesconto: true,
      valorLiquido: true,
      composicaoDetalhada: true,
      _count: { select: { itens: true } },
    },
    orderBy: { dataPedido: "desc" },
    take: Math.min(ctx.detailBudget.remaining, 5_000),
  });

  let enriquecidos = 0;
  for (const p of candidatos) {
    if (ctx.detailBudget.remaining <= 0) break;
    const precisaComposicao = pedidoPrecisaEnriquecerComposicao(p);
    const precisaItens = p._count.itens === 0;
    if (!precisaComposicao && !precisaItens) continue;
    const totalFallback = Number(p.valorLiquido ?? p.valorTotal ?? 0);
    const [detailResult, itens] = await Promise.all([
      precisaComposicao
        ? fetchComposicaoDetalheVenda(http, p.externalId!, totalFallback, ctx)
        : Promise.resolve(null),
      precisaItens
        ? fetchItensVenda(http, p.externalId!, ctx, catalogoProdutos)
        : Promise.resolve(null),
    ]);
    if (detailResult?.ignorar) {
      await prisma.pedido.delete({ where: { id: p.id } });
      continue;
    }
    if (!detailResult && !itens?.length) continue;

    await prisma.pedido.update({
      where: { id: p.id },
      data: {
        ...(detailResult
          ? {
              valorTotal: detailResult.composicao.valorLiquido,
              valorBruto: detailResult.composicao.valorBruto,
              valorFrete: detailResult.composicao.valorFrete,
              valorDesconto: detailResult.composicao.valorDesconto,
              valorLiquido: detailResult.composicao.valorLiquido,
              composicaoDetalhada: detailResult.composicaoDetalhada,
              statusPedido: detailResult.statusPedido ?? undefined,
            }
          : {}),
        ...(itens?.length
          ? {
              itens: {
                deleteMany: {},
                create: itens.map(i => ({
                  sku: i.sku ?? null,
                  produto: i.nome,
                  categoria: i.categoria ?? null,
                  quantidade: i.qtd ?? 1,
                  precoUnit: i.preco ?? 0,
                  custoUnit: i.custo ?? null,
                })),
              },
            }
          : {}),
      },
    });
    enriquecidos++;
  }
  return enriquecidos;
}

async function resolveComposicaoVenda(
  http: AxiosInstance,
  raw: unknown,
  totalFallback: number,
  vendaId: string,
  ctx: ResolveComposicaoCtx,
  catalogoProdutos: ContaAzulProdutoCategoriaLookup[]
): Promise<ResolveComposicaoResult> {
  const fromBusca = normalizarComposicao(
    composicaoFromVendaBuscaItem(raw),
    totalFallback
  );
  const itensPromise = fetchItensVenda(http, vendaId, ctx, catalogoProdutos);

  if (!precisaDetalheComposicao(fromBusca, totalFallback)) {
    return {
      composicao: fromBusca ?? composicaoFromTotalApenas(totalFallback),
      composicaoDetalhada: Boolean(fromBusca),
      itens: (await itensPromise) ?? undefined,
    };
  }

  if (ctx.detailBudget.remaining <= 0) {
    return {
      composicao: fromBusca ?? composicaoFromTotalApenas(totalFallback),
      composicaoDetalhada: false,
      itens: (await itensPromise) ?? undefined,
    };
  }

  ctx.detailBudget.remaining--;
  try {
    const detail = await contaAzulGet<unknown>(
      http,
      `/v1/venda/${encodeURIComponent(vendaId)}`
    );
    const meta = extrairMetadadosVendaDetalhe(detail);
    if (vendaDetalheDeveSerIgnorada(meta)) {
      return {
        composicao: composicaoFromTotalApenas(totalFallback),
        composicaoDetalhada: false,
        ignorar: true,
      };
    }
    const fromDetail =
      meta.composicao ??
      normalizarComposicao(composicaoFromVendaDetalhe(detail), totalFallback);
    return {
      composicao: fromDetail ?? composicaoFromTotalApenas(totalFallback),
      composicaoDetalhada: Boolean(fromDetail),
      statusPedido: meta.situacaoNome ?? undefined,
      itens: (await itensPromise) ?? undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(
      { vendaId, err: msg },
      "Conta Azul: detalhe da venda indisponível — usando total da busca"
    );
    if (/\(429\)/.test(msg)) ctx.detailBudget.remaining = 0;
  }

  return {
    composicao: fromBusca ?? composicaoFromTotalApenas(totalFallback),
    composicaoDetalhada: false,
    itens: (await itensPromise) ?? undefined,
  };
}

/** Busca todas as páginas de vendas no período (histórico), até limite de segurança. */
async function fetchTodasVendasBusca(
  http: AxiosInstance,
  env: Env
): Promise<unknown[]> {
  const dias = env.CONTA_AZUL_VENDAS_SYNC_DIAS;
  const tamanho = 200;
  const todas: unknown[] = [];
  const maxPaginas = 100;
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const path = buildVendasBuscaPath(pagina, dias, tamanho);
    type VendasPage = { itens?: unknown[]; total_itens?: number };
    const res = await contaAzulGet<VendasPage>(http, path);
    const batch = res.itens ?? [];
    todas.push(...batch);
    if (batch.length === 0) break;
    if (batch.length < tamanho) break;
    if (typeof res.total_itens === "number" && todas.length >= res.total_itens)
      break;
  }
  return todas;
}

async function removerVendasForaDaBuscaAtual(
  prisma: PrismaClient,
  env: Env,
  vendaIdsAtuais: Set<string>
): Promise<number> {
  if (vendaIdsAtuais.size === 0) return 0;
  const { start, end } = vendasBuscaRange(env.CONTA_AZUL_VENDAS_SYNC_DIAS);
  const result = await prisma.pedido.deleteMany({
    where: {
      origemPedido: "CONTA_AZUL",
      externalId: { not: null, notIn: Array.from(vendaIdsAtuais) },
      dataPedido: {
        gte: parseDataVendaContaAzul(formatDataCalendarioSp(start)),
        lte: new Date(`${formatDataCalendarioSp(end)}T23:59:59.999-03:00`),
      },
    },
  });
  return result.count;
}

export type ContaAzulSyncResult = {
  clientesProcessados: number;
  clientesComEndereco: number;
  vendasRecebidas: number;
  pedidosGravados: number;
  inteligenciaOportunidades: number;
};

let syncEmAndamento: Promise<ContaAzulSyncResult> | null = null;

/**
 * Sincronização: GET /v1/pessoas e GET /v1/venda/busca (janela CONTA_AZUL_VENDAS_SYNC_DIAS, páginas completas) — grava clientes e pedidos.
 */
export function isContaAzulSyncEmAndamento(): boolean {
  return syncEmAndamento != null;
}

export type IniciarSyncContaAzulResult =
  | { status: "started" }
  | { status: "already_running" };

/** Dispara sync sem bloquear a requisição HTTP (evita timeout do navegador/proxy). */
export function iniciarSyncContaAzulEmBackground(
  prisma: PrismaClient,
  env: Env,
  mode: ContaAzulSyncMode = "manual",
  options?: { forceFullClientes?: boolean }
): IniciarSyncContaAzulResult {
  if (syncEmAndamento) return { status: "already_running" };
  const execucao = executarContaAzulSync(prisma, env, mode, options);
  syncEmAndamento = execucao;
  void execucao.finally(() => {
    if (syncEmAndamento === execucao) syncEmAndamento = null;
  });
  return { status: "started" };
}

export type ContaAzulClientesSyncResult = {
  clientesProcessados: number;
  clientesComEndereco: number;
};

export async function runContaAzulClientesSync(
  prisma: PrismaClient,
  env: Env,
  options?: { forceFullClientes?: boolean }
): Promise<ContaAzulClientesSyncResult> {
  const started = Date.now();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.FALHA,
        detalhesExecucao: {
          step: "clientes_enderecos",
          message: "Sem access token configurado",
        },
        duracaoMs: Date.now() - started,
      },
    });
    throw new Error(
      "Conta Azul: sem token — conclua OAuth em /integrations/conta-azul/auth"
    );
  }

  try {
    const http = createContaAzulHttp(env, cred.accessToken);
    const syncState = await prisma.syncState.upsert({
      where: { provider: "CONTA_AZUL" },
      create: { provider: "CONTA_AZUL" },
      update: {},
    });
    const cursor = options?.forceFullClientes ? null : syncState.cursor;
    const pessoasRes = await fetchTodasPessoas(http, cursor);
    const rawItems = await enriquecerPessoasComEnderecoDetalhado(http, pessoasRes.items ?? []);
    const clientesSync = await upsertClientesContaAzul(prisma, rawItems);
    if (clientesSync.maxAlteracao) {
      await prisma.syncState.update({
        where: { provider: "CONTA_AZUL" },
        data: { cursor: clientesSync.maxAlteracao },
      });
    }

    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.SUCESSO,
        detalhesExecucao: {
          step: "clientes_enderecos",
          clientesProcessados: clientesSync.clientesProcessados,
          clientesComEndereco: clientesSync.clientesComEndereco,
          totalPessoasContaAzul: pessoasRes.totalItems ?? rawItems.length,
          forceFullClientes: Boolean(options?.forceFullClientes),
        },
        duracaoMs: Date.now() - started,
      },
    });

    logger.info(
      {
        clientes: clientesSync.clientesProcessados,
        clientesComEndereco: clientesSync.clientesComEndereco,
      },
      "Conta Azul: sync de clientes/endereço concluído"
    );

    return {
      clientesProcessados: clientesSync.clientesProcessados,
      clientesComEndereco: clientesSync.clientesComEndereco,
    };
  } catch (e) {
    logger.error({ err: e }, "Conta Azul: sync de clientes/endereço falhou");
    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.FALHA,
        mensagemErro: e instanceof Error ? e.message : String(e),
        detalhesExecucao: { step: "clientes_enderecos" },
        duracaoMs: Date.now() - started,
      },
    });
    throw e;
  }
}

export async function runContaAzulSync(
  prisma: PrismaClient,
  env: Env,
  options?: { mode?: ContaAzulSyncMode; skipIfBusy?: boolean; forceFullClientes?: boolean }
): Promise<ContaAzulSyncResult> {
  if (syncEmAndamento) {
    if (options?.skipIfBusy) {
      logger.info(
        "Conta Azul: sync ignorado — outra sincronização já está em andamento"
      );
      return {
        clientesProcessados: 0,
        clientesComEndereco: 0,
        vendasRecebidas: 0,
        pedidosGravados: 0,
        inteligenciaOportunidades: 0,
      };
    }
    throw new Error(
      "Já existe uma sincronização Conta Azul em andamento. Aguarde terminar (pode levar vários minutos) antes de clicar de novo."
    );
  }

  const mode = options?.mode ?? "manual";
  const execucao = executarContaAzulSync(prisma, env, mode, {
    forceFullClientes: options?.forceFullClientes,
  });
  syncEmAndamento = execucao;
  try {
    return await execucao;
  } finally {
    if (syncEmAndamento === execucao) syncEmAndamento = null;
  }
}

async function executarContaAzulSync(
  prisma: PrismaClient,
  env: Env,
  mode: ContaAzulSyncMode,
  options?: { forceFullClientes?: boolean }
): Promise<ContaAzulSyncResult> {
  const started = Date.now();
  const composicaoCtx: ResolveComposicaoCtx = {
    detailBudget: { remaining: contaAzulSyncDetailBudget(mode) },
  };
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.FALHA,
        detalhesExecucao: {
          step: "token",
          message: "Sem access token configurado",
        },
        duracaoMs: Date.now() - started,
      },
    });
    throw new Error(
      "Conta Azul: sem token — conclua OAuth em /integrations/conta-azul/auth"
    );
  }

  try {
    const http = createContaAzulHttp(env, cred.accessToken);
    const syncState = await prisma.syncState.upsert({
      where: { provider: "CONTA_AZUL" },
      create: { provider: "CONTA_AZUL" },
      update: {},
    });

    const cursor = options?.forceFullClientes ? null : syncState.cursor;
    const pessoasRes = await fetchTodasPessoas(http, cursor);
    const rawItems = pessoasRes.items ?? [];

    let nextCursor: string | null = cursor ?? null;
    const clientesSync = await upsertClientesContaAzul(prisma, rawItems);
    const { clientesComEndereco } = clientesSync;

    if (clientesSync.maxAlteracao) nextCursor = clientesSync.maxAlteracao;

    const vendasItens = await fetchTodasVendasBusca(http, env);
    const vendaIdsAtuais = new Set<string>();
    const catalogoProdutos = await prisma.produtoComercial.findMany({
      where: { contaAzulProdutoId: { not: null }, ativo: true, importadoOperacao: true },
      select: { nome: true, categoria: true },
    });

    let pedidosGravados = 0;
    let conciliacaoSugestoes = 0;
    let conciliacaoDivergencias = 0;
    for (const raw of vendasItens) {
      const mapped = mapVendaBuscaItem(raw);
      if (!mapped) continue;
      const { clienteExternalId, payload } = mapped;
      if (!payload.id) continue;
      vendaIdsAtuais.add(payload.id);
      let cli = await prisma.cliente.findUnique({
        where: { externalId: clienteExternalId },
      });
      if (!cli) {
        const pessoaVenda = mapPessoaFromVendaClienteEmbutido(raw);
        if (pessoaVenda?.id) {
          const data = mapClienteUpsert(pessoaVenda);
          cli = await prisma.cliente.upsert({
            where: { externalId: pessoaVenda.id },
            create: { ...data, externalId: pessoaVenda.id },
            update: {
              nome: data.nome,
              cnpjCpf: data.cnpjCpf,
              ...(data.endereco ? { endereco: data.endereco } : {}),
              emailPrincipal: data.emailPrincipal,
              telefoneWhatsapp: data.telefoneWhatsapp,
              contatoPrincipal: data.contatoPrincipal,
            },
          });
        }
      }
      if (!cli) {
        logger.warn(
          { clienteExternalId, vendaId: payload.id },
          "Venda Conta Azul sem cliente local e sem dados de cliente na venda."
        );
        continue;
      }
      const dataPedido = parseDataVendaContaAzul(payload.data);
      const resolved = await resolveComposicaoVenda(
        http,
        raw,
        payload.total ?? 0,
        payload.id,
        composicaoCtx,
        catalogoProdutos
      );
      if (resolved.ignorar) {
        await prisma.pedido.deleteMany({ where: { externalId: payload.id } });
        continue;
      }
      const { composicao, composicaoDetalhada, statusPedido } = resolved;
      const numeroVenda = payload.numeroVenda ?? extrairNumeroVendaContaAzul(raw) ?? undefined;
      const payloadComItens = {
        ...payload,
        numeroVenda,
        itens: resolved.itens?.length ? resolved.itens : payload.itens,
      };
      const saved = await prisma.pedido.upsert({
        where: { externalId: payload.id },
        create: mapPedidoCreate(
          cli.id,
          payloadComItens,
          composicao,
          composicaoDetalhada,
          statusPedido
        ),
        update: {
          numeroVenda: numeroVenda ?? undefined,
          dataPedido,
          valorTotal: composicao.valorLiquido,
          valorBruto: composicao.valorBruto,
          valorFrete: composicao.valorFrete,
          valorDesconto: composicao.valorDesconto,
          valorLiquido: composicao.valorLiquido,
          composicaoDetalhada,
          statusPedido: statusPedido ?? payload.status ?? "SYNC",
          ...(payloadComItens.itens?.length
            ? {
                itens: {
                  deleteMany: {},
                  create: payloadComItens.itens.map(i => ({
                    sku: i.sku ?? null,
                    produto: i.nome,
                    categoria: i.categoria ?? null,
                    quantidade: i.qtd ?? 1,
                    precoUnit: i.preco ?? 0,
                    custoUnit: i.custo ?? null,
                  })),
                },
              }
            : {}),
        },
      });
      pedidosGravados++;
      const conc = await processarConciliacaoAposSyncVenda(prisma, saved.id);
      conciliacaoSugestoes += conc.sugestoes;
      conciliacaoDivergencias += conc.divergencias;
    }

    const pedidosRemovidosForaDaBusca = await removerVendasForaDaBuscaAtual(
      prisma,
      env,
      vendaIdsAtuais
    );
    const composicaoEnriquecidos = await enriquecerComposicaoPedidosPendentes(
      prisma,
      http,
      composicaoCtx,
      catalogoProdutos
    );

    const intel = await runInteligenciaComercial(prisma);

    await prisma.syncState.update({
      where: { provider: "CONTA_AZUL" },
      data: { cursor: nextCursor, lastSyncAt: new Date() },
    });

    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.SUCESSO,
        detalhesExecucao: {
          clientesProcessados: rawItems.length,
          clientesComEndereco,
          totalPessoasContaAzul: pessoasRes.totalItems ?? rawItems.length,
          vendasRecebidas: vendasItens.length,
          pedidosGravados,
          inteligenciaOportunidades: intel.oportunidadesCriadas,
          inteligenciaClientes: intel.clientesAtualizados,
          cursor: nextCursor,
          syncMode: mode,
          detalhesVendaRestantes: composicaoCtx.detailBudget.remaining,
          composicaoEnriquecidos,
          pedidosRemovidosForaDaBusca,
          conciliacaoSugestoes,
          conciliacaoDivergencias,
        },
        duracaoMs: Date.now() - started,
      },
    });

    logger.info(
      {
        clientes: rawItems.length,
        clientesComEndereco,
        vendasRecebidas: vendasItens.length,
        pedidosGravados,
        intelOportunidades: intel.oportunidadesCriadas,
      },
      "Sync Conta Azul concluído"
    );

    return {
      clientesProcessados: rawItems.length,
      clientesComEndereco,
      vendasRecebidas: vendasItens.length,
      pedidosGravados,
      inteligenciaOportunidades: intel.oportunidadesCriadas,
    };
  } catch (e) {
    logger.error({ err: e }, "Sync Conta Azul falhou");
    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.FALHA,
        detalhesExecucao: { message: String(e) },
        mensagemErro: e instanceof Error ? e.message : "erro",
        duracaoMs: Date.now() - started,
      },
    });
    throw e;
  }
}
