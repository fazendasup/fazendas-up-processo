import { Prisma, type PrismaClient } from "../generated/prisma/index.js";
import { classificarStatusPedido } from "./pedido-status.js";
import {
  criarIndiceProdutosOperacionais,
  criarResolverChaveItemConciliacao,
  resolverProdutoOperacional,
  type ProdutoOperacionalLookup,
} from "./produto-operacional.js";
import { assertSemanaAnteriorFechada } from "./fechamento.js";
import {
  isOrcamentoFaturamentoAcumulado,
  mensagemErroCriarOperacionalDeOrcamentoAcumulado,
} from "./pedido-acumulo-operacional.js";
import { GO_LIVE_PEDIDOS, inicioSemana } from "./semana.js";
import {
  isErroTabelaConciliacaoEventosCheia,
  limparEventosConciliacaoAntigosIfDue,
  recuperarEspacoEventosConciliacao,
} from "./conciliacao-eventos-retencao.js";

type PedidoOperacionalComItens = Prisma.PedidoOperacionalGetPayload<{
  include: { itens: true; cliente: { select: { externalId: true; nome: true } } };
}>;

export const REGRA_ENTREGA_CONCILIACAO_SELECT = {
  cobraTaxaEntrega: true,
  valorTaxaEntrega: true,
} as const;

export type RegraEntregaConciliacao = {
  cobraTaxaEntrega: boolean;
  valorTaxaEntrega?: Prisma.Decimal | number | string | null;
};

type PedidoContaAzulComItens = Prisma.PedidoGetPayload<{
  include: {
    itens: true;
    cliente: {
      select: {
        externalId: true;
        nome: true;
        regraComercial: { select: { acumulaPedidos: true } & typeof REGRA_ENTREGA_CONCILIACAO_SELECT };
      };
    };
  };
}>;

export type SnapshotConciliacao = {
  operacional?: {
    id: string;
    dataEntrega: string;
    status: string;
    observacoes: string | null;
    itens: Array<{ produtoNome: string; quantidade: number; precoUnit: number | null }>;
  };
  contaAzul?: {
    id: string;
    externalId: string | null;
    numeroVenda: string | null;
    dataPedido: string;
    statusPedido: string;
    valorLiquido: number;
    itens: Array<{ produto: string; sku?: string | null; quantidade: number; precoUnit: number }>;
  };
};

type ResolverChaveItem = ReturnType<typeof criarResolverChaveItemConciliacao>;

export async function carregarProdutosConciliacao(prisma: PrismaClient): Promise<ProdutoOperacionalLookup[]> {
  return prisma.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null } },
    select: {
      id: true,
      nome: true,
      sku: true,
      contaAzulProdutoId: true,
      ativo: true,
      importadoOperacao: true,
      categoria: true,
    },
  });
}

export type DivergenciaConciliacao = {
  campo: string;
  operacional: unknown;
  contaAzul: unknown;
};

type OpcoesDivergenciaConciliacao = {
  compararData?: boolean;
  compararItens?: boolean;
  compararValorEstimado?: boolean;
  regraEntrega?: RegraEntregaConciliacao | null;
};

export function pedidoCriadoAPartirDoContaAzul(pedido: { snapshotConciliacao?: unknown }): boolean {
  const snapshot = pedido.snapshotConciliacao;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const raw = snapshot as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(raw, "operacional") && raw.operacional === null;
}

export function taxaEntregaParaConciliacao(
  regra: RegraEntregaConciliacao | null | undefined,
  valorFreteContaAzul?: unknown,
): number {
  if (!regra?.cobraTaxaEntrega) return 0;
  const configurada = num(regra.valorTaxaEntrega);
  if (configurada > 0) return configurada;
  return num(valorFreteContaAzul);
}

export function opcoesCalcularDivergencias(
  operacional: Pick<PedidoOperacionalComItens, "snapshotConciliacao">,
): OpcoesDivergenciaConciliacao {
  const criadoDoContaAzul = pedidoCriadoAPartirDoContaAzul(operacional);
  return {
    compararData: !criadoDoContaAzul,
    compararItens: !criadoDoContaAzul,
    compararValorEstimado: !criadoDoContaAzul,
  };
}

/** Cliente com faturamento acumulado: pedido operacional = entrega do dia; CA = período. */
export function clienteAcumulaFaturamento(regra?: {
  acumulaPedidos?: boolean;
} | null): boolean {
  return Boolean(regra?.acumulaPedidos);
}

export function opcoesCalcularDivergenciasParaPar(
  operacional: Pick<PedidoOperacionalComItens, "snapshotConciliacao">,
  contaAzul?: {
    cliente?: { regraComercial?: { acumulaPedidos?: boolean } | null };
  } | null,
  regraOperacional?: { acumulaPedidos?: boolean } | null,
): OpcoesDivergenciaConciliacao {
  const base = opcoesCalcularDivergencias(operacional);
  const acumula =
    clienteAcumulaFaturamento(regraOperacional) ||
    clienteAcumulaFaturamento(contaAzul?.cliente?.regraComercial);
  if (!acumula) return base;
  return {
    compararData: base.compararData,
    compararItens: false,
    compararValorEstimado: false,
  };
}

export function opcoesCalcularDivergenciasAgregadas(): OpcoesDivergenciaConciliacao {
  return {
    compararData: false,
    compararItens: true,
    compararValorEstimado: true,
  };
}

/** Soma itens de várias entregas operacionais para comparar com faturamento acumulado. */
export function montarOperacionalAgregado(
  operacionais: PedidoOperacionalComItens[],
): PedidoOperacionalComItens {
  if (operacionais.length === 0) {
    throw new Error("Informe ao menos um pedido operacional para agregar.");
  }
  if (operacionais.length === 1) return operacionais[0]!;
  const base = operacionais[0]!;
  const dataEntrega = operacionais.reduce(
    (min, op) => (op.dataEntrega.getTime() < min.getTime() ? op.dataEntrega : min),
    operacionais[0]!.dataEntrega,
  );
  return {
    ...base,
    dataEntrega,
    freteCortesia: operacionais.every((op) => op.freteCortesia),
    itens: operacionais.flatMap((op) => op.itens),
  };
}

export function snapshotOperacionalAgregado(
  operacionais: PedidoOperacionalComItens[],
): NonNullable<SnapshotConciliacao["operacional"]> & {
  agregado: true;
  ids: string[];
  datasEntrega: string[];
} {
  const agregado = montarOperacionalAgregado(operacionais);
  return {
    ...snapshotOperacional(agregado)!,
    agregado: true,
    ids: operacionais.map((op) => op.id),
    datasEntrega: operacionais.map((op) => op.dataEntrega.toISOString()).sort(),
  };
}

export function calcularDivergenciasAgregadas(
  operacionais: PedidoOperacionalComItens[],
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
): DivergenciaConciliacao[] {
  const agregado = montarOperacionalAgregado(operacionais);
  return calcularDivergencias(agregado, contaAzul, resolverChave, {
    ...opcoesCalcularDivergenciasAgregadas(),
    regraEntrega: contaAzul.cliente.regraComercial ?? null,
  });
}

export async function reconciliarDivergenciasAcumuloEsperadas(
  prisma: PrismaClient,
  operacionais: Array<
    PedidoOperacionalComItens & {
      statusConciliacao: string;
      pedidoContaAzul?: PedidoContaAzulComItens | null;
      cliente?: { regraComercial?: { acumulaPedidos?: boolean } | null } | null;
    }
  >,
  resolverChave: ResolverChaveItem,
): Promise<number> {
  const porVenda = new Map<
    string,
    Array<
      PedidoOperacionalComItens & {
        statusConciliacao: string;
        pedidoContaAzul?: PedidoContaAzulComItens | null;
        cliente?: { regraComercial?: { acumulaPedidos?: boolean } | null } | null;
      }
    >
  >();

  for (const op of operacionais) {
    if (!op.pedidoContaAzulId || !op.pedidoContaAzul) continue;
    const acumula =
      clienteAcumulaFaturamento(op.cliente?.regraComercial) ||
      clienteAcumulaFaturamento(op.pedidoContaAzul.cliente?.regraComercial);
    if (!acumula) continue;
    const lista = porVenda.get(op.pedidoContaAzulId) ?? [];
    lista.push(op);
    porVenda.set(op.pedidoContaAzulId, lista);
  }

  let corrigidos = 0;
  for (const [, ops] of Array.from(porVenda.entries())) {
    const contaAzul = ops[0]!.pedidoContaAzul!;
    const divergencias = calcularDivergenciasAgregadas(ops, contaAzul, resolverChave);
    const conciliado = divergencias.length === 0;
    const snapshot: SnapshotConciliacao = {
      operacional: snapshotOperacionalAgregado(ops),
      contaAzul: snapshotContaAzul(contaAzul),
    };
    const precisaAtualizar = ops.some(
      (op) =>
        (conciliado && op.statusConciliacao === "DIVERGENTE") ||
        (!conciliado && op.statusConciliacao === "CONCILIADO"),
    );
    if (!precisaAtualizar) continue;

    await prisma.$transaction(async (tx) => {
      for (const op of ops) {
        await tx.pedidoOperacional.update({
          where: { id: op.id },
          data: {
            statusConciliacao: conciliado ? "CONCILIADO" : "DIVERGENTE",
            snapshotConciliacao: snapshot as Prisma.InputJsonValue,
          },
        });
        op.statusConciliacao = conciliado ? "CONCILIADO" : "DIVERGENTE";
      }
      await tx.pedido.update({
        where: { id: contaAzul.id },
        data: { statusConciliacao: conciliado ? "CONCILIADA" : "DIVERGENTE" },
      });
    });
    corrigidos += ops.filter((op) => op.statusConciliacao === (conciliado ? "CONCILIADO" : "DIVERGENTE")).length;
  }
  return corrigidos;
}

function inicioDia(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function fimDia(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

const CORTE_INICIO_PEDIDOS = inicioDia(GO_LIVE_PEDIDOS);

function antesDoCortePedidos(d: Date): boolean {
  return fimDia(d).getTime() < CORTE_INICIO_PEDIDOS.getTime();
}

function mesmoDia(a: Date, b: Date): boolean {
  return ymdOperacional(a) === ymdOperacional(b);
}

function ymdOperacional(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira 00:00 UTC da semana operacional que contém `d`. */
function inicioSemanaOperacional(d: Date): Date {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const diff = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc;
}

function fimSemanaOperacional(d: Date): Date {
  const inicio = inicioSemanaOperacional(d);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  fim.setUTCHours(23, 59, 59, 999);
  return fim;
}

function inicioDiaOperacional(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function fimDiaOperacional(d: Date): Date {
  const fim = inicioDiaOperacional(d);
  fim.setUTCHours(23, 59, 59, 999);
  return fim;
}

function adicionarDiasOperacional(d: Date, dias: number): Date {
  const out = inicioDiaOperacional(d);
  out.setUTCDate(out.getUTCDate() + dias);
  return out;
}

function diaSemanaOperacional(d: Date): number {
  return d.getUTCDay();
}

function buildNomePorChaveItem(
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave: ResolverChaveItem,
): Map<string, string> {
  const nomePorChave = new Map<string, string>();
  for (const item of operacional.itens) {
    const key = resolverChave("operacional", { produtoId: item.produtoId, produtoNome: item.produtoNome });
    if (item.produtoNome && !nomePorChave.has(key)) nomePorChave.set(key, item.produtoNome);
  }
  for (const item of contaAzul.itens) {
    const key = resolverChave("contaAzul", { produto: item.produto, sku: item.sku });
    if (item.produto && !nomePorChave.has(key)) nomePorChave.set(key, item.produto);
  }
  return nomePorChave;
}

function chavePorCampoItem(
  campo: string,
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave: ResolverChaveItem,
): string | null {
  const nomeDisplay = campo.replace(/^item:/, "").trim();
  const nomePorChave = buildNomePorChaveItem(operacional, contaAzul, resolverChave);
  for (const [key, nome] of Array.from(nomePorChave.entries())) {
    if (nome === nomeDisplay) return key;
  }
  const alvo = normalizarNome(nomeDisplay);
  for (const [key, nome] of Array.from(nomePorChave.entries())) {
    if (normalizarNome(nome) === alvo) return key;
  }
  for (const item of operacional.itens) {
    if (normalizarNome(item.produtoNome) === alvo) {
      return resolverChave("operacional", { produtoId: item.produtoId, produtoNome: item.produtoNome });
    }
  }
  for (const item of contaAzul.itens) {
    if (normalizarNome(item.produto) === alvo) {
      return resolverChave("contaAzul", { produto: item.produto, sku: item.sku });
    }
  }
  return null;
}

function quantidadePorChaveOperacional(
  operacional: PedidoOperacionalComItens,
  resolverChave: ResolverChaveItem,
): Map<string, { ids: string[]; quantidade: number }> {
  const map = new Map<string, { ids: string[]; quantidade: number }>();
  for (const item of operacional.itens) {
    const key = resolverChave("operacional", { produtoId: item.produtoId, produtoNome: item.produtoNome });
    const atual = map.get(key) ?? { ids: [], quantidade: 0 };
    atual.ids.push(item.id);
    atual.quantidade += num(item.quantidade);
    map.set(key, atual);
  }
  return map;
}

function quantidadePorChaveContaAzul(
  contaAzul: PedidoContaAzulComItens,
  resolverChave: ResolverChaveItem,
): Map<string, { quantidade: number; precoUnit: number; produto: string; sku: string | null; categoria: string | null }> {
  const map = new Map<
    string,
    { quantidade: number; precoUnit: number; produto: string; sku: string | null; categoria: string | null }
  >();
  for (const item of contaAzul.itens) {
    const key = resolverChave("contaAzul", { produto: item.produto, sku: item.sku });
    const atual = map.get(key) ?? {
      quantidade: 0,
      precoUnit: num(item.precoUnit),
      produto: item.produto,
      sku: item.sku ?? null,
      categoria: item.categoria ?? null,
    };
    atual.quantidade += num(item.quantidade);
    map.set(key, atual);
  }
  return map;
}

function diffDias(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.abs(utcA - utcB) / 86_400_000;
}

function mesmaSemanaOperacional(a: Date, b: Date): boolean {
  return inicioSemanaOperacional(a).getTime() === inicioSemanaOperacional(b).getTime();
}

function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function snapshotOperacional(pedido: PedidoOperacionalComItens): SnapshotConciliacao["operacional"] {
  return {
    id: pedido.id,
    dataEntrega: pedido.dataEntrega.toISOString(),
    status: pedido.status,
    observacoes: pedido.observacoes,
    itens: pedido.itens.map((i) => ({
      produtoNome: i.produtoNome,
      quantidade: num(i.quantidade),
      precoUnit: i.precoUnit == null ? null : num(i.precoUnit),
    })),
  };
}

export function snapshotContaAzul(pedido: PedidoContaAzulComItens): SnapshotConciliacao["contaAzul"] {
  return {
    id: pedido.id,
    externalId: pedido.externalId,
    numeroVenda: pedido.numeroVenda,
    dataPedido: pedido.dataPedido.toISOString(),
    statusPedido: pedido.statusPedido,
    valorLiquido: num(pedido.valorLiquido ?? pedido.valorTotal),
    itens: pedido.itens.map((i) => ({
      produto: i.produto,
      sku: i.sku,
      quantidade: num(i.quantidade),
      precoUnit: num(i.precoUnit),
    })),
  };
}

/** Remove pares espelhados (op 10×ca 0 + op 0×ca 10 do mesmo volume) causados por nomes/chaves diferentes. */
export function consolidarDivergenciasEspelhadas(divs: DivergenciaConciliacao[]): DivergenciaConciliacao[] {
  const itens = divs.filter((d) => d.campo.startsWith("item:"));
  const outros = divs.filter((d) => !d.campo.startsWith("item:"));
  const soOp = itens.filter((d) => num(d.operacional) > 0 && num(d.contaAzul) === 0);
  const soCa = itens.filter((d) => num(d.operacional) === 0 && num(d.contaAzul) > 0);
  const mistos = itens.filter((d) => !soOp.includes(d) && !soCa.includes(d));
  const usadosOp = new Set<DivergenciaConciliacao>();
  const usadosCa = new Set<DivergenciaConciliacao>();
  const resultado: DivergenciaConciliacao[] = [...mistos];

  for (const ca of soCa) {
    const qCa = num(ca.contaAzul);
    const par = soOp.find((op) => !usadosOp.has(op) && Math.abs(num(op.operacional) - qCa) < 0.001);
    if (par) {
      usadosOp.add(par);
      usadosCa.add(ca);
      continue;
    }
    resultado.push(ca);
  }
  for (const op of soOp) {
    if (!usadosOp.has(op)) resultado.push(op);
  }
  return [...outros, ...resultado];
}

export function calcularDivergencias(
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
  opcoes: OpcoesDivergenciaConciliacao = {},
): DivergenciaConciliacao[] {
  const divergencias: DivergenciaConciliacao[] = [];
  const compararData = opcoes.compararData ?? true;
  const compararItens = opcoes.compararItens ?? true;
  const compararValorEstimado = opcoes.compararValorEstimado ?? true;

  if (compararData && !mesmoDia(operacional.dataEntrega, contaAzul.dataPedido)) {
    divergencias.push({
      campo: "data",
      operacional: ymdOperacional(operacional.dataEntrega),
      contaAzul: ymdOperacional(contaAzul.dataPedido),
    });
  }

  if (compararItens) {
    const nomePorChave = new Map<string, string>();
    const mapOp = new Map<string, number>();
    for (const item of operacional.itens) {
      const key = resolverChave
        ? resolverChave("operacional", { produtoId: item.produtoId, produtoNome: item.produtoNome })
        : `nome:${normalizarNome(item.produtoNome)}`;
      mapOp.set(key, (mapOp.get(key) ?? 0) + num(item.quantidade));
      if (item.produtoNome && !nomePorChave.has(key)) nomePorChave.set(key, item.produtoNome);
    }
    const mapCa = new Map<string, number>();
    for (const item of contaAzul.itens) {
      const key = resolverChave
        ? resolverChave("contaAzul", { produto: item.produto, sku: item.sku })
        : `nome:${normalizarNome(item.produto)}`;
      mapCa.set(key, (mapCa.get(key) ?? 0) + num(item.quantidade));
      if (item.produto && !nomePorChave.has(key)) nomePorChave.set(key, item.produto);
    }

    const nomes = new Set([...Array.from(mapOp.keys()), ...Array.from(mapCa.keys())]);
    for (const nome of Array.from(nomes)) {
      const qOp = mapOp.get(nome) ?? 0;
      const qCa = mapCa.get(nome) ?? 0;
      if (Math.abs(qOp - qCa) > 0.001) {
        divergencias.push({
          campo: `item:${nomePorChave.get(nome) ?? nome.replace(/^nome:/, "") ?? "sem_nome"}`,
          operacional: qOp,
          contaAzul: qCa,
        });
      }
    }
  }

  if (compararValorEstimado) {
    const regraEntrega = opcoes.regraEntrega ?? contaAzul.cliente.regraComercial ?? null;
    const taxaEntrega = operacional.freteCortesia
      ? 0
      : taxaEntregaParaConciliacao(regraEntrega, contaAzul.valorFrete);
    const valorItens = operacional.itens.reduce((s, i) => s + num(i.quantidade) * (num(i.precoUnit) || 0), 0);
    const valorOp = valorItens + taxaEntrega;
    const valorCa = num(contaAzul.valorLiquido ?? contaAzul.valorTotal);
    if (valorOp > 0 && valorCa > 0 && Math.abs(valorOp - valorCa) > 0.05) {
      divergencias.push({
        campo: "valor_estimado",
        operacional: taxaEntrega > 0 ? { itens: valorItens, taxaEntrega, total: valorOp } : valorOp,
        contaAzul: valorCa,
      });
    }
  }

  const consolidadas = consolidarDivergenciasEspelhadas(divergencias);
  // Quantidades batem: diferença de valor costuma ser frete/desconto/arredondamento/preço de tabela
  // vs líquido CA — não bloqueia conciliação (já há fluxo específico para frete nas regras).
  const temDiffItens = consolidadas.some((d) => d.campo.startsWith("item:"));
  if (!temDiffItens) {
    return consolidadas.filter((d) => d.campo !== "valor_estimado");
  }
  return consolidadas;
}

export function scoreSugestaoVinculo(
  operacional: PedidoOperacionalComItens,
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
): number {
  if (!documentoContaAzulConciliavel(contaAzul)) return 0;
  const extOp = operacional.contaAzulCustomerId;
  const extCa = contaAzul.cliente.externalId;
  if (!extOp || !extCa || extOp !== extCa) return 0;
  if (!mesmaSemanaOperacional(operacional.dataEntrega, contaAzul.dataPedido)) return 0;

  let score = 40;
  const dias = diffDias(operacional.dataEntrega, contaAzul.dataPedido);
  if (dias === 0) score += 35;
  else return 0;

  const chavesOp = new Set(
    operacional.itens
      .map((i) =>
        resolverChave
          ? resolverChave("operacional", { produtoId: i.produtoId, produtoNome: i.produtoNome })
          : `nome:${normalizarNome(i.produtoNome)}`,
      )
      .filter(Boolean),
  );
  const chavesCa = new Set(
    contaAzul.itens
      .map((i) =>
        resolverChave
          ? resolverChave("contaAzul", { produto: i.produto, sku: i.sku })
          : `nome:${normalizarNome(i.produto)}`,
      )
      .filter(Boolean),
  );
  if (chavesOp.size === 0 || chavesCa.size === 0) return score;

  let overlap = 0;
  for (const chave of Array.from(chavesOp)) {
    if (chavesCa.has(chave)) overlap++;
  }
  score += Math.min(25, Math.round((overlap / Math.max(chavesOp.size, chavesCa.size)) * 25));
  return score;
}

/** Score para listagem manual de candidatos — não exige mesmo dia nem documento conciliável. */
export function scoreCandidatoVinculoManual(
  operacional: Pick<PedidoOperacionalComItens, "dataEntrega" | "contaAzulCustomerId" | "itens">,
  contaAzul: PedidoContaAzulComItens,
  resolverChave?: ResolverChaveItem,
): number {
  const extOp = operacional.contaAzulCustomerId;
  const extCa = contaAzul.cliente.externalId;
  if (!extOp || !extCa || extOp !== extCa) return 0;

  const acumula = clienteAcumulaFaturamento(contaAzul.cliente.regraComercial);
  const dias = diffDias(operacional.dataEntrega, contaAzul.dataPedido);

  // Sem acúmulo: só candidata vínculo no mesmo dia (evita misturar 07/07 com 09/07).
  if (!acumula && dias !== 0) return 0;

  let score = 20;
  if (dias === 0) score += 50;
  else if (mesmaSemanaOperacional(operacional.dataEntrega, contaAzul.dataPedido)) score += 30;
  else if (dias <= 7) score += 10;

  const chavesOp = new Set(
    operacional.itens
      .map((i) =>
        resolverChave
          ? resolverChave("operacional", { produtoId: i.produtoId, produtoNome: i.produtoNome })
          : `nome:${normalizarNome(i.produtoNome)}`,
      )
      .filter(Boolean),
  );
  const chavesCa = new Set(
    contaAzul.itens
      .map((i) =>
        resolverChave
          ? resolverChave("contaAzul", { produto: i.produto, sku: i.sku })
          : `nome:${normalizarNome(i.produto)}`,
      )
      .filter(Boolean),
  );
  if (chavesOp.size === 0 || chavesCa.size === 0) return score;

  let overlap = 0;
  for (const chave of Array.from(chavesOp)) {
    if (chavesCa.has(chave)) overlap++;
  }
  score += Math.min(15, Math.round((overlap / Math.max(chavesOp.size, chavesCa.size)) * 15));
  return score;
}

export function janelaCandidatosVinculo(input: {
  dataPedido: Date;
  acumula: boolean;
  diasAcumulo?: number | null;
  janelaDias?: number;
}): { inicio: Date; fim: Date } {
  const corte = inicioDiaOperacional(GO_LIVE_PEDIDOS);

  // Sem acúmulo: apenas o próprio dia da venda.
  if (!input.acumula) {
    let inicio = inicioDiaOperacional(input.dataPedido);
    const fim = fimDiaOperacional(input.dataPedido);
    if (inicio.getTime() < corte.getTime()) inicio = corte;
    return { inicio, fim };
  }

  const janelaDias = input.janelaDias ?? 14;
  let inicio = adicionarDiasOperacional(input.dataPedido, -((input.diasAcumulo ?? 15) - 1));
  let fim = fimDiaOperacional(input.dataPedido);

  const extInicio = adicionarDiasOperacional(input.dataPedido, -janelaDias);
  const extFim = fimDiaOperacional(adicionarDiasOperacional(input.dataPedido, janelaDias));
  inicio = new Date(Math.min(inicio.getTime(), extInicio.getTime()));
  fim = new Date(Math.max(fim.getTime(), extFim.getTime()));
  if (inicio.getTime() < corte.getTime()) inicio = corte;
  return { inicio, fim };
}

export function diasEntrePedidos(operacional: { dataEntrega: Date }, contaAzul: { dataPedido: Date }): number {
  return diffDias(operacional.dataEntrega, contaAzul.dataPedido);
}

export function documentoContaAzulConciliavel(pedido: {
  statusPedido: string | null;
  cliente: { regraComercial?: { acumulaPedidos: boolean } | null };
}): boolean {
  const cls = classificarStatusPedido(pedido.statusPedido);
  if (cls === "venda") return true;
  return cls === "orcamento" && pedido.cliente.regraComercial?.acumulaPedidos === true;
}

async function registrarEvento(
  prisma: PrismaClient | Prisma.TransactionClient,
  data: {
    pedidoOperacionalId?: string | null;
    pedidoContaAzulId?: string | null;
    tipo: string;
    antes?: unknown;
    depois?: unknown;
    divergencias?: unknown;
    usuarioId?: string | null;
    usuarioNome?: string | null;
    observacoes?: string | null;
  },
) {
  const payload = {
    pedidoOperacionalId: data.pedidoOperacionalId ?? undefined,
    pedidoContaAzulId: data.pedidoContaAzulId ?? undefined,
    tipo: data.tipo,
    antes: data.antes == null ? undefined : (data.antes as Prisma.InputJsonValue),
    depois: data.depois == null ? undefined : (data.depois as Prisma.InputJsonValue),
    divergencias:
      data.divergencias == null ? undefined : (data.divergencias as Prisma.InputJsonValue),
    usuarioId: data.usuarioId ?? undefined,
    usuarioNome: data.usuarioNome ?? undefined,
    observacoes: data.observacoes ?? undefined,
  };

  try {
    await prisma.pedidoConciliacaoEvento.create({ data: payload });
    void limparEventosConciliacaoAntigosIfDue(prisma);
    return;
  } catch (err) {
    if (!isErroTabelaConciliacaoEventosCheia(err)) throw err;
    console.warn("[conciliacao] tabela de eventos cheia — tentando liberar espaço");
  }

  try {
    const removidos = await recuperarEspacoEventosConciliacao(prisma);
    if (removidos > 0) {
      await prisma.pedidoConciliacaoEvento.create({ data: payload });
      return;
    }
  } catch (retryErr) {
    console.error("[conciliacao] falha ao registrar evento após limpeza", retryErr);
  }

  console.error(
    "[conciliacao] evento de auditoria não registrado (tabela cheia). Operação principal concluída.",
    { tipo: data.tipo },
  );
}

export async function processarConciliacaoAposSyncVenda(
  prisma: PrismaClient,
  pedidoContaAzulId: string,
): Promise<{ sugestoes: number; divergencias: number }> {
  const contaAzul = await prisma.pedido.findUnique({
    where: { id: pedidoContaAzulId },
    include: {
      itens: true,
      cliente: {
        select: {
          externalId: true,
          nome: true,
          regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
        },
      },
    },
  });
  if (!contaAzul?.cliente.externalId) return { sugestoes: 0, divergencias: 0 };
  if (antesDoCortePedidos(contaAzul.dataPedido)) return { sugestoes: 0, divergencias: 0 };
  if (!documentoContaAzulConciliavel(contaAzul)) return { sugestoes: 0, divergencias: 0 };
  if (contaAzul.statusConciliacao === "IGNORADA" || contaAzul.statusConciliacao === "VENDA_ERRADA") {
    return { sugestoes: 0, divergencias: 0 };
  }

  const vinculados = await prisma.pedidoOperacional.findMany({
    where: { pedidoContaAzulId: contaAzul.id },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    orderBy: { dataEntrega: "asc" },
  });

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
  const acumula = clienteAcumulaFaturamento(contaAzul.cliente.regraComercial);

  if (vinculados.length > 0) {
    const divergencias =
      acumula && vinculados.length >= 1
        ? calcularDivergenciasAgregadas(vinculados, contaAzul, resolverChave)
        : calcularDivergencias(
            vinculados[0]!,
            contaAzul,
            resolverChave,
            opcoesCalcularDivergenciasParaPar(vinculados[0]!, contaAzul),
          );
    const snapshot: SnapshotConciliacao = {
      operacional:
        acumula && vinculados.length > 1
          ? snapshotOperacionalAgregado(vinculados)
          : snapshotOperacional(vinculados[0]!),
      contaAzul: snapshotContaAzul(contaAzul),
    };
    const algumConciliado = vinculados.some((op) => op.statusConciliacao === "CONCILIADO");
    const algumDivergente = vinculados.some((op) => op.statusConciliacao === "DIVERGENTE");

    if (divergencias.length > 0 && algumConciliado) {
      await prisma.$transaction(async (tx) => {
        for (const op of vinculados) {
          await tx.pedidoOperacional.update({
            where: { id: op.id },
            data: { statusConciliacao: "DIVERGENTE", snapshotConciliacao: snapshot as Prisma.InputJsonValue },
          });
        }
        await tx.pedido.update({
          where: { id: contaAzul.id },
          data: { statusConciliacao: "DIVERGENTE" },
        });
        await registrarEvento(tx, {
          pedidoOperacionalId: vinculados[0]!.id,
          pedidoContaAzulId: contaAzul.id,
          tipo: "VENDA_ALTERADA_CA",
          antes: vinculados[0]!.snapshotConciliacao ?? undefined,
          depois: snapshot,
          divergencias,
        });
      });
      return { sugestoes: 0, divergencias: 1 };
    }
    if (divergencias.length === 0 && algumDivergente) {
      await prisma.$transaction(async (tx) => {
        for (const op of vinculados) {
          await tx.pedidoOperacional.update({
            where: { id: op.id },
            data: {
              statusConciliacao: "CONCILIADO",
              snapshotConciliacao: snapshot as Prisma.InputJsonValue,
            },
          });
        }
        await tx.pedido.update({
          where: { id: contaAzul.id },
          data: { statusConciliacao: "CONCILIADA" },
        });
        await registrarEvento(tx, {
          pedidoOperacionalId: vinculados[0]!.id,
          pedidoContaAzulId: contaAzul.id,
          tipo: "DIVERGENCIA_RESOLVIDA",
          antes: vinculados[0]!.snapshotConciliacao ?? undefined,
          depois: snapshot,
        });
      });
    }
    return { sugestoes: 0, divergencias: 0 };
  }

  const candidatos = await prisma.pedidoOperacional.findMany({
    where: {
      contaAzulCustomerId: contaAzul.cliente.externalId,
      pedidoContaAzulId: null,
      statusConciliacao: { in: ["PLANEJADO", "VINCULO_SUGERIDO"] },
      dataEntrega: {
        gte: inicioSemana(contaAzul.dataPedido),
        lte: fimDia(new Date(inicioSemana(contaAzul.dataPedido).getTime() + 6 * 86_400_000)),
      },
    },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    take: 20,
  });

  let melhor: { op: PedidoOperacionalComItens; score: number } | null = null;
  for (const op of candidatos) {
    const score = scoreSugestaoVinculo(op, contaAzul, resolverChave);
    if (score >= 70 && (!melhor || score > melhor.score)) melhor = { op, score };
  }
  if (!melhor) return { sugestoes: 0, divergencias: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.pedidoOperacional.update({
      where: { id: melhor!.op.id },
      data: {
        statusConciliacao: "VINCULO_SUGERIDO",
        sugestaoPedidoContaAzulId: contaAzul.id,
      },
    });
    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        statusConciliacao: "SUGERIDA",
        sugestaoPedidoOperacionalId: melhor!.op.id,
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: melhor!.op.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: "SUGESTAO_VINCULO",
      depois: { score: melhor!.score, operacionalId: melhor!.op.id, contaAzulId: contaAzul.id },
    });
  });

  return { sugestoes: 1, divergencias: 0 };
}

export async function confirmarVinculoConciliacao(
  prisma: PrismaClient,
  input: {
    pedidoOperacionalId: string;
    pedidoContaAzulId: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const [operacional, contaAzul] = await Promise.all([
    prisma.pedidoOperacional.findUnique({
      where: { id: input.pedidoOperacionalId },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    }),
    prisma.pedido.findUnique({
      where: { id: input.pedidoContaAzulId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    }),
  ]);
  if (!operacional || !contaAzul) throw new Error("Pedido operacional ou venda Conta Azul não encontrado.");
  if (operacional.pedidoContaAzulId && operacional.pedidoContaAzulId !== contaAzul.id) {
    throw new Error("Este pedido operacional já está vinculado a outra venda.");
  }
  const acumula = clienteAcumulaFaturamento(contaAzul.cliente.regraComercial);
  const jaVinculados = await prisma.pedidoOperacional.findMany({
    where: { pedidoContaAzulId: contaAzul.id, NOT: { id: operacional.id } },
  });
  if (!acumula && jaVinculados.length > 0) {
    throw new Error("Esta venda Conta Azul já está vinculada a outro pedido operacional.");
  }
  if (acumula && jaVinculados.length > 0) {
    throw new Error(
      "Cliente com faturamento acumulado: use o vínculo múltiplo para incluir todos os pedidos do período.",
    );
  }
  if (!acumula && !mesmoDia(operacional.dataEntrega, contaAzul.dataPedido)) {
    throw new Error(
      "Para clientes sem acúmulo, o pedido operacional e a venda Conta Azul precisam ser do mesmo dia.",
    );
  }

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
  const divergencias = calcularDivergencias(
    operacional,
    contaAzul,
    resolverChave,
    opcoesCalcularDivergenciasParaPar(operacional, contaAzul),
  );
  const snapshot: SnapshotConciliacao = {
    operacional: snapshotOperacional(operacional),
    contaAzul: snapshotContaAzul(contaAzul),
  };

  await prisma.$transaction(async (tx) => {
    await tx.pedidoOperacional.update({
      where: { id: operacional.id },
      data: {
        pedidoContaAzulId: contaAzul.id,
        sugestaoPedidoContaAzulId: null,
        statusConciliacao: divergencias.length > 0 ? "DIVERGENTE" : "CONCILIADO",
        snapshotConciliacao: snapshot as Prisma.InputJsonValue,
      },
    });
    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        sugestaoPedidoOperacionalId: null,
        statusConciliacao: divergencias.length > 0 ? "DIVERGENTE" : "CONCILIADA",
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: operacional.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: divergencias.length > 0 ? "VINCULO_CONFIRMADO_COM_DIVERGENCIA" : "VINCULO_CONFIRMADO",
      depois: snapshot,
      divergencias: divergencias.length ? divergencias : undefined,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });

  return { divergencias };
}

export async function confirmarVinculoMultiploConciliacao(
  prisma: PrismaClient,
  input: {
    pedidoOperacionalIds: string[];
    pedidoContaAzulId: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const ids = Array.from(new Set(input.pedidoOperacionalIds)).filter(Boolean);
  if (ids.length === 0) throw new Error("Selecione ao menos um pedido operacional.");

  const [operacionais, contaAzul] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { id: { in: ids } },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
      orderBy: { dataEntrega: "asc" },
    }),
    prisma.pedido.findUnique({
      where: { id: input.pedidoContaAzulId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    }),
  ]);

  if (!contaAzul) throw new Error("Venda Conta Azul não encontrada.");
  if (operacionais.length !== ids.length) {
    throw new Error("Um ou mais pedidos operacionais não foram encontrados.");
  }
  if (!clienteAcumulaFaturamento(contaAzul.cliente.regraComercial)) {
    throw new Error("Vínculo múltiplo só está disponível para clientes com faturamento acumulado.");
  }

  const extCa = contaAzul.cliente.externalId;
  for (const op of operacionais) {
    if (op.pedidoContaAzulId && op.pedidoContaAzulId !== contaAzul.id) {
      throw new Error(`Pedido operacional ${op.id} já está vinculado a outra venda.`);
    }
    if (extCa && op.contaAzulCustomerId !== extCa) {
      throw new Error("Todos os pedidos operacionais devem ser do mesmo cliente da venda.");
    }
  }

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
  const divergencias = calcularDivergenciasAgregadas(operacionais, contaAzul, resolverChave);
  const snapshot: SnapshotConciliacao = {
    operacional: snapshotOperacionalAgregado(operacionais),
    contaAzul: snapshotContaAzul(contaAzul),
  };
  const conciliado = divergencias.length === 0;

  await prisma.$transaction(async (tx) => {
    for (const op of operacionais) {
      await tx.pedidoOperacional.update({
        where: { id: op.id },
        data: {
          pedidoContaAzulId: contaAzul.id,
          sugestaoPedidoContaAzulId: null,
          statusConciliacao: conciliado ? "CONCILIADO" : "DIVERGENTE",
          snapshotConciliacao: snapshot as Prisma.InputJsonValue,
        },
      });
    }
    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        sugestaoPedidoOperacionalId: null,
        statusConciliacao: conciliado ? "CONCILIADA" : "DIVERGENTE",
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: operacionais[0]!.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: conciliado ? "VINCULO_MULTIPLO_CONFIRMADO" : "VINCULO_MULTIPLO_COM_DIVERGENCIA",
      depois: snapshot,
      divergencias: divergencias.length ? divergencias : undefined,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });

  return { divergencias, pedidosVinculados: operacionais.length };
}

export async function marcarVendaErrada(
  prisma: PrismaClient,
  input: {
    pedidoContaAzulId: string;
    pedidoOperacionalId?: string;
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  await prisma.$transaction(async (tx) => {
    await tx.pedido.update({
      where: { id: input.pedidoContaAzulId },
      data: {
        statusConciliacao: "VENDA_ERRADA",
        sugestaoPedidoOperacionalId: null,
      },
    });
    if (input.pedidoOperacionalId) {
      await tx.pedidoOperacional.update({
        where: { id: input.pedidoOperacionalId },
        data: {
          statusConciliacao: "VENDA_ERRADA",
          sugestaoPedidoContaAzulId: null,
        },
      });
    }
    await registrarEvento(tx, {
      pedidoOperacionalId: input.pedidoOperacionalId,
      pedidoContaAzulId: input.pedidoContaAzulId,
      tipo: "VENDA_ERRADA",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function ignorarVendaContaAzul(
  prisma: PrismaClient,
  input: { pedidoContaAzulId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: input.pedidoContaAzulId } });
    if (!pedido) throw new Error("Venda não encontrada.");
    await tx.pedido.update({
      where: { id: input.pedidoContaAzulId },
      data: { statusConciliacao: "IGNORADA", sugestaoPedidoOperacionalId: null },
    });
    if (pedido.sugestaoPedidoOperacionalId) {
      await tx.pedidoOperacional.updateMany({
        where: { id: pedido.sugestaoPedidoOperacionalId },
        data: { statusConciliacao: "PLANEJADO", sugestaoPedidoContaAzulId: null },
      });
    }
    await registrarEvento(tx, {
      pedidoContaAzulId: input.pedidoContaAzulId,
      tipo: "VENDA_IGNORADA",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function manterOperacionalComoVerdade(
  prisma: PrismaClient,
  input: { pedidoOperacionalId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const op = await tx.pedidoOperacional.findUnique({ where: { id: input.pedidoOperacionalId } });
    if (!op) throw new Error("Pedido operacional não encontrado.");
    if (op.sugestaoPedidoContaAzulId) {
      await tx.pedido.updateMany({
        where: { id: op.sugestaoPedidoContaAzulId },
        data: { statusConciliacao: "NAO_CONCILIADA", sugestaoPedidoOperacionalId: null },
      });
    }
    await tx.pedidoOperacional.update({
      where: { id: input.pedidoOperacionalId },
      data: {
        statusConciliacao: op.pedidoContaAzulId ? "DIVERGENTE" : "PLANEJADO",
        sugestaoPedidoContaAzulId: null,
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: input.pedidoOperacionalId,
      tipo: "OPERACIONAL_MANTIDO",
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });
}

export async function criarOperacionalDeVenda(
  prisma: PrismaClient,
  input: {
    pedidoContaAzulId: string;
    tipoVenda: "RECORRENTE_SEMANAL" | "RECORRENTE_QUINZENAL" | "PLANO" | "AVULSO";
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const contaAzul = await prisma.pedido.findUnique({
    where: { id: input.pedidoContaAzulId },
    include: {
      itens: true,
      cliente: {
        select: {
          id: true,
          externalId: true,
          nome: true,
          regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
        },
      },
    },
  });
  if (!contaAzul?.cliente.externalId) throw new Error("Venda sem cliente Conta Azul vinculado.");
  if (antesDoCortePedidos(contaAzul.dataPedido)) {
    throw new Error("Pedidos operacionais começam em 01/06/2026.");
  }

  const existente = await prisma.pedidoOperacional.findFirst({
    where: { pedidoContaAzulId: contaAzul.id },
  });
  if (existente) throw new Error("Esta venda já possui pedido operacional vinculado.");

  if (
    isOrcamentoFaturamentoAcumulado(
      contaAzul.cliente.regraComercial,
      contaAzul.statusPedido
    )
  ) {
    throw new Error(
      mensagemErroCriarOperacionalDeOrcamentoAcumulado(
        contaAzul.cliente.regraComercial?.diasAcumulo
      )
    );
  }

  const produtosAtivos = await prisma.produtoComercial.findMany({
    where: { contaAzulProdutoId: { not: null }, ativo: true, importadoOperacao: true },
    select: {
      id: true,
      nome: true,
      sku: true,
      contaAzulProdutoId: true,
      ativo: true,
      importadoOperacao: true,
      categoria: true,
    },
  });
  const indice = criarIndiceProdutosOperacionais(produtosAtivos);
  const faltantes = contaAzul.itens
    .map((item) => {
      const prod = resolverProdutoOperacional(indice, { produto: item.produto, sku: item.sku });
      return prod ? null : item.produto;
    })
    .filter((nome): nome is string => Boolean(nome));
  if (faltantes.length > 0) {
    throw new Error(
      `Produto(s) não ativo(s) na operação: ${faltantes.join(", ")}. Importe/ative no catálogo Conta Azul (aba Produtos).`,
    );
  }

  const operacional = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedidoOperacional.create({
      data: {
        clienteId: contaAzul.cliente.id,
        contaAzulCustomerId: contaAzul.cliente.externalId!,
        dataEntrega: contaAzul.dataPedido,
        diaSemana: contaAzul.dataPedido.getUTCDay(),
        tipoVenda: input.tipoVenda,
        status: "PENDENTE",
        statusConciliacao: "CONCILIADO",
        pedidoContaAzulId: contaAzul.id,
        observacoes: input.observacoes ?? "Criado a partir da venda Conta Azul.",
        criadoPorId: input.usuario.id,
        editadoPorId: input.usuario.id,
        snapshotConciliacao: {
          operacional: null,
          contaAzul: snapshotContaAzul(contaAzul),
        } as Prisma.InputJsonValue,
        itens: {
          create: contaAzul.itens.map((item) => {
            const prod = resolverProdutoOperacional(indice, { produto: item.produto, sku: item.sku })!;
            return {
              produtoId: prod.id,
              produtoNome: prod.nome,
              categoria: item.categoria ?? prod.categoria,
              quantidade: num(item.quantidade),
              precoUnit: num(item.precoUnit),
            };
          }),
        },
      },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    });

    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: { statusConciliacao: "CONCILIADA", sugestaoPedidoOperacionalId: null },
    });

    await registrarEvento(tx, {
      pedidoOperacionalId: pedido.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: "OPERACIONAL_CRIADO_DE_VENDA",
      depois: { operacional: snapshotOperacional(pedido), contaAzul: snapshotContaAzul(contaAzul) },
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });

    return pedido;
  });

  return { pedidoOperacionalId: operacional.id };
}

export async function aplicarCorrecaoConciliacao(
  prisma: PrismaClient,
  input: {
    pedidoOperacionalId: string;
    pedidoContaAzulId: string;
    campos?: string[];
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const [operacional, contaAzul] = await Promise.all([
    prisma.pedidoOperacional.findUnique({
      where: { id: input.pedidoOperacionalId },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    }),
    prisma.pedido.findUnique({
      where: { id: input.pedidoContaAzulId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    }),
  ]);
  if (!operacional || !contaAzul) throw new Error("Pedido operacional ou venda Conta Azul não encontrado.");
  if (operacional.status === "CANCELADO") throw new Error("Não é possível corrigir pedido cancelado.");
  const vinculoValido =
    operacional.pedidoContaAzulId === contaAzul.id || operacional.sugestaoPedidoContaAzulId === contaAzul.id;
  if (!vinculoValido) {
    throw new Error("Esta venda não está vinculada ou sugerida para este pedido operacional.");
  }
  if (operacional.contaAzulCustomerId && contaAzul.cliente.externalId !== operacional.contaAzulCustomerId) {
    throw new Error("Cliente do pedido operacional não corresponde à venda Conta Azul.");
  }

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const produtosAtivos = produtosConciliacao.filter((p) => p.ativo && p.importadoOperacao);
  const indice = criarIndiceProdutosOperacionais(produtosAtivos);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
  const divergenciasAtuais = calcularDivergencias(
    operacional,
    contaAzul,
    resolverChave,
    opcoesCalcularDivergenciasParaPar(operacional, contaAzul),
  );
  const camposAlvo = input.campos?.length
    ? input.campos
    : divergenciasAtuais.map((d) => d.campo);
  if (camposAlvo.length === 0) throw new Error("Não há divergências para corrigir.");

  const divergenciasCorrigir = divergenciasAtuais.filter((d) => camposAlvo.includes(d.campo));
  if (divergenciasCorrigir.length === 0) {
    throw new Error("As divergências informadas não existem mais. Atualize a página.");
  }

  const antes = snapshotOperacional(operacional);
  let novaData: Date | null = null;

  await prisma.$transaction(async (tx) => {
    if (divergenciasCorrigir.some((d) => d.campo === "data")) {
      novaData = inicioDia(contaAzul.dataPedido);
      if (antesDoCortePedidos(novaData)) throw new Error("Pedidos operacionais começam em 01/06/2026.");
      await assertSemanaAnteriorFechada(tx as PrismaClient, novaData);
      await tx.pedidoOperacional.update({
        where: { id: operacional.id },
        data: {
          dataEntrega: novaData,
          diaSemana: diaSemanaOperacional(novaData),
          editadoPorId: input.usuario.id,
        },
      });
      await tx.pedidoOperacionalAvaria.updateMany({
        where: { pedidoId: operacional.id },
        data: { dataEntrega: novaData },
      });
    }

    const bloquearSyncItensAcumulo = isOrcamentoFaturamentoAcumulado(
      contaAzul.cliente.regraComercial,
      contaAzul.statusPedido
    );
    const sincronizarItens =
      !bloquearSyncItensAcumulo &&
      (divergenciasCorrigir.some((d) => d.campo === "valor_estimado") ||
        divergenciasCorrigir.some((d) => d.campo.startsWith("item:")));
    if (sincronizarItens) {
      const mapCa = quantidadePorChaveContaAzul(contaAzul, resolverChave);
      const mapOp = quantidadePorChaveOperacional(operacional, resolverChave);
      const chavesProcessar = new Set([...Array.from(mapCa.keys()), ...Array.from(mapOp.keys())]);

      for (const chave of Array.from(chavesProcessar)) {
        const ca = mapCa.get(chave);
        const op = mapOp.get(chave);
        const qCa = ca?.quantidade ?? 0;

        if (qCa <= 0) {
          if (op?.ids.length) {
            await tx.pedidoOperacionalItem.deleteMany({ where: { id: { in: op.ids } } });
          }
          continue;
        }

        const produtoCa = ca
          ? resolverProdutoOperacional(indice, { produto: ca.produto, sku: ca.sku })
          : null;
        if (!produtoCa) {
          throw new Error(
            `Produto "${ca?.produto ?? chave}" não está ativo na operação. Ative no catálogo antes de aplicar a correção.`,
          );
        }

        if (op?.ids.length) {
          const [primeiro, ...restantes] = op.ids;
          if (restantes.length > 0) {
            await tx.pedidoOperacionalItem.deleteMany({ where: { id: { in: restantes } } });
          }
          await tx.pedidoOperacionalItem.update({
            where: { id: primeiro },
            data: {
              produtoId: produtoCa.id,
              produtoNome: produtoCa.nome,
              categoria: ca?.categoria ?? produtoCa.categoria,
              quantidade: new Prisma.Decimal(qCa),
              precoUnit: ca?.precoUnit ?? null,
            },
          });
        } else {
          await tx.pedidoOperacionalItem.create({
            data: {
              pedidoId: operacional.id,
              produtoId: produtoCa.id,
              produtoNome: produtoCa.nome,
              categoria: ca?.categoria ?? produtoCa.categoria,
              quantidade: new Prisma.Decimal(qCa),
              precoUnit: ca?.precoUnit ?? null,
            },
          });
        }
      }
    }

    const operacionalAtualizado = await tx.pedidoOperacional.findUnique({
      where: { id: operacional.id },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    });
    if (!operacionalAtualizado) throw new Error("Pedido operacional não encontrado após correção.");

    const divergenciasDepois = calcularDivergencias(
      operacionalAtualizado,
      contaAzul,
      resolverChave,
      opcoesCalcularDivergenciasParaPar(operacionalAtualizado, contaAzul),
    );
    const snapshot: SnapshotConciliacao = {
      operacional: snapshotOperacional(operacionalAtualizado),
      contaAzul: snapshotContaAzul(contaAzul),
    };
    const conciliado = divergenciasDepois.length === 0;
    const podeVincular =
      operacional.pedidoContaAzulId === contaAzul.id ||
      operacional.sugestaoPedidoContaAzulId === contaAzul.id;

    if (podeVincular) {
      await tx.pedidoOperacional.update({
        where: { id: operacional.id },
        data: {
          pedidoContaAzulId: contaAzul.id,
          sugestaoPedidoContaAzulId: null,
          statusConciliacao: conciliado ? "CONCILIADO" : "DIVERGENTE",
          snapshotConciliacao: snapshot as Prisma.InputJsonValue,
          editadoPorId: input.usuario.id,
        },
      });
      await tx.pedido.update({
        where: { id: contaAzul.id },
        data: {
          sugestaoPedidoOperacionalId: null,
          statusConciliacao: conciliado ? "CONCILIADA" : "DIVERGENTE",
        },
      });
    } else {
      await tx.pedidoOperacional.update({
        where: { id: operacional.id },
        data: { editadoPorId: input.usuario.id },
      });
    }

    await registrarEvento(tx, {
      pedidoOperacionalId: operacional.id,
      pedidoContaAzulId: contaAzul.id,
      tipo: "CORRECAO_APLICADA_CA",
      antes,
      depois: snapshot,
      divergencias: divergenciasCorrigir,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });
  });

  const operacionalFinal = await prisma.pedidoOperacional.findUnique({
    where: { id: operacional.id },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
  });
  const divergenciasRestantes = operacionalFinal
    ? calcularDivergencias(
        operacionalFinal,
        contaAzul,
        resolverChave,
        opcoesCalcularDivergenciasParaPar(operacionalFinal, contaAzul),
      )
    : [];

  return {
    dataEntrega: novaData,
    divergenciasRestantes,
    conciliado: divergenciasRestantes.length === 0,
  };
}

function distribuirQuantidadeEntreEntregas(
  total: number,
  entregas: Array<{ id: string; peso: number }>,
): Map<string, number> {
  const out = new Map<string, number>();
  if (entregas.length === 0 || total <= 0) return out;
  const pesoTotal = entregas.reduce((s, e) => s + e.peso, 0);
  if (pesoTotal <= 0) {
    out.set(entregas[0]!.id, total);
    return out;
  }
  let restante = total;
  for (let i = 0; i < entregas.length; i++) {
    const entrega = entregas[i]!;
    const q =
      i === entregas.length - 1
        ? restante
        : Math.round(((total * entrega.peso) / pesoTotal) * 1000) / 1000;
    out.set(entrega.id, q);
    restante -= q;
  }
  return out;
}

/** Distribui itens da venda CA entre entregas operacionais vinculadas (faturamento acumulado). */
export async function aplicarCorrecaoAgregadaConciliacao(
  prisma: PrismaClient,
  input: {
    pedidoOperacionalIds: string[];
    pedidoContaAzulId: string;
    campos?: string[];
    usuario: { id: string; nome: string };
    observacoes?: string;
  },
) {
  const ids = Array.from(new Set(input.pedidoOperacionalIds)).filter(Boolean);
  if (ids.length === 0) throw new Error("Informe ao menos uma entrega operacional.");

  const [operacionaisRaw, contaAzul] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { id: { in: ids } },
      include: {
        itens: true,
        cliente: { select: { externalId: true, nome: true, regraComercial: { select: { acumulaPedidos: true } } } },
      },
      orderBy: [{ dataEntrega: "asc" }, { criadoEm: "asc" }],
    }),
    prisma.pedido.findUnique({
      where: { id: input.pedidoContaAzulId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    }),
  ]);

  if (!contaAzul) throw new Error("Venda Conta Azul não encontrada.");
  const operacionais = operacionaisRaw.filter((op) => op.status !== "CANCELADO");
  if (operacionais.length === 0) throw new Error("Nenhuma entrega operacional ativa para corrigir.");

  for (const op of operacionais) {
    if (op.pedidoContaAzulId !== contaAzul.id && op.sugestaoPedidoContaAzulId !== contaAzul.id) {
      throw new Error("Todas as entregas devem estar vinculadas (ou sugeridas) à mesma venda Conta Azul.");
    }
    if (op.contaAzulCustomerId && contaAzul.cliente.externalId !== op.contaAzulCustomerId) {
      throw new Error("Cliente inconsistente entre entregas operacionais e venda Conta Azul.");
    }
  }

  if (isOrcamentoFaturamentoAcumulado(contaAzul.cliente.regraComercial, contaAzul.statusPedido)) {
    throw new Error(
      "Orçamento diário de acumulador não recebe correção agregada. Vincule as entregas à venda faturada consolidada.",
    );
  }

  const produtosConciliacao = await carregarProdutosConciliacao(prisma);
  const produtosAtivos = produtosConciliacao.filter((p) => p.ativo && p.importadoOperacao);
  const indice = criarIndiceProdutosOperacionais(produtosAtivos);
  const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);

  const divergenciasAtuais = calcularDivergenciasAgregadas(operacionais, contaAzul, resolverChave);
  const camposAlvo = input.campos?.length
    ? input.campos
    : divergenciasAtuais.map((d) => d.campo);
  if (camposAlvo.length === 0) throw new Error("Não há divergências agregadas para corrigir.");

  const divergenciasCorrigir = divergenciasAtuais.filter((d) => camposAlvo.includes(d.campo));
  if (divergenciasCorrigir.length === 0) {
    throw new Error("As divergências informadas não existem mais. Atualize a página.");
  }
  if (divergenciasCorrigir.some((d) => d.campo === "data")) {
    throw new Error(
      "Divergência de data em faturamento acumulado: ajuste a data de cada entrega individualmente.",
    );
  }

  const sincronizarItens =
    divergenciasCorrigir.some((d) => d.campo === "valor_estimado") ||
    divergenciasCorrigir.some((d) => d.campo.startsWith("item:"));

  await prisma.$transaction(async (tx) => {
    if (sincronizarItens) {
      const mapCa = quantidadePorChaveContaAzul(contaAzul, resolverChave);
      const itensPorOp = new Map<string, Array<{ produtoId: string; produtoNome: string; categoria: string | null; quantidade: number; precoUnit: number | null }>>();

      for (const op of operacionais) {
        itensPorOp.set(op.id, []);
      }

      for (const [chave, ca] of Array.from(mapCa.entries())) {
        if (ca.quantidade <= 0) continue;
        const produtoCa = resolverProdutoOperacional(indice, { produto: ca.produto, sku: ca.sku });
        if (!produtoCa) {
          throw new Error(
            `Produto "${ca.produto}" não está ativo na operação. Ative no catálogo antes de aplicar a correção.`,
          );
        }

        const pesos = operacionais.map((op) => {
          const mapOp = quantidadePorChaveOperacional(op, resolverChave);
          return { id: op.id, peso: mapOp.get(chave)?.quantidade ?? 0 };
        });
        const distribuicao = distribuirQuantidadeEntreEntregas(ca.quantidade, pesos);

        for (const [opId, qtd] of Array.from(distribuicao.entries())) {
          if (qtd <= 0) continue;
          const lista = itensPorOp.get(opId) ?? [];
          lista.push({
            produtoId: produtoCa.id,
            produtoNome: produtoCa.nome,
            categoria: ca.categoria ?? produtoCa.categoria,
            quantidade: qtd,
            precoUnit: ca.precoUnit ?? null,
          });
          itensPorOp.set(opId, lista);
        }
      }

      for (const op of operacionais) {
        await tx.pedidoOperacionalItem.deleteMany({ where: { pedidoId: op.id } });
        const novosItens = itensPorOp.get(op.id) ?? [];
        if (novosItens.length > 0) {
          await tx.pedidoOperacionalItem.createMany({
            data: novosItens.map((item) => ({
              pedidoId: op.id,
              produtoId: item.produtoId,
              produtoNome: item.produtoNome,
              categoria: item.categoria,
              quantidade: new Prisma.Decimal(item.quantidade),
              precoUnit: item.precoUnit == null ? null : new Prisma.Decimal(item.precoUnit),
            })),
          });
        }
        await tx.pedidoOperacional.update({
          where: { id: op.id },
          data: { editadoPorId: input.usuario.id },
        });
      }
    }

    const operacionaisAtualizados = await tx.pedidoOperacional.findMany({
      where: { id: { in: operacionais.map((op) => op.id) } },
      include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
      orderBy: [{ dataEntrega: "asc" }, { criadoEm: "asc" }],
    });

    const divergenciasDepois = calcularDivergenciasAgregadas(
      operacionaisAtualizados,
      contaAzul,
      resolverChave,
    );
    const conciliado = divergenciasDepois.length === 0;
    const snapshot: SnapshotConciliacao = {
      operacional: snapshotOperacionalAgregado(operacionaisAtualizados),
      contaAzul: snapshotContaAzul(contaAzul),
    };

    for (const op of operacionaisAtualizados) {
      await tx.pedidoOperacional.update({
        where: { id: op.id },
        data: {
          pedidoContaAzulId: contaAzul.id,
          sugestaoPedidoContaAzulId: null,
          statusConciliacao: conciliado ? "CONCILIADO" : "DIVERGENTE",
          snapshotConciliacao: snapshot as Prisma.InputJsonValue,
        },
      });
      await registrarEvento(tx, {
        pedidoOperacionalId: op.id,
        pedidoContaAzulId: contaAzul.id,
        tipo: "CORRECAO_AGREGADA_APLICADA_CA",
        depois: snapshot,
        divergencias: divergenciasCorrigir,
        usuarioId: input.usuario.id,
        usuarioNome: input.usuario.nome,
        observacoes: input.observacoes,
      });
    }

    await tx.pedido.update({
      where: { id: contaAzul.id },
      data: {
        sugestaoPedidoOperacionalId: null,
        statusConciliacao: conciliado ? "CONCILIADA" : "DIVERGENTE",
      },
    });
  });

  const operacionaisFinal = await prisma.pedidoOperacional.findMany({
    where: { id: { in: operacionais.map((op) => op.id) } },
    include: { itens: true, cliente: { select: { externalId: true, nome: true } } },
    orderBy: [{ dataEntrega: "asc" }, { criadoEm: "asc" }],
  });
  const divergenciasRestantes = calcularDivergenciasAgregadas(
    operacionaisFinal,
    contaAzul,
    resolverChave,
  );

  return {
    pedidosCorrigidos: operacionaisFinal.length,
    divergenciasRestantes,
    conciliado: divergenciasRestantes.length === 0,
  };
}

export async function desvincularConciliacao(
  prisma: PrismaClient,
  input: { pedidoOperacionalId: string; usuario: { id: string; nome: string }; observacoes?: string },
) {
  await prisma.$transaction(async (tx) => {
    const op = await tx.pedidoOperacional.findUnique({ where: { id: input.pedidoOperacionalId } });
    if (!op?.pedidoContaAzulId) throw new Error("Pedido operacional não possui vínculo com Conta Azul.");
    const caId = op.pedidoContaAzulId;
    await tx.pedidoOperacional.update({
      where: { id: op.id },
      data: {
        pedidoContaAzulId: null,
        statusConciliacao: "PLANEJADO",
        snapshotConciliacao: Prisma.DbNull,
        sugestaoPedidoContaAzulId: null,
      },
    });
    await registrarEvento(tx, {
      pedidoOperacionalId: op.id,
      pedidoContaAzulId: caId,
      tipo: "DESVINCULADO",
      antes: op.snapshotConciliacao ?? undefined,
      usuarioId: input.usuario.id,
      usuarioNome: input.usuario.nome,
      observacoes: input.observacoes,
    });

    const restantes = await tx.pedidoOperacional.findMany({
      where: { pedidoContaAzulId: caId },
      include: {
        itens: true,
        cliente: { select: { externalId: true, nome: true } },
      },
      orderBy: { dataEntrega: "asc" },
    });
    if (restantes.length === 0) {
      await tx.pedido.update({
        where: { id: caId },
        data: { statusConciliacao: "NAO_CONCILIADA", sugestaoPedidoOperacionalId: null },
      });
      return;
    }

    const contaAzul = await tx.pedido.findUnique({
      where: { id: caId },
      include: {
        itens: true,
        cliente: {
          select: {
            externalId: true,
            nome: true,
            regraComercial: { select: { acumulaPedidos: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT } },
          },
        },
      },
    });
    if (!contaAzul) return;

    const produtosConciliacao = await carregarProdutosConciliacao(tx as PrismaClient);
    const resolverChave = criarResolverChaveItemConciliacao(produtosConciliacao);
    const acumula = clienteAcumulaFaturamento(contaAzul.cliente.regraComercial);
    const divergencias =
      acumula && restantes.length > 1
        ? calcularDivergenciasAgregadas(restantes, contaAzul, resolverChave)
        : calcularDivergencias(
            restantes[0]!,
            contaAzul,
            resolverChave,
            opcoesCalcularDivergenciasParaPar(restantes[0]!, contaAzul),
          );
    const conciliado = divergencias.length === 0;
    const snapshot: SnapshotConciliacao = {
      operacional:
        acumula && restantes.length > 1
          ? snapshotOperacionalAgregado(restantes)
          : snapshotOperacional(restantes[0]!),
      contaAzul: snapshotContaAzul(contaAzul),
    };
    for (const rest of restantes) {
      await tx.pedidoOperacional.update({
        where: { id: rest.id },
        data: {
          statusConciliacao: conciliado ? "CONCILIADO" : "DIVERGENTE",
          snapshotConciliacao: snapshot as Prisma.InputJsonValue,
        },
      });
    }
    await tx.pedido.update({
      where: { id: caId },
      data: { statusConciliacao: conciliado ? "CONCILIADA" : "DIVERGENTE" },
    });
  });
}
