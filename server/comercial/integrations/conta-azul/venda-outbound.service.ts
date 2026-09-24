import type { AxiosInstance } from "axios";
import { Prisma } from "../../generated/prisma/index.js";
import type { PrismaClient } from "../../generated/prisma/index.js";
import type { Env } from "../../env";
import { logger } from "../../lib/logger";
import { clienteAcumulaFaturamento } from "../../lib/conciliacao-pedidos";
import {
  addDiasCivil,
  isoDataCivil,
  periodoAcumuloContendo,
} from "../../lib/periodo-acumulo";
import {
  contaAzulGet,
  contaAzulPost,
  createContaAzulHttp,
} from "./conta-azul.client";
import { ensureValidAccessToken } from "./sync.service";

export type ModoEnvioContaAzul = "ORCAMENTO" | "VENDA";

export type ItemEnvioCa = {
  produtoId: string;
  contaAzulProdutoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnit: number;
};

export type ValidacaoEnvioCa = {
  ok: boolean;
  erros: string[];
  avisos: string[];
  modoSugerido: ModoEnvioContaAzul;
  /** True quando já houve orçamento marcado e o usuário pode reenviar (ex.: excluiu no CA). */
  podeReenviarOrcamento: boolean;
  periodo?: { inicio: string; fim: string; ehUltimoDiaDoPeriodo: boolean };
};

export type BoletoEmitidoCa = {
  id: string;
  url: string | null;
  status: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    try {
      return (v as { toNumber: () => number }).toNumber();
    } catch {
      return 0;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function ensureContaAzulEnvioConfig(prisma: PrismaClient) {
  return prisma.contaAzulEnvioConfig.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

type ContaFinanceiraItem = {
  id?: string;
  id_conta_financeira?: string;
  nome?: string;
  ativo?: boolean;
  tipo?: string;
};

/** Sincroniza lista de contas financeiras e escolhe padrão se ainda não houver. */
export async function sincronizarContasFinanceirasEnvio(
  prisma: PrismaClient,
  env: Env,
): Promise<{
  contas: Array<{ id: string; nome: string; tipo: string | null; ativo: boolean }>;
  selecionadaId: string | null;
}> {
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error("Conta Azul: sem token — conclua o OAuth em Configurações.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const raw = await contaAzulGet<{ itens?: ContaFinanceiraItem[] }>(
    http,
    "/v1/conta-financeira?apenas_ativo=true&tamanho_pagina=100",
  );
  const contas = (raw.itens ?? [])
    .map((c) => {
      const id = String(c.id ?? c.id_conta_financeira ?? "").trim();
      if (!id) return null;
      return {
        id,
        nome: String(c.nome ?? id),
        tipo: c.tipo ? String(c.tipo) : null,
        ativo: c.ativo !== false,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  const cfg = await ensureContaAzulEnvioConfig(prisma);
  let selecionadaId = cfg.idContaFinanceira;
  if (!selecionadaId || !contas.some((c) => c.id === selecionadaId)) {
    const prefer =
      contas.find((c) =>
        /COBRANCAS_CONTA_AZUL|RECEBA.?FACIL|MEIOS_RECEBIMENTO/i.test(c.tipo ?? ""),
      ) ??
      contas.find((c) => /CONTA_CORRENTE|COBRANCA/i.test(c.tipo ?? "")) ??
      contas[0];
    if (prefer) {
      await prisma.contaAzulEnvioConfig.update({
        where: { id: "default" },
        data: {
          idContaFinanceira: prefer.id,
          nomeContaFinanceira: prefer.nome,
        },
      });
      selecionadaId = prefer.id;
    }
  }

  return { contas, selecionadaId: selecionadaId ?? null };
}

async function proximoNumeroVenda(
  prisma: PrismaClient,
  http: AxiosInstance,
): Promise<number> {
  const cfg = await ensureContaAzulEnvioConfig(prisma);
  if (cfg.proximoNumeroVenda != null && cfg.proximoNumeroVenda > 0) {
    const n = cfg.proximoNumeroVenda;
    await prisma.contaAzulEnvioConfig.update({
      where: { id: "default" },
      data: { proximoNumeroVenda: n + 1 },
    });
    return n;
  }

  // Heurística: maior número local + busca recente CA
  const maxLocal = await prisma.pedido.findMany({
    where: { numeroVenda: { not: null } },
    select: { numeroVenda: true },
    take: 500,
    orderBy: { dataPedido: "desc" },
  });
  let max = 0;
  for (const p of maxLocal) {
    const n = Number(String(p.numeroVenda).replace(/\D/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }

  try {
    const fim = isoDataCivil(new Date());
    const ini = isoDataCivil(addDiasCivil(new Date(), -90));
    const busca = await contaAzulGet<{
      itens?: Array<{ numero?: number; numero_venda?: number }>;
    }>(
      http,
      `/v1/venda/busca?data_inicio=${ini}&data_fim=${fim}&pagina=1&tamanho_pagina=50&campo_ordenado_descendente=NUMERO`,
    );
    for (const it of busca.itens ?? []) {
      const n = Number(it.numero ?? it.numero_venda ?? 0);
      if (Number.isFinite(n) && n > max) max = n;
    }
  } catch (err) {
    logger.warn({ err }, "Conta Azul: falha ao obter próximo número de venda");
  }

  const next = max + 1;
  await prisma.contaAzulEnvioConfig.update({
    where: { id: "default" },
    data: { proximoNumeroVenda: next + 1 },
  });
  return next;
}

function agregarItens(
  pedidos: Array<{
    id: string;
    freteCortesia: boolean;
    itens: Array<{
      produtoId: string;
      produtoNome: string;
      quantidade: Prisma.Decimal | number;
      precoUnit: Prisma.Decimal | number | null;
      produto: { contaAzulProdutoId: string | null; precoBase: Prisma.Decimal | number | null };
    }>;
  }>,
): { itens: ItemEnvioCa[]; erros: string[] } {
  const map = new Map<string, ItemEnvioCa>();
  const erros: string[] = [];

  for (const ped of pedidos) {
    for (const it of ped.itens) {
      const caId = it.produto.contaAzulProdutoId?.trim();
      if (!caId) {
        erros.push(`Produto «${it.produtoNome}» sem vínculo Conta Azul.`);
        continue;
      }
      const qtd = num(it.quantidade);
      if (qtd <= 0) {
        erros.push(`Produto «${it.produtoNome}» com quantidade inválida.`);
        continue;
      }
      let preco = num(it.precoUnit);
      if (preco <= 0) preco = num(it.produto.precoBase);
      if (preco <= 0) {
        erros.push(`Produto «${it.produtoNome}» sem preço unitário.`);
        continue;
      }
      const cur = map.get(caId);
      if (!cur) {
        map.set(caId, {
          produtoId: it.produtoId,
          contaAzulProdutoId: caId,
          produtoNome: it.produtoNome,
          quantidade: qtd,
          precoUnit: preco,
        });
      } else {
        const totalValor = cur.quantidade * cur.precoUnit + qtd * preco;
        const totalQtd = cur.quantidade + qtd;
        cur.quantidade = round2(totalQtd);
        cur.precoUnit = totalQtd > 0 ? round2(totalValor / totalQtd) : preco;
      }
    }
  }

  return { itens: Array.from(map.values()), erros };
}

function freteDosPedidos(
  pedidos: Array<{ freteCortesia: boolean }>,
  regra: {
    cobraTaxaEntrega: boolean;
    valorTaxaEntrega: Prisma.Decimal | number | null;
  } | null,
): number {
  if (!regra?.cobraTaxaEntrega) return 0;
  const valor = num(regra.valorTaxaEntrega);
  if (valor <= 0) return 0;
  // Uma taxa por documento enviado (não soma N entregas no fechamento).
  const algumCobra = pedidos.some((p) => !p.freteCortesia);
  return algumCobra ? valor : 0;
}

type PedidoEnvioLoaded = {
  id: string;
  status: string;
  dataEntrega: Date;
  contaAzulCustomerId: string;
  freteCortesia: boolean;
  observacoes: string | null;
  statusEnvioContaAzul: string;
  pedidoContaAzulId: string | null;
  contaAzulEnvioExternalId: string | null;
  cliente: { id: string; nome: string; externalId: string | null } | null;
  itens: Array<{
    produtoId: string;
    produtoNome: string;
    quantidade: Prisma.Decimal;
    precoUnit: Prisma.Decimal | null;
    produto: {
      contaAzulProdutoId: string | null;
      precoBase: Prisma.Decimal | null;
      ativo: boolean;
    };
  }>;
};

async function carregarPedido(
  prisma: PrismaClient,
  pedidoId: string,
): Promise<PedidoEnvioLoaded> {
  const pedido = await prisma.pedidoOperacional.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: { select: { id: true, nome: true, externalId: true } },
      itens: {
        include: {
          produto: {
            select: {
              contaAzulProdutoId: true,
              precoBase: true,
              ativo: true,
            },
          },
        },
      },
    },
  });
  if (!pedido) throw new Error("Pedido operacional não encontrado.");
  return pedido;
}

export async function validarEnvioOperacionalContaAzul(
  prisma: PrismaClient,
  pedidoId: string,
): Promise<ValidacaoEnvioCa> {
  const pedido = await carregarPedido(prisma, pedidoId);
  const erros: string[] = [];
  const avisos: string[] = [];

  if (pedido.status === "CANCELADO") {
    erros.push("Pedido cancelado não pode ser enviado.");
  }
  if (!pedido.contaAzulCustomerId?.trim()) {
    erros.push("Cliente sem ID Conta Azul.");
  }
  if (pedido.itens.length === 0) {
    erros.push("Pedido sem itens.");
  }
  if (
    pedido.statusEnvioContaAzul === "ENVIADO_VENDA" ||
    (pedido.pedidoContaAzulId && pedido.statusEnvioContaAzul === "ENVIADO_VENDA")
  ) {
    erros.push("Pedido já enviado como venda ao Conta Azul.");
  }

  const podeReenviarOrcamento = pedido.statusEnvioContaAzul === "ENVIADO_ORCAMENTO";
  if (podeReenviarOrcamento) {
    avisos.push(
      "Já há orçamento marcado como enviado. Reenviar cria um novo documento (use se excluiu ou corrigiu no Conta Azul).",
    );
  }

  const { itens, erros: errosItens } = agregarItens([pedido]);
  erros.push(...errosItens);
  if (itens.length === 0 && errosItens.length === 0) {
    erros.push("Nenhum item válido para envio.");
  }

  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId: pedido.contaAzulCustomerId },
  });
  const nome = pedido.cliente?.nome ?? "";
  const acumula = clienteAcumulaFaturamento(regra, nome);
  const periodo = acumula
    ? periodoAcumuloContendo(pedido.dataEntrega, regra?.diasAcumulo)
    : undefined;

  const modoSugerido: ModoEnvioContaAzul = acumula ? "ORCAMENTO" : "VENDA";
  if (acumula && periodo?.ehUltimoDiaDoPeriodo) {
    avisos.push(
      `Último dia do período ${isoDataCivil(periodo.inicio)}–${isoDataCivil(periodo.fim)}: use «Fechar período» para enviar a venda acumulada.`,
    );
  }

  const cfg = await ensureContaAzulEnvioConfig(prisma);
  if (modoSugerido === "VENDA" && !cfg.idContaFinanceira) {
    avisos.push(
      "Conta financeira ainda não configurada — o sync tentará escolher uma automaticamente no envio.",
    );
  }

  return {
    ok: erros.length === 0,
    erros,
    avisos,
    modoSugerido,
    podeReenviarOrcamento,
    periodo: periodo
      ? {
          inicio: isoDataCivil(periodo.inicio),
          fim: isoDataCivil(periodo.fim),
          ehUltimoDiaDoPeriodo: periodo.ehUltimoDiaDoPeriodo,
        }
      : undefined,
  };
}

async function criarOrcamentoCa(
  http: AxiosInstance,
  input: {
    idCliente: string;
    data: string;
    validade: string;
    itens: ItemEnvioCa[];
    frete: number;
    observacoes?: string | null;
    descricao?: string;
  },
): Promise<{ id: string }> {
  const body = {
    id_cliente: input.idCliente,
    data_orcamento: input.data,
    data_validade: input.validade,
    descricao: input.descricao ?? `Orçamento operacional ${input.data}`,
    observacoes: input.observacoes ?? undefined,
    observacoes_pagamento: "Conforme regra comercial (faturamento acumulado).",
    previsao_entrega: `Entrega em ${input.data}`,
    itens: input.itens.map((i) => ({
      id: i.contaAzulProdutoId,
      quantidade: i.quantidade,
      valor: i.precoUnit,
    })),
    composicao_de_valor: {
      frete: input.frete,
    },
  };
  const res = await contaAzulPost<{ id?: string }>(http, "/v1/orcamentos", body);
  const id = res?.id?.trim();
  if (!id) throw new Error("Conta Azul não retornou ID do orçamento.");
  return { id };
}

async function criarVendaCa(
  prisma: PrismaClient,
  http: AxiosInstance,
  input: {
    idCliente: string;
    data: string;
    itens: ItemEnvioCa[];
    frete: number;
    observacoes?: string | null;
    prazoBoletoDias: number;
    tipoPagamento: string;
    idContaFinanceira: string;
  },
): Promise<{ id: string; numero: number; dataVencimento: string; valorParcela: number }> {
  const numero = await proximoNumeroVenda(prisma, http);
  const totalItens = round2(
    input.itens.reduce((s, i) => s + i.quantidade * i.precoUnit, 0),
  );
  const total = round2(totalItens + input.frete);
  const venc = isoDataCivil(addDiasCivil(new Date(input.data + "T12:00:00"), input.prazoBoletoDias));

  const opcao =
    input.prazoBoletoDias <= 0 ? "À vista" : String(input.prazoBoletoDias);

  const body = {
    id_cliente: input.idCliente,
    numero,
    situacao: "EM_ANDAMENTO",
    data_venda: input.data,
    observacoes: input.observacoes ?? undefined,
    observacoes_pagamento: `Prazo ${input.prazoBoletoDias} dia(s)`,
    itens: input.itens.map((i) => ({
      id: i.contaAzulProdutoId,
      descricao: i.produtoNome,
      quantidade: i.quantidade,
      valor: i.precoUnit,
    })),
    composicao_de_valor: {
      frete: input.frete,
    },
    condicao_pagamento: {
      tipo_pagamento: input.tipoPagamento || "BOLETO_BANCARIO",
      id_conta_financeira: input.idContaFinanceira,
      opcao_condicao_pagamento: opcao,
      parcelas: [
        {
          data_vencimento: venc,
          valor: total,
          descricao: "Parcela 1",
        },
      ],
    },
  };

  const res = await contaAzulPost<{ id?: string }>(http, "/v1/venda", body);
  const id = res?.id?.trim();
  if (!id) throw new Error("Conta Azul não retornou ID da venda.");
  return { id, numero, dataVencimento: venc, valorParcela: total };
}

/** Extrai o id da 1ª parcela a partir do GET /v1/venda/{id}. */
export function extrairIdParcelaVenda(venda: unknown): string | null {
  if (!venda || typeof venda !== "object") return null;
  const o = venda as Record<string, unknown>;
  const cond = o.condicao_pagamento;
  const listas: unknown[] = [];
  if (cond && typeof cond === "object") {
    const c = cond as Record<string, unknown>;
    if (Array.isArray(c.parcelas)) listas.push(...c.parcelas);
  }
  if (Array.isArray(o.parcelas)) listas.push(...o.parcelas);
  if (Array.isArray(o.installments)) listas.push(...o.installments);
  for (const p of listas) {
    if (!p || typeof p !== "object") continue;
    const row = p as Record<string, unknown>;
    const id = String(row.id ?? row.id_parcela ?? row.idParcela ?? "").trim();
    if (id) return id;
  }
  return null;
}

/**
 * Emite boleto (Cobranças Conta Azul) vinculado à parcela da venda.
 * Falha aqui não deve desfazer a venda — o caller decide se propaga ou só avisa.
 */
async function emitirBoletoDaVenda(
  http: AxiosInstance,
  input: {
    vendaId: string;
    contaBancaria: string;
    dataVencimento: string;
    descricaoFatura: string;
    descontoPercentual?: number | null;
  },
): Promise<BoletoEmitidoCa> {
  const venda = await contaAzulGet<unknown>(
    http,
    `/v1/venda/${encodeURIComponent(input.vendaId)}`,
  );
  const idParcela = extrairIdParcelaVenda(venda);
  if (!idParcela) {
    throw new Error(
      "Venda criada, mas a Conta Azul não retornou id da parcela para emitir o boleto.",
    );
  }

  const body: Record<string, unknown> = {
    conta_bancaria: input.contaBancaria,
    descricao_fatura: input.descricaoFatura.slice(0, 200),
    id_parcela: idParcela,
    data_vencimento: input.dataVencimento,
    tipo: "BOLETO",
  };
  const perc = Number(input.descontoPercentual);
  if (Number.isFinite(perc) && perc > 0) {
    body.atributos = {
      desconto_antecipado: {
        percentual: perc,
        dias_antes_vencer: 0,
      },
    };
  }

  const cobranca = await contaAzulPost<{
    id?: string;
    url?: string;
    status?: string;
  }>(http, "/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca", body);

  const id = String(cobranca?.id ?? "").trim();
  if (!id) {
    throw new Error("Conta Azul não retornou ID da cobrança/boleto.");
  }
  return {
    id,
    url: cobranca.url ? String(cobranca.url) : null,
    status: cobranca.status ? String(cobranca.status) : null,
  };
}

async function gravarPedidoLocalAposEnvio(
  prisma: PrismaClient,
  opts: {
    externalId: string;
    clienteId: string;
    dataPedido: Date;
    itens: ItemEnvioCa[];
    frete: number;
    statusPedido: string;
    numeroVenda?: string;
  },
) {
  const valorItens = round2(
    opts.itens.reduce((s, i) => s + i.quantidade * i.precoUnit, 0),
  );
  const liquido = round2(valorItens + opts.frete);

  return prisma.pedido.upsert({
    where: { externalId: opts.externalId },
    create: {
      externalId: opts.externalId,
      numeroVenda: opts.numeroVenda ?? null,
      clienteId: opts.clienteId,
      dataPedido: opts.dataPedido,
      valorTotal: new Prisma.Decimal(liquido),
      valorBruto: new Prisma.Decimal(valorItens),
      valorFrete: new Prisma.Decimal(opts.frete),
      valorDesconto: new Prisma.Decimal(0),
      valorLiquido: new Prisma.Decimal(liquido),
      composicaoDetalhada: true,
      statusPedido: opts.statusPedido,
      origemPedido: "CONTA_AZUL",
      itens: {
        create: opts.itens.map((i) => ({
          produto: i.produtoNome,
          quantidade: new Prisma.Decimal(i.quantidade),
          precoUnit: new Prisma.Decimal(i.precoUnit),
        })),
      },
    },
    update: {
      numeroVenda: opts.numeroVenda ?? undefined,
      dataPedido: opts.dataPedido,
      valorTotal: new Prisma.Decimal(liquido),
      valorBruto: new Prisma.Decimal(valorItens),
      valorFrete: new Prisma.Decimal(opts.frete),
      valorLiquido: new Prisma.Decimal(liquido),
      statusPedido: opts.statusPedido,
      itens: {
        deleteMany: {},
        create: opts.itens.map((i) => ({
          produto: i.produtoNome,
          quantidade: new Prisma.Decimal(i.quantidade),
          precoUnit: new Prisma.Decimal(i.precoUnit),
        })),
      },
    },
  });
}

/**
 * Envia um pedido operacional:
 * - cliente sem acúmulo → VENDA
 * - cliente com acúmulo → ORÇAMENTO (nunca venda avulsa)
 */
export async function enviarOperacionalContaAzul(
  prisma: PrismaClient,
  env: Env,
  pedidoId: string,
  opts?: { forcarModo?: ModoEnvioContaAzul },
): Promise<{
  modo: ModoEnvioContaAzul;
  externalId: string;
  pedidoContaAzulLocalId: string;
  boleto?: BoletoEmitidoCa | null;
  boletoErro?: string | null;
  reenvioOrcamento?: boolean;
}> {
  const validacao = await validarEnvioOperacionalContaAzul(prisma, pedidoId);
  const modo = opts?.forcarModo ?? validacao.modoSugerido;
  const reenvioOrcamento =
    modo === "ORCAMENTO" && validacao.podeReenviarOrcamento;

  if (modo === "VENDA") {
    const pedido = await carregarPedido(prisma, pedidoId);
    const regra = await prisma.regraComercialCliente.findUnique({
      where: { contaAzulCustomerId: pedido.contaAzulCustomerId },
    });
    if (clienteAcumulaFaturamento(regra, pedido.cliente?.nome ?? "")) {
      throw new Error(
        "Cliente com faturamento acumulado: envie orçamento no dia a dia e use «Fechar período» para a venda consolidada.",
      );
    }
  }

  if (!validacao.ok && modo === validacao.modoSugerido) {
    throw new Error(validacao.erros.join(" "));
  }
  if (!validacao.ok && modo === "ORCAMENTO") {
    throw new Error(validacao.erros.join(" "));
  }

  await prisma.pedidoOperacional.update({
    where: { id: pedidoId },
    data: { statusEnvioContaAzul: "ENVIANDO", ultimoErroEnvioCa: null },
  });

  try {
    const pedido = await carregarPedido(prisma, pedidoId);
    const regra = await prisma.regraComercialCliente.findUnique({
      where: { contaAzulCustomerId: pedido.contaAzulCustomerId },
    });
    const { itens, erros } = agregarItens([pedido]);
    if (erros.length || itens.length === 0) {
      throw new Error(erros.join(" ") || "Sem itens válidos.");
    }

    const frete = freteDosPedidos([pedido], regra);
    const dataIso = isoDataCivil(pedido.dataEntrega);
    const cred = await ensureValidAccessToken(prisma, env);
    if (!cred?.accessToken) {
      throw new Error("Conta Azul: sem token — conclua o OAuth em Configurações.");
    }
    const http = createContaAzulHttp(env, cred.accessToken);

    // Garante conta financeira para vendas
    if (modo === "VENDA") {
      await sincronizarContasFinanceirasEnvio(prisma, env);
    }
    const cfg = await ensureContaAzulEnvioConfig(prisma);

    let externalId: string;
    let statusPedido: string;
    let numeroVenda: string | undefined;
    let boleto: BoletoEmitidoCa | null = null;
    let boletoErro: string | null = null;
    let dataVencimentoBoleto: string | null = null;

    if (modo === "ORCAMENTO") {
      const diasValidade = Math.max(1, regra?.diasAcumulo ?? 15);
      const created = await criarOrcamentoCa(http, {
        idCliente: pedido.contaAzulCustomerId,
        data: dataIso,
        validade: isoDataCivil(addDiasCivil(pedido.dataEntrega, diasValidade)),
        itens,
        frete,
        observacoes: pedido.observacoes,
        descricao: `Orçamento entrega ${dataIso} — ${pedido.cliente?.nome ?? ""}`.trim(),
      });
      externalId = created.id;
      statusPedido = "ORCAMENTO";

      // Reenvio após exclusão/ajuste no CA: arquiva espelho local antigo.
      if (reenvioOrcamento && pedido.pedidoContaAzulId) {
        await prisma.pedido.update({
          where: { id: pedido.pedidoContaAzulId },
          data: {
            statusConciliacao: "IGNORADA",
            sugestaoPedidoOperacionalId: null,
          },
        });
      }
    } else {
      if (!cfg.idContaFinanceira) {
        throw new Error(
          "Configure a conta financeira Conta Azul em Comercial → Configurações (sync contas).",
        );
      }
      const prazo = Math.max(0, regra?.prazoBoletoDias ?? 0);
      const created = await criarVendaCa(prisma, http, {
        idCliente: pedido.contaAzulCustomerId,
        data: dataIso,
        itens,
        frete,
        observacoes: pedido.observacoes,
        prazoBoletoDias: prazo,
        tipoPagamento: cfg.tipoPagamentoPadrao || "BOLETO_BANCARIO",
        idContaFinanceira: cfg.idContaFinanceira,
      });
      externalId = created.id;
      numeroVenda = String(created.numero);
      statusPedido = "EM_ANDAMENTO";
      dataVencimentoBoleto = created.dataVencimento;

      if ((cfg.tipoPagamentoPadrao || "BOLETO_BANCARIO") === "BOLETO_BANCARIO") {
        try {
          boleto = await emitirBoletoDaVenda(http, {
            vendaId: created.id,
            contaBancaria: cfg.idContaFinanceira,
            dataVencimento: created.dataVencimento,
            descricaoFatura: `Venda ${created.numero} — ${pedido.cliente?.nome ?? ""}`.trim(),
            descontoPercentual: num(regra?.descontoBoletoPercentual),
          });
        } catch (err) {
          boletoErro = err instanceof Error ? err.message : String(err);
          logger.warn(
            { err, vendaId: created.id },
            "Conta Azul: venda ok, falha ao emitir boleto",
          );
        }
      }
    }

    const cliId =
      pedido.cliente?.id ??
      (
        await prisma.cliente.findUnique({
          where: { externalId: pedido.contaAzulCustomerId },
          select: { id: true },
        })
      )?.id;
    if (!cliId) {
      throw new Error("Cliente local não encontrado para gravar o documento Conta Azul.");
    }

    const local = await gravarPedidoLocalAposEnvio(prisma, {
      externalId,
      clienteId: cliId,
      dataPedido: pedido.dataEntrega,
      itens,
      frete,
      statusPedido,
      numeroVenda,
    });

    await prisma.pedidoOperacional.update({
      where: { id: pedidoId },
      data: {
        statusEnvioContaAzul:
          modo === "ORCAMENTO" ? "ENVIADO_ORCAMENTO" : "ENVIADO_VENDA",
        contaAzulEnvioExternalId: externalId,
        enviadoContaAzulEm: new Date(),
        ultimoErroEnvioCa: boletoErro ? boletoErro.slice(0, 2000) : null,
        pedidoContaAzulId: local.id,
        statusConciliacao: "CONCILIADO",
        snapshotConciliacao: {
          operacional: null,
          contaAzul: {
            origem: "envio_fup",
            modo,
            reenvioOrcamento: Boolean(reenvioOrcamento),
            boleto: boleto ?? undefined,
            boletoErro: boletoErro ?? undefined,
            dataVencimentoBoleto: dataVencimentoBoleto ?? undefined,
          },
        },
      },
    });

    await prisma.pedidoConciliacaoEvento.create({
      data: {
        pedidoOperacionalId: pedidoId,
        pedidoContaAzulId: local.id,
        tipo: modo === "ORCAMENTO" ? "ENVIO_CA_ORCAMENTO" : "ENVIO_CA_VENDA",
        depois: {
          externalId,
          modo,
          reenvioOrcamento: Boolean(reenvioOrcamento),
          boleto: boleto ?? undefined,
          boletoErro: boletoErro ?? undefined,
        },
      },
    });

    await prisma.execucaoApi.create({
      data: {
        acaoApi: "ENVIO_CA",
        statusExecucao: "SUCESSO",
        detalhesExecucao: {
          modo,
          pedidoOperacionalId: pedidoId,
          externalId,
          boletoId: boleto?.id,
          boletoErro: boletoErro ?? undefined,
        },
      },
    });

    return {
      modo,
      externalId,
      pedidoContaAzulLocalId: local.id,
      boleto,
      boletoErro,
      reenvioOrcamento: Boolean(reenvioOrcamento),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.pedidoOperacional.update({
      where: { id: pedidoId },
      data: {
        statusEnvioContaAzul: "ERRO",
        ultimoErroEnvioCa: msg.slice(0, 2000),
      },
    });
    await prisma.execucaoApi.create({
      data: {
        acaoApi: "ENVIO_CA",
        statusExecucao: "FALHA",
        mensagemErro: msg.slice(0, 1900),
        detalhesExecucao: { pedidoOperacionalId: pedidoId },
      },
    });
    throw e;
  }
}

/**
 * Prévia do período de acúmulo (histórico de entregas) para confirmação antes da venda.
 */
export async function previewPeriodoAcumuloContaAzul(
  prisma: PrismaClient,
  input: {
    contaAzulCustomerId: string;
    dataReferencia: Date;
    pedidoOperacionalIds?: string[];
  },
): Promise<{
  ok: boolean;
  erros: string[];
  clienteNome: string;
  periodo: { inicio: string; fim: string };
  frete: number;
  prazoBoletoDias: number;
  entregas: Array<{
    id: string;
    dataEntrega: string;
    status: string;
    statusEnvioContaAzul: string;
    observacoes: string | null;
    itens: Array<{
      produtoNome: string;
      quantidade: number;
      precoUnit: number;
      subtotal: number;
    }>;
    subtotal: number;
  }>;
  itensConsolidados: Array<{
    produtoNome: string;
    quantidade: number;
    precoUnit: number;
    subtotal: number;
  }>;
  totalItens: number;
  totalComFrete: number;
}> {
  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId: input.contaAzulCustomerId },
  });
  const cliente = await prisma.cliente.findUnique({
    where: { externalId: input.contaAzulCustomerId },
  });
  const erros: string[] = [];
  if (!clienteAcumulaFaturamento(regra, cliente?.nome ?? "")) {
    erros.push("Cliente não está configurado para faturamento acumulado.");
  }

  const periodo = periodoAcumuloContendo(
    input.dataReferencia,
    regra?.diasAcumulo,
  );
  const inicio = new Date(periodo.inicio);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(periodo.fim);
  fim.setHours(23, 59, 59, 999);

  const pedidos = await prisma.pedidoOperacional.findMany({
    where: {
      contaAzulCustomerId: input.contaAzulCustomerId,
      status: { not: "CANCELADO" },
      dataEntrega: { gte: inicio, lte: fim },
      ...(input.pedidoOperacionalIds?.length
        ? { id: { in: input.pedidoOperacionalIds } }
        : {}),
      statusEnvioContaAzul: { not: "ENVIADO_VENDA" },
    },
    include: {
      itens: {
        include: {
          produto: {
            select: {
              contaAzulProdutoId: true,
              precoBase: true,
              ativo: true,
            },
          },
        },
      },
    },
    orderBy: { dataEntrega: "asc" },
  });

  if (pedidos.length === 0 && erros.length === 0) {
    erros.push(
      `Nenhuma entrega pendente de venda no período ${isoDataCivil(periodo.inicio)}–${isoDataCivil(periodo.fim)}.`,
    );
  }

  const { itens, erros: errosItens } = agregarItens(pedidos);
  erros.push(...errosItens);

  const frete = freteDosPedidos(pedidos, regra);
  const prazoBoletoDias = Math.max(
    0,
    regra?.prazoBoletoAcumuloDias ?? regra?.prazoBoletoDias ?? 0,
  );

  const entregas = pedidos.map((p) => {
    const linhas = p.itens.map((it) => {
      let preco = num(it.precoUnit);
      if (preco <= 0) preco = num(it.produto.precoBase);
      const quantidade = num(it.quantidade);
      return {
        produtoNome: it.produtoNome,
        quantidade,
        precoUnit: preco,
        subtotal: round2(quantidade * preco),
      };
    });
    const subtotal = round2(linhas.reduce((s, l) => s + l.subtotal, 0));
    return {
      id: p.id,
      dataEntrega: isoDataCivil(p.dataEntrega),
      status: p.status,
      statusEnvioContaAzul: p.statusEnvioContaAzul,
      observacoes: p.observacoes,
      itens: linhas,
      subtotal,
    };
  });

  const itensConsolidados = itens.map((i) => ({
    produtoNome: i.produtoNome,
    quantidade: i.quantidade,
    precoUnit: i.precoUnit,
    subtotal: round2(i.quantidade * i.precoUnit),
  }));
  const totalItens = round2(itensConsolidados.reduce((s, i) => s + i.subtotal, 0));

  return {
    ok: erros.length === 0 && itensConsolidados.length > 0,
    erros,
    clienteNome: cliente?.nome ?? input.contaAzulCustomerId,
    periodo: {
      inicio: isoDataCivil(periodo.inicio),
      fim: isoDataCivil(periodo.fim),
    },
    frete,
    prazoBoletoDias,
    entregas,
    itensConsolidados,
    totalItens,
    totalComFrete: round2(totalItens + frete),
  };
}

/**
 * Fecha o período de acúmulo: agrega entregas do bloco e cria UMA venda na CA.
 */
export async function fecharPeriodoAcumuloContaAzul(
  prisma: PrismaClient,
  env: Env,
  input: {
    contaAzulCustomerId: string;
    dataReferencia: Date;
    pedidoOperacionalIds?: string[];
  },
): Promise<{
  externalId: string;
  pedidoContaAzulLocalId: string;
  pedidosAtualizados: number;
  periodo: { inicio: string; fim: string };
  boleto?: BoletoEmitidoCa | null;
  boletoErro?: string | null;
}> {
  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId: input.contaAzulCustomerId },
  });
  const cliente = await prisma.cliente.findUnique({
    where: { externalId: input.contaAzulCustomerId },
  });
  if (!clienteAcumulaFaturamento(regra, cliente?.nome ?? "")) {
    throw new Error("Cliente não está configurado para faturamento acumulado.");
  }

  const periodo = periodoAcumuloContendo(
    input.dataReferencia,
    regra?.diasAcumulo,
  );
  const inicio = new Date(periodo.inicio);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(periodo.fim);
  fim.setHours(23, 59, 59, 999);

  const pedidos = await prisma.pedidoOperacional.findMany({
    where: {
      contaAzulCustomerId: input.contaAzulCustomerId,
      status: { not: "CANCELADO" },
      dataEntrega: { gte: inicio, lte: fim },
      ...(input.pedidoOperacionalIds?.length
        ? { id: { in: input.pedidoOperacionalIds } }
        : {}),
      statusEnvioContaAzul: { not: "ENVIADO_VENDA" },
    },
    include: {
      cliente: { select: { id: true, nome: true, externalId: true } },
      itens: {
        include: {
          produto: {
            select: {
              contaAzulProdutoId: true,
              precoBase: true,
              ativo: true,
            },
          },
        },
      },
    },
    orderBy: { dataEntrega: "asc" },
  });

  if (pedidos.length === 0) {
    throw new Error(
      `Nenhuma entrega pendente de venda no período ${isoDataCivil(periodo.inicio)}–${isoDataCivil(periodo.fim)}.`,
    );
  }

  const { itens, erros } = agregarItens(pedidos);
  if (erros.length) throw new Error(erros.join(" "));
  if (itens.length === 0) throw new Error("Sem itens válidos no período.");

  const frete = freteDosPedidos(pedidos, regra);
  await sincronizarContasFinanceirasEnvio(prisma, env);
  const cfg = await ensureContaAzulEnvioConfig(prisma);
  if (!cfg.idContaFinanceira) {
    throw new Error("Conta financeira Conta Azul não configurada.");
  }

  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error("Conta Azul: sem token — conclua o OAuth em Configurações.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const dataIso = isoDataCivil(periodo.fim);
  const prazo = Math.max(
    0,
    regra?.prazoBoletoAcumuloDias ?? regra?.prazoBoletoDias ?? 0,
  );

  const ids = pedidos.map((p) => p.id);
  await prisma.pedidoOperacional.updateMany({
    where: { id: { in: ids } },
    data: { statusEnvioContaAzul: "ENVIANDO", ultimoErroEnvioCa: null },
  });

  try {
    const created = await criarVendaCa(prisma, http, {
      idCliente: input.contaAzulCustomerId,
      data: dataIso,
      itens,
      frete,
      observacoes: `Venda acumulada ${isoDataCivil(periodo.inicio)}–${dataIso} (${pedidos.length} entrega(s))`,
      prazoBoletoDias: prazo,
      tipoPagamento: cfg.tipoPagamentoPadrao || "BOLETO_BANCARIO",
      idContaFinanceira: cfg.idContaFinanceira,
    });

    let boleto: BoletoEmitidoCa | null = null;
    let boletoErro: string | null = null;
    if ((cfg.tipoPagamentoPadrao || "BOLETO_BANCARIO") === "BOLETO_BANCARIO") {
      try {
        boleto = await emitirBoletoDaVenda(http, {
          vendaId: created.id,
          contaBancaria: cfg.idContaFinanceira,
          dataVencimento: created.dataVencimento,
          descricaoFatura: `Venda acumulada ${created.numero} — ${cliente?.nome ?? ""}`.trim(),
          descontoPercentual: num(regra?.descontoBoletoPercentual),
        });
      } catch (err) {
        boletoErro = err instanceof Error ? err.message : String(err);
        logger.warn(
          { err, vendaId: created.id },
          "Conta Azul: venda acumulada ok, falha ao emitir boleto",
        );
      }
    }

    const local = await gravarPedidoLocalAposEnvio(prisma, {
      externalId: created.id,
      clienteId: cliente!.id,
      dataPedido: periodo.fim,
      itens,
      frete,
      statusPedido: "EM_ANDAMENTO",
      numeroVenda: String(created.numero),
    });

    await prisma.pedidoOperacional.updateMany({
      where: { id: { in: ids } },
      data: {
        statusEnvioContaAzul: "ENVIADO_VENDA",
        contaAzulEnvioExternalId: created.id,
        enviadoContaAzulEm: new Date(),
        ultimoErroEnvioCa: boletoErro ? boletoErro.slice(0, 2000) : null,
        pedidoContaAzulId: local.id,
        statusConciliacao: "CONCILIADO",
      },
    });

    await prisma.pedidoConciliacaoEvento.create({
      data: {
        pedidoContaAzulId: local.id,
        tipo: "ENVIO_CA_VENDA_ACUMULO",
        depois: {
          externalId: created.id,
          pedidoOperacionalIds: ids,
          periodo: {
            inicio: isoDataCivil(periodo.inicio),
            fim: dataIso,
          },
          boleto: boleto ?? undefined,
          boletoErro: boletoErro ?? undefined,
        },
      },
    });

    await prisma.execucaoApi.create({
      data: {
        acaoApi: "ENVIO_CA",
        statusExecucao: "SUCESSO",
        detalhesExecucao: {
          modo: "VENDA_ACUMULO",
          externalId: created.id,
          pedidos: ids.length,
          boletoId: boleto?.id,
          boletoErro: boletoErro ?? undefined,
        },
      },
    });

    return {
      externalId: created.id,
      pedidoContaAzulLocalId: local.id,
      pedidosAtualizados: ids.length,
      periodo: {
        inicio: isoDataCivil(periodo.inicio),
        fim: dataIso,
      },
      boleto,
      boletoErro,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.pedidoOperacional.updateMany({
      where: { id: { in: ids } },
      data: {
        statusEnvioContaAzul: "ERRO",
        ultimoErroEnvioCa: msg.slice(0, 2000),
      },
    });
    throw e;
  }
}
