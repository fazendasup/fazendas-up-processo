import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CLIENTES_ACUMULO_ALLOWLIST_LABELS,
  clientePodeAcumularPedidos,
} from "@shared/clientesAcumuloPedidos";
import { OrigemPedido, Prisma } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "../lib/composicao-valor.js";
import {
  ESTOQUE_MIX_FOLHA_PADRAO,
  buildEstoqueVivoDia,
  normalizeEstoqueMixFolhaLeve,
  previewMixEstoqueVivo,
  type ConfigProdutoEstoque,
  type EstoqueVivoMixCfg,
  type LinhaPedidoEstoque,
} from "../lib/estoque-vivo.js";
import { classificarStatusPedido } from "../lib/pedido-status.js";
import {
  assertSemanaAnteriorFechada,
  calcularStatusSemana,
} from "../lib/fechamento.js";
import { obterBloqueioSemanaComReparo } from "../lib/fechamento-gate.js";
import { calcularConciliacaoSemanal } from "../lib/conciliacao-semanal.js";
import { repararConciliacaoSemana, usuarioReparo } from "../lib/conciliacao-semana-reparo.js";
import { comRecuperacaoEspacoMysql, liberarEspacoComercial } from "../lib/mysql-espaco.js";
import { fimSemana, GO_LIVE_PEDIDOS, inicioSemana, semanaIgnoraConciliacaoFechamento } from "../lib/semana.js";
import {
  comercialProcedure,
  comercialRequirePerfis,
  router,
} from "../../_core/trpc";
import {
  aplicarCorrecaoConciliacao,
  aplicarCorrecaoAgregadaConciliacao,
  calcularDivergencias,
  calcularDivergenciasAgregadas,
  clienteAcumulaFaturamento,
  confirmarVinculoConciliacao,
  confirmarVinculoMultiploConciliacao,
  janelaCandidatosVinculo,
  opcoesCalcularDivergencias,
  opcoesCalcularDivergenciasParaPar,
  reconciliarDivergenciasAcumuloEsperadas,
  REGRA_ENTREGA_CONCILIACAO_SELECT,
  criarOperacionalDeVenda,
  desvincularConciliacao,
  diasEntrePedidos,
  documentoContaAzulConciliavel,
  ignorarVendaContaAzul,
  manterOperacionalComoVerdade,
  marcarVendaErrada,
  scoreCandidatoVinculoManual,
  scoreSugestaoVinculo,
} from "../lib/conciliacao-pedidos.js";
import { acumulaPedidosEfetivo, desligarAcumuloForaAllowlist } from "../lib/clientes-acumulo-cleanup.js";
import {
  criarIndiceProdutosOperacionais,
  criarResolverChaveItemConciliacao,
  listarProdutosFaltantesVenda,
} from "../lib/produto-operacional.js";
import {
  importarProdutosParaOperacao,
  iniciarSincronizacaoCatalogoProdutosEmBackground,
} from "../integrations/conta-azul/produtos-sync.service.js";
const podeConfigurarEstoqueVivo = comercialRequirePerfis(
  "ADMIN",
  "GERENTE_COMERCIAL",
  "COMERCIAL",
  "OPERACOES"
);

const STATUS_PEDIDO = ["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"] as const;
const statusSchema = z.enum(["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"]);
const tipoVendaSchema = z.enum([
  "RECORRENTE_SEMANAL",
  "RECORRENTE_QUINZENAL",
  "PLANO",
  "AVULSO",
]);
const periodoEntregaSchema = z.enum(["MANHA", "TARDE"]).nullable().optional();
const modoCompraSchema = z.enum(["UNIDADE", "KG"]);

function deveOcultarValores(ctx: {
  comercialUsuario?: { perfil?: string } | null;
}): boolean {
  return ctx.comercialUsuario?.perfil === "LIDER_COLHEITA";
}

function ocultarValoresPedido<T extends Record<string, any>>(pedido: T): T {
  return {
    ...pedido,
    itens: (pedido.itens ?? []).map((item: any) => ({
      ...item,
      precoUnit: null,
      produto: item.produto
        ? { ...item.produto, precoBase: null }
        : item.produto,
    })),
    cliente: pedido.cliente?.regraComercial
      ? {
          ...pedido.cliente,
          regraComercial: {
            ...pedido.cliente.regraComercial,
            valorTaxaEntrega: null,
            descontoBoletoPercentual: null,
            precosEspeciais: [],
          },
        }
      : pedido.cliente,
    pedidoContaAzul: pedido.pedidoContaAzul
      ? { ...pedido.pedidoContaAzul, valorLiquido: null, valorTotal: null }
      : pedido.pedidoContaAzul,
  };
}

function ocultarValoresConciliacaoCliente<T extends Record<string, any>>(
  row: T
): T {
  return {
    ...row,
    operacional: row.operacional
      ? { ...row.operacional, valorEstimado: null }
      : row.operacional,
    contaAzul: row.contaAzul
      ? {
          ...row.contaAzul,
          valorLiquido: null,
          valorGerencial: null,
          descontoBoletoValor: null,
        }
      : row.contaAzul,
    diffValor: null,
  };
}

type RegraOrdenacaoEntrega = {
  periodoEntrega?: string | null;
  horarioMaximoEntrega?: string | null;
};

function minutosDoHorario(horario: string | null | undefined): number | null {
  if (!horario) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(horario.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (
    !Number.isInteger(horas) ||
    !Number.isInteger(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }
  return horas * 60 + minutos;
}

function prioridadeEntregaAutomatica(
  regra: RegraOrdenacaoEntrega | null | undefined
): number {
  const periodoBase =
    regra?.periodoEntrega === "MANHA"
      ? 0
      : regra?.periodoEntrega === "TARDE"
        ? 12 * 60
        : 24 * 60;
  return minutosDoHorario(regra?.horarioMaximoEntrega) ?? periodoBase;
}

function compararEntregaPorRegra(
  a: {
    cliente?: {
      nome?: string | null;
      regraComercial?: RegraOrdenacaoEntrega | null;
    } | null;
    criadoEm?: Date;
  },
  b: {
    cliente?: {
      nome?: string | null;
      regraComercial?: RegraOrdenacaoEntrega | null;
    } | null;
    criadoEm?: Date;
  }
): number {
  const prioridadeA = prioridadeEntregaAutomatica(a.cliente?.regraComercial);
  const prioridadeB = prioridadeEntregaAutomatica(b.cliente?.regraComercial);
  if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
  const nomeA = a.cliente?.nome ?? "";
  const nomeB = b.cliente?.nome ?? "";
  const porNome = nomeA.localeCompare(nomeB, "pt-BR");
  if (porNome !== 0) return porNome;
  return (a.criadoEm?.getTime() ?? 0) - (b.criadoEm?.getTime() ?? 0);
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

function inicioComCortePedidos(d: Date): Date {
  const inicio = inicioDia(d);
  return inicio.getTime() < CORTE_INICIO_PEDIDOS.getTime()
    ? new Date(CORTE_INICIO_PEDIDOS)
    : inicio;
}

function intervaloComCortePedidos(
  inicio: Date,
  fim: Date
): { inicio: Date; fim: Date; vazio: boolean } {
  const outInicio = inicioComCortePedidos(inicio);
  const outFim = fimDia(fim);
  return {
    inicio: outInicio,
    fim: outFim,
    vazio: outFim.getTime() < outInicio.getTime(),
  };
}

function adicionarDias(d: Date, dias: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + dias);
  return out;
}

function diaSemana(d: Date): number {
  return d.getDay();
}

function money(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type MixEstoqueDb = {
  id: string;
  nome: string;
  produtoReferenciaId: string;
  perdaPercentual: unknown;
  ativo: boolean;
  produtoReferencia: { id: string; nome: string };
  componentes: Array<{
    produtoId: string;
    quantidade: unknown;
    produto: { id: string; nome: string };
  }>;
};

function mapMixEstoqueDbParaCfg(row: MixEstoqueDb): EstoqueVivoMixCfg {
  return {
    id: row.id,
    nome: row.nome,
    produtoReferenciaId: row.produtoReferenciaId,
    produtoReferenciaNome: row.produtoReferencia.nome,
    perdaPercentual: money(row.perdaPercentual) ?? 0,
    ativo: row.ativo,
    componentes: row.componentes.map(c => ({
      produtoId: c.produtoId,
      produtoNome: c.produto.nome,
      quantidade: money(c.quantidade) ?? 0,
    })),
  };
}

const mixEstoqueInclude = {
  produtoReferencia: { select: { id: true, nome: true } },
  componentes: {
    include: { produto: { select: { id: true, nome: true } } },
    orderBy: { produto: { nome: "asc" as const } },
  },
} satisfies Prisma.EstoqueVivoMixInclude;

const mixEstoqueComponenteSchema = z.object({
  produtoId: z.string().min(1),
  quantidade: z.number().positive(),
});

const salvarMixEstoqueSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1),
  produtoReferenciaId: z.string().min(1),
  perdaPercentual: z.number().min(0).max(99.99).default(0),
  ativo: z.boolean().default(true),
  componentes: z.array(mixEstoqueComponenteSchema).min(1),
});

async function registrarAuditoria(
  prisma: PrismaClient | Prisma.TransactionClient,
  pedidoId: string,
  usuario: { id: string; nome: string },
  acao: string,
  antes: unknown,
  depois: unknown
) {
  await prisma.pedidoOperacionalAuditoria.create({
    data: {
      pedidoId,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      acao,
      antes: antes == null ? undefined : (antes as Prisma.InputJsonValue),
      depois: depois == null ? undefined : (depois as Prisma.InputJsonValue),
    },
  });
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function alertasAvariasDepoisPedidoOrigem(
  prisma: PrismaClient,
  pedidos: Array<{
    id: string;
    contaAzulCustomerId: string;
    dataEntrega: Date;
    criadoEm: Date;
  }>
) {
  if (pedidos.length === 0) return new Map<string, unknown>();

  const auditoriasCopia = await prisma.pedidoOperacionalAuditoria.findMany({
    where: {
      pedidoId: { in: pedidos.map(p => p.id) },
      acao: {
        in: ["pedido_copiado_semana_anterior", "pedido_copiado_para_dia"],
      },
    },
    select: { pedidoId: true, depois: true },
    orderBy: { criadoEm: "desc" },
  });

  const origemPorPedido = new Map<string, string>();
  for (const auditoria of auditoriasCopia) {
    if (origemPorPedido.has(auditoria.pedidoId)) continue;
    const depois = jsonObject(auditoria.depois);
    const pedidoOrigemId =
      typeof depois?.pedidoOrigemId === "string" ? depois.pedidoOrigemId : null;
    if (pedidoOrigemId) origemPorPedido.set(auditoria.pedidoId, pedidoOrigemId);
  }
  if (origemPorPedido.size === 0) return new Map<string, unknown>();

  const pedidosOrigem = await prisma.pedidoOperacional.findMany({
    where: { id: { in: Array.from(origemPorPedido.values()) } },
    select: {
      id: true,
      contaAzulCustomerId: true,
      dataEntrega: true,
      criadoEm: true,
    },
  });
  const origemPorId = new Map(pedidosOrigem.map(p => [p.id, p]));

  const criterios = pedidos
    .map(pedido => {
      const origemId = origemPorPedido.get(pedido.id);
      const origem = origemId ? origemPorId.get(origemId) : null;
      if (!origem) return null;
      return {
        contaAzulCustomerId: pedido.contaAzulCustomerId,
        criadoEm: { gt: origem.criadoEm },
        dataEntrega: {
          gte: inicioDia(origem.dataEntrega),
          lte: fimDia(pedido.dataEntrega),
        },
      };
    })
    .filter(Boolean) as Prisma.PedidoOperacionalAvariaWhereInput[];
  if (criterios.length === 0) return new Map<string, unknown>();

  const avarias = await prisma.pedidoOperacionalAvaria.findMany({
    where: { OR: criterios },
    include: { criadoPor: { select: { nome: true, email: true } } },
    orderBy: [{ dataEntrega: "desc" }, { criadoEm: "desc" }],
  });

  const alertas = new Map<string, unknown>();
  for (const pedido of pedidos) {
    const origemId = origemPorPedido.get(pedido.id);
    const origem = origemId ? origemPorId.get(origemId) : null;
    if (!origem) continue;
    const avariasPedido = avarias.filter(
      a =>
        a.contaAzulCustomerId === pedido.contaAzulCustomerId &&
        a.criadoEm > origem.criadoEm &&
        a.dataEntrega >= inicioDia(origem.dataEntrega) &&
        a.dataEntrega <= fimDia(pedido.dataEntrega)
    );
    if (avariasPedido.length === 0) continue;

    const quantidadeTotal = avariasPedido.reduce(
      (sum, a) => sum + (Number(a.quantidade ?? 0) || 0),
      0
    );
    alertas.set(pedido.id, {
      pedidoOrigemId: origem.id,
      dataPedidoBase: origem.dataEntrega,
      criadoEmPedidoBase: origem.criadoEm,
      quantidadeTotal,
      lancamentos: avariasPedido.slice(0, 5).map(a => ({
        id: a.id,
        dataEntrega: a.dataEntrega,
        produtoId: a.produtoId,
        produtoNome: a.produtoNome,
        categoria: a.categoria,
        quantidade: Number(a.quantidade ?? 0) || 0,
        observacoes: a.observacoes,
        criadoPor: a.criadoPor,
      })),
    });
  }

  return alertas;
}

const itemPedidoInput = z.object({
  produtoId: z.string().min(1, "Produto é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  observacoes: z.string().optional(),
});

const avariaPedidoInput = z.object({
  produtoId: z.string().min(1, "Variedade da avaria é obrigatória"),
  quantidade: z
    .number()
    .positive("Quantidade de avaria deve ser maior que zero"),
  observacoes: z.string().optional(),
});

const nullablePositiveNumber = z.preprocess(value => {
  if (value === "" || value == null) return null;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return normalized === "" ? null : Number(normalized);
  }
  return value;
}, z.number().positive().nullable().optional());

const nullableNonNegativeNumber = z.preprocess(value => {
  if (value === "" || value == null) return null;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return normalized === "" ? null : Number(normalized);
  }
  return value;
}, z.number().nonnegative().nullable().optional());

const nullableNonNegativeInt = z.preprocess(value => {
  if (value === "" || value == null) return null;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return normalized === "" ? null : Number(normalized);
  }
  return value;
}, z.number().int().nonnegative().nullable().optional());

const nullableStringArray = z.array(z.string()).nullable().optional();

const produtoInput = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, "Nome do produto é obrigatório"),
  precoBase: z.number().nonnegative().nullable().optional(),
  categoria: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
  modoCompra: modoCompraSchema.default("UNIDADE"),
  fatorCompraUnidade: nullablePositiveNumber,
  rendimentoPorKg: nullablePositiveNumber,
  ocultoListaCompra: z.boolean().default(false),
  mixAtivo: z.boolean().default(false),
  mixFolhaLeve: z.boolean().default(false),
  mixProdutoReferenciaId: z.string().nullable().optional(),
  mixVariedades: nullableStringArray,
});

export const pedidosRouter = router({
  me: comercialProcedure.query(({ ctx }) => ({
    id: ctx.comercialUsuario.id,
    nome: ctx.comercialUsuario.nome,
    perfil: ctx.comercialUsuario.perfil,
  })),

  clientes: comercialProcedure
    .input(
      z.object({
        busca: z.string().optional(),
        dia: z.coerce.date().optional(),
        limite: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereBusca = input.busca?.trim()
        ? {
            OR: [
              { nome: { contains: input.busca.trim() } },
              { cnpjCpf: { contains: input.busca.trim() } },
              { externalId: { contains: input.busca.trim() } },
              { telefoneWhatsapp: { contains: input.busca.trim() } },
            ],
          }
        : {};
      const idsNoDia =
        input.dia && !antesDoCortePedidos(input.dia)
          ? await ctx.prisma!.pedidoOperacional.findMany({
              where: {
                dataEntrega: {
                  gte: inicioComCortePedidos(input.dia),
                  lte: fimDia(input.dia),
                },
              },
              select: { contaAzulCustomerId: true },
              distinct: ["contaAzulCustomerId"],
            })
          : null;

      return ctx.prisma!.cliente.findMany({
        where: {
          externalId: {
            not: null,
            ...(idsNoDia
              ? { in: idsNoDia.map(r => r.contaAzulCustomerId) }
              : {}),
          },
          ...whereBusca,
        },
        orderBy: { nome: "asc" },
        take: input.limite,
        select: {
          id: true,
          externalId: true,
          nome: true,
          cnpjCpf: true,
          contatoPrincipal: true,
          emailPrincipal: true,
          telefoneWhatsapp: true,
        },
      });
    }),

  contextoCliente: comercialProcedure
    .input(z.object({ contaAzulCustomerId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const cliente = await ctx.prisma!.cliente.findUnique({
        where: { externalId: input.contaAzulCustomerId },
        select: {
          id: true,
          externalId: true,
          nome: true,
          cnpjCpf: true,
          contatoPrincipal: true,
          emailPrincipal: true,
          telefoneWhatsapp: true,
        },
      });
      if (!cliente)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente Conta Azul não encontrado",
        });
      const regra = await ctx.prisma!.regraComercialCliente.findUnique({
        where: { contaAzulCustomerId: input.contaAzulCustomerId },
        include: { precosEspeciais: { include: { produto: true } } },
      });
      const regraEfetiva = regra
        ? {
            ...regra,
            acumulaPedidos: acumulaPedidosEfetivo(regra.acumulaPedidos, cliente.nome),
          }
        : regra;
      if (deveOcultarValores(ctx)) {
        const regraSemValores = regraEfetiva
          ? {
              ...regraEfetiva,
              valorTaxaEntrega: null,
              descontoBoletoPercentual: null,
              precosEspeciais: [],
            }
          : regraEfetiva;
        return { cliente, regra: regraSemValores, semRegras: !regra };
      }
      return { cliente, regra: regraEfetiva, semRegras: !regra };
    }),

  avisoAvariasCliente: comercialProcedure
    .input(
      z.object({
        contaAzulCustomerId: z.string().min(1),
        dia: z.coerce.date(),
        janelaDias: z.number().int().min(1).max(60).default(14),
      })
    )
    .query(async ({ ctx, input }) => {
      const fim = fimDia(input.dia);
      const inicio = inicioDia(
        adicionarDias(input.dia, -(input.janelaDias - 1))
      );
      const dataPedidoBase = inicioDia(adicionarDias(input.dia, -7));
      const pedidoBase = await ctx.prisma!.pedidoOperacional.findFirst({
        where: {
          contaAzulCustomerId: input.contaAzulCustomerId,
          dataEntrega: { gte: dataPedidoBase, lte: fimDia(dataPedidoBase) },
          status: { not: "CANCELADO" },
        },
        select: { id: true, dataEntrega: true, criadoEm: true },
        orderBy: { criadoEm: "desc" },
      });
      const avarias = await ctx.prisma!.pedidoOperacionalAvaria.findMany({
        where: {
          contaAzulCustomerId: input.contaAzulCustomerId,
          dataEntrega: {
            gte: pedidoBase ? inicioDia(pedidoBase.dataEntrega) : inicio,
            lte: fim,
          },
          ...(pedidoBase ? { criadoEm: { gt: pedidoBase.criadoEm } } : {}),
        },
        include: {
          criadoPor: { select: { nome: true, email: true } },
          pedido: { select: { id: true, status: true, tipoVenda: true } },
        },
        orderBy: [{ dataEntrega: "desc" }, { criadoEm: "desc" }],
      });

      const resumoPorProduto = new Map<
        string,
        {
          produtoId: string;
          produtoNome: string;
          categoria: string | null;
          quantidade: number;
        }
      >();
      let quantidadeTotal = 0;
      for (const avaria of avarias) {
        const quantidade = Number(avaria.quantidade ?? 0) || 0;
        quantidadeTotal += quantidade;
        const atual = resumoPorProduto.get(avaria.produtoId) ?? {
          produtoId: avaria.produtoId,
          produtoNome: avaria.produtoNome,
          categoria: avaria.categoria,
          quantidade: 0,
        };
        atual.quantidade += quantidade;
        resumoPorProduto.set(avaria.produtoId, atual);
      }

      return {
        janelaDias: input.janelaDias,
        inicio,
        fim,
        criterio: pedidoBase ? "APOS_PEDIDO_SEMANA_ANTERIOR" : "JANELA_RECENTE",
        pedidoBase,
        possuiAvarias: avarias.length > 0,
        quantidadeTotal,
        produtos: Array.from(resumoPorProduto.values()).sort(
          (a, b) =>
            b.quantidade - a.quantidade ||
            a.produtoNome.localeCompare(b.produtoNome, "pt-BR")
        ),
        lancamentos: avarias.map(a => ({
          id: a.id,
          pedidoId: a.pedidoId,
          dataEntrega: a.dataEntrega,
          produtoId: a.produtoId,
          produtoNome: a.produtoNome,
          categoria: a.categoria,
          quantidade: Number(a.quantidade ?? 0) || 0,
          observacoes: a.observacoes,
          criadoPor: a.criadoPor,
          pedido: a.pedido,
        })),
      };
    }),

  produtos: comercialProcedure
    .input(
      z
        .object({
          incluirInativos: z.boolean().default(false),
          apenasOperacao: z.boolean().default(true),
          busca: z.string().optional(),
        })
        .default({ incluirInativos: false, apenasOperacao: true })
    )
    .query(async ({ ctx, input }) => {
      const produtos = await ctx.prisma!.produtoComercial.findMany({
        where: {
          ...(input.apenasOperacao
            ? {
                contaAzulProdutoId: { not: null },
                importadoOperacao: true,
                ativo: true,
              }
            : input.incluirInativos
              ? { contaAzulProdutoId: { not: null } }
              : { contaAzulProdutoId: { not: null }, ativo: true }),
          ...(input.busca?.trim()
            ? { nome: { contains: input.busca.trim() } }
            : {}),
        },
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
        include: { _count: { select: { itensPedido: true } } },
      });
      return produtos.map(p => ({
        ...p,
        precoBase: deveOcultarValores(ctx) ? null : p.precoBase,
        usoPedidos: p._count.itensPedido,
      }));
    }),

  catalogoContaAzul: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z
        .object({
          busca: z.string().optional(),
          apenasDisponiveis: z.boolean().default(true),
          somenteAtivosContaAzul: z.boolean().default(true),
        })
        .default({ apenasDisponiveis: true, somenteAtivosContaAzul: true })
    )
    .query(async ({ ctx, input }) => {
      const produtos = await ctx.prisma!.produtoComercial.findMany({
        where: {
          contaAzulProdutoId: { not: null },
          // Disponíveis = ainda não estão ativos na operação (nunca importados
          // ou desativados). Antes só `importadoOperacao: false` escondia itens
          // desativados com a flag ainda true — sem caminho para reativar.
          ...(input.apenasDisponiveis
            ? {
                OR: [{ importadoOperacao: false }, { ativo: false }],
              }
            : {}),
          ...(input.somenteAtivosContaAzul ? { statusContaAzul: "ATIVO" } : {}),
          ...(input.busca?.trim()
            ? { nome: { contains: input.busca.trim() } }
            : {}),
        },
        orderBy: [{ nome: "asc" }],
      });
      return produtos;
    }),

  sincronizarCatalogoContaAzul: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .mutation(async ({ ctx }) => {
      if (!ctx.comercialEnv) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ambiente comercial indisponível.",
        });
      }
      const r = iniciarSincronizacaoCatalogoProdutosEmBackground(
        ctx.prisma!,
        ctx.comercialEnv
      );
      if (r.status === "already_running") {
        return r;
      }
      return r;
    }),

  importarProdutosContaAzul: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(z.object({ produtoIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ ctx, input }) =>
      importarProdutosParaOperacao(ctx.prisma!, input.produtoIds)
    ),

  salvarProduto: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(produtoInput)
    .mutation(async ({ ctx, input }) => {
      if (!input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Produtos devem ser importados do catálogo Conta Azul. Sincronize e selecione os itens na aba Produtos.",
        });
      }
      const existente = await ctx.prisma!.produtoComercial.findUnique({
        where: { id: input.id },
      });
      if (!existente)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produto não encontrado.",
        });
      if (!existente.contaAzulProdutoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Este produto não veio do Conta Azul e não pode ser usado na operação.",
        });
      }
      const data = {
        nome: existente.nome,
        precoBase:
          input.precoBase == null ? null : new Prisma.Decimal(input.precoBase),
        categoria: input.categoria?.trim() || null,
        ativo: input.ativo,
        modoCompra: input.modoCompra,
        fatorCompraUnidade:
          input.fatorCompraUnidade == null
            ? null
            : new Prisma.Decimal(input.fatorCompraUnidade),
        rendimentoPorKg:
          input.rendimentoPorKg == null
            ? null
            : new Prisma.Decimal(input.rendimentoPorKg),
        ocultoListaCompra: input.ocultoListaCompra,
        mixAtivo: input.mixAtivo,
        mixFolhaLeve: input.mixFolhaLeve,
        mixProdutoReferenciaId: input.mixProdutoReferenciaId || null,
        mixVariedades: input.mixVariedades
          ? (input.mixVariedades as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      };
      return ctx.prisma!.produtoComercial.update({
        where: { id: input.id },
        data,
      });
    }),

  excluirProduto: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const usos = await ctx.prisma!.pedidoOperacionalItem.count({
        where: { produtoId: input.id },
      });
      if (usos > 0) {
        // Volta ao catálogo "Disponíveis" para poder reativar depois.
        return ctx.prisma!.produtoComercial.update({
          where: { id: input.id },
          data: { ativo: false, importadoOperacao: false },
        });
      }
      return ctx.prisma!.produtoComercial.delete({ where: { id: input.id } });
    }),

  salvarRegraCliente: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        contaAzulCustomerId: z.string().min(1),
        observacoesGerais: z.string().nullable().optional(),
        tipoVendaPadrao: tipoVendaSchema.nullable().optional(),
        periodoEntrega: periodoEntregaSchema,
        horarioMaximoEntrega: z.string().nullable().optional(),
        cobraTaxaEntrega: z.boolean().default(false),
        valorTaxaEntrega: nullableNonNegativeNumber,
        prazoBoletoDias: nullableNonNegativeInt,
        descontoBoletoPercentual: z.preprocess(
          (value) => {
            if (value === "" || value == null) return null;
            if (typeof value === "string") {
              const normalized = value.trim().replace(",", ".");
              return normalized === "" ? null : Number(normalized);
            }
            return value;
          },
          z.number().min(0).max(100).nullable().optional(),
        ),
        acumulaPedidos: z.boolean().default(false),
        diasAcumulo: nullableNonNegativeInt,
        prazoBoletoAcumuloDias: nullableNonNegativeInt,
        precosEspeciais: z
          .array(
            z.object({ produtoId: z.string(), preco: z.number().nonnegative() })
          )
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      const cliente = await ctx.prisma!.cliente.findUnique({
        where: { externalId: input.contaAzulCustomerId },
      });
      if (!cliente)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente Conta Azul não encontrado",
        });
      if (input.acumulaPedidos && !clientePodeAcumularPedidos(cliente.nome)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Acúmulo de pedidos só é permitido para: ${CLIENTES_ACUMULO_ALLOWLIST_LABELS.join(", ")}.`,
        });
      }
      return ctx.prisma!.$transaction(async tx => {
        const regra = await tx.regraComercialCliente.upsert({
          where: { contaAzulCustomerId: input.contaAzulCustomerId },
          create: {
            contaAzulCustomerId: input.contaAzulCustomerId,
            observacoesGerais: input.observacoesGerais?.trim() || null,
            tipoVendaPadrao: input.tipoVendaPadrao ?? null,
            periodoEntrega: input.periodoEntrega ?? null,
            horarioMaximoEntrega: input.horarioMaximoEntrega || null,
            cobraTaxaEntrega: input.cobraTaxaEntrega,
            valorTaxaEntrega:
              input.cobraTaxaEntrega && input.valorTaxaEntrega != null
                ? new Prisma.Decimal(input.valorTaxaEntrega)
                : null,
            prazoBoletoDias: input.prazoBoletoDias ?? null,
            descontoBoletoPercentual:
              input.descontoBoletoPercentual == null
                ? null
                : new Prisma.Decimal(input.descontoBoletoPercentual),
            acumulaPedidos: input.acumulaPedidos,
            diasAcumulo: input.diasAcumulo ?? null,
            prazoBoletoAcumuloDias: input.prazoBoletoAcumuloDias ?? null,
          },
          update: {
            observacoesGerais: input.observacoesGerais?.trim() || null,
            tipoVendaPadrao: input.tipoVendaPadrao ?? null,
            periodoEntrega: input.periodoEntrega ?? null,
            horarioMaximoEntrega: input.horarioMaximoEntrega || null,
            cobraTaxaEntrega: input.cobraTaxaEntrega,
            valorTaxaEntrega:
              input.cobraTaxaEntrega && input.valorTaxaEntrega != null
                ? new Prisma.Decimal(input.valorTaxaEntrega)
                : null,
            prazoBoletoDias: input.prazoBoletoDias ?? null,
            descontoBoletoPercentual:
              input.descontoBoletoPercentual == null
                ? null
                : new Prisma.Decimal(input.descontoBoletoPercentual),
            acumulaPedidos: input.acumulaPedidos,
            diasAcumulo: input.diasAcumulo ?? null,
            prazoBoletoAcumuloDias: input.prazoBoletoAcumuloDias ?? null,
          },
        });
        await tx.precoEspecialCliente.deleteMany({
          where: { regraId: regra.id },
        });
        if (input.precosEspeciais.length > 0) {
          await tx.precoEspecialCliente.createMany({
            data: input.precosEspeciais.map(p => ({
              regraId: regra.id,
              produtoId: p.produtoId,
              preco: new Prisma.Decimal(p.preco),
            })),
          });
        }
        return tx.regraComercialCliente.findUnique({
          where: { id: regra.id },
          include: { precosEspeciais: { include: { produto: true } } },
        });
      });
    }),

  agenda: comercialProcedure
    .input(
      z.object({
        dia: z.coerce.date().optional(),
        contaAzulCustomerId: z.string().optional(),
        busca: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.dia && antesDoCortePedidos(input.dia)) return [];
      const whereDia = input.dia
        ? {
            dataEntrega: {
              gte: inicioComCortePedidos(input.dia),
              lte: fimDia(input.dia),
            },
          }
        : { dataEntrega: { gte: CORTE_INICIO_PEDIDOS } };
      const busca = input.busca?.trim();
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: {
          ...whereDia,
          ...(input.contaAzulCustomerId
            ? { contaAzulCustomerId: input.contaAzulCustomerId }
            : {}),
          ...(busca
            ? {
                OR: [
                  { observacoes: { contains: busca } },
                  { cliente: { nome: { contains: busca } } },
                  { itens: { some: { produtoNome: { contains: busca } } } },
                  { itens: { some: { categoria: { contains: busca } } } },
                ],
              }
            : {}),
        },
        orderBy: [
          { dataEntrega: "asc" },
          { cliente: { nome: "asc" } },
          { criadoEm: "desc" },
        ],
        include: {
          cliente: { include: { regraComercial: true } },
          itens: { include: { produto: true } },
          avarias: {
            include: {
              produto: true,
              criadoPor: { select: { nome: true, email: true } },
            },
          },
          criadoPor: { select: { nome: true, email: true } },
          editadoPor: { select: { nome: true, email: true } },
        },
      });
      const alertas = await alertasAvariasDepoisPedidoOrigem(
        ctx.prisma!,
        pedidos
      );
      return pedidos.sort(compararEntregaPorRegra).map(pedido => ({
        ...(deveOcultarValores(ctx) ? ocultarValoresPedido(pedido) : pedido),
        alertaAvariasPendentes: alertas.get(pedido.id) ?? null,
      }));
    }),

  salvarPedido: comercialProcedure
    .input(
      z.object({
        id: z.string().optional(),
        contaAzulCustomerId: z.string().min(1, "Cliente é obrigatório"),
        dataEntrega: z.coerce.date(),
        tipoVenda: tipoVendaSchema,
        observacoes: z.string().optional(),
        freteCortesia: z.boolean().optional(),
        itens: z.array(itemPedidoInput).default([]),
        avarias: z.array(avariaPedidoInput).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      if (antesDoCortePedidos(input.dataEntrega)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedidos operacionais começam em 01/06/2026.",
        });
      }
      const cliente = await ctx.prisma!.cliente.findUnique({
        where: { externalId: input.contaAzulCustomerId },
      });
      if (!cliente)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente Conta Azul não encontrado",
        });
      // Gate de fechamento semanal desativado — criação liberada mesmo com semana anterior aberta.
      if (!input.id) {
        await assertSemanaAnteriorFechada(ctx.prisma!, input.dataEntrega);
      }
      if (input.itens.length === 0 && input.avarias.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe pelo menos um produto ou uma avaria",
        });
      }
      const produtoIds = Array.from(
        new Set([
          ...input.itens.map(i => i.produtoId),
          ...input.avarias.map(a => a.produtoId),
        ])
      );
      const produtos = await ctx.prisma!.produtoComercial.findMany({
        where: {
          id: { in: produtoIds },
          ativo: true,
          importadoOperacao: true,
          contaAzulProdutoId: { not: null },
        },
      });
      if (produtos.length !== produtoIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Um ou mais produtos não existem, não estão ativos na operação ou não foram importados do Conta Azul.",
        });
      }
      const produtoMap = new Map(produtos.map(p => [p.id, p]));
      const regra = await ctx.prisma!.regraComercialCliente.findUnique({
        where: { contaAzulCustomerId: input.contaAzulCustomerId },
        include: { precosEspeciais: true },
      });
      const precoEspecial = new Map(
        (regra?.precosEspeciais ?? []).map(p => [p.produtoId, p.preco])
      );

      try {
        // Auditoria FORA da transação: se a tabela de log estiver cheia (1114),
        // a edição de itens/data não pode ser revertida — o dashboard precisa refletir o salvo.
        const antes = input.id
          ? await ctx.prisma!.pedidoOperacional.findUnique({
              where: { id: input.id },
              include: { itens: true, avarias: true },
            })
          : null;

        const salvo = await comRecuperacaoEspacoMysql(ctx.prisma!, () =>
          ctx.prisma!.$transaction(async tx => {
            const baseData = {
              clienteId: cliente.id,
              contaAzulCustomerId: input.contaAzulCustomerId,
              dataEntrega: inicioDia(input.dataEntrega),
              diaSemana: diaSemana(input.dataEntrega),
              tipoVenda: input.tipoVenda,
              observacoes: input.observacoes?.trim() || null,
              freteCortesia: input.freteCortesia ?? false,
              editadoPorId: usuario.id,
            };
            const pedido = input.id
              ? await tx.pedidoOperacional.update({
                  where: { id: input.id },
                  data: baseData,
                })
              : await tx.pedidoOperacional.create({
                  data: { ...baseData, criadoPorId: usuario.id },
                });
            if (input.id) {
              await tx.pedidoOperacionalItem.deleteMany({
                where: { pedidoId: pedido.id },
              });
              await tx.pedidoOperacionalAvaria.deleteMany({
                where: { pedidoId: pedido.id },
              });
            }
            if (input.itens.length > 0) {
              await tx.pedidoOperacionalItem.createMany({
                data: input.itens.map(item => {
                  const produto = produtoMap.get(item.produtoId)!;
                  const especial = precoEspecial.get(item.produtoId);
                  const preco = especial ?? produto.precoBase;
                  return {
                    pedidoId: pedido.id,
                    produtoId: produto.id,
                    produtoNome: produto.nome,
                    categoria: produto.categoria,
                    quantidade: new Prisma.Decimal(item.quantidade),
                    precoUnit: preco ?? null,
                    precoEspecial: Boolean(especial),
                    observacoes: item.observacoes?.trim() || null,
                  };
                }),
              });
            }
            if (input.avarias.length > 0) {
              await tx.pedidoOperacionalAvaria.createMany({
                data: input.avarias.map(avaria => {
                  const produto = produtoMap.get(avaria.produtoId)!;
                  return {
                    pedidoId: pedido.id,
                    clienteId: cliente.id,
                    contaAzulCustomerId: input.contaAzulCustomerId,
                    dataEntrega: inicioDia(input.dataEntrega),
                    produtoId: produto.id,
                    produtoNome: produto.nome,
                    categoria: produto.categoria,
                    quantidade: new Prisma.Decimal(avaria.quantidade),
                    observacoes: avaria.observacoes?.trim() || null,
                    criadoPorId: usuario.id,
                  };
                }),
              });
            }
            return tx.pedidoOperacional.findUnique({
              where: { id: pedido.id },
              include: { cliente: true, itens: true, avarias: true },
            });
          }),
        );

        if (salvo) {
          await registrarAuditoria(
            ctx.prisma!,
            salvo.id,
            { id: usuario.id, nome: usuario.nome },
            input.id ? "pedido_editado" : "pedido_criado",
            antes,
            { ...salvo, itens: input.itens, avarias: input.avarias },
          ).catch(err => {
            console.warn("[salvarPedido] auditoria ignorada:", err);
          });
        }
        return salvo;
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("1114") || /table ['`].+['`] is full/i.test(err.message))
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Banco comercial sem espaço em disco. Rode `npm run comercial:liberar-espaco -- --emergencia` no servidor e tente de novo.",
          });
        }
        throw err;
      }
    }),

  alterarDataPedido: comercialProcedure
    .input(
      z.object({
        pedidoId: z.string().min(1),
        dataEntrega: z.coerce.date(),
        moverClienteDia: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      if (antesDoCortePedidos(input.dataEntrega)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedidos operacionais começam em 01/06/2026.",
        });
      }

      const novaData = inicioDia(input.dataEntrega);
      const pedido = await ctx.prisma!.pedidoOperacional.findUnique({
        where: { id: input.pedidoId },
        include: { avarias: true },
      });
      if (!pedido)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado",
        });
      if (pedido.status === "CANCELADO") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível alterar a data de pedido cancelado.",
        });
      }
      if (inicioDia(pedido.dataEntrega).getTime() === novaData.getTime()) {
        return { success: true, unchanged: true };
      }

      await assertSemanaAnteriorFechada(ctx.prisma!, novaData);

      const dataAtual = inicioDia(pedido.dataEntrega);
      const pedidosAlvo = input.moverClienteDia
        ? await ctx.prisma!.pedidoOperacional.findMany({
            where: {
              contaAzulCustomerId: pedido.contaAzulCustomerId,
              dataEntrega: { gte: dataAtual, lte: fimDia(dataAtual) },
              status: { not: "CANCELADO" },
            },
            select: { id: true, dataEntrega: true, diaSemana: true },
          })
        : [
            {
              id: pedido.id,
              dataEntrega: pedido.dataEntrega,
              diaSemana: pedido.diaSemana,
            },
          ];
      const pedidosAlvoIds = pedidosAlvo.map(p => p.id);

      await ctx.prisma!.$transaction(async tx => {
        await tx.pedidoOperacional.updateMany({
          where: { id: { in: pedidosAlvoIds } },
          data: {
            dataEntrega: novaData,
            diaSemana: diaSemana(novaData),
            editadoPorId: usuario.id,
          },
        });
        await tx.pedidoOperacionalAvaria.updateMany({
          where: { pedidoId: { in: pedidosAlvoIds } },
          data: { dataEntrega: novaData },
        });
      });

      for (const pedidoAlvo of pedidosAlvo) {
        await registrarAuditoria(
          ctx.prisma!,
          pedidoAlvo.id,
          { id: usuario.id, nome: usuario.nome },
          "data_pedido_alterada",
          {
            dataEntrega: pedidoAlvo.dataEntrega,
            diaSemana: pedidoAlvo.diaSemana,
          },
          { dataEntrega: novaData, diaSemana: diaSemana(novaData) }
        ).catch(err => {
          console.warn("[alterarDataPedido] auditoria ignorada:", err);
        });
      }

      return {
        success: true,
        unchanged: false,
        pedidosMovidos: pedidosAlvoIds.length,
        dataEntrega: novaData,
      };
    }),

  /** Copia um único pedido operacional para a data escolhida (mantém o original). */
  copiarPedidoParaDia: comercialProcedure
    .input(
      z.object({
        pedidoId: z.string().min(1),
        dataEntrega: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      if (antesDoCortePedidos(input.dataEntrega)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedidos operacionais começam em 01/06/2026.",
        });
      }

      const dataDestino = inicioDia(input.dataEntrega);
      const pedidoOrigem = await ctx.prisma!.pedidoOperacional.findUnique({
        where: { id: input.pedidoId },
        include: { itens: true, cliente: { select: { nome: true } } },
      });
      if (!pedidoOrigem)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado",
        });
      if (pedidoOrigem.status === "CANCELADO") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível copiar pedido cancelado.",
        });
      }
      if (pedidoOrigem.itens.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedido sem itens para copiar.",
        });
      }

      try {
        const novoPedido = await comRecuperacaoEspacoMysql(ctx.prisma!, () =>
          ctx.prisma!.$transaction(async tx => {
            const criado = await tx.pedidoOperacional.create({
              data: {
                clienteId: pedidoOrigem.clienteId,
                contaAzulCustomerId: pedidoOrigem.contaAzulCustomerId,
                dataEntrega: dataDestino,
                diaSemana: diaSemana(dataDestino),
                tipoVenda: pedidoOrigem.tipoVenda,
                status: "PENDENTE",
                statusConciliacao: "PLANEJADO",
                observacoes: pedidoOrigem.observacoes,
                freteCortesia: pedidoOrigem.freteCortesia,
                prioridadeEntrega: pedidoOrigem.prioridadeEntrega,
                criadoPorId: usuario.id,
                editadoPorId: usuario.id,
              },
            });

            await tx.pedidoOperacionalItem.createMany({
              data: pedidoOrigem.itens.map(item => ({
                pedidoId: criado.id,
                produtoId: item.produtoId,
                produtoNome: item.produtoNome,
                categoria: item.categoria,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit,
                precoEspecial: item.precoEspecial,
                observacoes: item.observacoes,
              })),
            });

            await registrarAuditoria(
              tx as any,
              criado.id,
              { id: usuario.id, nome: usuario.nome },
              "pedido_copiado_para_dia",
              null,
              {
                pedidoOrigemId: pedidoOrigem.id,
                dataOrigem: pedidoOrigem.dataEntrega.toISOString(),
                dataDestino: dataDestino.toISOString(),
                clienteNome: pedidoOrigem.cliente?.nome ?? null,
              },
            );

            return criado;
          }),
        );

        return {
          success: true,
          pedidoId: novoPedido.id,
          dataEntrega: dataDestino,
          clienteNome: pedidoOrigem.cliente?.nome ?? pedidoOrigem.contaAzulCustomerId,
        };
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("1114") || /table ['`].+['`] is full/i.test(err.message))
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Banco comercial sem espaço em disco. Rode `npm run comercial:liberar-espaco -- --emergencia` no servidor e tente de novo.",
          });
        }
        throw err;
      }
    }),

  copiarSemanaAnterior: comercialProcedure
    .input(z.object({ dia: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });

      const semanaDestinoInicio = inicioSemana(input.dia);
      const semanaDestinoFim = fimSemana(input.dia);
      const semanaOrigemInicio = inicioSemana(
        adicionarDias(semanaDestinoInicio, -7)
      );
      const semanaOrigemFim = fimSemana(semanaOrigemInicio);

      if (semanaOrigemFim.getTime() < CORTE_INICIO_PEDIDOS.getTime()) {
        return {
          criados: 0,
          ignorados: 0,
          origem: semanaOrigemInicio,
          destino: semanaDestinoInicio,
          mensagem:
            "A semana anterior está antes do início operacional (01/06/2026).",
        };
      }

      // Gate de fechamento desativado — cópia liberada mesmo com semana anterior aberta.
      await assertSemanaAnteriorFechada(ctx.prisma!, semanaDestinoInicio);

      const [pedidosOrigem, clientesDestino, regrasOrigem] = await Promise.all([
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            dataEntrega: { gte: semanaOrigemInicio, lte: semanaOrigemFim },
            status: { not: "CANCELADO" },
          },
          include: { itens: true },
          orderBy: [
            { dataEntrega: "asc" },
            { prioridadeEntrega: "asc" },
            { criadoEm: "asc" },
          ],
        }),
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            dataEntrega: { gte: semanaDestinoInicio, lte: semanaDestinoFim },
          },
          select: { contaAzulCustomerId: true, dataEntrega: true },
        }),
        ctx.prisma!.regraComercialCliente.findMany({
          select: { contaAzulCustomerId: true, tipoVendaPadrao: true },
        }),
      ]);
      const tipoVendaPadraoPorCliente = new Map(
        regrasOrigem.map(regra => [regra.contaAzulCustomerId, regra.tipoVendaPadrao])
      );

      if (pedidosOrigem.length === 0) {
        return {
          criados: 0,
          ignorados: 0,
          origem: semanaOrigemInicio,
          destino: semanaDestinoInicio,
          mensagem:
            "Nenhum pedido de plano ou recorrente encontrado na semana anterior.",
        };
      }

      const destinoKey = (contaAzulCustomerId: string, data: Date) =>
        `${contaAzulCustomerId}:${inicioDia(data).toISOString().slice(0, 10)}`;
      const destinosJaExistentes = clientesDestino.map(p =>
        destinoKey(p.contaAzulCustomerId, p.dataEntrega)
      );

      // Um pedido por transação: evita undo log gigante. Limpeza pesada fica no endpoint /liberar.
      const clientesJaNoDestino = new Set(destinosJaExistentes);
      let criados = 0;
      let ignorados = 0;
      let falhasEspaco = 0;

      for (const pedidoOrigem of pedidosOrigem) {
        const tipoVendaDestino =
          tipoVendaPadraoPorCliente.get(pedidoOrigem.contaAzulCustomerId) ??
          pedidoOrigem.tipoVenda;
        if (tipoVendaDestino === "AVULSO") {
          ignorados++;
          continue;
        }
        const dataDestino = inicioDia(adicionarDias(pedidoOrigem.dataEntrega, 7));
        const keyDestino = destinoKey(pedidoOrigem.contaAzulCustomerId, dataDestino);
        if (clientesJaNoDestino.has(keyDestino)) {
          ignorados++;
          continue;
        }
        if (pedidoOrigem.itens.length === 0) {
          ignorados++;
          continue;
        }

        try {
          await ctx.prisma!.$transaction(async tx => {
            const novoPedido = await tx.pedidoOperacional.create({
              data: {
                clienteId: pedidoOrigem.clienteId,
                contaAzulCustomerId: pedidoOrigem.contaAzulCustomerId,
                dataEntrega: dataDestino,
                diaSemana: diaSemana(dataDestino),
                tipoVenda: tipoVendaDestino,
                status: "PENDENTE",
                statusConciliacao: "PLANEJADO",
                observacoes: pedidoOrigem.observacoes,
                freteCortesia: pedidoOrigem.freteCortesia,
                prioridadeEntrega: pedidoOrigem.prioridadeEntrega,
                criadoPorId: usuario.id,
                editadoPorId: usuario.id,
              },
            });

            await tx.pedidoOperacionalItem.createMany({
              data: pedidoOrigem.itens.map(item => ({
                pedidoId: novoPedido.id,
                produtoId: item.produtoId,
                produtoNome: item.produtoNome,
                categoria: item.categoria,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit,
                precoEspecial: item.precoEspecial,
                observacoes: item.observacoes,
              })),
            });
          });
          clientesJaNoDestino.add(keyDestino);
          criados++;
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.includes("1114") ||
              /table ['`].+['`] is full/i.test(err.message) ||
              err.message.includes("sem espaço em disco") ||
              err.message.includes("3019") ||
              /undo log/i.test(err.message))
          ) {
            falhasEspaco++;
            // Limpeza rápida (sem shrink) — shrink bloqueava a request por minutos.
            await liberarEspacoComercial(ctx.prisma!, { emergencia: true, shrink: false }).catch(
              () => null,
            );
            continue;
          }
          throw err;
        }
      }

      if (criados === 0 && falhasEspaco > 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Cópia da semana falhou: banco sem espaço em disco. Abra https://app.fazendasup.com.br/api/diagnostico/espaco/liberar e tente de novo. Se persistir, aumente o disco do MySQL no Railway.",
        });
      }

      return {
        criados,
        ignorados,
        falhasEspaco,
        origem: semanaOrigemInicio,
        destino: semanaDestinoInicio,
        mensagem:
          falhasEspaco > 0
            ? `Copiados ${criados}; ${falhasEspaco} falharam por falta de espaço (rode /api/diagnostico/espaco/liberar e copie de novo).`
            : undefined,
      };
    }),

  dashboard: comercialProcedure
    .input(
      z.object({
        dia: z.coerce.date(),
        /** dia = só a data; semana = seg–dom da data, só pedidos ainda abertos (PENDENTE/PRONTO). */
        escopo: z.enum(["dia", "semana"]).default("dia"),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (antesDoCortePedidos(input.dia)) return [];
      const escopoSemana = input.escopo === "semana";
      const inicio = escopoSemana
        ? inicioSemana(input.dia)
        : inicioComCortePedidos(input.dia);
      const fim = escopoSemana ? fimSemana(input.dia) : fimDia(input.dia);
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: {
          dataEntrega: { gte: inicio, lte: fim },
          ...(escopoSemana
            ? { status: { in: ["PENDENTE", "PRONTO"] } }
            : {}),
        },
        include: {
          cliente: {
            include: {
              regraComercial: {
                include: { precosEspeciais: { include: { produto: true } } },
              },
            },
          },
          pedidoContaAzul: {
            select: {
              id: true,
              statusPedido: true,
              itens: {
                select: {
                  produto: true,
                  sku: true,
                  quantidade: true,
                },
              },
            },
          },
          itens: true,
          avarias: {
            include: { criadoPor: { select: { nome: true, email: true } } },
          },
        },
        orderBy: [
          { dataEntrega: "asc" },
          { cliente: { nome: "asc" } },
          { criadoEm: "asc" },
        ],
      });
      pedidos.sort((a, b) => {
        const da = inicioDia(a.dataEntrega).getTime();
        const db = inicioDia(b.dataEntrega).getTime();
        if (da !== db) return da - db;
        return compararEntregaPorRegra(a, b);
      });
      const alertas = await alertasAvariasDepoisPedidoOrigem(
        ctx.prisma!,
        pedidos
      );
      const grupos = new Map<
        string,
        {
          contaAzulCustomerId: string;
          cliente: unknown;
          regras: unknown;
          status: string;
          dataEntrega: Date;
          dataEntregaIso: string;
          prioridadeEntrega: number;
          pedidos: typeof pedidos;
          itens: unknown[];
          avarias: unknown[];
          alertasAvariasPendentes: unknown[];
          avisosAcumulo: string[];
          volumeFaturamentoOculto: boolean;
        }
      >();
      for (const p of pedidos) {
        const pedido = deveOcultarValores(ctx) ? ocultarValoresPedido(p) : p;
        const dataEntrega = inicioDia(p.dataEntrega);
        const dataEntregaIso = `${dataEntrega.getFullYear()}-${String(dataEntrega.getMonth() + 1).padStart(2, "0")}-${String(dataEntrega.getDate()).padStart(2, "0")}`;
        const key = escopoSemana
          ? `${p.contaAzulCustomerId}:${p.status}:${dataEntregaIso}`
          : `${p.contaAzulCustomerId}:${p.status}`;
        const atual = grupos.get(key) ?? {
          contaAzulCustomerId: p.contaAzulCustomerId,
          cliente: pedido.cliente,
          regras: pedido.cliente?.regraComercial ?? null,
          status: p.status,
          dataEntrega,
          dataEntregaIso,
          prioridadeEntrega: prioridadeEntregaAutomatica(
            p.cliente?.regraComercial
          ),
          pedidos: [],
          itens: [],
          avarias: [],
          alertasAvariasPendentes: [],
          avisosAcumulo: [],
          volumeFaturamentoOculto: false,
        };
        atual.pedidos.push(pedido);
        // Mesma fonte da agenda: itens salvos no pedido operacional (não trocar por
        // orçamento CA nem por entrega da semana anterior).
        atual.itens.push(
          ...p.itens.map((i: any) => ({
            ...i,
            quantidade: Number(i.quantidade ?? 0) || 0,
            tipoVenda: p.tipoVenda,
          }))
        );
        atual.avarias.push(
          ...pedido.avarias.map((a: any) => ({
            ...a,
            tipoVenda: p.tipoVenda,
          }))
        );
        const alerta = alertas.get(p.id);
        if (alerta) atual.alertasAvariasPendentes.push(alerta);
        grupos.set(key, atual);
      }
      return Array.from(grupos.values()).sort((a, b) => {
        if (escopoSemana) {
          const da = a.dataEntrega.getTime();
          const db = b.dataEntrega.getTime();
          if (da !== db) return da - db;
        }
        return a.prioridadeEntrega - b.prioridadeEntrega;
      });
    }),

  atualizarStatusClienteDia: comercialProcedure
    .input(
      z.object({
        contaAzulCustomerId: z.string(),
        dia: z.coerce.date(),
        status: statusSchema,
        statusAtual: statusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      if (antesDoCortePedidos(input.dia)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedidos operacionais começam em 01/06/2026.",
        });
      }
      const where = {
        contaAzulCustomerId: input.contaAzulCustomerId,
        dataEntrega: {
          gte: inicioComCortePedidos(input.dia),
          lte: fimDia(input.dia),
        },
        ...(input.statusAtual ? { status: input.statusAtual } : {}),
      };
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where,
        select: { id: true, status: true },
      });
      await ctx.prisma!.$transaction(async tx => {
        await tx.pedidoOperacional.updateMany({
          where,
          data: { status: input.status, editadoPorId: usuario.id },
        });
        for (const p of pedidos) {
          await registrarAuditoria(
            tx as any,
            p.id,
            { id: usuario.id, nome: usuario.nome },
            "status_cliente_dia",
            { status: p.status },
            { status: input.status }
          );
        }
      });
      return { success: true, count: pedidos.length };
    }),

  atualizarPrioridadeClienteDia: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        contaAzulCustomerId: z.string(),
        dia: z.coerce.date(),
        prioridadeEntrega: z.number().int().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      if (antesDoCortePedidos(input.dia)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pedidos operacionais começam em 01/06/2026.",
        });
      }
      await ctx.prisma!.pedidoOperacional.updateMany({
        where: {
          contaAzulCustomerId: input.contaAzulCustomerId,
          dataEntrega: {
            gte: inicioComCortePedidos(input.dia),
            lte: fimDia(input.dia),
          },
        },
        data: {
          prioridadeEntrega: input.prioridadeEntrega,
          editadoPorId: usuario.id,
        },
      });
      return { success: true };
    }),

  cancelarPedido: comercialProcedure
    .input(z.object({ pedidoId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      const pedido = await ctx.prisma!.pedidoOperacional.findUnique({
        where: { id: input.pedidoId },
        include: { itens: true, avarias: true },
      });
      if (!pedido)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pedido não encontrado",
        });
      if (pedido.status === "CANCELADO")
        return { success: true, alreadyCancelled: true };

      await ctx.prisma!.$transaction(async tx => {
        await tx.pedidoOperacional.update({
          where: { id: input.pedidoId },
          data: { status: "CANCELADO", editadoPorId: usuario.id },
        });
        await registrarAuditoria(
          tx as any,
          input.pedidoId,
          { id: usuario.id, nome: usuario.nome },
          "pedido_cancelado",
          {
            status: pedido.status,
            itens: pedido.itens,
            avarias: pedido.avarias,
          },
          { status: "CANCELADO" }
        );
      });

      return { success: true, alreadyCancelled: false };
    }),

  reativarPedidosCancelados: comercialProcedure
    .input(z.object({ pedidoIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: { id: { in: input.pedidoIds } },
        select: { id: true, status: true },
      });
      const cancelados = pedidos.filter(p => p.status === "CANCELADO");
      if (cancelados.length === 0) return { success: true, count: 0 };

      await ctx.prisma!.$transaction(async tx => {
        await tx.pedidoOperacional.updateMany({
          where: { id: { in: cancelados.map(p => p.id) }, status: "CANCELADO" },
          data: { status: "PENDENTE", editadoPorId: usuario.id },
        });
        for (const pedido of cancelados) {
          await registrarAuditoria(
            tx as any,
            pedido.id,
            { id: usuario.id, nome: usuario.nome },
            "pedido_reativado",
            { status: pedido.status },
            { status: "PENDENTE" }
          );
        }
      });

      return { success: true, count: cancelados.length };
    }),

  auditoriaPedido: comercialProcedure
    .input(z.object({ pedidoId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma!.pedidoOperacionalAuditoria.findMany({
        where: { pedidoId: input.pedidoId },
        orderBy: { criadoEm: "desc" },
      })
    ),

  relatorioHistorico: comercialProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
        contaAzulCustomerId: z.string().optional(),
        status: statusSchema.optional(),
        busca: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const busca = input.busca?.trim();
      const intervalo = intervaloComCortePedidos(input.inicio, input.fim);
      if (intervalo.vazio) {
        return {
          resumo: {
            pedidos: 0,
            clientes: 0,
            unidades: 0,
            produtos: 0,
            valorEstimado: 0,
            status: STATUS_PEDIDO.reduce<Record<string, number>>(
              (acc, s) => ({ ...acc, [s]: 0 }),
              {}
            ),
            contaAzulPedidos: 0,
            contaAzulUnidades: 0,
            contaAzulValor: 0,
            contaAzulValorGerencial: 0,
            descontoBoletoTotal: 0,
            diferencaValorContaAzul: 0,
            clientesDivergentesContaAzul: 0,
            ultimaSincronizacaoContaAzul: null,
          },
          produtos: [],
          pedidos: [],
          contaAzul: { vendas: [], conciliacao: [] },
        };
      }
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: {
          dataEntrega: { gte: intervalo.inicio, lte: intervalo.fim },
          ...(input.contaAzulCustomerId
            ? { contaAzulCustomerId: input.contaAzulCustomerId }
            : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(busca
            ? {
                OR: [
                  { observacoes: { contains: busca } },
                  { cliente: { nome: { contains: busca } } },
                  { itens: { some: { produtoNome: { contains: busca } } } },
                  { itens: { some: { categoria: { contains: busca } } } },
                ],
              }
            : {}),
        },
        include: {
          cliente: true,
          itens: { include: { produto: true } },
          avarias: {
            include: {
              produto: true,
              criadoPor: { select: { nome: true, email: true } },
            },
          },
          criadoPor: { select: { nome: true, email: true } },
          editadoPor: { select: { nome: true, email: true } },
          auditoria: { orderBy: { criadoEm: "desc" }, take: 5 },
          pedidoContaAzul: {
            select: {
              id: true,
              externalId: true,
              numeroVenda: true,
              dataPedido: true,
              statusPedido: true,
              valorLiquido: true,
              valorTotal: true,
            },
          },
        },
        orderBy: [
          { dataEntrega: "desc" },
          { cliente: { nome: "asc" } },
          { criadoEm: "desc" },
        ],
        take: 500,
      });
      const vendasContaAzulRaw = await ctx.prisma!.pedido.findMany({
        where: {
          origemPedido: OrigemPedido.CONTA_AZUL,
          dataPedido: { gte: intervalo.inicio, lte: intervalo.fim },
          ...(input.contaAzulCustomerId
            ? { cliente: { externalId: input.contaAzulCustomerId } }
            : {}),
          ...(busca
            ? {
                OR: [
                  { statusPedido: { contains: busca } },
                  { cliente: { nome: { contains: busca } } },
                  { itens: { some: { produto: { contains: busca } } } },
                  { itens: { some: { categoria: { contains: busca } } } },
                ],
              }
            : {}),
        },
        include: {
          cliente: {
            select: { id: true, externalId: true, nome: true, cnpjCpf: true },
          },
          itens: true,
        },
        orderBy: [{ dataPedido: "desc" }, { cliente: { nome: "asc" } }],
        take: 500,
      });
      const vendasContaAzul = vendasContaAzulRaw.filter(
        p => classificarStatusPedido(p.statusPedido) === "venda"
      );

      const statusResumo = STATUS_PEDIDO.reduce<Record<string, number>>(
        (acc, s) => ({ ...acc, [s]: 0 }),
        {}
      );
      const clientes = new Set<string>();
      const produtos = new Map<
        string,
        {
          nome: string;
          categoria: string | null;
          quantidade: number;
          pedidos: number;
        }
      >();
      let unidades = 0;
      let valorEstimado = 0;

      for (const pedido of pedidos) {
        statusResumo[pedido.status] = (statusResumo[pedido.status] ?? 0) + 1;
        clientes.add(pedido.contaAzulCustomerId);
        for (const item of pedido.itens) {
          const quantidade = Number(item.quantidade);
          unidades += quantidade;
          const valorItem = quantidade * (money(item.precoUnit) ?? 0);
          valorEstimado += valorItem;
          const key = item.produtoNome;
          const atual = produtos.get(key) ?? {
            nome: item.produtoNome,
            categoria: item.categoria,
            quantidade: 0,
            pedidos: 0,
          };
          atual.quantidade += quantidade;
          atual.pedidos += 1;
          produtos.set(key, atual);
        }
      }

      const conciliacao = await calcularConciliacaoSemanal(
        ctx.prisma!,
        intervalo.inicio,
        intervalo.fim
      );
      const ocultarValores = deveOcultarValores(ctx);
      const conciliacaoContaAzul = ocultarValores
        ? conciliacao.clientes.map(ocultarValoresConciliacaoCliente)
        : conciliacao.clientes;

      return {
        resumo: {
          pedidos: pedidos.length,
          clientes: clientes.size,
          unidades,
          produtos: produtos.size,
          valorEstimado: ocultarValores ? null : valorEstimado,
          status: statusResumo,
          contaAzulPedidos: conciliacao.resumo.contaAzulPedidos,
          contaAzulUnidades: conciliacao.resumo.contaAzulUnidades,
          contaAzulValor: ocultarValores
            ? null
            : conciliacao.resumo.contaAzulValor,
          contaAzulValorGerencial: ocultarValores
            ? null
            : conciliacao.resumo.contaAzulValorGerencial,
          descontoBoletoTotal: ocultarValores
            ? null
            : conciliacao.resumo.descontoBoletoTotal,
          diferencaValorContaAzul: ocultarValores
            ? null
            : conciliacao.resumo.operacionalValor -
              conciliacao.resumo.contaAzulValor,
          clientesDivergentesContaAzul: conciliacao.resumo.clientesDivergentes,
          clientesAguardandoVendaContaAzul:
            conciliacao.resumo.clientesAguardandoVenda,
          clientesVendaSemPedidoContaAzul:
            conciliacao.resumo.clientesVendaSemPedido,
          ultimaSincronizacaoContaAzul:
            conciliacao.ultimaSincronizacaoContaAzul,
        },
        produtos: Array.from(produtos.values()).sort(
          (a, b) =>
            b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")
        ),
        pedidos: ocultarValores ? pedidos.map(ocultarValoresPedido) : pedidos,
        contaAzul: {
          vendas: vendasContaAzul.map(p => ({
            ...p,
            valorTotal: ocultarValores ? null : p.valorTotal,
            valorLiquido: ocultarValores ? null : p.valorLiquido,
            valorFrete: ocultarValores ? null : p.valorFrete,
            valorDesconto: ocultarValores ? null : p.valorDesconto,
            valorLiquidoDashboard: ocultarValores
              ? null
              : composicaoDoPedidoParaDashboard(p).valorLiquido,
            itens: ocultarValores
              ? p.itens.map(i => ({ ...i, precoUnit: null, custoUnit: null }))
              : p.itens,
          })),
          conciliacao: conciliacaoContaAzul,
        },
      };
    }),

  relatorioAvarias: comercialProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
        contaAzulCustomerId: z.string().optional(),
        busca: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const busca = input.busca?.trim();
      const intervalo = intervaloComCortePedidos(input.inicio, input.fim);
      if (intervalo.vazio) {
        return {
          resumo: { registros: 0, quantidade: 0, clientes: 0, produtos: 0 },
          produtos: [],
          avarias: [],
        };
      }
      const avarias = await ctx.prisma!.pedidoOperacionalAvaria.findMany({
        where: {
          dataEntrega: { gte: intervalo.inicio, lte: intervalo.fim },
          ...(input.contaAzulCustomerId
            ? { contaAzulCustomerId: input.contaAzulCustomerId }
            : {}),
          ...(busca
            ? {
                OR: [
                  { observacoes: { contains: busca } },
                  { cliente: { nome: { contains: busca } } },
                  { produtoNome: { contains: busca } },
                  { categoria: { contains: busca } },
                ],
              }
            : {}),
        },
        include: {
          cliente: true,
          produto: true,
          pedido: {
            select: {
              id: true,
              status: true,
              tipoVenda: true,
              observacoes: true,
            },
          },
          criadoPor: { select: { nome: true, email: true } },
        },
        orderBy: [
          { dataEntrega: "desc" },
          { cliente: { nome: "asc" } },
          { produtoNome: "asc" },
        ],
        take: 1000,
      });

      const clientes = new Set<string>();
      const produtos = new Map<
        string,
        {
          nome: string;
          categoria: string | null;
          quantidade: number;
          linhas: number;
        }
      >();
      let quantidadeTotal = 0;

      for (const avaria of avarias) {
        clientes.add(avaria.contaAzulCustomerId);
        const quantidade = Number(avaria.quantidade);
        quantidadeTotal += quantidade;
        const atual = produtos.get(avaria.produtoNome) ?? {
          nome: avaria.produtoNome,
          categoria: avaria.categoria,
          quantidade: 0,
          linhas: 0,
        };
        atual.quantidade += quantidade;
        atual.linhas += 1;
        produtos.set(avaria.produtoNome, atual);
      }

      return {
        resumo: {
          registros: avarias.length,
          quantidade: quantidadeTotal,
          clientes: clientes.size,
          produtos: produtos.size,
        },
        produtos: Array.from(produtos.values()).sort(
          (a, b) =>
            b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")
        ),
        avarias,
      };
    }),

  compras: comercialProcedure
    .input(
      z.object({
        dia: z.coerce.date(),
        incluirOcultos: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (antesDoCortePedidos(input.dia)) {
        return {
          linhas: [],
          desativados: [],
          totais: { sumNec: 0, sumUn: 0, sumKg: 0 },
          mixes: [],
          cfgMix: {
            ...ESTOQUE_MIX_FOLHA_PADRAO,
            qtdReferencia: 0,
            partePorVariedade: 0,
          },
        };
      }
      const [pedidosDb, produtosDb, cfgRow, mixesDb] = await Promise.all([
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            dataEntrega: {
              gte: inicioComCortePedidos(input.dia),
              lte: fimDia(input.dia),
            },
            status: { not: "CANCELADO" },
          },
          include: {
            itens: { include: { produto: true } },
            cliente: { include: { regraComercial: true } },
          },
        }),
        ctx.prisma!.produtoComercial.findMany({
          where: {
            contaAzulProdutoId: { not: null },
            importadoOperacao: true,
            ativo: true,
          },
          orderBy: { nome: "asc" },
        }),
        ctx.prisma!.estoqueVivoConfig.findUnique({ where: { id: "default" } }),
        ctx.prisma!.estoqueVivoMix.findMany({
          where: { ativo: true },
          include: mixEstoqueInclude,
          orderBy: { nome: "asc" },
        }),
      ]);

      const pedidosLinhas: LinhaPedidoEstoque[] = [];
      for (const pedido of pedidosDb) {
        for (const item of pedido.itens) {
          pedidosLinhas.push({
            nome: item.produtoNome,
            quantidade: Number(item.quantidade ?? 0) || 0,
          });
        }
      }

      const cfgMix = normalizeEstoqueMixFolhaLeve(
        cfgRow
          ? {
              referenciaProduto: cfgRow.mixReferenciaNome,
              variedades: cfgRow.mixVariedades,
            }
          : ESTOQUE_MIX_FOLHA_PADRAO
      );

      const mixesCfg = mixesDb.map(mapMixEstoqueDbParaCfg);

      const produtosCfg: ConfigProdutoEstoque[] = produtosDb.map(p => {
        const fatorN = money(p.fatorCompraUnidade);
        const rendN = money(p.rendimentoPorKg);
        return {
          produtoId: p.id,
          nome: p.nome,
          modoCompra: p.modoCompra === "KG" ? "kilo" : "unidade",
          fator: fatorN != null && fatorN > 0 ? fatorN : null,
          rendimento: rendN != null && rendN > 0 ? rendN : 0,
          mixAtivo: p.mixAtivo,
          oculto: p.ocultoListaCompra,
        };
      });

      const resultado = buildEstoqueVivoDia(
        pedidosLinhas,
        produtosCfg,
        cfgMix,
        {
          incluirOcultos: input.incluirOcultos,
          mixes: mixesCfg,
        }
      );

      const produtoPorId = new Map(produtosDb.map(p => [p.id, p]));

      return {
        ...resultado,
        linhas: resultado.linhas
          .map(linha => ({
            ...linha,
            produto: linha.produtoId
              ? (produtoPorId.get(linha.produtoId) ?? null)
              : null,
          }))
          .sort(
            (a, b) =>
              b.quantidadePedido - a.quantidadePedido ||
              a.nome.localeCompare(b.nome, "pt-BR")
          ),
      };
    }),

  listarMixesEstoqueVivo: comercialProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma!.estoqueVivoMix.findMany({
      include: mixEstoqueInclude,
      orderBy: { nome: "asc" },
    });
    return rows.map(mapMixEstoqueDbParaCfg);
  }),

  previewMixEstoqueVivo: comercialProcedure
    .input(
      z.object({
        mixId: z.string().optional(),
        mix: salvarMixEstoqueSchema.optional(),
        unidadesReferencia: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      let mixCfg: EstoqueVivoMixCfg | null = null;
      if (input.mixId) {
        const row = await ctx.prisma!.estoqueVivoMix.findUnique({
          where: { id: input.mixId },
          include: mixEstoqueInclude,
        });
        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mix não encontrado." });
        }
        mixCfg = mapMixEstoqueDbParaCfg(row);
      } else if (input.mix) {
        const ref = await ctx.prisma!.produtoComercial.findUnique({
          where: { id: input.mix.produtoReferenciaId },
          select: { id: true, nome: true },
        });
        if (!ref) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Produto referência do mix não encontrado.",
          });
        }
        const compIds = Array.from(
          new Set(input.mix.componentes.map(c => c.produtoId))
        );
        const compDb = await ctx.prisma!.produtoComercial.findMany({
          where: { id: { in: compIds } },
          select: { id: true, nome: true },
        });
        const compPorId = new Map(compDb.map(c => [c.id, c]));
        mixCfg = {
          id: input.mix.id ?? "preview",
          nome: input.mix.nome,
          produtoReferenciaId: ref.id,
          produtoReferenciaNome: ref.nome,
          perdaPercentual: input.mix.perdaPercentual,
          ativo: input.mix.ativo,
          componentes: input.mix.componentes.map(c => {
            const prod = compPorId.get(c.produtoId);
            if (!prod) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Componente do mix não encontrado no catálogo.",
              });
            }
            return {
              produtoId: prod.id,
              produtoNome: prod.nome,
              quantidade: c.quantidade,
            };
          }),
        };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe mixId ou mix para simular.",
        });
      }

      const produtosDb = await ctx.prisma!.produtoComercial.findMany({
        where: {
          contaAzulProdutoId: { not: null },
          importadoOperacao: true,
          ativo: true,
        },
      });
      const produtosCfg: ConfigProdutoEstoque[] = produtosDb.map(p => {
        const fatorN = money(p.fatorCompraUnidade);
        const rendN = money(p.rendimentoPorKg);
        return {
          produtoId: p.id,
          nome: p.nome,
          modoCompra: p.modoCompra === "KG" ? "kilo" : "unidade",
          fator: fatorN != null && fatorN > 0 ? fatorN : null,
          rendimento: rendN != null && rendN > 0 ? rendN : 0,
          mixAtivo: p.mixAtivo,
          oculto: p.ocultoListaCompra,
        };
      });

      return {
        mix: mixCfg,
        unidadesReferencia: input.unidadesReferencia,
        linhas: previewMixEstoqueVivo(
          input.unidadesReferencia,
          mixCfg,
          produtosCfg
        ),
      };
    }),

  salvarMixEstoqueVivo: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(salvarMixEstoqueSchema)
    .mutation(async ({ ctx, input }) => {
      const compIds = Array.from(
        new Set(input.componentes.map(c => c.produtoId))
      );
      if (compIds.includes(input.produtoReferenciaId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O produto referência não pode ser componente do próprio mix.",
        });
      }
      const [ref, comps] = await Promise.all([
        ctx.prisma!.produtoComercial.findUnique({
          where: { id: input.produtoReferenciaId },
          select: { id: true },
        }),
        ctx.prisma!.produtoComercial.findMany({
          where: { id: { in: compIds } },
          select: { id: true },
        }),
      ]);
      if (!ref) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Produto referência não encontrado.",
        });
      }
      if (comps.length !== compIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Um ou mais componentes não existem no catálogo.",
        });
      }

      const dataMix = {
        nome: input.nome.trim(),
        produtoReferenciaId: input.produtoReferenciaId,
        perdaPercentual: new Prisma.Decimal(input.perdaPercentual),
        ativo: input.ativo,
      };

      if (input.id) {
        const existente = await ctx.prisma!.estoqueVivoMix.findUnique({
          where: { id: input.id },
          select: { id: true },
        });
        if (!existente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mix não encontrado." });
        }
        const out = await ctx.prisma!.$transaction(async tx => {
          await tx.estoqueVivoMixComponente.deleteMany({ where: { mixId: input.id! } });
          return tx.estoqueVivoMix.update({
            where: { id: input.id },
            data: {
              ...dataMix,
              componentes: {
                create: input.componentes.map(c => ({
                  produtoId: c.produtoId,
                  quantidade: new Prisma.Decimal(c.quantidade),
                })),
              },
            },
            include: mixEstoqueInclude,
          });
        });
        return mapMixEstoqueDbParaCfg(out);
      }

      try {
        const out = await ctx.prisma!.estoqueVivoMix.create({
          data: {
            ...dataMix,
            componentes: {
              create: input.componentes.map(c => ({
                produtoId: c.produtoId,
                quantidade: new Prisma.Decimal(c.quantidade),
              })),
            },
          },
          include: mixEstoqueInclude,
        });
        return mapMixEstoqueDbParaCfg(out);
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um mix para este produto referência.",
          });
        }
        throw err;
      }
    }),

  excluirMixEstoqueVivo: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma!.estoqueVivoMix.delete({ where: { id: input.id } });
        return { ok: true as const };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mix não encontrado." });
        }
        throw err;
      }
    }),

  salvarConfigMixFolhaLeve: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        referenciaProduto: z.string().min(1),
        variedades: z.array(z.string().min(1)).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cfg = normalizeEstoqueMixFolhaLeve({
        referenciaProduto: input.referenciaProduto,
        variedades: input.variedades,
      });
      return ctx.prisma!.estoqueVivoConfig.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          mixReferenciaNome: cfg.referenciaProduto,
          mixVariedades: cfg.variedades,
        },
        update: {
          mixReferenciaNome: cfg.referenciaProduto,
          mixVariedades: cfg.variedades,
        },
      });
    }),

  atualizarCompraProduto: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        produtoId: z.string().optional(),
        produtoNome: z.string().min(1).optional(),
        modoCompra: modoCompraSchema.optional(),
        fatorCompraUnidade: nullablePositiveNumber,
        rendimentoPorKg: nullablePositiveNumber,
        ocultoListaCompra: z.boolean().optional(),
        mixAtivo: z.boolean().optional(),
        mixFolhaLeve: z.boolean().optional(),
        mixProdutoReferenciaId: z.string().nullable().optional(),
        mixVariedades: nullableStringArray,
      })
    )
    .mutation(({ ctx, input }) => {
      const data = {
        modoCompra: input.modoCompra,
        fatorCompraUnidade:
          input.fatorCompraUnidade === undefined
            ? undefined
            : input.fatorCompraUnidade == null
              ? null
              : new Prisma.Decimal(input.fatorCompraUnidade),
        rendimentoPorKg:
          input.rendimentoPorKg === undefined
            ? undefined
            : input.rendimentoPorKg == null
              ? null
              : new Prisma.Decimal(input.rendimentoPorKg),
        ocultoListaCompra: input.ocultoListaCompra,
        mixAtivo: input.mixAtivo,
        mixFolhaLeve: input.mixFolhaLeve,
        mixProdutoReferenciaId: input.mixProdutoReferenciaId,
        mixVariedades:
          input.mixVariedades === undefined
            ? undefined
            : input.mixVariedades == null
              ? Prisma.JsonNull
              : (input.mixVariedades as Prisma.InputJsonValue),
      };
      if (input.produtoId) {
        return ctx.prisma!.produtoComercial.update({
          where: { id: input.produtoId },
          data,
        });
      }
      if (!input.produtoNome?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe o produto para configurar o estoque vivo.",
        });
      }
      const nome = input.produtoNome.trim();
      return ctx.prisma!.produtoComercial.upsert({
        where: { nome },
        create: { nome, ...data },
        update: data,
      });
    }),

  // ===================== Fechamento semanal =====================

  /** Status da semana do dia informado + a primeira semana anterior que bloqueia novos pedidos. */
  statusSemana: comercialProcedure
    .input(z.object({ dia: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const semanaInicio = inicioSemana(input.dia);
      const semanaFim = fimSemana(input.dia);
      const [semanaAtual, bloqueioResult] = await Promise.all([
        calcularStatusSemana(ctx.prisma!, input.dia),
        obterBloqueioSemanaComReparo(
          ctx.prisma!,
          semanaInicio,
          usuarioReparo(ctx),
        ),
      ]);
      const bloqueio = bloqueioResult.bloqueio;
      const [conciliacaoAtual, conciliacaoBloqueio] = await Promise.all([
        calcularConciliacaoSemanal(ctx.prisma!, semanaInicio, semanaFim),
        bloqueio
          ? calcularConciliacaoSemanal(
              ctx.prisma!,
              bloqueio.inicio,
              bloqueio.fim
            )
          : Promise.resolve(null),
      ]);
      const podeFecharOperacional =
        semanaAtual.totalPedidos > 0 &&
        semanaAtual.pendentes === 0 &&
        !semanaAtual.fechada;
      const ignoraConciliacaoAtual = semanaIgnoraConciliacaoFechamento(semanaInicio);
      const ignoraConciliacaoBloqueio =
        bloqueio != null && semanaIgnoraConciliacaoFechamento(bloqueio.inicio);
      const conciliacaoBloqueioPendente = conciliacaoBloqueio?.conciliado === false;
      return {
        semanaAtual,
        bloqueio,
        conciliacaoContaAzul: conciliacaoAtual,
        conciliacaoBloqueio,
        podeCriarPedidos: true,
        podeFecharSemanaAtual:
          podeFecharOperacional &&
          (conciliacaoAtual.conciliado || ignoraConciliacaoAtual),
        podeFecharBloqueio:
          bloqueio != null &&
          bloqueio.pendentes === 0 &&
          (conciliacaoBloqueio?.conciliado !== false || ignoraConciliacaoBloqueio),
        podeFecharSemConciliacaoBloqueio:
          bloqueio != null &&
          bloqueio.pendentes === 0 &&
          conciliacaoBloqueioPendente &&
          !ignoraConciliacaoBloqueio,
        bloqueioIgnoraConciliacao: ignoraConciliacaoBloqueio,
        semanaAtualIgnoraConciliacao: ignoraConciliacaoAtual,
      };
    }),

  /** Fecha (ou refecha) a semana do dia informado. Exige que não haja pedidos pendentes. */
  fecharSemana: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        dia: z.coerce.date(),
        ignorarConciliacao: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });

      const semanaInicio = inicioSemana(input.dia);
      const semanaFim = fimSemana(input.dia);

      if (semanaInicio.getTime() > inicioSemana(new Date()).getTime()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível fechar uma semana futura.",
        });
      }

      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: { dataEntrega: { gte: semanaInicio, lte: semanaFim } },
        include: { itens: true },
      });

      const pendentes = pedidos.filter(
        p => p.status !== "ENTREGUE" && p.status !== "CANCELADO"
      );
      if (pendentes.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Ainda há ${pendentes.length} pedido(s) sem definição de entregue/cancelado. Revise antes de fechar a semana.`,
        });
      }

      await repararConciliacaoSemana(
        ctx.prisma!,
        semanaInicio,
        semanaFim,
        usuarioReparo(ctx),
      );
      const conciliacao = await calcularConciliacaoSemanal(
        ctx.prisma!,
        semanaInicio,
        semanaFim
      );
      const ignoraConciliacao =
        input.ignorarConciliacao ||
        semanaIgnoraConciliacaoFechamento(semanaInicio);
      if (!conciliacao.conciliado && !ignoraConciliacao) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Há ${conciliacao.resumo.clientesDivergentes} cliente(s) com divergência real entre Pedidos e Conta Azul. Corrija os lançamentos e sincronize novamente antes de fechar.`,
        });
      }

      let totalEntregues = 0;
      let totalCancelados = 0;
      let valorEntregue = new Prisma.Decimal(0);
      for (const p of pedidos) {
        if (p.status === "ENTREGUE") {
          totalEntregues++;
          for (const item of p.itens) {
            if (item.precoUnit != null) {
              valorEntregue = valorEntregue.plus(
                new Prisma.Decimal(item.quantidade).times(item.precoUnit)
              );
            }
          }
        } else if (p.status === "CANCELADO") {
          totalCancelados++;
        }
      }

      const dadosFechamento = {
        semanaFim,
        fechadoPorId: usuario.id,
        fechadoPorNome: usuario.nome,
        fechadoEm: new Date(),
        totalPedidos: pedidos.length,
        totalEntregues,
        totalCancelados,
        valorEntregue,
        reabertoEm: null,
        reabertoPorId: null,
        reabertoPorNome: null,
        snapshot: {
          operacional: {
            totalPedidos: pedidos.length,
            totalEntregues,
            totalCancelados,
            valorEntregue: Number(valorEntregue),
          },
          conciliacaoContaAzul: conciliacao,
          conciliacaoIgnoradaNoFechamento: ignoraConciliacao && !conciliacao.conciliado,
          fechadoEm: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      };

      const fechamento = await ctx.prisma!.fechamentoSemanal.upsert({
        where: { semanaInicio },
        create: { semanaInicio, ...dadosFechamento },
        update: dadosFechamento,
      });

      return { success: true, fechamento };
    }),

  /** Reabre uma semana já fechada (volta a bloquear até novo fechamento). */
  reabrirSemana: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(z.object({ dia: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });

      const semanaInicio = inicioSemana(input.dia);
      const existente = await ctx.prisma!.fechamentoSemanal.findUnique({
        where: { semanaInicio },
      });
      if (!existente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Essa semana não está fechada.",
        });
      }

      const fechamento = await ctx.prisma!.fechamentoSemanal.update({
        where: { semanaInicio },
        data: {
          reabertoEm: new Date(),
          reabertoPorId: usuario.id,
          reabertoPorNome: usuario.nome,
        },
      });

      return { success: true, fechamento };
    }),

  conciliacaoPainel: comercialProcedure
    .input(z.object({ inicio: z.coerce.date(), fim: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const intervalo = intervaloComCortePedidos(input.inicio, input.fim);
      if (intervalo.vazio) {
        return {
          resumo: {
            semVenda: 0,
            vendasSemPedido: 0,
            sugestoes: 0,
            conciliados: 0,
            divergentes: 0,
            clientesSemanaPendentes: 0,
          },
          semana: null,
          clientesSemana: [],
          semVenda: [],
          vendasSemPedido: [],
          sugestoes: [],
          conciliados: [],
          divergentes: [],
          eventos: [],
        };
      }
      const inicio = intervalo.inicio;
      const fim = intervalo.fim;
      const prisma = ctx.prisma!;
      const semanaInicio = inicioSemana(inicio);
      const semanaFim = fimSemana(inicio);

      await desligarAcumuloForaAllowlist(prisma);
      await repararConciliacaoSemana(prisma, semanaInicio, semanaFim, usuarioReparo(ctx));

      const [operacionais, vendas, eventos] = await Promise.all([
        prisma.pedidoOperacional.findMany({
          where: { dataEntrega: { gte: inicio, lte: fim } },
          include: {
            cliente: {
              select: {
                nome: true,
                externalId: true,
                regraComercial: { select: { acumulaPedidos: true, diasAcumulo: true } },
              },
            },
            itens: true,
            pedidoContaAzul: {
              include: {
                itens: true,
                cliente: {
                  select: {
                    externalId: true,
                    nome: true,
                    regraComercial: {
                      select: {
                        acumulaPedidos: true,
                        diasAcumulo: true,
                        ...REGRA_ENTREGA_CONCILIACAO_SELECT,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ dataEntrega: "desc" }, { criadoEm: "desc" }],
          take: 300,
        }),
        prisma.pedido.findMany({
          where: {
            origemPedido: OrigemPedido.CONTA_AZUL,
            dataPedido: { gte: inicio, lte: fim },
          },
          include: {
            cliente: {
              select: {
                id: true,
                externalId: true,
                nome: true,
                regraComercial: {
                  select: {
                    acumulaPedidos: true,
                    diasAcumulo: true,
                    ...REGRA_ENTREGA_CONCILIACAO_SELECT,
                  },
                },
              },
            },
            itens: true,
            pedidosOperacionaisVinculo: {
              select: { id: true, statusConciliacao: true, dataEntrega: true },
            },
          },
          orderBy: { dataPedido: "desc" },
          take: 300,
        }),
        prisma.pedidoConciliacaoEvento.findMany({
          where: { criadoEm: { gte: inicio, lte: fim } },
          orderBy: { criadoEm: "desc" },
          take: 40,
        }),
      ]);

      const documentosConciliaveis = vendas.filter(v =>
        documentoContaAzulConciliavel(v)
      );
      const produtosConciliacao = await prisma.produtoComercial.findMany({
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
      const resolverChaveConciliacao =
        criarResolverChaveItemConciliacao(produtosConciliacao);
      const limparVenda = (v: any) =>
        deveOcultarValores(ctx)
          ? {
              ...v,
              valorTotal: null,
              valorLiquido: null,
              valorFrete: null,
              valorDesconto: null,
              itens: (v.itens ?? []).map((i: any) => ({
                ...i,
                precoUnit: null,
                custoUnit: null,
              })),
            }
          : v;
      await reconciliarDivergenciasAcumuloEsperadas(
        prisma,
        operacionais,
        resolverChaveConciliacao,
      );
      const sugestoes = operacionais
        .filter(
          op =>
            op.statusConciliacao === "VINCULO_SUGERIDO" &&
            op.sugestaoPedidoContaAzulId
        )
        .map(op => {
          const venda = documentosConciliaveis.find(
            v => v.id === op.sugestaoPedidoContaAzulId
          );
          const score = venda
            ? scoreSugestaoVinculo(op, venda, resolverChaveConciliacao)
            : 0;
          const divergencias = venda
            ? calcularDivergencias(
                op,
                venda,
                resolverChaveConciliacao,
                opcoesCalcularDivergenciasParaPar(op, venda),
              )
            : [];
          return {
            operacional: op,
            venda,
            divergencias,
            score,
          };
        })
        .filter(s => s.venda && s.score >= 70);
      const vendasComSugestaoValida = new Set(sugestoes.map(s => s.venda!.id));

      const semVenda = operacionais.filter(
        op => !op.pedidoContaAzulId && op.statusConciliacao !== "VENDA_ERRADA"
      );
      const vendasSemPedido = documentosConciliaveis.filter(
        v =>
          (v.pedidosOperacionaisVinculo?.length ?? 0) === 0 &&
          v.statusConciliacao !== "IGNORADA" &&
          v.statusConciliacao !== "VENDA_ERRADA" &&
          v.statusConciliacao !== "CONCILIADA" &&
          (v.statusConciliacao !== "SUGERIDA" ||
            !vendasComSugestaoValida.has(v.id))
      );
      const conciliados = operacionais.filter(
        op => op.statusConciliacao === "CONCILIADO" && op.pedidoContaAzul
      );
      const divergentesRaw = operacionais.filter(
        op => op.statusConciliacao === "DIVERGENTE" && op.pedidoContaAzul
      );
      const divergentesPorVenda = new Map<string, typeof divergentesRaw>();
      for (const op of divergentesRaw) {
        const caId = op.pedidoContaAzulId!;
        const lista = divergentesPorVenda.get(caId) ?? [];
        lista.push(op);
        divergentesPorVenda.set(caId, lista);
      }

      const divergentes: Array<Record<string, unknown>> = [];
      for (const [, ops] of Array.from(divergentesPorVenda.entries())) {
        const venda = ops[0]!.pedidoContaAzul!;
        const acumula =
          clienteAcumulaFaturamento(ops[0]!.cliente?.regraComercial) ||
          clienteAcumulaFaturamento(venda.cliente?.regraComercial);
        const divergencias =
          acumula && ops.length >= 1
            ? calcularDivergenciasAgregadas(ops, venda, resolverChaveConciliacao)
            : calcularDivergencias(
                ops[0]!,
                venda,
                resolverChaveConciliacao,
                opcoesCalcularDivergenciasParaPar(
                  ops[0]!,
                  venda,
                  ops[0]!.cliente?.regraComercial,
                ),
              );
        if (divergencias.length === 0) continue;

        if (acumula && ops.length > 1) {
          divergentes.push({
            agregado: true,
            pedidoContaAzulId: venda.id,
            pedidoContaAzul: deveOcultarValores(ctx) ? limparVenda(venda) : venda,
            operacionais: deveOcultarValores(ctx)
              ? ops.map(ocultarValoresPedido)
              : ops,
            divergencias,
          });
        } else {
          for (const op of ops) {
            divergentes.push({
              ...(deveOcultarValores(ctx) ? ocultarValoresPedido(op) : op),
              divergencias,
            });
          }
        }
      }

      const conciliacaoSemanal = await calcularConciliacaoSemanal(
        prisma,
        semanaInicio,
        semanaFim,
      );
      const clientesSemana = conciliacaoSemanal.clientes
        .filter(
          c =>
            c.status === "divergente" ||
            c.status === "venda_sem_pedido" ||
            c.status === "aguardando_venda",
        )
        .map(c => {
          const base = deveOcultarValores(ctx)
            ? ocultarValoresConciliacaoCliente(c)
            : c;
          // Sem acúmulo: listar só dias com problema (não misturar 07/07 ok com 10/07).
          // Ainda assim inclui OP vinculado à venda do dia-problema (mesmo se a entrega for noutra data).
          const diasProblemaSet =
            c.acumulaPedidos !== true &&
            Array.isArray(c.diasProblema) &&
            c.diasProblema.length > 0
              ? new Set(
                  (c.diasProblema as Array<{ dia: string }>).map((d) => d.dia),
                )
              : null;
          const noDiaProblema = (d: Date) =>
            !diasProblemaSet || diasProblemaSet.has(d.toISOString().slice(0, 10));
          const vendasCliente = documentosConciliaveis.filter(
            (v) =>
              (v.cliente.externalId ?? v.cliente.id) === c.contaAzulCustomerId &&
              v.dataPedido.getTime() >= semanaInicio.getTime() &&
              v.dataPedido.getTime() <= semanaFim.getTime() &&
              noDiaProblema(v.dataPedido),
          );
          const opIdsVinculadosVendasProblema = new Set(
            vendasCliente.flatMap((v) =>
              (v.pedidosOperacionaisVinculo ?? []).map((op: { id: string }) => op.id),
            ),
          );
          const opsCliente = operacionais.filter((op) => {
            if (op.contaAzulCustomerId !== c.contaAzulCustomerId) return false;
            if (
              op.dataEntrega.getTime() < semanaInicio.getTime() ||
              op.dataEntrega.getTime() > semanaFim.getTime()
            ) {
              // OP fora da semana visual, mas vinculado à venda do dia-problema
              return opIdsVinculadosVendasProblema.has(op.id);
            }
            return noDiaProblema(op.dataEntrega) || opIdsVinculadosVendasProblema.has(op.id);
          });
          const acumulaPedidos =
            typeof c.acumulaPedidos === "boolean"
              ? c.acumulaPedidos
              : clienteAcumulaFaturamento(
                  opsCliente[0]?.cliente?.regraComercial ??
                    vendasCliente[0]?.cliente?.regraComercial,
                  c.clienteNome ??
                    opsCliente[0]?.cliente?.nome ??
                    vendasCliente[0]?.cliente?.nome,
                );
          const diasAcumulo =
            opsCliente[0]?.cliente?.regraComercial?.diasAcumulo ??
            vendasCliente[0]?.cliente?.regraComercial?.diasAcumulo ??
            null;
          return {
            ...base,
            acumulaPedidos,
            diasAcumulo,
            operacionais: opsCliente.map(op =>
              deveOcultarValores(ctx) ? ocultarValoresPedido(op) : op,
            ),
            vendas: vendasCliente.map(limparVenda),
          };
        });

      return {
        resumo: {
          semVenda: semVenda.length,
          vendasSemPedido: vendasSemPedido.length,
          sugestoes: sugestoes.length,
          conciliados: conciliados.length,
          divergentes: divergentes.length,
          clientesSemanaPendentes: clientesSemana.length,
        },
        semana: {
          inicio: semanaInicio,
          fim: semanaFim,
          rotulo: `${String(semanaInicio.getDate()).padStart(2, "0")}/${String(semanaInicio.getMonth() + 1).padStart(2, "0")}–${String(semanaFim.getDate()).padStart(2, "0")}/${String(semanaFim.getMonth() + 1).padStart(2, "0")}`,
          conciliado: conciliacaoSemanal.conciliado,
        },
        clientesSemana,
        semVenda: deveOcultarValores(ctx)
          ? semVenda.map(ocultarValoresPedido)
          : semVenda,
        vendasSemPedido: vendasSemPedido.map(limparVenda),
        sugestoes,
        conciliados: deveOcultarValores(ctx)
          ? conciliados.map(ocultarValoresPedido)
          : conciliados,
        divergentes,
        eventos,
      };
    }),

  conciliacaoReferenciasAvaria: comercialProcedure
    .input(z.object({ clienteId: z.string(), dataEntrega: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      if (antesDoCortePedidos(input.dataEntrega)) {
        return { operacionais: [], vendas: [] };
      }
      const cliente = await ctx.prisma!.cliente.findUnique({
        where: { id: input.clienteId },
      });
      if (!cliente?.externalId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unidade sem vínculo Conta Azul.",
        });
      }
      const diaIni = inicioDia(input.dataEntrega);
      const diaFim = fimDia(input.dataEntrega);
      const [operacionais, vendas] = await Promise.all([
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            contaAzulCustomerId: cliente.externalId,
            dataEntrega: { gte: diaIni, lte: diaFim },
            status: { not: "CANCELADO" },
          },
          include: {
            itens: { select: { produtoNome: true, quantidade: true } },
            pedidoContaAzul: {
              select: { id: true, numeroVenda: true, externalId: true },
            },
          },
          orderBy: { criadoEm: "asc" },
        }),
        ctx.prisma!.pedido.findMany({
          where: {
            origemPedido: OrigemPedido.CONTA_AZUL,
            clienteId: cliente.id,
            dataPedido: { gte: diaIni, lte: diaFim },
          },
          include: { itens: { select: { produto: true, quantidade: true } } },
          orderBy: { dataPedido: "asc" },
        }),
      ]);
      const vendasFiltradas = vendas.filter(
        v => classificarStatusPedido(v.statusPedido) === "venda"
      );
      return {
        operacionais: operacionais.map(op => ({
          id: op.id,
          status: op.status,
          statusConciliacao: op.statusConciliacao,
          observacoes: op.observacoes,
          itens: op.itens,
          numeroVenda: op.pedidoContaAzul?.numeroVenda ?? null,
          pedidoContaAzulId: op.pedidoContaAzulId,
        })),
        vendas: vendasFiltradas.map(v => ({
          id: v.id,
          numeroVenda: v.numeroVenda,
          externalId: v.externalId,
          statusConciliacao: v.statusConciliacao,
          valorLiquido: v.valorLiquido ?? v.valorTotal,
          itens: v.itens,
        })),
      };
    }),

  conciliacaoCandidatosVenda: comercialProcedure
    .input(
      z.object({
        pedidoContaAzulId: z.string(),
        janelaDias: z.number().int().min(0).max(30).default(14),
      })
    )
    .query(async ({ ctx, input }) => {
      const venda = await ctx.prisma!.pedido.findUnique({
        where: { id: input.pedidoContaAzulId },
        include: {
          itens: true,
          cliente: {
            select: {
              id: true,
              externalId: true,
              nome: true,
              regraComercial: {
                select: {
                  acumulaPedidos: true,
                  diasAcumulo: true,
                  ...REGRA_ENTREGA_CONCILIACAO_SELECT,
                },
              },
            },
          },
        },
      });
      if (!venda?.cliente.externalId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda Conta Azul não encontrada ou sem cliente vinculado.",
        });
      }
      if (antesDoCortePedidos(venda.dataPedido)) {
        return { venda, candidatos: [] };
      }

      const acumula = clienteAcumulaFaturamento(
        venda.cliente.regraComercial,
        venda.cliente.nome,
      );
      const diasAcumulo = venda.cliente.regraComercial?.diasAcumulo ?? 15;
      const { inicio: inicioJanela, fim: fimJanela } = janelaCandidatosVinculo({
        dataPedido: venda.dataPedido,
        acumula,
        diasAcumulo,
        janelaDias: input.janelaDias,
      });
      const candidatos = await ctx.prisma!.pedidoOperacional.findMany({
        where: {
          contaAzulCustomerId: venda.cliente.externalId,
          status: { not: "CANCELADO" },
          dataEntrega: {
            gte: inicioJanela,
            lte: fimJanela,
          },
        },
        include: {
          cliente: { select: { nome: true, externalId: true } },
          itens: true,
          pedidoContaAzul: {
            select: { id: true, numeroVenda: true, externalId: true },
          },
        },
        orderBy: [{ dataEntrega: "asc" }, { criadoEm: "asc" }],
        take: 80,
      });

      const produtosConciliacao = await ctx.prisma!.produtoComercial.findMany({
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
      const resolverChave =
        criarResolverChaveItemConciliacao(produtosConciliacao);

      const candidatosMapeados = candidatos
        .map(op => {
          const score = scoreCandidatoVinculoManual(op, venda, resolverChave);
          const vinculadoNestaVenda = op.pedidoContaAzulId === venda.id;
          const vinculadoOutraVenda = Boolean(
            op.pedidoContaAzulId && op.pedidoContaAzulId !== venda.id,
          );
          return {
            pedido: op,
            score,
            diasDistancia: diasEntrePedidos(op, venda),
            divergencias: calcularDivergencias(
              op,
              venda,
              resolverChave,
              opcoesCalcularDivergenciasParaPar(op, venda),
            ),
            vinculadoNestaVenda,
            vinculadoOutraVenda,
          };
        })
        .filter(c => c.score > 0)
        .sort(
          (a, b) =>
            a.pedido.dataEntrega.getTime() - b.pedido.dataEntrega.getTime() ||
            b.score - a.score ||
            a.diasDistancia - b.diasDistancia
        );

      const selecionadosPadrao = candidatosMapeados
        .filter(c => c.vinculadoNestaVenda || !c.pedido.pedidoContaAzulId)
        .map(c => c.pedido.id);
      const opsAgregacao = candidatos.filter(c =>
        selecionadosPadrao.includes(c.id)
      );
      const divergenciasAgregadas =
        acumula && opsAgregacao.length > 0
          ? calcularDivergenciasAgregadas(opsAgregacao, venda, resolverChave)
          : [];

      return {
        venda,
        acumulaPedidos: acumula,
        diasAcumulo: acumula ? diasAcumulo : null,
        selecionadosPadrao,
        divergenciasAgregadas,
        candidatos: candidatosMapeados,
      };
    }),

  conciliacaoProdutosFaltantesVenda: comercialProcedure
    .input(z.object({ pedidoContaAzulId: z.string() }))
    .query(async ({ ctx, input }) => {
      const venda = await ctx.prisma!.pedido.findUnique({
        where: { id: input.pedidoContaAzulId },
        include: { itens: true },
      });
      if (!venda)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venda não encontrada.",
        });

      const [ativos, catalogo] = await Promise.all([
        ctx.prisma!.produtoComercial.findMany({
          where: {
            contaAzulProdutoId: { not: null },
            ativo: true,
            importadoOperacao: true,
          },
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
        ctx.prisma!.produtoComercial.findMany({
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
        }),
      ]);

      const indice = criarIndiceProdutosOperacionais(ativos);
      const faltantes = listarProdutosFaltantesVenda(
        indice,
        venda.itens.map(i => ({ produto: i.produto, sku: i.sku })),
        catalogo
      );
      return { faltantes };
    }),

  conciliacaoConfirmarVinculo: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalId: z.string(),
        pedidoContaAzulId: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      return confirmarVinculoConciliacao(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
    }),

  conciliacaoConfirmarVinculoMultiplo: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalIds: z.array(z.string()).min(1),
        pedidoContaAzulId: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      return confirmarVinculoMultiploConciliacao(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
    }),

  conciliacaoMarcarVendaErrada: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoContaAzulId: z.string(),
        pedidoOperacionalId: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      await marcarVendaErrada(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
      return { success: true };
    }),

  conciliacaoIgnorarVenda: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoContaAzulId: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      await ignorarVendaContaAzul(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
      return { success: true };
    }),

  conciliacaoManterOperacional: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalId: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      await manterOperacionalComoVerdade(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
      return { success: true };
    }),

  conciliacaoCriarOperacionalDeVenda: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoContaAzulId: z.string(),
        tipoVenda: tipoVendaSchema,
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      return criarOperacionalDeVenda(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
    }),

  conciliacaoDesvincular: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalId: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      await desvincularConciliacao(ctx.prisma!, {
        ...input,
        usuario: { id: usuario.id, nome: usuario.nome },
      });
      return { success: true };
    }),

  conciliacaoAplicarCorrecao: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalId: z.string(),
        pedidoContaAzulId: z.string(),
        campos: z.array(z.string()).optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      try {
        return await aplicarCorrecaoConciliacao(ctx.prisma!, {
          ...input,
          usuario: { id: usuario.id, nome: usuario.nome },
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível aplicar a correção.",
        });
      }
    }),

  conciliacaoAplicarCorrecaoAgregada: comercialProcedure
    .use(podeConfigurarEstoqueVivo)
    .input(
      z.object({
        pedidoOperacionalIds: z.array(z.string()).min(1),
        pedidoContaAzulId: z.string(),
        campos: z.array(z.string()).optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário comercial não identificado",
        });
      try {
        return await aplicarCorrecaoAgregadaConciliacao(ctx.prisma!, {
          ...input,
          usuario: { id: usuario.id, nome: usuario.nome },
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível aplicar a correção agregada.",
        });
      }
    }),
});
