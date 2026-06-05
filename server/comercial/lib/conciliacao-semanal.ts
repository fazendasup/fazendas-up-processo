import { AcaoApi, OrigemPedido } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "./composicao-valor.js";
import {
  pedidoCriadoAPartirDoContaAzul,
  REGRA_ENTREGA_CONCILIACAO_SELECT,
  taxaEntregaParaConciliacao,
  type RegraEntregaConciliacao,
} from "./conciliacao-pedidos.js";
import { classificarStatusPedido } from "./pedido-status.js";
import { composicaoGerencialDoPedido, mapDescontoBoletoPorContaAzul } from "./valor-gerencial.js";

export type StatusConciliacaoSemanalCliente =
  | "ok"
  | "aguardando_venda"
  | "venda_sem_pedido"
  | "divergente";

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
  status: StatusConciliacaoSemanalCliente;
  /** Mantido para compatibilidade: só `true` quando `status === "divergente"`. */
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
    clientesAguardandoVenda: number;
    clientesVendaSemPedido: number;
    clientesOk: number;
  };
  clientes: ClienteConciliacaoSemanal[];
  ultimaSincronizacaoContaAzul: Date | null;
  conciliado: boolean;
};

type PrismaConciliacao = Pick<
  PrismaClient,
  "pedidoOperacional" | "pedido" | "execucaoApi" | "regraComercialCliente"
>;

type OperacionalSemanal = {
  contaAzulCustomerId: string;
  status: string;
  snapshotConciliacao: unknown;
  cliente: { nome: string } | null;
  pedidoContaAzul: { valorLiquido: unknown; valorTotal: unknown } | null;
  itens: Array<{ quantidade: unknown; precoUnit: unknown }>;
};

function money(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function valorItensPedido(itens: OperacionalSemanal["itens"]): number {
  return itens.reduce((sum, item) => {
    const quantidade = Number(item.quantidade);
    return sum + quantidade * (money(item.precoUnit) ?? 0);
  }, 0);
}

function classificarClienteSemanal(
  opPedidos: number,
  caPedidos: number,
  diffUnidades: number,
  diffValor: number,
): StatusConciliacaoSemanalCliente {
  if (opPedidos > caPedidos) return "aguardando_venda";
  if (caPedidos > opPedidos) return "venda_sem_pedido";
  if (
    Math.abs(diffUnidades) > 0.001 ||
    Math.abs(diffValor) > 0.05
  ) {
    return "divergente";
  }
  return "ok";
}

/** Compara pedidos operacionais da semana com vendas Conta Azul no mesmo intervalo. */
export async function calcularConciliacaoSemanal(
  prisma: PrismaConciliacao,
  inicio: Date,
  fim: Date,
): Promise<ConciliacaoSemanal> {
  const [pedidosOperacionais, vendasContaAzulRaw, ultimaSync, descontoPorConta, regrasEntrega] = await Promise.all([
    prisma.pedidoOperacional.findMany({
      where: { dataEntrega: { gte: inicio, lte: fim } },
      select: {
        contaAzulCustomerId: true,
        status: true,
        snapshotConciliacao: true,
        cliente: { select: { nome: true } },
        pedidoContaAzul: { select: { valorLiquido: true, valorTotal: true } },
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
    prisma.regraComercialCliente.findMany({
      select: { contaAzulCustomerId: true, ...REGRA_ENTREGA_CONCILIACAO_SELECT },
    }),
  ]);

  const regraPorCliente = new Map<string, RegraEntregaConciliacao>(
    regrasEntrega.map((regra) => [regra.contaAzulCustomerId, regra]),
  );
  const vendasContaAzul = vendasContaAzulRaw.filter((p) => classificarStatusPedido(p.statusPedido) === "venda");

  const contaAzulPorCliente = new Map<
    string,
    {
      clienteNome: string;
      pedidos: number;
      unidades: number;
      valorLiquido: number;
      valorGerencial: number;
      descontoBoletoValor: number;
      valorFrete: number;
    }
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
    const valorFrete = money(venda.valorFrete) ?? 0;

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
      valorFrete: 0,
    };
    atual.pedidos += 1;
    atual.unidades += totalUnidades;
    atual.valorLiquido += comp.valorLiquido;
    atual.valorGerencial += gerencial.valorGerencial;
    atual.descontoBoletoValor += gerencial.descontoBoletoValor;
    atual.valorFrete += valorFrete;
    contaAzulPorCliente.set(contaAzulCustomerId, atual);
  }

  const operacionalPorCliente = new Map<string, { clienteNome: string; pedidos: number; unidades: number; valorEstimado: number }>();
  let operacionalPedidos = 0;
  let operacionalUnidades = 0;
  let operacionalValor = 0;

  for (const pedido of pedidosOperacionais as OperacionalSemanal[]) {
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
    }

    const criadoDoContaAzul = pedidoCriadoAPartirDoContaAzul(pedido);
    if (criadoDoContaAzul) {
      const valorPedidoCa = money(pedido.pedidoContaAzul?.valorLiquido ?? pedido.pedidoContaAzul?.valorTotal);
      const valorPedido = valorPedidoCa ?? valorItensPedido(pedido.itens);
      operacionalValor += valorPedido;
      opCliente.valorEstimado += valorPedido;
    } else {
      const regra = regraPorCliente.get(pedido.contaAzulCustomerId);
      const freteCliente = contaAzulPorCliente.get(pedido.contaAzulCustomerId);
      const freteReferencia =
        freteCliente && freteCliente.pedidos > 0 ? freteCliente.valorFrete / freteCliente.pedidos : 0;
      const valorPedido =
        valorItensPedido(pedido.itens) + taxaEntregaParaConciliacao(regra, freteReferencia);
      operacionalValor += valorPedido;
      opCliente.valorEstimado += valorPedido;
    }

    operacionalPorCliente.set(pedido.contaAzulCustomerId, opCliente);
  }

  const chaves = new Set([
    ...Array.from(operacionalPorCliente.keys()),
    ...Array.from(contaAzulPorCliente.keys()),
  ]);
  const clientes = Array.from(chaves)
    .map((contaAzulCustomerId) => {
      const op = operacionalPorCliente.get(contaAzulCustomerId);
      const ca = contaAzulPorCliente.get(contaAzulCustomerId);
      const opPedidos = op?.pedidos ?? 0;
      const caPedidos = ca?.pedidos ?? 0;
      const diffPedidos = opPedidos - caPedidos;
      const diffUnidades = (op?.unidades ?? 0) - (ca?.unidades ?? 0);
      const diffValor = (op?.valorEstimado ?? 0) - (ca?.valorLiquido ?? 0);
      const status = classificarClienteSemanal(opPedidos, caPedidos, diffUnidades, diffValor);
      return {
        contaAzulCustomerId,
        clienteNome: op?.clienteNome ?? ca?.clienteNome ?? contaAzulCustomerId,
        operacional: op ?? { pedidos: 0, unidades: 0, valorEstimado: 0 },
        contaAzul: ca
          ? {
              pedidos: ca.pedidos,
              unidades: ca.unidades,
              valorLiquido: ca.valorLiquido,
              valorGerencial: ca.valorGerencial,
              descontoBoletoValor: ca.descontoBoletoValor,
            }
          : { pedidos: 0, unidades: 0, valorLiquido: 0, valorGerencial: 0, descontoBoletoValor: 0 },
        diffPedidos,
        diffUnidades,
        diffValor,
        status,
        divergente: status === "divergente",
      };
    })
    .sort((a, b) => {
      const rank = (status: StatusConciliacaoSemanalCliente) =>
        status === "divergente" ? 3 : status === "venda_sem_pedido" ? 2 : status === "aguardando_venda" ? 1 : 0;
      return rank(b.status) - rank(a.status) || Math.abs(b.diffValor) - Math.abs(a.diffValor);
    });

  const clientesDivergentes = clientes.filter((c) => c.status === "divergente").length;
  const clientesAguardandoVenda = clientes.filter((c) => c.status === "aguardando_venda").length;
  const clientesVendaSemPedido = clientes.filter((c) => c.status === "venda_sem_pedido").length;
  const clientesOk = clientes.filter((c) => c.status === "ok").length;

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
      clientesAguardandoVenda,
      clientesVendaSemPedido,
      clientesOk,
    },
    clientes,
    ultimaSincronizacaoContaAzul: ultimaSync?.dataExecucao ?? null,
    conciliado: clientesDivergentes === 0,
  };
}
