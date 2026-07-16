import { clienteFaturaMesAntecipado } from "@shared/clientesAcumuloPedidos";
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
import { desligarAcumuloForaAllowlist } from "./clientes-acumulo-cleanup.js";
import { classificarStatusPedido } from "./pedido-status.js";
import { composicaoGerencialDoPedido, mapDescontoBoletoPorContaAzul } from "./valor-gerencial.js";

export type StatusConciliacaoSemanalCliente =
  | "ok"
  | "aguardando_venda"
  | "venda_sem_pedido"
  | "divergente";

export type DiaConciliacaoCliente = {
  dia: string;
  status: StatusConciliacaoSemanalCliente;
  opPedidos: number;
  caPedidos: number;
  opUnidades: number;
  caUnidades: number;
  opValor: number;
  caValor: number;
};

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
  /** Efetivo após allowlist (Licco/Spoleto/…); ignora flag residual de outros clientes. */
  acumulaPedidos?: boolean;
  /** Mensagem pronta com datas (sem misturar dias). */
  detalhe?: string;
  diasProblema?: DiaConciliacaoCliente[];
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

type VendaCaSemanal = { id: string; dataPedido: Date; unidades: number; valorLiquido: number };

type RegraSemanal = RegraEntregaConciliacao & { acumulaPedidos: boolean; diasAcumulo?: number | null };

function ymdCalendario(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function money(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function valorItensPedido(itens: Array<{ quantidade: unknown; precoUnit?: unknown }>): number {
  return itens.reduce((sum, item) => {
    const quantidade = Number(item.quantidade);
    return sum + quantidade * (money(item.precoUnit) ?? 0);
  }, 0);
}

function sumUnidadesPedidos(
  pedidos: Array<{ itens: Array<{ quantidade: unknown }> }>,
): number {
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
    // Pedidos já vinculados: usar líquido CA (fonte financeira) em vez de
    // recompor itens+taxa — evita falso "diff valor" com desconto/frete/arredondamento.
    const caRef = grupo.find((p) => p.pedidoContaAzul)?.pedidoContaAzul;
    const valorCa = money(caRef?.valorLiquido ?? caRef?.valorTotal);
    if (valorCa != null && valorCa > 0) {
      valorEstimado += valorCa;
    } else {
      valorEstimado += grupo.reduce((s, p) => s + valorItensPedido(p.itens), 0);
      if (grupo.some((p) => !p.freteCortesia)) valorEstimado += taxa;
    }
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
  // Volume operacional é a fonte da verdade na semana. Diferença só de valor
  // (frete CA vs taxa cadastrada, desconto, arredondamento) não marca divergente.
  if (unidadesOk) return "ok";
  void diffValor;
  void opts;

  if (caPedidos === 0 && opPedidos > 0) return "aguardando_venda";
  if (opPedidos === 0 && caPedidos > 0) return "venda_sem_pedido";

  // Clientes acumuladores ou vínculo múltiplo: comparar totais, não contagem 1:1 de documentos.
  return "divergente";
}

const RANK_STATUS_SEMANAL: Record<StatusConciliacaoSemanalCliente, number> = {
  ok: 0,
  aguardando_venda: 1,
  venda_sem_pedido: 2,
  divergente: 3,
};

export function piorStatusConciliacaoSemanal(
  statuses: StatusConciliacaoSemanalCliente[],
): StatusConciliacaoSemanalCliente {
  if (statuses.length === 0) return "ok";
  return statuses.reduce((pior, atual) =>
    RANK_STATUS_SEMANAL[atual] > RANK_STATUS_SEMANAL[pior] ? atual : pior,
  );
}

function fmtDiaBr(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

export type AvaliacaoClienteNaoAcumulador = {
  status: StatusConciliacaoSemanalCliente;
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
  diasProblema: DiaConciliacaoCliente[];
  detalhe: string;
};

/**
 * Clientes sem acúmulo: compara e reporta estritamente no mesmo dia (UTC).
 * Totais do cabeçalho usam só os dias com problema — não misturam 07/07 (ok) com 10/07 (sem pedido).
 */
export function avaliarClienteNaoAcumuladorPorDatas(input: {
  operacionais: Array<{
    dataEntrega: Date;
    status: string;
    pedidoContaAzulId: string | null;
    itens: Array<{ quantidade: unknown; precoUnit?: unknown }>;
  }>;
  vendas: Array<{ dataPedido: Date; unidades: number; valorLiquido: number }>;
}): AvaliacaoClienteNaoAcumulador {
  const opPorDia = new Map<
    string,
    Array<{
      dataEntrega: Date;
      status: string;
      pedidoContaAzulId: string | null;
      itens: Array<{ quantidade: unknown; precoUnit?: unknown }>;
    }>
  >();
  for (const pedido of input.operacionais) {
    if (pedido.status === "CANCELADO") continue;
    const dia = ymdCalendario(pedido.dataEntrega);
    const lista = opPorDia.get(dia) ?? [];
    lista.push(pedido);
    opPorDia.set(dia, lista);
  }

  const caPorDia = new Map<string, { pedidos: number; unidades: number; valorLiquido: number }>();
  for (const venda of input.vendas) {
    const dia = ymdCalendario(venda.dataPedido);
    const atual = caPorDia.get(dia) ?? { pedidos: 0, unidades: 0, valorLiquido: 0 };
    atual.pedidos += 1;
    atual.unidades += venda.unidades;
    atual.valorLiquido += venda.valorLiquido;
    caPorDia.set(dia, atual);
  }

  const dias = Array.from(
    new Set([...Array.from(opPorDia.keys()), ...Array.from(caPorDia.keys())]),
  ).sort();

  const diasAvaliados: DiaConciliacaoCliente[] = [];
  for (const dia of dias) {
    const ops = opPorDia.get(dia) ?? [];
    const ca = caPorDia.get(dia) ?? { pedidos: 0, unidades: 0, valorLiquido: 0 };
    const opPedidos = pedidosOperacionaisEfetivos(ops);
    const opUnidades = sumUnidadesPedidos(ops);
    const opValor = valorItensPedido(ops.flatMap((p) => p.itens));
    // Por dia: assimetria de documentos manda — não esconder venda sem OP
    // só porque unidades batem (ex.: CA vazio) ou misturar com volume semanal.
    let status: StatusConciliacaoSemanalCliente;
    if (opPedidos === 0 && ca.pedidos === 0) {
      status = "ok";
    } else if (ca.pedidos === 0 && opPedidos > 0) {
      status = "aguardando_venda";
    } else if (opPedidos === 0 && ca.pedidos > 0) {
      status = "venda_sem_pedido";
    } else if (Math.abs(opUnidades - ca.unidades) <= 0.001) {
      status = "ok";
    } else {
      status = "divergente";
    }
    diasAvaliados.push({
      dia,
      status,
      opPedidos,
      caPedidos: ca.pedidos,
      opUnidades,
      caUnidades: ca.unidades,
      opValor,
      caValor: ca.valorLiquido,
    });
  }

  const diasProblema = diasAvaliados.filter((d) => d.status !== "ok");
  const status = piorStatusConciliacaoSemanal(diasAvaliados.map((d) => d.status));

  // Métricas do cartão: só dias com problema (nunca misturar dia ok com dia pendente).
  const base = diasProblema.length > 0 ? diasProblema : diasAvaliados;
  const operacional = {
    pedidos: base.reduce((s, d) => s + d.opPedidos, 0),
    unidades: base.reduce((s, d) => s + d.opUnidades, 0),
    valorEstimado: base.reduce((s, d) => s + d.opValor, 0),
  };
  const contaAzul = {
    pedidos: base.reduce((s, d) => s + d.caPedidos, 0),
    unidades: base.reduce((s, d) => s + d.caUnidades, 0),
    valorLiquido: base.reduce((s, d) => s + d.caValor, 0),
    valorGerencial: base.reduce((s, d) => s + d.caValor, 0),
    descontoBoletoValor: 0,
  };

  const datas = diasProblema.map((d) => fmtDiaBr(d.dia));
  let detalhe = "Conciliação ok por dia.";
  if (status === "venda_sem_pedido") {
    detalhe =
      datas.length === 1
        ? `Venda Conta Azul sem pedido operacional em ${datas[0]}. Crie ou vincule o pedido daquele dia.`
        : `Vendas Conta Azul sem pedido operacional em ${datas.join(", ")}. Crie ou vincule o pedido de cada dia.`;
  } else if (status === "aguardando_venda") {
    detalhe =
      datas.length === 1
        ? `Pedido operacional sem venda Conta Azul em ${datas[0]}. Aguarde a sincronização ou confira o cancelamento.`
        : `Pedidos operacionais sem venda Conta Azul em ${datas.join(", ")}.`;
  } else if (status === "divergente") {
    const divs = diasProblema.filter((d) => d.status === "divergente");
    detalhe = divs
      .map(
        (d) =>
          `${fmtDiaBr(d.dia)}: quantidade ${d.opUnidades.toLocaleString("pt-BR")}/${d.caUnidades.toLocaleString("pt-BR")}`,
      )
      .join(" · ");
    detalhe = `Divergência no mesmo dia — ${detalhe}.`;
  }

  return {
    status,
    operacional,
    contaAzul,
    diffPedidos: operacional.pedidos - contaAzul.pedidos,
    diffUnidades: operacional.unidades - contaAzul.unidades,
    diffValor: operacional.valorEstimado - contaAzul.valorLiquido,
    diasProblema,
    detalhe,
  };
}

/**
 * Status semanal para cliente acumulador (Licco/Spoleto/…/Padoca).
 *
 * Regras além da comparação de totais:
 * - Semana sem venda CA: entregas todas vinculadas a documento CA (venda de outra
 *   semana ou orçamento-cautela) não são pendência — a validação acontece no
 *   documento vinculado.
 * - Faturamento antecipado (Padoca): a venda sai no início do mês e as entregas
 *   vêm depois. Entregar MENOS que a venda no meio do período é o fluxo normal
 *   (saldo a entregar); só é divergência real quando as entregas excedem a venda.
 */
export function avaliarClienteAcumuladorSemanal(input: {
  clienteNome: string;
  opPedidos: number;
  caPedidos: number;
  diffUnidades: number;
  diffValor: number;
  entregasEfetivas: Array<{ pedidoContaAzulId: string | null }>;
}): { status: StatusConciliacaoSemanalCliente; detalhe?: string } {
  const antecipado = clienteFaturaMesAntecipado(input.clienteNome);
  const unidadesOk = Math.abs(input.diffUnidades) <= 0.001;
  if (unidadesOk) return { status: "ok" };

  if (input.caPedidos === 0 && input.opPedidos > 0) {
    const todasVinculadas =
      input.entregasEfetivas.length > 0 &&
      input.entregasEfetivas.every((p) => p.pedidoContaAzulId);
    if (todasVinculadas) {
      return {
        status: "ok",
        detalhe: antecipado
          ? "Entregas cobertas pela venda antecipada do período (vinculadas no Conta Azul)."
          : "Entregas vinculadas a documento Conta Azul de outra semana (faturamento acumulado).",
      };
    }
    return {
      status: "aguardando_venda",
      detalhe: antecipado
        ? "Faturamento antecipado: vincule as entregas da semana à venda do início do período (ou ao orçamento-cautela do dia) para conciliar."
        : undefined,
    };
  }

  if (antecipado && input.caPedidos > 0 && input.diffUnidades < 0) {
    return {
      status: "ok",
      detalhe: `Venda antecipada do período: ${Math.abs(input.diffUnidades).toLocaleString("pt-BR")} unidade(s) ainda a entregar. Vincule as entregas conforme acontecem.`,
    };
  }

  return {
    status: classificarClienteSemanal(
      input.opPedidos,
      input.caPedidos,
      input.diffUnidades,
      input.diffValor,
      { acumulaPedidos: true },
    ),
  };
}

/** @deprecated use avaliarClienteNaoAcumuladorPorDatas — mantido para testes/compat. */
export function classificarClienteNaoAcumuladorPorDatas(input: {
  operacionais: Array<{
    dataEntrega: Date;
    status: string;
    pedidoContaAzulId: string | null;
    itens: Array<{ quantidade: unknown; precoUnit?: unknown }>;
  }>;
  vendas: Array<{ dataPedido: Date; unidades: number; valorLiquido?: number }>;
}): StatusConciliacaoSemanalCliente {
  return avaliarClienteNaoAcumuladorPorDatas({
    operacionais: input.operacionais,
    vendas: input.vendas.map((v) => ({
      dataPedido: v.dataPedido,
      unidades: v.unidades,
      valorLiquido: v.valorLiquido ?? 0,
    })),
  }).status;
}

/**
 * Documentos que entram no total Conta Azul do fechamento semanal.
 * Orçamentos diários de clientes acumuladores ficam visíveis na conciliação,
 * mas não somam no total — mesmo quando coexistem com a venda consolidada
 * (3 orçamentos + 1 venda total, ou 2 orçamentos + venda no último dia).
 */
export function documentoEntraTotalConciliacaoSemanal(
  statusPedido: string | null,
): boolean {
  return classificarStatusPedido(statusPedido) === "venda";
}

function documentoContaAzulSemanal(statusPedido: string | null): boolean {
  return documentoEntraTotalConciliacaoSemanal(statusPedido);
}

/**
 * Cliente acumulador com venda faturada na semana: soma todas as entregas manuais
 * (independente de estarem vinculadas a orçamentos diários intermediários).
 */
export function totaisOperacionaisAcumuladorSemanaFaturada(
  pedidos: OperacionalSemanal[],
  regra: RegraSemanal | undefined,
  freteCliente: { pedidos: number; valorFrete: number } | undefined,
): { unidades: number; valorEstimado: number } {
  const manuais = pedidos.filter(
    (p) => p.status !== "CANCELADO" && !pedidoCriadoAPartirDoContaAzul(p),
  );
  let unidades = sumUnidadesPedidos(manuais);
  let valorEstimado = manuais.reduce((s, p) => s + valorItensPedido(p.itens), 0);
  const taxa = taxaEntregaCliente(regra, freteCliente);
  if (manuais.some((p) => !p.freteCortesia)) valorEstimado += taxa;
  return { unidades, valorEstimado };
}

/** Compara pedidos operacionais da semana com vendas Conta Azul no mesmo intervalo. */
export async function calcularConciliacaoSemanal(
  prisma: PrismaConciliacao,
  inicio: Date,
  fim: Date,
): Promise<ConciliacaoSemanal> {
  await desligarAcumuloForaAllowlist(prisma);

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
    if (!documentoContaAzulSemanal(venda.statusPedido)) continue;

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
    vendasCliente.push({
      id: venda.id,
      dataPedido: venda.dataPedido,
      unidades: totalUnidades,
      valorLiquido: comp.valorLiquido,
    });
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
    clienteAcumulaFaturamento(
      regraPorCliente.get(id),
      contaAzulPorCliente.get(id)?.clienteNome,
    ),
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
    const acumula = clienteAcumulaFaturamento(regra, opCliente.clienteNome);
    const ca = contaAzulPorCliente.get(contaAzulCustomerId);
    const vendasCa = vendasCaPorCliente.get(contaAzulCustomerId) ?? [];
    const pedidosTotais = acumula
      ? [...opCliente.pedidos, ...(pedidosAcumuloExtraPorCliente.get(contaAzulCustomerId) ?? [])]
      : opCliente.pedidos;
    const totais =
      acumula && vendasCa.length > 0
        ? totaisOperacionaisAcumuladorSemanaFaturada(pedidosTotais, regra, ca)
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
      const clienteNome = opRaw?.clienteNome ?? ca?.clienteNome ?? contaAzulCustomerId;
      const acumulaPedidos = clienteAcumulaFaturamento(
        regraPorCliente.get(contaAzulCustomerId),
        clienteNome,
      );
      const vendasCa = vendasCaPorCliente.get(contaAzulCustomerId) ?? [];
      if (!acumulaPedidos) {
        const avaliado = avaliarClienteNaoAcumuladorPorDatas({
          operacionais: opRaw?.pedidos ?? [],
          vendas: vendasCa,
        });
        return {
          contaAzulCustomerId,
          clienteNome,
          operacional: avaliado.operacional,
          contaAzul: avaliado.contaAzul,
          diffPedidos: avaliado.diffPedidos,
          diffUnidades: avaliado.diffUnidades,
          diffValor: avaliado.diffValor,
          status: avaliado.status,
          divergente: avaliado.status === "divergente",
          acumulaPedidos: false,
          detalhe: avaliado.detalhe,
          diasProblema: avaliado.diasProblema,
        };
      }

      const entregasEfetivas = pedidosOperacionaisSemanaEfetivos(opRaw?.pedidos ?? [], true);
      const opPedidos = pedidosOperacionaisEfetivos(entregasEfetivas);
      const caPedidos = ca?.pedidos ?? 0;
      const diffPedidos = opPedidos - caPedidos;
      const diffUnidades = (opRaw?.unidades ?? 0) - (ca?.unidades ?? 0);
      const diffValor = (opRaw?.valorEstimado ?? 0) - (ca?.valorLiquido ?? 0);
      const avaliado = avaliarClienteAcumuladorSemanal({
        clienteNome,
        opPedidos,
        caPedidos,
        diffUnidades,
        diffValor,
        entregasEfetivas,
      });
      return {
        contaAzulCustomerId,
        clienteNome,
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
        status: avaliado.status,
        divergente: avaliado.status === "divergente",
        acumulaPedidos: true,
        detalhe: avaliado.detalhe,
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
