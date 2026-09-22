/**
 * Tentativa de sync de compras Conta Azul (API pública ainda não documenta compras).
 * Espelha o padrão de /v1/venda/busca + /itens; falha com aviso se endpoints não existirem.
 */
import type { AxiosInstance } from "axios";
import { getComercialEnv } from "./comercial/env";
import { getComercialPrisma } from "./comercial/db";
import { ensureValidAccessToken } from "./comercial/integrations/conta-azul/sync.service";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "./comercial/integrations/conta-azul/conta-azul.client";
import { upsertCompraNfComItens } from "./compraNfDb";
import type { CompraNfParsed } from "../shared/compraNf";
import { diaIsoAmericaSp } from "../shared/comercial/periodo-america-sp";

type BuscaPage = {
  itens?: unknown[];
  items?: unknown[];
  total_itens?: number;
  totalItems?: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickId(raw: Record<string, unknown>): string | null {
  return (
    str(raw.id) ??
    str(raw.id_compra) ??
    str(raw.compra_id) ??
    str(raw.uuid) ??
    null
  );
}

function mapCompraHeader(
  raw: Record<string, unknown>,
  dataFallback: string,
): {
  externalId: string;
  parsedBase: Omit<CompraNfParsed, "itens">;
  fornecedorIdCa: string | null;
} | null {
  const externalId = pickId(raw);
  if (!externalId) return null;
  const forn =
    asRecord(raw.fornecedor) ??
    asRecord(raw.contato) ??
    asRecord(raw.pessoa) ??
    null;
  const fornecedorNome =
    str(forn?.nome) ??
    str(raw.nome_fornecedor) ??
    str(raw.fornecedor_nome) ??
    str(raw.descricao) ??
    "Fornecedor Conta Azul";
  const dataEmissao =
    str(raw.data_emissao)?.slice(0, 10) ??
    str(raw.data)?.slice(0, 10) ??
    str(raw.data_compra)?.slice(0, 10) ??
    str(raw.data_competencia)?.slice(0, 10) ??
    dataFallback;
  return {
    externalId,
    fornecedorIdCa: str(forn?.id),
    parsedBase: {
      chaveAcesso: str(raw.chave_acesso) ?? str(raw.chave),
      numero: str(raw.numero) ?? str(raw.numero_nota) ?? str(raw.nfe),
      serie: str(raw.serie),
      dataEmissao,
      fornecedorNome,
      fornecedorCnpj: str(forn?.documento) ?? str(forn?.cnpj) ?? str(raw.cnpj),
      valorTotal:
        num(raw.valor_total) ||
        num(raw.total) ||
        num(raw.valor) ||
        num(raw.valor_liquido),
    },
  };
}

function mapItens(raw: unknown): CompraNfParsed["itens"] {
  const root = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(root?.itens) ? root!.itens : null) ??
    (Array.isArray(root?.items) ? root!.items : null) ??
    [];
  const out: CompraNfParsed["itens"] = [];
  for (const item of list) {
    const r = asRecord(item);
    if (!r) continue;
    const prod = asRecord(r.produto) ?? asRecord(r.item) ?? null;
    const descricao =
      str(r.descricao) ??
      str(r.nome) ??
      str(prod?.nome) ??
      str(prod?.descricao) ??
      str(r.produto_nome);
    if (!descricao) continue;
    const quantidade =
      num(r.quantidade) || num(r.qtd) || num(r.quantidade_comprada) || 0;
    out.push({
      nItem: num(r.numero_item) || num(r.n_item) || null,
      codigo: str(r.codigo) ?? str(prod?.id) ?? str(prod?.sku),
      descricao,
      quantidade,
      unidade: str(r.unidade) ?? str(r.unidade_medida) ?? str(prod?.unidade),
      valorUnitario:
        num(r.valor_unitario) || num(r.valor_unitario_bruto) || null,
      valorTotal:
        num(r.valor_total) ||
        num(r.valor) ||
        num(r.valor_bruto) ||
        (quantidade > 0
          ? quantidade * (num(r.valor_unitario) || 0)
          : 0),
    });
  }
  return out;
}

async function tryBuscaCompras(
  http: AxiosInstance,
  inicio: string,
  fim: string,
): Promise<{ path: string; itens: unknown[] } | null> {
  const candidates = [
    `/v1/compra/busca?data_inicio=${inicio}&data_fim=${fim}&pagina=1&tamanho_pagina=100`,
    `/v1/compras/busca?data_inicio=${inicio}&data_fim=${fim}&pagina=1&tamanho_pagina=100`,
    `/v1/compra?data_inicio=${inicio}&data_fim=${fim}&pagina=1&tamanho_pagina=100`,
    `/v1/compras?data_inicio=${inicio}&data_fim=${fim}&pagina=1&tamanho_pagina=100`,
  ];
  for (const path of candidates) {
    try {
      const data = await contaAzulGet<BuscaPage>(http, path);
      const itens = data.itens ?? data.items ?? [];
      if (Array.isArray(itens)) {
        return { path: path.split("?")[0]!, itens };
      }
    } catch {
      // tenta próximo
    }
  }
  return null;
}

async function tryItensCompra(
  http: AxiosInstance,
  compraId: string,
): Promise<CompraNfParsed["itens"] | null> {
  const candidates = [
    `/v1/compra/${encodeURIComponent(compraId)}/itens`,
    `/v1/compras/${encodeURIComponent(compraId)}/itens`,
    `/v1/compra/${encodeURIComponent(compraId)}`,
    `/v1/compras/${encodeURIComponent(compraId)}`,
  ];
  for (const path of candidates) {
    try {
      const data = await contaAzulGet<unknown>(http, path);
      const itens = mapItens(data);
      if (itens.length > 0) return itens;
      const root = asRecord(data);
      if (root && Array.isArray(root.itens) === false) {
        // detalhe sem lista — ignora
      }
    } catch {
      // próximo
    }
  }
  return null;
}

export async function syncComprasContaAzul(input: {
  projetoId: number;
  inicio: Date;
  fim: Date;
}): Promise<{
  ok: boolean;
  caminho?: string;
  recebidas: number;
  gravadas: number;
  atualizadas: number;
  semItens: number;
  aviso?: string;
}> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    return {
      ok: false,
      recebidas: 0,
      gravadas: 0,
      atualizadas: 0,
      semItens: 0,
      aviso:
        "Conta Azul não conectado. Configure em Comercial → Configurações, ou importe o XML das NFs.",
    };
  }

  const http = createContaAzulHttp(env, cred.accessToken);
  const inicioIso = diaIsoAmericaSp(input.inicio);
  const fimIso = diaIsoAmericaSp(input.fim);
  const busca = await tryBuscaCompras(http, inicioIso, fimIso);
  if (!busca) {
    return {
      ok: false,
      recebidas: 0,
      gravadas: 0,
      atualizadas: 0,
      semItens: 0,
      aviso:
        "A API Conta Azul deste ambiente não expõe listagem de compras com itens. Importe o XML das NFs de compra (o mesmo arquivo usado em Compras → Importar XML) para montar o relatório de alfaces por fornecedor.",
    };
  }

  let gravadas = 0;
  let atualizadas = 0;
  let semItens = 0;
  let processadas = 0;
  const max = 80;

  for (const raw of busca.itens) {
    if (processadas >= max) break;
    const rec = asRecord(raw);
    if (!rec) continue;
    const mapped = mapCompraHeader(rec, inicioIso);
    if (!mapped) continue;
    processadas++;

    let itens = mapItens(raw);
    if (itens.length === 0) {
      const fetched = await tryItensCompra(http, mapped.externalId);
      if (fetched?.length) itens = fetched;
    }
    if (itens.length === 0) {
      semItens++;
      continue;
    }

    const parsed: CompraNfParsed = {
      ...mapped.parsedBase,
      itens,
      valorTotal:
        mapped.parsedBase.valorTotal ||
        itens.reduce((s, i) => s + i.valorTotal, 0),
    };
    const r = await upsertCompraNfComItens({
      projetoId: input.projetoId,
      parsed,
      fonte: "conta_azul",
      externalIdCa: mapped.externalId,
      fornecedorIdCa: mapped.fornecedorIdCa,
    });
    if (r.created) gravadas++;
    else atualizadas++;
  }

  return {
    ok: true,
    caminho: busca.path,
    recebidas: busca.itens.length,
    gravadas,
    atualizadas,
    semItens,
    aviso:
      semItens > 0
        ? `${semItens} compra(s) sem itens na API — complete com XML se faltar volume.`
        : undefined,
  };
}
