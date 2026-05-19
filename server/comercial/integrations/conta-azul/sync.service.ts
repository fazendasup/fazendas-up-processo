import { AcaoApi, StatusExecucaoApi } from "../../generated/prisma/index.js";
import type { PrismaClient } from "../../generated/prisma/index.js";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import type { AxiosInstance } from "axios";
import { createContaAzulHttp, contaAzulGet } from "./conta-azul.client";
import {
  mapClienteUpsert,
  mapPedidoCreate,
  mapPessoaApiItem,
  mapPessoaFromVendaClienteEmbutido,
  pessoaItemTemPerfilCliente,
  mapVendaBuscaItem,
  parseDataVendaContaAzul,
  type ContaAzulPessoasListResponse,
} from "./mappers";
import { refreshAccessToken } from "./oauth.service";
import { runInteligenciaComercial } from "../../services/inteligencia-comercial";

export async function ensureValidAccessToken(prisma: PrismaClient, env: Env) {
  const cred = await prisma.integrationCredential.findUnique({ where: { provider: "CONTA_AZUL" } });
  if (!cred?.accessToken) return null;
  if (!cred.expiresAt || cred.expiresAt.getTime() > Date.now() + 60_000) return cred;
  if (!cred.refreshToken) return cred;

  const refreshed = await refreshAccessToken(env, cred.refreshToken);
  const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;

  return prisma.integrationCredential.update({
    where: { provider: "CONTA_AZUL" },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? cred.refreshToken,
      expiresAt,
      metadata: {
        ...(typeof cred.metadata === "object" && cred.metadata ? (cred.metadata as Record<string, unknown>) : {}),
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
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "00";
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

function buildVendasBuscaPath(pagina: number, dias: number, tamanhoPagina: number): string {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - dias);
  const qs = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: String(tamanhoPagina),
    campo_ordenado_descendente: "DATA",
    data_inicio: formatDataCalendarioSp(start),
    data_fim: formatDataCalendarioSp(end),
  });
  return `/v1/venda/busca?${qs.toString()}`;
}

/** Busca todas as páginas de vendas no período (histórico), até limite de segurança. */
async function fetchTodasVendasBusca(http: AxiosInstance, env: Env): Promise<unknown[]> {
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
    if (typeof res.total_itens === "number" && todas.length >= res.total_itens) break;
  }
  return todas;
}

export type ContaAzulSyncResult = {
  clientesProcessados: number;
  vendasRecebidas: number;
  pedidosGravados: number;
  inteligenciaOportunidades: number;
};

/**
 * Sincronização: GET /v1/pessoas e GET /v1/venda/busca (janela CONTA_AZUL_VENDAS_SYNC_DIAS, páginas completas) — grava clientes e pedidos.
 */
export async function runContaAzulSync(prisma: PrismaClient, env: Env): Promise<ContaAzulSyncResult> {
  const started = Date.now();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    await prisma.execucaoApi.create({
      data: {
        acaoApi: AcaoApi.SYNC_CA,
        statusExecucao: StatusExecucaoApi.FALHA,
        detalhesExecucao: { step: "token", message: "Sem access token configurado" },
        duracaoMs: Date.now() - started,
      },
    });
    throw new Error("Conta Azul: sem token — conclua OAuth em /integrations/conta-azul/auth");
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
      pessoasRes = await contaAzulGet<ContaAzulPessoasListResponse>(http, pathPessoas);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const podeTentarSemFiltro =
        pessoasPathUsaFiltroData(pathPessoas) &&
        /\bConta Azul \((400|500|502|503)\)/.test(msg);
      if (podeTentarSemFiltro) {
        logger.warn(
          { err: e },
          "Conta Azul GET /v1/pessoas com filtro de data falhou; repetindo sem data_alteracao_*",
        );
        pessoasRes = await contaAzulGet<ContaAzulPessoasListResponse>(http, buildPessoasPath(null));
      } else {
        throw e;
      }
    }
    const rawItems = pessoasRes.items ?? [];

    let nextCursor: string | null = cursor ?? null;
    let maxAlteracao: string | null = null;

    for (const raw of rawItems) {
      if (!pessoaItemTemPerfilCliente(raw)) {
        logger.debug({ id: raw.id, nome: raw.nome, perfis: raw.perfis }, "Pessoa ignorada (sem perfil Cliente)");
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
        if (!maxAlteracao || raw.data_alteracao > maxAlteracao) maxAlteracao = raw.data_alteracao;
      }
    }

    if (maxAlteracao) nextCursor = maxAlteracao;

    const vendasItens = await fetchTodasVendasBusca(http, env);

    let pedidosGravados = 0;
    for (const raw of vendasItens) {
      const mapped = mapVendaBuscaItem(raw);
      if (!mapped) continue;
      const { clienteExternalId, payload } = mapped;
      if (!payload.id) continue;
      let cli = await prisma.cliente.findUnique({ where: { externalId: clienteExternalId } });
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
          "Venda Conta Azul sem cliente local e sem dados de cliente na venda.",
        );
        continue;
      }
      const dataPedido = parseDataVendaContaAzul(payload.data);
      await prisma.pedido.upsert({
        where: { externalId: payload.id },
        create: mapPedidoCreate(cli.id, payload),
        update: {
          dataPedido,
          valorTotal: payload.total ?? 0,
          statusPedido: payload.status ?? "SYNC",
        },
      });
      pedidosGravados++;
    }

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
      "Sync Conta Azul concluído",
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
