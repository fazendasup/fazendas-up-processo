import type { Prisma } from "../../generated/prisma/index.js";
import { OrigemPedido, StatusRelacionamento, TipoCliente } from "../../generated/prisma/index.js";
import type { ComposicaoValorPedido } from "../../lib/composicao-valor.js";

export type ContaAzulPessoaPayload = {
  id?: string;
  nome?: string;
  cpfCnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
};

/** Resposta GET /v1/pessoas (OpenAPI Conta Azul) */
export type ContaAzulPessoasListResponse = {
  items?: Array<{
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    data_alteracao?: string;
    /** Ex.: ["CLIENTE","FORNECEDOR"] — não importar quem não for cliente de fato. */
    perfis?: string[];
    endereco?: {
      logradouro?: string;
      numero?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
    } | null;
  }>;
  totalItems?: number;
};

/** Conta Azul separa perfis; só deve virar cadastro local quem tem perfil de cliente. */
export function pessoaItemTemPerfilCliente(
  item: NonNullable<ContaAzulPessoasListResponse["items"]>[number],
): boolean {
  const perfis = item.perfis;
  if (!perfis?.length) return true;
  return perfis.some((p) => {
    const u = String(p).toUpperCase().trim();
    return u === "CLIENTE" || u === "CLIENT";
  });
}

/** Converte um item de GET /v1/pessoas para o formato usado no upsert local */
export function mapPessoaApiItem(item: NonNullable<ContaAzulPessoasListResponse["items"]>[number]): ContaAzulPessoaPayload {
  const e = item.endereco;
  let enderecoStr: string | undefined;
  if (e && typeof e === "object") {
    const parts = [e.logradouro, e.numero, e.bairro, e.cidade, e.estado, e.cep].filter(Boolean);
    enderecoStr = parts.length ? parts.join(", ") : undefined;
  }
  return {
    id: item.id,
    nome: item.nome,
    cpfCnpj: item.documento ?? undefined,
    email: item.email ?? undefined,
    telefone: item.telefone ?? undefined,
    endereco: enderecoStr,
  };
}

export function mapTipoCliente(payload: ContaAzulPessoaPayload, fallback: TipoCliente = "RESTAURANTE"): TipoCliente {
  const n = (payload.nome ?? "").toLowerCase();
  if (n.includes("mercado") || n.includes("super")) return "MERCADO";
  return fallback;
}

export function mapClienteUpsert(payload: ContaAzulPessoaPayload): Prisma.ClienteUpsertArgs["create"] {
  const idExterno = payload.id ?? null;
  return {
    externalId: idExterno,
    nome: payload.nome ?? "Cliente sem nome",
    tipo: mapTipoCliente(payload),
    cnpjCpf: payload.cpfCnpj ?? null,
    endereco: payload.endereco ?? null,
    emailPrincipal: payload.email ?? null,
    telefoneWhatsapp: payload.telefone ?? null,
    contatoPrincipal: payload.nome ?? null,
    statusRelacionamento: StatusRelacionamento.ATIVO,
    tags: [],
    scoreComercial: null,
  };
}

export type ContaAzulPedidoPayload = {
  id?: string;
  data?: string;
  total?: number;
  status?: string;
  itens?: Array<{ nome: string; sku?: string; categoria?: string; qtd?: number; preco?: number }>;
};

/** Item de `itens[]` em GET /v1/venda/busca (OpenAPI Conta Azul). */
export function mapVendaBuscaItem(raw: unknown): {
  clienteExternalId: string;
  payload: ContaAzulPedidoPayload;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  if (!id) return null;
  const totalCandidates = [o.total, o.valor_total, o.valorTotal, o.valor_liquido, o.valorLiquido];
  let total = NaN;
  for (const raw of totalCandidates) {
    const n =
      typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) {
      total = n;
      break;
    }
  }
  const data = typeof o.data === "string" ? o.data : undefined;
  const cliente = o.cliente;
  let clienteExternalId: string | null = null;
  if (cliente && typeof cliente === "object") {
    const cid = (cliente as Record<string, unknown>).id;
    if (typeof cid === "string") clienteExternalId = cid;
  }
  if (!clienteExternalId) return null;
  const situacao = o.situacao;
  let status = "SYNC";
  if (situacao && typeof situacao === "object") {
    const nome = (situacao as Record<string, unknown>).nome;
    if (typeof nome === "string" && nome.trim()) status = nome;
  }
  return {
    clienteExternalId,
    payload: {
      id,
      total: Number.isFinite(total) ? total : 0,
      data,
      status,
      itens: [],
    },
  };
}

/** Cliente embutido na venda quando ainda não sincronizamos o cadastro em GET /v1/pessoas. */
/** Data só com dia (YYYY-MM-DD) da Conta Azul — meio-dia em SP evita cair no dia anterior no dashboard. */
export function parseDataVendaContaAzul(data: string | undefined): Date {
  if (!data?.trim()) return new Date();
  const d = data.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T12:00:00-03:00`);
  }
  return new Date(d);
}

export function mapPessoaFromVendaClienteEmbutido(rawVenda: unknown): ContaAzulPessoaPayload | null {
  if (!rawVenda || typeof rawVenda !== "object") return null;
  const cliente = (rawVenda as Record<string, unknown>).cliente;
  if (!cliente || typeof cliente !== "object") return null;
  const c = cliente as Record<string, unknown>;
  const id = typeof c.id === "string" ? c.id : null;
  if (!id) return null;
  return {
    id,
    nome: typeof c.nome === "string" ? c.nome : undefined,
    email: typeof c.email === "string" ? c.email : undefined,
    telefone: typeof c.telefone === "string" ? c.telefone : undefined,
    endereco: typeof c.endereco === "string" ? c.endereco : undefined,
  };
}

export function mapPedidoCreate(
  clienteId: string,
  payload: ContaAzulPedidoPayload,
  composicao: ComposicaoValorPedido,
  composicaoDetalhada = false,
): Prisma.PedidoCreateInput {
  return {
    externalId: payload.id ?? undefined,
    dataPedido: parseDataVendaContaAzul(payload.data),
    valorTotal: composicao.valorLiquido,
    valorBruto: composicao.valorBruto,
    valorFrete: composicao.valorFrete,
    valorDesconto: composicao.valorDesconto,
    valorLiquido: composicao.valorLiquido,
    composicaoDetalhada,
    statusPedido: payload.status ?? "SYNC",
    origemPedido: OrigemPedido.CONTA_AZUL,
    cliente: { connect: { id: clienteId } },
    itens: {
      create:
        payload.itens?.map((i) => ({
          sku: i.sku ?? null,
          produto: i.nome,
          categoria: i.categoria ?? null,
          quantidade: i.qtd ?? 1,
          precoUnit: i.preco ?? 0,
        })) ?? [],
    },
  };
}
