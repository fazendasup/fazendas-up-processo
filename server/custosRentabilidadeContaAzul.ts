import { AcaoApi, OrigemPedido } from "./comercial/generated/prisma/index.js";
import { getComercialPrisma } from "./comercial/db";
import { classificarStatusPedido } from "./comercial/lib/pedido-status.js";
import {
  criarIndiceProdutosOperacionais,
  resolverProdutoOperacional,
} from "./comercial/lib/produto-operacional.js";
import * as custosProdutoDb from "./custosProdutoDb";
import type { CustoProdutoFichaRow } from "../drizzle/schema";

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
  quantidade: number;
  receitaTotal: number;
  linhasPedido: number;
  custoUnitContaAzul: number | null;
};

export type VendasContaAzulResultado = {
  pedidosVenda: number;
  receitaTotal: number;
  quantidadeTotal: number;
  produtos: VendaContaAzulAgregada[];
  produtosSemFicha: number;
  ultimaSyncContaAzul: Date | null;
  ultimaSyncStatus: string | null;
};

function criarIndiceFichas(fichas: CustoProdutoFichaRow[]) {
  const porProdutoComercialId = new Map<string, CustoProdutoFichaRow>();
  const porNome = new Map<string, CustoProdutoFichaRow>();
  for (const f of fichas) {
    if (f.ativo === false) continue;
    if (f.produtoComercialId) porProdutoComercialId.set(f.produtoComercialId, f);
    const nk = normalizarNome(f.nome);
    if (nk && !porNome.has(nk)) porNome.set(nk, f);
  }
  return { porProdutoComercialId, porNome };
}

function resolverFicha(
  indice: ReturnType<typeof criarIndiceFichas>,
  produtoComercialId: string | null,
  produtoNome: string,
): { fichaId: number | null; fichaNome: string | null } {
  if (produtoComercialId) {
    const f = indice.porProdutoComercialId.get(produtoComercialId);
    if (f) return { fichaId: f.id, fichaNome: f.nome };
  }
  const f = indice.porNome.get(normalizarNome(produtoNome));
  if (f) return { fichaId: f.id, fichaNome: f.nome };
  return { fichaId: null, fichaNome: null };
}

type AggInterno = VendaContaAzulAgregada & { _custoPeso: number; _custoSum: number };

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
  let receitaTotal = 0;
  let quantidadeTotal = 0;

  for (const p of pedidos) {
    if (classificarStatusPedido(p.statusPedido) !== "venda") continue;
    pedidosVenda += 1;

    for (const item of p.itens) {
      const qtd = Number(item.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) continue;

      const preco = Number(item.precoUnit);
      const receita = round2(qtd * (Number.isFinite(preco) ? preco : 0));
      const resolved = resolverProdutoOperacional(indiceProdutos, {
        produto: item.produto,
        sku: item.sku,
      });
      const produtoComercialId = resolved?.id ?? null;
      const chave = produtoComercialId
        ? `pid:${produtoComercialId}`
        : `nome:${normalizarNome(item.produto) || "sem_nome"}`;
      const { fichaId, fichaNome } = resolverFicha(indiceFichas, produtoComercialId, item.produto);

      const cur: AggInterno = agg.get(chave) ?? {
        chave,
        produtoNome: resolved?.nome ?? item.produto,
        sku: item.sku ?? resolved?.sku ?? null,
        produtoComercialId,
        fichaId,
        fichaNome,
        quantidade: 0,
        receitaTotal: 0,
        linhasPedido: 0,
        custoUnitContaAzul: null,
        _custoPeso: 0,
        _custoSum: 0,
      };

      cur.quantidade = round2(cur.quantidade + qtd);
      cur.receitaTotal = round2(cur.receitaTotal + receita);
      cur.linhasPedido += 1;
      if (!cur.fichaId && fichaId) {
        cur.fichaId = fichaId;
        cur.fichaNome = fichaNome;
      }

      const custo = item.custoUnit != null ? Number(item.custoUnit) : null;
      if (custo != null && Number.isFinite(custo) && custo >= 0) {
        cur._custoSum += custo * qtd;
        cur._custoPeso += qtd;
      }

      agg.set(chave, cur);
      receitaTotal = round2(receitaTotal + receita);
      quantidadeTotal = round2(quantidadeTotal + qtd);
    }
  }

  const produtosArr: VendaContaAzulAgregada[] = Array.from(agg.values())
    .map(({ _custoPeso, _custoSum, ...rest }) => ({
      ...rest,
      custoUnitContaAzul: _custoPeso > 0 ? round2(_custoSum / _custoPeso) : null,
    }))
    .sort((a, b) => b.receitaTotal - a.receitaTotal);

  return {
    pedidosVenda,
    receitaTotal: round2(receitaTotal),
    quantidadeTotal: round2(quantidadeTotal),
    produtos: produtosArr,
    produtosSemFicha: produtosArr.filter((p) => p.fichaId == null).length,
    ultimaSyncContaAzul: lastSync?.dataExecucao ?? null,
    ultimaSyncStatus: lastSync?.statusExecucao ?? null,
  };
}
