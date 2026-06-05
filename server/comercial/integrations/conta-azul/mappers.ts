import type { Prisma } from "../../generated/prisma/index.js";
import {
  OrigemPedido,
  StatusRelacionamento,
  TipoCliente,
} from "../../generated/prisma/index.js";
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
  item: NonNullable<ContaAzulPessoasListResponse["items"]>[number]
): boolean {
  const perfis = item.perfis;
  if (!perfis?.length) return true;
  return perfis.some(p => {
    const u = String(p).toUpperCase().trim();
    return u === "CLIENTE" || u === "CLIENT";
  });
}

/** Converte um item de GET /v1/pessoas para o formato usado no upsert local */
export function mapPessoaApiItem(
  item: NonNullable<ContaAzulPessoasListResponse["items"]>[number]
): ContaAzulPessoaPayload {
  const e = item.endereco;
  let enderecoStr: string | undefined;
  if (e && typeof e === "object") {
    const parts = [
      e.logradouro,
      e.numero,
      e.bairro,
      e.cidade,
      e.estado,
      e.cep,
    ].filter(Boolean);
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

export function mapTipoCliente(
  payload: ContaAzulPessoaPayload,
  fallback: TipoCliente = "RESTAURANTE"
): TipoCliente {
  const n = (payload.nome ?? "").toLowerCase();
  if (n.includes("assinatura") || n.includes("plano"))
    return "PLANO_ASSINATURA";
  if (n.includes("mercado") || n.includes("super")) return "SUPERMERCADO";
  if (n.includes("avulso")) return "AVULSO";
  return fallback;
}

export function mapClienteUpsert(
  payload: ContaAzulPessoaPayload
): Prisma.ClienteUpsertArgs["create"] {
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

export type ContaAzulPedidoItemPayload = {
  nome: string;
  sku?: string;
  categoria?: string | null;
  qtd?: number;
  preco?: number;
  custo?: number;
};

export type ContaAzulProdutoCategoriaLookup = {
  nome: string;
  categoria: string | null;
};

export type ContaAzulPedidoPayload = {
  id?: string;
  numeroVenda?: string;
  data?: string;
  total?: number;
  status?: string;
  itens?: ContaAzulPedidoItemPayload[];
};

export function extrairNumeroVendaContaAzul(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidates = [o.numero, o.numero_venda, o.numeroVenda, o.codigo, o.sequencia];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return String(c);
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function normalizarProdutoNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function categoriaFallbackPorNome(nome: string): string | null {
  const n = normalizarProdutoNome(nome);
  if (/\b(micro|flor|flores|molho|manjericao)\b/.test(n)) return "Pote";
  if (/\b(alface frisee|mimosa|baby acelga)\b/.test(n)) return "Buque";
  if (/\b(alface|rucula|agriao|hortela|mix|folha)\b/.test(n))
    return "Desfolhado";
  return null;
}

function categoriaPorCatalogo(
  nome: string,
  catalogo: ContaAzulProdutoCategoriaLookup[]
): string | null {
  const alvo = normalizarProdutoNome(nome);
  if (!alvo) return null;
  const match = catalogo
    .map(p => ({
      nome: p.nome,
      categoria: p.categoria,
      normalizado: normalizarProdutoNome(p.nome),
    }))
    .filter(
      p =>
        p.categoria &&
        (alvo.includes(p.normalizado) || p.normalizado.includes(alvo))
    )
    .sort((a, b) => b.normalizado.length - a.normalizado.length)[0];
  return match?.categoria ?? null;
}

export function mapVendaItensResponse(
  raw: unknown,
  catalogo: ContaAzulProdutoCategoriaLookup[] = []
): ContaAzulPedidoItemPayload[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const rawItens = Array.isArray(root.itens)
    ? root.itens
    : Array.isArray(root.items)
      ? root.items
      : Array.isArray(root.produtos)
        ? root.produtos
        : [];

  return rawItens
    .map((rawItem): ContaAzulPedidoItemPayload | null => {
      if (!rawItem || typeof rawItem !== "object") return null;
      const item = rawItem as Record<string, unknown>;
      const tipo =
        typeof item.tipo === "string"
          ? item.tipo.toUpperCase().trim()
          : "PRODUTO";
      if (tipo && tipo !== "PRODUTO") return null;
      const nome =
        typeof item.nome === "string"
          ? item.nome
          : typeof item.descricao === "string"
            ? item.descricao
            : typeof item.produto === "string"
              ? item.produto
              : "";
      if (!nome.trim()) return null;
      if (
        /\b(entrega|frete|taxa|servico|serviço)\b/i.test(
          normalizarProdutoNome(nome)
        )
      )
        return null;
      const sku =
        typeof item.id_item === "string"
          ? item.id_item
          : typeof item.sku === "string"
            ? item.sku
            : typeof item.id === "string"
              ? item.id
              : undefined;
      const qtdRaw = item.quantidade ?? item.qtd;
      const precoRaw = item.valor ?? item.preco ?? item.preco_unitario;
      const custoRaw = item.custo ?? item.custo_unitario ?? item.custoUnitario;
      const qtd =
        typeof qtdRaw === "number"
          ? qtdRaw
          : typeof qtdRaw === "string"
            ? Number(qtdRaw)
            : 1;
      const preco =
        typeof precoRaw === "number"
          ? precoRaw
          : typeof precoRaw === "string"
            ? Number(precoRaw)
            : 0;
      const custo =
        typeof custoRaw === "number"
          ? custoRaw
          : typeof custoRaw === "string"
            ? Number(custoRaw)
            : undefined;
      return {
        nome,
        sku,
        categoria:
          categoriaPorCatalogo(nome, catalogo) ??
          categoriaFallbackPorNome(nome),
        qtd: Number.isFinite(qtd) && qtd > 0 ? qtd : 1,
        preco: Number.isFinite(preco) && preco >= 0 ? preco : 0,
        custo:
          custo != null && Number.isFinite(custo) && custo >= 0
            ? custo
            : undefined,
      };
    })
    .filter((item): item is ContaAzulPedidoItemPayload => item != null);
}

/** Item de `itens[]` em GET /v1/venda/busca (OpenAPI Conta Azul). */
export function mapVendaBuscaItem(raw: unknown): {
  clienteExternalId: string;
  payload: ContaAzulPedidoPayload;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  if (!id) return null;
  const totalCandidates = [
    o.total,
    o.valor_total,
    o.valorTotal,
    o.valor_liquido,
    o.valorLiquido,
  ];
  let total = NaN;
  for (const raw of totalCandidates) {
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim()
          ? Number(raw)
          : NaN;
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
      numeroVenda: extrairNumeroVendaContaAzul(raw) ?? undefined,
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

export function mapPessoaFromVendaClienteEmbutido(
  rawVenda: unknown
): ContaAzulPessoaPayload | null {
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
  statusPedido?: string | null
): Prisma.PedidoCreateInput {
  return {
    externalId: payload.id ?? undefined,
    numeroVenda: payload.numeroVenda ?? undefined,
    dataPedido: parseDataVendaContaAzul(payload.data),
    valorTotal: composicao.valorLiquido,
    valorBruto: composicao.valorBruto,
    valorFrete: composicao.valorFrete,
    valorDesconto: composicao.valorDesconto,
    valorLiquido: composicao.valorLiquido,
    composicaoDetalhada,
    statusPedido: statusPedido ?? payload.status ?? "SYNC",
    origemPedido: OrigemPedido.CONTA_AZUL,
    cliente: { connect: { id: clienteId } },
    itens: {
      create:
        payload.itens?.map(i => ({
          sku: i.sku ?? null,
          produto: i.nome,
          categoria: i.categoria ?? null,
          quantidade: i.qtd ?? 1,
          precoUnit: i.preco ?? 0,
          custoUnit: i.custo ?? null,
        })) ?? [],
    },
  };
}

export type ContaAzulProdutoResumo = {
  id: string;
  nome: string;
  codigo: string | null;
  valorVenda: number | null;
  status: string | null;
  tipo: string | null;
};

/** Item de GET /v1/produtos (OpenAPI Conta Azul — inventário). */
export function mapProdutoContaAzulItem(raw: unknown): ContaAzulProdutoResumo | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : null;
  const nome = typeof item.nome === "string" ? item.nome.trim() : "";
  if (!id || !nome) return null;
  const tipo = typeof item.tipo === "string" ? item.tipo.toUpperCase().trim() : "PRODUTO";
  if (tipo && tipo !== "PRODUTO" && tipo !== "VARIACAO_PRODUTO") return null;
  const codigo =
    typeof item.codigo === "string" && item.codigo.trim()
      ? item.codigo.trim()
      : null;
  const valorRaw = item.valor_venda ?? item.valorVenda;
  const valorVenda =
    typeof valorRaw === "number"
      ? valorRaw
      : typeof valorRaw === "string"
        ? Number(valorRaw)
        : null;
  const status = typeof item.status === "string" ? item.status.toUpperCase().trim() : null;
  return {
    id,
    nome,
    codigo,
    valorVenda: valorVenda != null && Number.isFinite(valorVenda) ? valorVenda : null,
    status,
    tipo,
  };
}
