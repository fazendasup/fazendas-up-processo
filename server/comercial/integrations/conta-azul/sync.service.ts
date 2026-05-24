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
  mapVendaBuscaItem,
  mapVendaItensResponse,
  parseDataVendaContaAzul,
  type ContaAzulPedidoItemPayload,
  type ContaAzulProdutoCategoriaLookup,
  type ContaAzulPessoasListResponse,
} from "./mappers";
import { refreshAccessToken } from "./oauth.service";
import { runInteligenciaComercial } from "../../services/inteligencia-comercial";
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

function buildPessoasPath(cursor: string | null): string {
  const qs = new URLSearchParams({
    pagina: "1",
    tamanho_pagina: "100",
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
  mode: ContaAzulSyncMode = "manual"
): IniciarSyncContaAzulResult {
  if (syncEmAndamento) return { status: "already_running" };
  const execucao = executarContaAzulSync(prisma, env, mode);
  syncEmAndamento = execucao;
  void execucao.finally(() => {
    if (syncEmAndamento === execucao) syncEmAndamento = null;
  });
  return { status: "started" };
}

export async function runContaAzulSync(
  prisma: PrismaClient,
  env: Env,
  options?: { mode?: ContaAzulSyncMode; skipIfBusy?: boolean }
): Promise<ContaAzulSyncResult> {
  if (syncEmAndamento) {
    if (options?.skipIfBusy) {
      logger.info(
        "Conta Azul: sync ignorado — outra sincronização já está em andamento"
      );
      return {
        clientesProcessados: 0,
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
  const execucao = executarContaAzulSync(prisma, env, mode);
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
  mode: ContaAzulSyncMode
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

    const cursor = syncState.cursor;

    const pathPessoas = buildPessoasPath(cursor);
    let pessoasRes: ContaAzulPessoasListResponse;
    try {
      pessoasRes = await contaAzulGet<ContaAzulPessoasListResponse>(
        http,
        pathPessoas
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const podeTentarSemFiltro =
        pessoasPathUsaFiltroData(pathPessoas) &&
        /\bConta Azul \((400|500|502|503)\)/.test(msg);
      if (podeTentarSemFiltro) {
        logger.warn(
          { err: e },
          "Conta Azul GET /v1/pessoas com filtro de data falhou; repetindo sem data_alteracao_*"
        );
        pessoasRes = await contaAzulGet<ContaAzulPessoasListResponse>(
          http,
          buildPessoasPath(null)
        );
      } else {
        throw e;
      }
    }
    const rawItems = pessoasRes.items ?? [];

    let nextCursor: string | null = cursor ?? null;
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
      await prisma.cliente.upsert({
        where: { externalId: p.id },
        create: { ...data, externalId: p.id },
        update: {
          nome: data.nome,
          cnpjCpf: data.cnpjCpf,
          endereco: data.endereco,
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

    if (maxAlteracao) nextCursor = maxAlteracao;

    const vendasItens = await fetchTodasVendasBusca(http, env);
    const vendaIdsAtuais = new Set<string>();
    const catalogoProdutos = await prisma.produtoComercial.findMany({
      where: { ativo: true },
      select: { nome: true, categoria: true },
    });

    let pedidosGravados = 0;
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
              endereco: data.endereco,
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
      const payloadComItens = {
        ...payload,
        itens: resolved.itens?.length ? resolved.itens : payload.itens,
      };
      await prisma.pedido.upsert({
        where: { externalId: payload.id },
        create: mapPedidoCreate(
          cli.id,
          payloadComItens,
          composicao,
          composicaoDetalhada,
          statusPedido
        ),
        update: {
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
                  })),
                },
              }
            : {}),
        },
      });
      pedidosGravados++;
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
        },
        duracaoMs: Date.now() - started,
      },
    });

    logger.info(
      {
        clientes: rawItems.length,
        vendasRecebidas: vendasItens.length,
        pedidosGravados,
        intelOportunidades: intel.oportunidadesCriadas,
      },
      "Sync Conta Azul concluído"
    );

    return {
      clientesProcessados: rawItems.length,
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
