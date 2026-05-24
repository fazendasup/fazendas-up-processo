import type { Cliente, Pedido } from "../generated/prisma/index.js";
import { StatusRelacionamento } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "../lib/composicao-valor.js";
import { classificarStatusPedido } from "../lib/pedido-status.js";

export type SinaisVenda = {
  diasSemCompra: number | null;
  ticketMedio: number;
  frequenciaPorSemana: number;
  totalPedidos: number;
  valorTotalPeriodo: number;
  valorUltimos30: number;
  valor30Anterior: number;
  tendenciaReceitaPct: number | null;
  categorias: string[];
  produtos: string[];
  categoriaPrincipal: string | null;
  produtoPrincipal: string | null;
  diversidadeCategorias: number;
  mesesAtivos: number;
  categoriasDetalhe: Array<{
    nome: string;
    valor: number;
    quantidade: number;
    pedidos: number;
    participacaoValor: number;
  }>;
  produtosDetalhe: Array<{
    nome: string;
    categoria: string | null;
    valor: number;
    quantidade: number;
    pedidos: number;
    participacaoValor: number;
  }>;
};

type PedidoComItens = Pedido & {
  itens?: Array<{
    produto: string;
    categoria?: string | null;
    quantidade?: unknown;
    precoUnit?: unknown;
  }>;
};

function sinalVazio(): SinaisVenda {
  return {
    diasSemCompra: null,
    ticketMedio: 0,
    frequenciaPorSemana: 0,
    totalPedidos: 0,
    valorTotalPeriodo: 0,
    valorUltimos30: 0,
    valor30Anterior: 0,
    tendenciaReceitaPct: null,
    categorias: [],
    produtos: [],
    categoriaPrincipal: null,
    produtoPrincipal: null,
    diversidadeCategorias: 0,
    mesesAtivos: 0,
    categoriasDetalhe: [],
    produtosDetalhe: [],
  };
}

function addCount(
  map: Map<string, number>,
  key: string | null | undefined,
  qtd = 1
) {
  const k = String(key ?? "").trim();
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + qtd);
}

function topKey(map: Map<string, number>): string | null {
  return (
    Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
    )[0]?.[0] ?? null
  );
}

type ItemStats = { valor: number; quantidade: number; pedidos: Set<string> };

function addStats(
  map: Map<string, ItemStats>,
  key: string | null | undefined,
  valor: number,
  quantidade: number,
  pedidoId: string
) {
  const k = String(key ?? "").trim();
  if (!k) return;
  const acc = map.get(k) ?? {
    valor: 0,
    quantidade: 0,
    pedidos: new Set<string>(),
  };
  acc.valor += valor;
  acc.quantidade += quantidade;
  acc.pedidos.add(pedidoId);
  map.set(k, acc);
}

function detalhesOrdenados(map: Map<string, ItemStats>, total: number) {
  return Array.from(map.entries())
    .map(([nome, s]) => ({
      nome,
      valor: s.valor,
      quantidade: s.quantidade,
      pedidos: s.pedidos.size,
      participacaoValor: total > 0 ? s.valor / total : 0,
    }))
    .sort(
      (a, b) =>
        b.valor - a.valor ||
        b.quantidade - a.quantidade ||
        a.nome.localeCompare(b.nome, "pt-BR")
    );
}

export function extrairSinaisDePedidos(
  pedidos: PedidoComItens[],
  agora = new Date()
): SinaisVenda {
  const vendas = pedidos.filter(
    p => classificarStatusPedido(p.statusPedido) === "venda"
  );
  if (vendas.length === 0) {
    return sinalVazio();
  }

  const ordenados = [...vendas].sort(
    (a, b) => a.dataPedido.getTime() - b.dataPedido.getTime()
  );
  const ultima = ordenados[ordenados.length - 1]!;
  const diasSemCompra = Math.max(
    0,
    Math.floor((agora.getTime() - ultima.dataPedido.getTime()) / 86_400_000)
  );

  const valorPedido = (p: PedidoComItens) =>
    composicaoDoPedidoParaDashboard(p).valorLiquido;
  const valorTotalPeriodo = vendas.reduce((s, p) => s + valorPedido(p), 0);
  const ticketMedio = valorTotalPeriodo / vendas.length;

  const primeira = ordenados[0]!;
  const diasJanela = Math.max(
    7,
    (ultima.dataPedido.getTime() - primeira.dataPedido.getTime()) / 86_400_000
  );
  const semanas = diasJanela / 7;
  const frequenciaPorSemana = vendas.length / semanas;

  const t30 = agora.getTime() - 30 * 86_400_000;
  const t60 = agora.getTime() - 60 * 86_400_000;
  let valorUltimos30 = 0;
  let valor30Anterior = 0;
  const meses = new Set<string>();
  const categoriasCount = new Map<string, number>();
  const produtosCount = new Map<string, number>();
  const categoriasStats = new Map<string, ItemStats>();
  const produtosStats = new Map<string, ItemStats>();
  const produtoCategoria = new Map<string, string | null>();

  for (const p of vendas) {
    const valor = valorPedido(p);
    const t = p.dataPedido.getTime();
    if (t >= t30) valorUltimos30 += valor;
    else if (t >= t60) valor30Anterior += valor;
    meses.add(
      `${p.dataPedido.getFullYear()}-${String(p.dataPedido.getMonth() + 1).padStart(2, "0")}`
    );
    for (const item of p.itens ?? []) {
      const qtd = Number(item.quantidade ?? 1);
      const preco = Number(item.precoUnit ?? 0);
      const quantidade = Number.isFinite(qtd) && qtd > 0 ? qtd : 1;
      const valorItem =
        Number.isFinite(preco) && preco > 0 ? quantidade * preco : 0;
      addCount(categoriasCount, item.categoria, quantidade);
      addCount(produtosCount, item.produto, quantidade);
      addStats(categoriasStats, item.categoria, valorItem, quantidade, p.id);
      addStats(produtosStats, item.produto, valorItem, quantidade, p.id);
      if (item.produto?.trim())
        produtoCategoria.set(item.produto, item.categoria ?? null);
    }
  }

  const tendenciaReceitaPct =
    valor30Anterior > 0
      ? (valorUltimos30 - valor30Anterior) / valor30Anterior
      : valorUltimos30 > 0
        ? 1
        : null;

  const categoriasDetalhe = detalhesOrdenados(
    categoriasStats,
    valorTotalPeriodo
  );
  const produtosDetalhe = detalhesOrdenados(
    produtosStats,
    valorTotalPeriodo
  ).map(p => ({
    ...p,
    categoria: produtoCategoria.get(p.nome) ?? null,
  }));

  return {
    diasSemCompra,
    ticketMedio,
    frequenciaPorSemana,
    totalPedidos: vendas.length,
    valorTotalPeriodo,
    valorUltimos30,
    valor30Anterior,
    tendenciaReceitaPct,
    categorias: Array.from(categoriasCount.keys()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
    produtos: Array.from(produtosCount.keys()).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
    categoriaPrincipal: topKey(categoriasCount),
    produtoPrincipal: topKey(produtosCount),
    diversidadeCategorias: categoriasCount.size,
    mesesAtivos: meses.size,
    categoriasDetalhe,
    produtosDetalhe,
  };
}

/**
 * Score 0–100 derivado primariamente de dados estruturados (Conta Azul / pedidos).
 * Manus entra só como refinamento qualitativo em outro endpoint.
 */
export function calcularScoreComercialBase(sinais: SinaisVenda): number {
  if (sinais.totalPedidos === 0) return 5;

  const dias = sinais.diasSemCompra ?? 999;
  const recencia =
    dias <= 7
      ? 24
      : dias <= 15
        ? 20
        : dias <= 30
          ? 13
          : dias <= 45
            ? 7
            : dias <= 75
              ? 2
              : -8;
  const frequencia = Math.min(
    22,
    Math.log1p(sinais.frequenciaPorSemana * 3.2) * 12
  );
  const valor = Math.min(
    22,
    Math.log10(Math.max(1, sinais.valorTotalPeriodo)) * 5.4
  );
  const ticket = Math.min(
    17,
    Math.log10(Math.max(1, sinais.ticketMedio)) * 6.2
  );
  const diversidade = Math.min(7, sinais.diversidadeCategorias * 1.7);
  const recorrencia = Math.min(6, sinais.mesesAtivos * 1.5);
  const tendencia =
    sinais.tendenciaReceitaPct == null
      ? 0
      : sinais.tendenciaReceitaPct >= 0.4
        ? 6
        : sinais.tendenciaReceitaPct >= 0.1
          ? 3
          : sinais.tendenciaReceitaPct <= -0.45
            ? -9
            : sinais.tendenciaReceitaPct <= -0.2
              ? -5
              : 0;

  const score =
    8 +
    recencia +
    frequencia +
    valor +
    ticket +
    diversidade +
    recorrencia +
    tendencia;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function inferirStatusRelacionamento(
  sinais: SinaisVenda
): StatusRelacionamento {
  const dias = sinais.diasSemCompra ?? 999;
  if (sinais.totalPedidos === 0) return StatusRelacionamento.INATIVO;
  if (dias > 75) return StatusRelacionamento.INATIVO;
  if (
    dias > 35 ||
    sinais.frequenciaPorSemana < 0.2 ||
    (sinais.tendenciaReceitaPct ?? 0) <= -0.55
  ) {
    return StatusRelacionamento.EM_RISCO;
  }
  if (
    sinais.valorTotalPeriodo >= 8_000 &&
    sinais.ticketMedio >= 350 &&
    sinais.frequenciaPorSemana >= 0.8 &&
    dias <= 21
  ) {
    return StatusRelacionamento.ESTRATEGICO;
  }
  return StatusRelacionamento.ATIVO;
}

export function sugerirTags(_cliente: Cliente, sinais: SinaisVenda): string[] {
  const tags: string[] = [];
  if (sinais.ticketMedio >= 700) tags.push("Premium");
  if (sinais.valorTotalPeriodo >= 8_000) tags.push("Volume");
  if ((sinais.diasSemCompra ?? 0) > 35) tags.push("Reativacao");
  if (sinais.frequenciaPorSemana >= 2) tags.push("Alta_Frequencia");
  if ((sinais.tendenciaReceitaPct ?? 0) <= -0.3) tags.push("Queda_Recente");
  if (sinais.diversidadeCategorias <= 1 && sinais.totalPedidos >= 3)
    tags.push("Mix_Concentrado");
  return tags;
}
