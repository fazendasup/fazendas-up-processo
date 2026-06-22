import { AcaoApi, OrigemPedido } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "./composicao-valor.js";
import {
  clienteAcumulaFaturamento,
  janelaCandidatosVinculo,
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
  id: string;
  dataEntrega: Date;
  contaAzulCustomerId: string;
  status: string;
  freteCortesia: boolean;
  snapshotConciliacao: unknown;
  pedidoContaAzulId: string | null;
  cliente: { nome: string } | null;
  pedidoContaAzul: { valorLiquido: unknown; valorTotal: unknown } | null;
  itens: Array<{ quantidade: unknown; precoUnit: unknown }>;
};

type VendaCaSemanal = { id: string; dataPedido: Date };

type RegraSemanal = RegraEntregaConciliacao & { acumulaPedidos: boolean; diasAcumulo?: number | null };

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

function sumUnidadesPedidos(pedidos: OperacionalSemanal[]): number {
  return pedidos.reduce(
    (sum, p) => sum + p.itens.reduce((s, i) => s + Number(i.quantidade), 0),
    0,
  );
}

function taxaEntregaCliente(
  regra: RegraSemanal | undefined,
  freteCliente: { pedidos: number; valorFrete: number } | undefined,
): number {
  const freteReferencia =
    freteCliente && freteCliente.pedidos > 0
      ? freteCliente.valorFrete / freteCliente.pedidos
      : 0;
  return taxaEntregaParaConciliacao(regra, freteReferencia);
}

/**
 * Totais operacionais da semana por cliente.
 * Clientes acumuladores: espelhos CA não entram (volume já está nas entregas manuais).
 * Vínculo múltiplo: soma itens do grupo e cobra frete uma vez.
 */
export function totaisOperacionaisClienteSemanal(
  pedidos: OperacionalSemanal[],
  acumulaPedidos: boolean,
  regra: RegraSemanal | undefined,
  freteCliente: { pedidos: number; valorFrete: number } | undefined,
): { unidades: number; valorEstimado: number } {
  const ativos = pedidos.filter((p) => p.status !== "CANCELADO");
  const porVinculo = new Map<string, OperacionalSemanal[]>();
  const manuais: OperacionalSemanal[] = [];
  const espelhosNaoAcumula: OperacionalSemanal[] = [];
  const espelhosContados = new Set<string>();

  for (const pedido of ativos) {
    const espelho = pedidoCriadoAPartirDoContaAzul(pedido);
    if (espelho && acumulaPedidos) continue;

    if (espelho) {
      const caId = pedido.pedidoContaAzulId;
      if (caId) {
        if (espelhosContados.has(caId)) continue;
        espelhosContados.add(caId);
      }
      espelhosNaoAcumula.push(pedido);
      continue;
    }

    const caId = pedido.pedidoContaAzulId;
    if (caId) {
      const lista = porVinculo.get(caId) ?? [];
      lista.push(pedido);
      porVinculo.set(caId, lista);
    } else {
      manuais.push(pedido);
    }
  }

  let unidades = 0;
  let valorEstimado = 0;
  const taxa = taxaEntregaCliente(regra, freteCliente);

  for (const pedido of espelhosNaoAcumula) {
    unidades += sumUnidadesPedidos([pedido]);
    const valorCa = money(
      pedido.pedidoContaAzul?.valorLiquido ?? pedido.pedidoContaAzul?.valorTotal,
    );
    valorEstimado += valorCa ?? valorItensPedido(pedido.itens);
  }

  for (const grupo of Array.from(porVinculo.values())) {
    unidades += sumUnidadesPedidos(grupo);
    valorEstimado += grupo.reduce((s, p) => s + valorItensPedido(p.itens), 0);
    if (grupo.some((p) => !p.freteCortesia)) valorEstimado += taxa;
  }

  if (manuais.length > 0) {
    unidades += sumUnidadesPedidos(manuais);
    valorEstimado += manuais.reduce((s, p) => s + valorItensPedido(p.itens), 0);
    if (acumulaPedidos) {
      if (manuais.some((p) => !p.freteCortesia)) valorEstimado += taxa;
    } else {
      for (const pedido of manuais) {
        if (!pedido.freteCortesia) valorEstimado += taxa;
      }
    }
  }

  return { unidades, valorEstimado };
}

/**
 * Cliente acumulador: total operacional = entregas manuais na janela de cada venda CA da semana
 * (inclui dias anteriores dentro do período de acumulação).
 */
export function totaisOperacionaisAcumuloSemana(
  pedidos: OperacionalSemanal[],
  vendasCaSemana: VendaCaSemanal[],
  regra: RegraSemanal | undefined,
  freteCliente: { pedidos: number; valorFrete: number } | undefined,
): { unidades: number; valorEstimado: number } {
  if (vendasCaSemana.length === 0) {
    return totaisOperacionaisClienteSemanal(pedidos, true, regra, freteCliente);
  }

  const opsUsados = new Set<string>();
  const grupos: OperacionalSemanal[][] = [];

  for (const venda of vendasCaSemana) {
    const janela = janelaCandidatosVinculo({
      dataPedido: venda.dataPedido,
      acumula: true,
      diasAcumulo: regra?.diasAcumulo,
    });
    const candidatos = pedidos.filter((p) => {
      if (p.status === "CANCELADO") return false;
      if (pedidoCriadoAPartirDoContaAzul(p)) return false;
      if (opsUsados.has(p.id)) return false;
      const t = p.dataEntrega.getTime();
      if (t < janela.inicio.getTime() || t > janela.fim.getTime()) return false;
      return !p.pedidoContaAzulId || p.pedidoContaAzulId === venda.id;
    });
    for (const p of candidatos) opsUsados.add(p.id);
    if (candidatos.length > 0) grupos.push(candidatos);
  }

  let unidades = 0;
  let valorEstimado = 0;
  const taxa = taxaEntregaCliente(regra, freteCliente);
  for (const grupo of grupos) {
    unidades += sumUnidadesPedidos(grupo);
    valorEstimado += grupo.reduce((s, p) => s + valorItensPedido(p.itens), 0);
    if (grupo.some((p) => !p.freteCortesia)) valorEstimado += taxa;
  }

  return { unidades, valorEstimado };
}

/** Pedidos usados na contagem efetiva da semana (exclui espelhos CA em clientes acumuladores). */
export function pedidosOperacionaisSemanaEfetivos(
  pedidos: OperacionalSemanal[],
  acumulaPedidos: boolean,
): OperacionalSemanal[] {
  const ativos = pedidos.filter((p) => p.status !== "CANCELADO");
  if (!acumulaPedidos) return ativos;
  return ativos.filter((p) => !pedidoCriadoAPartirDoContaAzul(p));
}

/** Vários pedidos operacionais podem apontar para a mesma venda CA (vínculo múltiplo). */
export function pedidosOperacionaisEfetivos(
  pedidos: Array<{ pedidoContaAzulId: string | null }>,
): number {
  const vinculos = new Set<string>();
  let semVinculo = 0;
  for (const pedido of pedidos) {
    if (pedido.pedidoContaAzulId) vinculos.add(pedido.pedidoContaAzulId);
    else semVinculo += 1;
  }
  return vinculos.size + semVinculo;
}

export function classificarClienteSemanal(
  opPedidos: number,
  caPedidos: number,
  diffUnidades: number,
  diffValor: number,
  opts?: { acumulaPedidos?: boolean },
): StatusConciliacaoSemanalCliente {
  const unidadesOk = Math.abs(diffUnidades) <= 0.001;
  const valorOk = Math.abs(diffValor) <= 0.05;
  if (unidadesOk && valorOk) return "ok";

  if (caPedidos === 0 && opPedidos > 0) return "aguardando_venda";
  if (opPedidos === 0 && caPedidos > 0) return "venda_sem_pedido";

  // Clientes acumuladores ou vínculo múltiplo: comparar totais, não contagem 1:1 de documentos.
  return "divergente";
}

function documentoContaAzulSemanal(
  statusPedido: string | null,
  acumulaPedidos: boolean,
): boolean {
  const cls = classificarStatusPedido(statusPedido);
  if (cls === "venda") return true;
  return cls === "orcamento" && acumulaPedidos;
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
        id: true,
        dataEntrega: true,
        contaAzulCustomerId: true,
        status: true,
        freteCortesia: true,
        snapshotConciliacao: true,
        pedidoContaAzulId: true,
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
      select: {
        contaAzulCustomerId: true,
        acumulaPedidos: true,
        diasAcumulo: true,
        ...REGRA_ENTREGA_CONCILIACAO_SELECT,
      },
    }),
  ]);

  const regraPorCliente = new Map<string, RegraSemanal>(
    regrasEntrega.map((regra) => [regra.contaAzulCustomerId, regra]),
  );

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
  const vendasCaPorCliente = new Map<string, VendaCaSemanal[]>();

  for (const venda of vendasContaAzulRaw) {
    const contaAzulCustomerId = venda.cliente.externalId ?? venda.cliente.id;
    const acumula = clienteAcumulaFaturamento(regraPorCliente.get(contaAzulCustomerId));
    if (!documentoContaAzulSemanal(venda.statusPedido, acumula)) continue;

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

    const vendasCliente = vendasCaPorCliente.get(contaAzulCustomerId) ?? [];
    vendasCliente.push({ id: venda.id, dataPedido: venda.dataPedido });
    vendasCaPorCliente.set(contaAzulCustomerId, vendasCliente);
  }

  const selectOperacionalSemanal = {
    id: true,
    dataEntrega: true,
    contaAzulCustomerId: true,
    status: true,
    freteCortesia: true,
    snapshotConciliacao: true,
    pedidoContaAzulId: true,
    cliente: { select: { nome: true } },
    pedidoContaAzul: { select: { valorLiquido: true, valorTotal: true } },
    itens: true,
  } as const;

  const acumulaComCa = Array.from(vendasCaPorCliente.keys()).filter((id) =>
    clienteAcumulaFaturamento(regraPorCliente.get(id)),
  );
  let pedidosAcumuloExtra: OperacionalSemanal[] = [];
  if (acumulaComCa.length > 0) {
    const maxDias = Math.max(
      15,
      ...acumulaComCa.map((id) => regraPorCliente.get(id)?.diasAcumulo ?? 15),
    );
    const inicioAcumulo = new Date(inicio);
    inicioAcumulo.setDate(inicioAcumulo.getDate() - maxDias - 14);
    pedidosAcumuloExtra = (await prisma.pedidoOperacional.findMany({
      where: {
        contaAzulCustomerId: { in: acumulaComCa },
        dataEntrega: { gte: inicioAcumulo, lt: inicio },
        status: { not: "CANCELADO" },
      },
      select: selectOperacionalSemanal,
    })) as OperacionalSemanal[];
  }

  const pedidosAcumuloExtraPorCliente = new Map<string, OperacionalSemanal[]>();
  for (const p of pedidosAcumuloExtra) {
    const lista = pedidosAcumuloExtraPorCliente.get(p.contaAzulCustomerId) ?? [];
    lista.push(p);
    pedidosAcumuloExtraPorCliente.set(p.contaAzulCustomerId, lista);
  }

  const operacionalPorCliente = new Map<
    string,
    {
      clienteNome: string;
      pedidos: OperacionalSemanal[];
      unidades: number;
      valorEstimado: number;
    }
  >();
  let operacionalPedidos = 0;
  let operacionalUnidades = 0;
  let operacionalValor = 0;

  for (const pedido of pedidosOperacionais as OperacionalSemanal[]) {
    if (pedido.status === "CANCELADO") continue;
    const opCliente = operacionalPorCliente.get(pedido.contaAzulCustomerId) ?? {
      clienteNome: pedido.cliente?.nome ?? pedido.contaAzulCustomerId,
      pedidos: [],
      unidades: 0,
      valorEstimado: 0,
    };
    opCliente.pedidos.push(pedido);
    operacionalPorCliente.set(pedido.contaAzulCustomerId, opCliente);
  }

  for (const [contaAzulCustomerId, opCliente] of Array.from(operacionalPorCliente.entries())) {
    const regra = regraPorCliente.get(contaAzulCustomerId);
    const acumula = clienteAcumulaFaturamento(regra);
    const ca = contaAzulPorCliente.get(contaAzulCustomerId);
    const vendasCa = vendasCaPorCliente.get(contaAzulCustomerId) ?? [];
    const pedidosTotais = acumula
      ? [...opCliente.pedidos, ...(pedidosAcumuloExtraPorCliente.get(contaAzulCustomerId) ?? [])]
      : opCliente.pedidos;
    const totais =
      acumula && vendasCa.length > 0
        ? totaisOperacionaisAcumuloSemana(pedidosTotais, vendasCa, regra, ca)
        : totaisOperacionaisClienteSemanal(pedidosTotais, acumula, regra, ca);
    opCliente.unidades = totais.unidades;
    opCliente.valorEstimado = totais.valorEstimado;
    operacionalUnidades += totais.unidades;
    operacionalValor += totais.valorEstimado;
    operacionalPedidos += pedidosOperacionaisEfetivos(
      pedidosOperacionaisSemanaEfetivos(opCliente.pedidos, acumula),
    );
  }

  const chaves = new Set([
    ...Array.from(operacionalPorCliente.keys()),
    ...Array.from(contaAzulPorCliente.keys()),
  ]);
  const clientes = Array.from(chaves)
    .map((contaAzulCustomerId) => {
      const opRaw = operacionalPorCliente.get(contaAzulCustomerId);
      const ca = contaAzulPorCliente.get(contaAzulCustomerId);
      const acumulaPedidos = clienteAcumulaFaturamento(regraPorCliente.get(contaAzulCustomerId));
      const opPedidos = opRaw
        ? pedidosOperacionaisEfetivos(
            pedidosOperacionaisSemanaEfetivos(opRaw.pedidos, acumulaPedidos),
          )
        : 0;
      const caPedidos = ca?.pedidos ?? 0;
      const diffPedidos = opPedidos - caPedidos;
      const diffUnidades = (opRaw?.unidades ?? 0) - (ca?.unidades ?? 0);
      const diffValor = (opRaw?.valorEstimado ?? 0) - (ca?.valorLiquido ?? 0);
      const status = classificarClienteSemanal(opPedidos, caPedidos, diffUnidades, diffValor, {
        acumulaPedidos,
      });
      return {
        contaAzulCustomerId,
        clienteNome: opRaw?.clienteNome ?? ca?.clienteNome ?? contaAzulCustomerId,
        operacional: opRaw
          ? { pedidos: opPedidos, unidades: opRaw.unidades, valorEstimado: opRaw.valorEstimado }
          : { pedidos: 0, unidades: 0, valorEstimado: 0 },
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
