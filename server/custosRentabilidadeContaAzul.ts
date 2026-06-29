import { AcaoApi, OrigemPedido } from "./comercial/generated/prisma/index.js";
import { getComercialPrisma } from "./comercial/db";
import { composicaoDoPedidoParaDashboard } from "./comercial/lib/composicao-valor.js";
import { classificarStatusPedido } from "./comercial/lib/pedido-status.js";
import {
  criarIndiceProdutosOperacionais,
  resolverProdutoOperacional,
} from "./comercial/lib/produto-operacional.js";
import * as custosProdutoDb from "./custosProdutoDb";
import type { CustoProdutoFichaRow } from "../drizzle/schema";
import {
  PRODUTO_VENDA_SEM_ITENS_CHAVE,
  PRODUTO_VENDA_SEM_ITENS_NOME,
} from "@shared/custosRentabilidadeVendasCa";

function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type VendaContaAzulAgregada = {
  chave: string;
  produtoNome: string;
  sku: string | null;
  produtoComercialId: string | null;
  fichaId: number | null;
  fichaNome: string | null;
  /** false quando a ficha existe mas está desativada na lista de custos. */
  fichaAtivo: boolean | null;
  quantidade: number;
  receitaTotal: number;
  linhasPedido: number;
  custoUnitContaAzul: number | null;
};

export type VendasContaAzulDiagnostico = {
  pedidosNoPeriodo: number;
  pedidosVenda: number;
  pedidosExcluidosStatus: number;
  pedidosSemItens: number;
  receitaLiquidaPedidos: number;
  receitaItensBruto: number;
  freteTotal: number;
  descontoTotal: number;
};

export type VendasContaAzulResultado = {
  pedidosVenda: number;
  receitaTotal: number;
  quantidadeTotal: number;
  produtos: VendaContaAzulAgregada[];
  produtosSemFicha: number;
  ultimaSyncContaAzul: Date | null;
  ultimaSyncStatus: string | null;
  diagnostico: VendasContaAzulDiagnostico;
};

function fichaEstaAtiva(f: { ativo: boolean | number | null | undefined }): boolean {
  return f.ativo !== false && f.ativo !== 0;
}

function criarIndiceFichas(fichas: CustoProdutoFichaRow[]) {
  const porProdutoComercialId = new Map<string, CustoProdutoFichaRow>();
  const porNome = new Map<string, CustoProdutoFichaRow>();
  for (const f of fichas) {
    if (f.produtoComercialId) {
      const atual = porProdutoComercialId.get(f.produtoComercialId);
      if (!atual || (fichaEstaAtiva(f) && !fichaEstaAtiva(atual))) {
        porProdutoComercialId.set(f.produtoComercialId, f);
      }
    }
    const nk = normalizarNome(f.nome);
    if (nk) {
      const atual = porNome.get(nk);
      if (!atual || (fichaEstaAtiva(f) && !fichaEstaAtiva(atual))) {
        porNome.set(nk, f);
      }
    }
  }
  return { porProdutoComercialId, porNome };
}

function resolverFicha(
  indice: ReturnType<typeof criarIndiceFichas>,
  produtoComercialId: string | null,
  produtoNome: string,
): { fichaId: number | null; fichaNome: string | null; fichaAtivo: boolean | null } {
  if (produtoComercialId) {
    const f = indice.porProdutoComercialId.get(produtoComercialId);
    if (f) return { fichaId: f.id, fichaNome: f.nome, fichaAtivo: fichaEstaAtiva(f) };
  }
  const f = indice.porNome.get(normalizarNome(produtoNome));
  if (f) return { fichaId: f.id, fichaNome: f.nome, fichaAtivo: fichaEstaAtiva(f) };
  return { fichaId: null, fichaNome: null, fichaAtivo: null };
}

type AggInterno = VendaContaAzulAgregada & { _custoPeso: number; _custoSum: number };

type LinhaPedidoInterna = {
  chave: string;
  produtoNome: string;
  sku: string | null;
  produtoComercialId: string | null;
  fichaId: number | null;
  fichaNome: string | null;
  fichaAtivo: boolean | null;
  quantidade: number;
  bruto: number;
  custoUnit: number | null;
};

export async function buscarVendasContaAzulPorPeriodo(
  projetoId: number,
  inicio: Date,
  fim: Date,
): Promise<VendasContaAzulResultado> {
  const prisma = getComercialPrisma();
  const [pedidos, produtos, fichas, lastSync] = await Promise.all([
    prisma.pedido.findMany({
      where: {
        origemPedido: OrigemPedido.CONTA_AZUL,
        dataPedido: { gte: inicio, lte: fim },
      },
      select: {
        statusPedido: true,
        valorBruto: true,
        valorFrete: true,
        valorDesconto: true,
        valorLiquido: true,
        valorTotal: true,
        composicaoDetalhada: true,
        itens: {
          select: {
            produto: true,
            sku: true,
            quantidade: true,
            precoUnit: true,
            custoUnit: true,
          },
        },
      },
    }),
    prisma.produtoComercial.findMany({
      select: {
        id: true,
        nome: true,
        sku: true,
        contaAzulProdutoId: true,
        ativo: true,
        importadoOperacao: true,
        categoria: true,
      },
    }),
    custosProdutoDb.listCustosProdutoFichas(projetoId),
    prisma.execucaoApi.findFirst({
      where: { acaoApi: AcaoApi.SYNC_CA },
      orderBy: { dataExecucao: "desc" },
      select: { dataExecucao: true, statusExecucao: true },
    }),
  ]);

  const indiceProdutos = criarIndiceProdutosOperacionais(produtos);
  const indiceFichas = criarIndiceFichas(fichas);
  const agg = new Map<string, AggInterno>();

  let pedidosVenda = 0;
  let pedidosExcluidosStatus = 0;
  let pedidosSemItens = 0;
  let receitaLiquidaPedidos = 0;
  let receitaItensBruto = 0;
  let freteTotal = 0;
  let descontoTotal = 0;
  let quantidadeTotal = 0;

  for (const p of pedidos) {
    if (classificarStatusPedido(p.statusPedido) !== "venda") {
      pedidosExcluidosStatus += 1;
      continue;
    }

    pedidosVenda += 1;
    const comp = composicaoDoPedidoParaDashboard(p);
    receitaLiquidaPedidos = round2(receitaLiquidaPedidos + comp.valorLiquido);
    freteTotal = round2(freteTotal + comp.valorFrete);
    descontoTotal = round2(descontoTotal + comp.valorDesconto);
    const linhas: LinhaPedidoInterna[] = [];
    for (const item of p.itens) {
      const qtd = Number(item.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) continue;

      const preco = Number(item.precoUnit);
      const bruto = round2(qtd * (Number.isFinite(preco) ? preco : 0));
      receitaItensBruto = round2(receitaItensBruto + bruto);

      const resolved = resolverProdutoOperacional(indiceProdutos, {
        produto: item.produto,
        sku: item.sku,
      });
      const produtoComercialId = resolved?.id ?? null;
      const chave = produtoComercialId
        ? `pid:${produtoComercialId}`
        : `nome:${normalizarNome(item.produto) || "sem_nome"}`;
      const { fichaId, fichaNome, fichaAtivo } = resolverFicha(
        indiceFichas,
        produtoComercialId,
        item.produto,
      );
      const custo = item.custoUnit != null ? Number(item.custoUnit) : null;

      linhas.push({
        chave,
        produtoNome: resolved?.nome ?? item.produto,
        sku: item.sku ?? resolved?.sku ?? null,
        produtoComercialId,
        fichaId,
        fichaNome,
        fichaAtivo,
        quantidade: qtd,
        bruto,
        custoUnit: custo != null && Number.isFinite(custo) && custo >= 0 ? custo : null,
      });
    }

    if (linhas.length === 0) {
      if (comp.valorLiquido > 0) {
        pedidosSemItens += 1;
        const cur: AggInterno = agg.get(PRODUTO_VENDA_SEM_ITENS_CHAVE) ?? {
          chave: PRODUTO_VENDA_SEM_ITENS_CHAVE,
          produtoNome: PRODUTO_VENDA_SEM_ITENS_NOME,
          sku: null,
          produtoComercialId: null,
          fichaId: null,
          fichaNome: null,
          fichaAtivo: null,
          quantidade: 0,
          receitaTotal: 0,
          linhasPedido: 0,
          custoUnitContaAzul: null,
          _custoPeso: 0,
          _custoSum: 0,
        };
        cur.quantidade = round2(cur.quantidade + 1);
        cur.receitaTotal = round2(cur.receitaTotal + comp.valorLiquido);
        cur.linhasPedido += 1;
        agg.set(PRODUTO_VENDA_SEM_ITENS_CHAVE, cur);
        quantidadeTotal = round2(quantidadeTotal + 1);
      }
      continue;
    }

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]!;
      const receita = linha.bruto;
      const cur: AggInterno = agg.get(linha.chave) ?? {
        chave: linha.chave,
        produtoNome: linha.produtoNome,
        sku: linha.sku,
        produtoComercialId: linha.produtoComercialId,
        fichaId: linha.fichaId,
        fichaNome: linha.fichaNome,
        fichaAtivo: linha.fichaAtivo,
        quantidade: 0,
        receitaTotal: 0,
        linhasPedido: 0,
        custoUnitContaAzul: null,
        _custoPeso: 0,
        _custoSum: 0,
      };

      cur.quantidade = round2(cur.quantidade + linha.quantidade);
      cur.receitaTotal = round2(cur.receitaTotal + receita);
      cur.linhasPedido += 1;
      if (!cur.fichaId && linha.fichaId) {
        cur.fichaId = linha.fichaId;
        cur.fichaNome = linha.fichaNome;
        cur.fichaAtivo = linha.fichaAtivo;
      }
      if (linha.custoUnit != null) {
        cur._custoSum += linha.custoUnit * linha.quantidade;
        cur._custoPeso += linha.quantidade;
      }

      agg.set(linha.chave, cur);
      quantidadeTotal = round2(quantidadeTotal + linha.quantidade);
    }
  }

  const produtosArr: VendaContaAzulAgregada[] = Array.from(agg.values())
    .map(({ _custoPeso, _custoSum, ...rest }) => ({
      ...rest,
      custoUnitContaAzul: _custoPeso > 0 ? round2(_custoSum / _custoPeso) : null,
    }))
    .sort((a, b) => b.receitaTotal - a.receitaTotal);

  const receitaTotal = round2(
    produtosArr.reduce((s, p) => s + p.receitaTotal, 0),
  );

  return {
    pedidosVenda,
    receitaTotal,
    quantidadeTotal: round2(quantidadeTotal),
    produtos: produtosArr,
    produtosSemFicha: produtosArr.filter(
      (p) => p.fichaId == null && p.chave !== PRODUTO_VENDA_SEM_ITENS_CHAVE,
    ).length,
    ultimaSyncContaAzul: lastSync?.dataExecucao ?? null,
    ultimaSyncStatus: lastSync?.statusExecucao ?? null,
    diagnostico: {
      pedidosNoPeriodo: pedidos.length,
      pedidosVenda,
      pedidosExcluidosStatus,
      pedidosSemItens,
      receitaLiquidaPedidos: round2(receitaLiquidaPedidos),
      receitaItensBruto: round2(receitaItensBruto),
      freteTotal: round2(freteTotal),
      descontoTotal: round2(descontoTotal),
    },
  };
}
