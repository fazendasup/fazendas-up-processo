import { diaIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import { getComercialEnv } from "../env";
import { getComercialPrisma } from "../db";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../integrations/conta-azul/sync.service";
import { logger } from "../lib/logger";

export type TituloReceberCa = {
  id: string;
  descricao: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
  status: string;
  valorTotal: number;
  valorAberto: number;
  valorPago: number;
  clienteId: string | null;
  clienteNome: string | null;
  categoria: string | null;
  referencia: string | null;
};

export type ResumoInadimplenciaCliente = {
  contaAzulCustomerId: string;
  inadimplente: boolean;
  quantidadeTitulos: number;
  valorEmAberto: number;
};

type ParcelaRaw = {
  id?: string;
  descricao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  status?: string;
  total?: number;
  pago?: number;
  nao_pago?: number;
  cliente?: { id?: string; nome?: string };
  categorias?: Array<{ nome?: string }>;
  referencia?: string;
  indice?: number;
};

type BuscaResponse = { itens?: ParcelaRaw[]; itens_totais?: number };

const CACHE_TTL_MS = 90_000;
let cacheAtrasados: { at: number; itens: TituloReceberCa[] } | null = null;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isoHoje(): string {
  return diaIsoAmericaSp(new Date());
}

function mapParcela(raw: ParcelaRaw): TituloReceberCa | null {
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  const valorAberto = num(raw.nao_pago);
  const valorPago = num(raw.pago);
  const valorTotal = num(raw.total) || valorAberto + valorPago;
  return {
    id,
    descricao: String(raw.descricao ?? "").trim() || "Sem descrição",
    dataVencimento: raw.data_vencimento?.slice(0, 10) ?? null,
    dataPagamento: raw.data_pagamento?.slice(0, 10) ?? null,
    status: String(raw.status ?? "").trim() || "DESCONHECIDO",
    valorTotal,
    valorAberto,
    valorPago,
    clienteId: raw.cliente?.id?.trim() || null,
    clienteNome: raw.cliente?.nome?.trim() || null,
    categoria: raw.categorias?.[0]?.nome?.trim() || null,
    referencia:
      raw.referencia != null
        ? String(raw.referencia)
        : raw.indice != null
          ? String(raw.indice)
          : null,
  };
}

function tituloEmAtraso(t: TituloReceberCa, hoje: string): boolean {
  if (t.valorAberto <= 0.009) return false;
  if (/ATRASADO/i.test(t.status)) return true;
  if (t.dataPagamento) return false;
  if (t.dataVencimento && t.dataVencimento < hoje) return true;
  return false;
}

async function httpCa() {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error(
      "Conta Azul não conectado. Configure em Comercial → Configurações.",
    );
  }
  return createContaAzulHttp(env, cred.accessToken);
}

async function buscarReceberPaginas(
  http: ReturnType<typeof createContaAzulHttp>,
  buildQs: (pagina: number) => URLSearchParams,
): Promise<ParcelaRaw[]> {
  const path = "/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
  const porId = new Map<string, ParcelaRaw>();
  const tamanho = 200;
  for (let pagina = 1; pagina <= 40; pagina++) {
    const qs = buildQs(pagina);
    qs.set("pagina", String(pagina));
    qs.set("tamanho_pagina", String(tamanho));
    let res: BuscaResponse;
    try {
      res = await contaAzulGet<BuscaResponse>(http, `${path}?${qs.toString()}`);
    } catch (err) {
      if (pagina === 1) throw err;
      logger.warn({ err, pagina }, "Conta Azul: página de receber falhou");
      break;
    }
    const batch = res.itens ?? [];
    for (const it of batch) {
      if (it.id) porId.set(it.id, it);
    }
    if (batch.length < tamanho) break;
  }
  return Array.from(porId.values());
}

/** Títulos a receber em atraso (cache curto). */
export async function listarTitulosEmAtrasoCa(opts?: {
  forceRefresh?: boolean;
}): Promise<TituloReceberCa[]> {
  if (
    !opts?.forceRefresh &&
    cacheAtrasados &&
    Date.now() - cacheAtrasados.at < CACHE_TTL_MS
  ) {
    return cacheAtrasados.itens;
  }

  const http = await httpCa();
  const hoje = isoHoje();
  const [y, m, d] = hoje.split("-").map(Number);
  const inicio = new Date(y! - 3, (m ?? 1) - 1, d ?? 1);
  const vencDe = diaIsoAmericaSp(inicio);

  let raw: ParcelaRaw[] = [];
  try {
    raw = await buscarReceberPaginas(http, () => {
      const qs = new URLSearchParams({
        data_vencimento_de: vencDe,
        data_vencimento_ate: hoje,
        status: "ATRASADO",
      });
      return qs;
    });
  } catch (err) {
    logger.warn(
      { err },
      "Conta Azul: busca ATRASADO falhou — tentando abertos por vencimento",
    );
    raw = await buscarReceberPaginas(http, () => {
      const qs = new URLSearchParams({
        data_vencimento_de: vencDe,
        data_vencimento_ate: hoje,
      });
      return qs;
    });
  }

  const itens = raw
    .map(mapParcela)
    .filter((t): t is TituloReceberCa => t != null)
    .filter((t) => tituloEmAtraso(t, hoje))
    .sort((a, b) =>
      String(a.dataVencimento ?? "").localeCompare(String(b.dataVencimento ?? "")),
    );

  cacheAtrasados = { at: Date.now(), itens };
  return itens;
}

export async function resumoInadimplenciaPorClientes(
  contaAzulCustomerIds: string[],
): Promise<ResumoInadimplenciaCliente[]> {
  const ids = Array.from(
    new Set(contaAzulCustomerIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (ids.length === 0) return [];

  const atrasados = await listarTitulosEmAtrasoCa();
  const idSet = new Set(ids);
  const porCliente = new Map<string, { qtd: number; valor: number }>();

  for (const t of atrasados) {
    const cid = t.clienteId?.trim();
    if (!cid || !idSet.has(cid)) continue;
    const cur = porCliente.get(cid) ?? { qtd: 0, valor: 0 };
    cur.qtd += 1;
    cur.valor += t.valorAberto;
    porCliente.set(cid, cur);
  }

  return ids.map((id) => {
    const cur = porCliente.get(id);
    return {
      contaAzulCustomerId: id,
      inadimplente: Boolean(cur && cur.qtd > 0),
      quantidadeTitulos: cur?.qtd ?? 0,
      valorEmAberto: Math.round((cur?.valor ?? 0) * 100) / 100,
    };
  });
}

export async function detalheInadimplenciaCliente(
  contaAzulCustomerId: string,
): Promise<{
  contaAzulCustomerId: string;
  clienteNome: string | null;
  inadimplente: boolean;
  valorEmAberto: number;
  titulos: TituloReceberCa[];
}> {
  const id = contaAzulCustomerId.trim();
  const atrasados = await listarTitulosEmAtrasoCa();
  const titulos = atrasados.filter((t) => t.clienteId === id);
  const valorEmAberto =
    Math.round(titulos.reduce((s, t) => s + t.valorAberto, 0) * 100) / 100;
  return {
    contaAzulCustomerId: id,
    clienteNome: titulos[0]?.clienteNome ?? null,
    inadimplente: titulos.length > 0,
    valorEmAberto,
    titulos,
  };
}

/** Extrato a receber só deste cliente (pago + em aberto) no período. */
export async function extratoReceberClienteCa(input: {
  contaAzulCustomerId: string;
  dataInicio: string;
  dataFim: string;
}): Promise<{
  contaAzulCustomerId: string;
  clienteNome: string | null;
  periodo: { inicio: string; fim: string };
  titulos: TituloReceberCa[];
  totais: {
    recebido: number;
    emAberto: number;
    emAtraso: number;
    total: number;
  };
}> {
  const id = input.contaAzulCustomerId.trim();
  const http = await httpCa();
  const hoje = isoHoje();

  // Conta Azul exige data_vencimento_*; filtramos cliente e unimos vencimento + pagamento.
  const porId = new Map<string, TituloReceberCa>();

  const coletar = async (buildQs: () => URLSearchParams) => {
    const raw = await buscarReceberPaginas(http, () => {
      const qs = buildQs();
      qs.append("ids_clientes", id);
      return qs;
    });
    for (const r of raw) {
      const t = mapParcela(r);
      if (!t) continue;
      if (t.clienteId && t.clienteId !== id) continue;
      porId.set(t.id, t);
    }
  };

  await coletar(
    () =>
      new URLSearchParams({
        data_vencimento_de: input.dataInicio,
        data_vencimento_ate: input.dataFim,
      }),
  );

  const vencAmploDe = diaIsoAmericaSp(
    new Date(
      Number(input.dataInicio.slice(0, 4)) - 2,
      Number(input.dataInicio.slice(5, 7)) - 1,
      Number(input.dataInicio.slice(8, 10)),
    ),
  );
  const vencAmploAte = diaIsoAmericaSp(
    new Date(
      Number(input.dataFim.slice(0, 4)) + 2,
      Number(input.dataFim.slice(5, 7)) - 1,
      Number(input.dataFim.slice(8, 10)),
    ),
  );

  await coletar(
    () =>
      new URLSearchParams({
        data_vencimento_de: vencAmploDe,
        data_vencimento_ate: vencAmploAte,
        data_pagamento_de: input.dataInicio,
        data_pagamento_ate: input.dataFim,
      }),
  );

  const titulos = Array.from(porId.values()).sort((a, b) => {
    const da = a.dataPagamento || a.dataVencimento || "";
    const db = b.dataPagamento || b.dataVencimento || "";
    return da.localeCompare(db);
  });

  let recebido = 0;
  let emAberto = 0;
  let emAtraso = 0;
  for (const t of titulos) {
    recebido += t.valorPago;
    emAberto += t.valorAberto;
    if (tituloEmAtraso(t, hoje)) emAtraso += t.valorAberto;
  }

  return {
    contaAzulCustomerId: id,
    clienteNome: titulos[0]?.clienteNome ?? null,
    periodo: { inicio: input.dataInicio, fim: input.dataFim },
    titulos,
    totais: {
      recebido: Math.round(recebido * 100) / 100,
      emAberto: Math.round(emAberto * 100) / 100,
      emAtraso: Math.round(emAtraso * 100) / 100,
      total: Math.round((recebido + emAberto) * 100) / 100,
    },
  };
}
