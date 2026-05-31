import { AcaoApi, OrigemPedido } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "./composicao-valor.js";
import { classificarStatusPedido } from "./pedido-status.js";
import { composicaoGerencialDoPedido, mapDescontoBoletoPorContaAzul } from "./valor-gerencial.js";

export type ClienteConciliacaoSemanal = {
  contaAzulCustomerId: string;
  clienteNome: string;
  operacional: { pedidos: number; unidades: number; valorEstimado: number };
  contaAzul: {
    pedidos: number;
    unidades: number;
    valorLiquido: number;
    valorGerencial: number;
    descontoBoletoValor: number;
  };
  diffPedidos: number;
  diffUnidades: number;
  diffValor: number;
  divergente: boolean;
};

export type ConciliacaoSemanal = {
  inicio: Date;
  fim: Date;
  resumo: {
    operacionalPedidos: number;
    operacionalUnidades: number;
    operacionalValor: number;
    contaAzulPedidos: number;
    contaAzulUnidades: number;
    contaAzulValor: number;
    contaAzulValorGerencial: number;
    descontoBoletoTotal: number;
    clientesDivergentes: number;
  };
  clientes: ClienteConciliacaoSemanal[];
  ultimaSincronizacaoContaAzul: Date | null;
  conciliado: boolean;
};

type PrismaConciliacao = Pick<
  PrismaClient,
  "pedidoOperacional" | "pedido" | "execucaoApi" | "regraComercialCliente"
>;

function money(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Compara pedidos operacionais da semana com vendas Conta Azul no mesmo intervalo. */
export async function calcularConciliacaoSemanal(
  prisma: PrismaConciliacao,
  inicio: Date,
  fim: Date,
): Promise<ConciliacaoSemanal> {
  const [pedidosOperacionais, vendasContaAzulRaw, ultimaSync, descontoPorConta] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { dataEntrega: { gte: inicio, lte: fim } },
      include: {
        cliente: { select: { nome: true } },
        itens: true,
      },
    }),
    prisma.pedido.findMany({
      where: {
        origemPedido: OrigemPedido.CONTA_AZUL,
        dataPedido: { gte: inicio, lte: fim },
      },
      include: {
        cliente: { select: { id: true, externalId: true, nome: true } },
        itens: true,
      },
    }),
    prisma.execucaoApi.findFirst({
      where: { acaoApi: AcaoApi.SYNC_CA, statusExecucao: "SUCESSO" },
      orderBy: { dataExecucao: "desc" },
      select: { dataExecucao: true },
    }),
    mapDescontoBoletoPorContaAzul(prisma),
  ]);

  const vendasContaAzul = vendasContaAzulRaw.filter((p) => classificarStatusPedido(p.statusPedido) === "venda");

  const operacionalPorCliente = new Map<string, { clienteNome: string; pedidos: number; unidades: number; valorEstimado: number }>();
  let operacionalPedidos = 0;
  let operacionalUnidades = 0;
  let operacionalValor = 0;

  for (const pedido of pedidosOperacionais) {
    if (pedido.status === "CANCELADO") continue;
    operacionalPedidos += 1;
    const opCliente = operacionalPorCliente.get(pedido.contaAzulCustomerId) ?? {
      clienteNome: pedido.cliente?.nome ?? pedido.contaAzulCustomerId,
      pedidos: 0,
      unidades: 0,
      valorEstimado: 0,
    };
    opCliente.pedidos += 1;
    for (const item of pedido.itens) {
      const quantidade = Number(item.quantidade);
      operacionalUnidades += quantidade;
      opCliente.unidades += quantidade;
      const valorItem = quantidade * (money(item.precoUnit) ?? 0);
      operacionalValor += valorItem;
      opCliente.valorEstimado += valorItem;
    }
    operacionalPorCliente.set(pedido.contaAzulCustomerId, opCliente);
  }

  const contaAzulPorCliente = new Map<
    string,
    { clienteNome: string; pedidos: number; unidades: number; valorLiquido: number; valorGerencial: number; descontoBoletoValor: number }
  >();
  let contaAzulPedidos = 0;
  let contaAzulUnidades = 0;
  let contaAzulValor = 0;
  let contaAzulValorGerencial = 0;
  let descontoBoletoTotal = 0;

  for (const venda of vendasContaAzul) {
    const contaAzulCustomerId = venda.cliente.externalId ?? venda.cliente.id;
    const comp = composicaoDoPedidoParaDashboard(venda);
    const pct = descontoPorConta.get(contaAzulCustomerId) ?? 0;
    const gerencial = composicaoGerencialDoPedido(comp, pct);
    const totalUnidades = venda.itens.reduce((sum, item) => sum + Number(item.quantidade), 0);

    contaAzulPedidos += 1;
    contaAzulUnidades += totalUnidades;
    contaAzulValor += comp.valorLiquido;
    contaAzulValorGerencial += gerencial.valorGerencial;
    descontoBoletoTotal += gerencial.descontoBoletoValor;

    const atual = contaAzulPorCliente.get(contaAzulCustomerId) ?? {
      clienteNome: venda.cliente.nome,
      pedidos: 0,
      unidades: 0,
      valorLiquido: 0,
      valorGerencial: 0,
      descontoBoletoValor: 0,
    };
    atual.pedidos += 1;
    atual.unidades += totalUnidades;
    atual.valorLiquido += comp.valorLiquido;
    atual.valorGerencial += gerencial.valorGerencial;
    atual.descontoBoletoValor += gerencial.descontoBoletoValor;
    contaAzulPorCliente.set(contaAzulCustomerId, atual);
  }

  const chaves = new Set([
    ...Array.from(operacionalPorCliente.keys()),
    ...Array.from(contaAzulPorCliente.keys()),
  ]);
  const clientes = Array.from(chaves)
    .map((contaAzulCustomerId) => {
      const op = operacionalPorCliente.get(contaAzulCustomerId);
      const ca = contaAzulPorCliente.get(contaAzulCustomerId);
      const diffPedidos = (op?.pedidos ?? 0) - (ca?.pedidos ?? 0);
      const diffUnidades = (op?.unidades ?? 0) - (ca?.unidades ?? 0);
      const diffValor = (op?.valorEstimado ?? 0) - (ca?.valorLiquido ?? 0);
      return {
        contaAzulCustomerId,
        clienteNome: op?.clienteNome ?? ca?.clienteNome ?? contaAzulCustomerId,
        operacional: op ?? { pedidos: 0, unidades: 0, valorEstimado: 0 },
        contaAzul: ca ?? { pedidos: 0, unidades: 0, valorLiquido: 0, valorGerencial: 0, descontoBoletoValor: 0 },
        diffPedidos,
        diffUnidades,
        diffValor,
        divergente: diffPedidos !== 0 || Math.abs(diffUnidades) > 0.001 || Math.abs(diffValor) > 0.01,
      };
    })
    .sort((a, b) => Number(b.divergente) - Number(a.divergente) || Math.abs(b.diffValor) - Math.abs(a.diffValor));

  const clientesDivergentes = clientes.filter((c) => c.divergente).length;

  return {
    inicio,
    fim,
    resumo: {
      operacionalPedidos,
      operacionalUnidades,
      operacionalValor,
      contaAzulPedidos,
      contaAzulUnidades,
      contaAzulValor,
      contaAzulValorGerencial,
      descontoBoletoTotal,
      clientesDivergentes,
    },
    clientes,
    ultimaSincronizacaoContaAzul: ultimaSync?.dataExecucao ?? null,
    conciliado: clientesDivergentes === 0,
  };
}
