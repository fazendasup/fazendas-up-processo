import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OrigemPedido, Prisma } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "../lib/composicao-valor.js";
import {
  ESTOQUE_MIX_FOLHA_PADRAO,
  buildEstoqueVivoDia,
  normalizeEstoqueMixFolhaLeve,
  type ConfigProdutoEstoque,
  type LinhaPedidoEstoque,
} from "../lib/estoque-vivo.js";
import { classificarStatusPedido } from "../lib/pedido-status.js";
import { comercialProcedure, comercialRequirePerfis, router } from "../../_core/trpc";

const adminComercial = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL");

const STATUS_PEDIDO = ["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"] as const;
const statusSchema = z.enum(["PENDENTE", "PRONTO", "ENTREGUE", "CANCELADO"]);
const tipoVendaSchema = z.enum(["RECORRENTE_SEMANAL", "RECORRENTE_QUINZENAL", "PLANO", "AVULSO"]);
const periodoEntregaSchema = z.enum(["MANHA", "TARDE"]).nullable().optional();
const modoCompraSchema = z.enum(["UNIDADE", "KG"]);

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

async function registrarAuditoria(
  prisma: PrismaClient | Prisma.TransactionClient,
  pedidoId: string,
  usuario: { id: string; nome: string },
  acao: string,
  antes: unknown,
  depois: unknown,
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

const itemPedidoInput = z.object({
  produtoId: z.string().min(1, "Produto é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  observacoes: z.string().optional(),
});

const avariaPedidoInput = z.object({
  produtoId: z.string().min(1, "Variedade da avaria é obrigatória"),
  quantidade: z.number().positive("Quantidade de avaria deve ser maior que zero"),
  observacoes: z.string().optional(),
});

const produtoInput = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, "Nome do produto é obrigatório"),
  precoBase: z.number().nonnegative().nullable().optional(),
  categoria: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
  modoCompra: modoCompraSchema.default("UNIDADE"),
  fatorCompraUnidade: z.number().positive().nullable().optional(),
  rendimentoPorKg: z.number().positive().nullable().optional(),
  ocultoListaCompra: z.boolean().default(false),
  mixAtivo: z.boolean().default(false),
  mixFolhaLeve: z.boolean().default(false),
  mixProdutoReferenciaId: z.string().nullable().optional(),
  mixVariedades: z.array(z.string()).optional(),
});

export const pedidosRouter = router({
  me: comercialProcedure.query(({ ctx }) => ({
    id: ctx.comercialUsuario.id,
    nome: ctx.comercialUsuario.nome,
    perfil: ctx.comercialUsuario.perfil,
  })),

  clientes: comercialProcedure
    .input(z.object({ busca: z.string().optional(), dia: z.coerce.date().optional(), limite: z.number().min(1).max(100).default(50) }))
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
      const idsNoDia = input.dia
        ? await ctx.prisma!.pedidoOperacional.findMany({
            where: { dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) } },
            select: { contaAzulCustomerId: true },
            distinct: ["contaAzulCustomerId"],
          })
        : null;

      return ctx.prisma!.cliente.findMany({
        where: {
          externalId: {
            not: null,
            ...(idsNoDia ? { in: idsNoDia.map((r) => r.contaAzulCustomerId) } : {}),
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
      if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente Conta Azul não encontrado" });
      const regra = await ctx.prisma!.regraComercialCliente.findUnique({
        where: { contaAzulCustomerId: input.contaAzulCustomerId },
        include: { precosEspeciais: { include: { produto: true } } },
      });
      return { cliente, regra, semRegras: !regra };
    }),

  produtos: comercialProcedure
    .input(z.object({ incluirInativos: z.boolean().default(false), busca: z.string().optional() }).default({ incluirInativos: false }))
    .query(async ({ ctx, input }) => {
      const produtos = await ctx.prisma!.produtoComercial.findMany({
        where: {
          ...(input.incluirInativos ? {} : { ativo: true }),
          ...(input.busca?.trim() ? { nome: { contains: input.busca.trim() } } : {}),
        },
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
        include: { _count: { select: { itensPedido: true } } },
      });
      return produtos.map((p) => ({ ...p, usoPedidos: p._count.itensPedido }));
    }),

  salvarProduto: comercialProcedure
    .use(adminComercial)
    .input(produtoInput)
    .mutation(async ({ ctx, input }) => {
      const data = {
        nome: input.nome.trim(),
        precoBase: input.precoBase == null ? null : new Prisma.Decimal(input.precoBase),
        categoria: input.categoria?.trim() || null,
        ativo: input.ativo,
        modoCompra: input.modoCompra,
        fatorCompraUnidade: input.fatorCompraUnidade == null ? null : new Prisma.Decimal(input.fatorCompraUnidade),
        rendimentoPorKg: input.rendimentoPorKg == null ? null : new Prisma.Decimal(input.rendimentoPorKg),
        ocultoListaCompra: input.ocultoListaCompra,
        mixAtivo: input.mixAtivo,
        mixFolhaLeve: input.mixFolhaLeve,
        mixProdutoReferenciaId: input.mixProdutoReferenciaId || null,
        mixVariedades: input.mixVariedades ? (input.mixVariedades as Prisma.InputJsonValue) : Prisma.JsonNull,
      };
      if (input.id) {
        return ctx.prisma!.produtoComercial.update({ where: { id: input.id }, data });
      }
      return ctx.prisma!.produtoComercial.create({ data });
    }),

  excluirProduto: comercialProcedure
    .use(adminComercial)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const usos = await ctx.prisma!.pedidoOperacionalItem.count({ where: { produtoId: input.id } });
      if (usos > 0) {
        return ctx.prisma!.produtoComercial.update({ where: { id: input.id }, data: { ativo: false } });
      }
      return ctx.prisma!.produtoComercial.delete({ where: { id: input.id } });
    }),

  salvarRegraCliente: comercialProcedure
    .use(adminComercial)
    .input(
      z.object({
        contaAzulCustomerId: z.string().min(1),
        observacoesGerais: z.string().nullable().optional(),
        periodoEntrega: periodoEntregaSchema,
        horarioMaximoEntrega: z.string().nullable().optional(),
        cobraTaxaEntrega: z.boolean().default(false),
        prazoBoletoDias: z.number().int().nonnegative().nullable().optional(),
        acumulaPedidos: z.boolean().default(false),
        diasAcumulo: z.number().int().nonnegative().nullable().optional(),
        prazoBoletoAcumuloDias: z.number().int().nonnegative().nullable().optional(),
        precosEspeciais: z.array(z.object({ produtoId: z.string(), preco: z.number().nonnegative() })).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      const cliente = await ctx.prisma!.cliente.findUnique({ where: { externalId: input.contaAzulCustomerId } });
      if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente Conta Azul não encontrado" });
      return ctx.prisma!.$transaction(async (tx) => {
        const regra = await tx.regraComercialCliente.upsert({
          where: { contaAzulCustomerId: input.contaAzulCustomerId },
          create: {
            contaAzulCustomerId: input.contaAzulCustomerId,
            observacoesGerais: input.observacoesGerais?.trim() || null,
            periodoEntrega: input.periodoEntrega ?? null,
            horarioMaximoEntrega: input.horarioMaximoEntrega || null,
            cobraTaxaEntrega: input.cobraTaxaEntrega,
            prazoBoletoDias: input.prazoBoletoDias ?? null,
            acumulaPedidos: input.acumulaPedidos,
            diasAcumulo: input.diasAcumulo ?? null,
            prazoBoletoAcumuloDias: input.prazoBoletoAcumuloDias ?? null,
          },
          update: {
            observacoesGerais: input.observacoesGerais?.trim() || null,
            periodoEntrega: input.periodoEntrega ?? null,
            horarioMaximoEntrega: input.horarioMaximoEntrega || null,
            cobraTaxaEntrega: input.cobraTaxaEntrega,
            prazoBoletoDias: input.prazoBoletoDias ?? null,
            acumulaPedidos: input.acumulaPedidos,
            diasAcumulo: input.diasAcumulo ?? null,
            prazoBoletoAcumuloDias: input.prazoBoletoAcumuloDias ?? null,
          },
        });
        await tx.precoEspecialCliente.deleteMany({ where: { regraId: regra.id } });
        if (input.precosEspeciais.length > 0) {
          await tx.precoEspecialCliente.createMany({
            data: input.precosEspeciais.map((p) => ({
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereDia = input.dia ? { dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) } } : {};
      const busca = input.busca?.trim();
      return ctx.prisma!.pedidoOperacional.findMany({
        where: {
          ...whereDia,
          ...(input.contaAzulCustomerId ? { contaAzulCustomerId: input.contaAzulCustomerId } : {}),
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
        orderBy: [{ dataEntrega: "asc" }, { prioridadeEntrega: "asc" }, { criadoEm: "desc" }],
        include: {
          cliente: true,
          itens: { include: { produto: true } },
          avarias: { include: { produto: true, criadoPor: { select: { nome: true, email: true } } } },
          criadoPor: { select: { nome: true, email: true } },
          editadoPor: { select: { nome: true, email: true } },
        },
      });
    }),

  salvarPedido: comercialProcedure
    .input(
      z.object({
        id: z.string().optional(),
        contaAzulCustomerId: z.string().min(1, "Cliente é obrigatório"),
        dataEntrega: z.coerce.date(),
        tipoVenda: tipoVendaSchema,
        observacoes: z.string().optional(),
        itens: z.array(itemPedidoInput).default([]),
        avarias: z.array(avariaPedidoInput).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      const cliente = await ctx.prisma!.cliente.findUnique({ where: { externalId: input.contaAzulCustomerId } });
      if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente Conta Azul não encontrado" });
      if (input.itens.length === 0 && input.avarias.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe pelo menos um produto ou uma avaria" });
      }
      const produtoIds = Array.from(new Set([...input.itens.map((i) => i.produtoId), ...input.avarias.map((a) => a.produtoId)]));
      const produtos = await ctx.prisma!.produtoComercial.findMany({
        where: { id: { in: produtoIds }, ativo: true },
      });
      if (produtos.length !== produtoIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Um ou mais produtos não existem ou estão inativos" });
      }
      const produtoMap = new Map(produtos.map((p) => [p.id, p]));
      const regra = await ctx.prisma!.regraComercialCliente.findUnique({
        where: { contaAzulCustomerId: input.contaAzulCustomerId },
        include: { precosEspeciais: true },
      });
      const precoEspecial = new Map((regra?.precosEspeciais ?? []).map((p) => [p.produtoId, p.preco]));

      return ctx.prisma!.$transaction(async (tx) => {
        const antes = input.id
          ? await tx.pedidoOperacional.findUnique({ where: { id: input.id }, include: { itens: true, avarias: true } })
          : null;
        const baseData = {
          clienteId: cliente.id,
          contaAzulCustomerId: input.contaAzulCustomerId,
          dataEntrega: inicioDia(input.dataEntrega),
          diaSemana: diaSemana(input.dataEntrega),
          tipoVenda: input.tipoVenda,
          observacoes: input.observacoes?.trim() || null,
          editadoPorId: usuario.id,
        };
        const pedido = input.id
          ? await tx.pedidoOperacional.update({ where: { id: input.id }, data: baseData })
          : await tx.pedidoOperacional.create({
              data: { ...baseData, criadoPorId: usuario.id },
            });
        if (input.id) {
          await tx.pedidoOperacionalItem.deleteMany({ where: { pedidoId: pedido.id } });
          await tx.pedidoOperacionalAvaria.deleteMany({ where: { pedidoId: pedido.id } });
        }
        if (input.itens.length > 0) {
          await tx.pedidoOperacionalItem.createMany({
            data: input.itens.map((item) => {
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
            data: input.avarias.map((avaria) => {
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
        await registrarAuditoria(
          tx as any,
          pedido.id,
          { id: usuario.id, nome: usuario.nome },
          input.id ? "pedido_editado" : "pedido_criado",
          antes,
          { ...pedido, itens: input.itens, avarias: input.avarias },
        );
        return tx.pedidoOperacional.findUnique({
          where: { id: pedido.id },
          include: { cliente: true, itens: true, avarias: true },
        });
      });
    }),

  copiarSemanaAnterior: comercialProcedure
    .input(z.object({ dia: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });

      const destino = inicioDia(input.dia);
      const origem = inicioDia(adicionarDias(destino, -7));

      const [pedidosOrigem, clientesDestino] = await Promise.all([
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            dataEntrega: { gte: origem, lte: fimDia(origem) },
            status: { not: "CANCELADO" },
          },
          include: { itens: true },
          orderBy: [{ prioridadeEntrega: "asc" }, { criadoEm: "asc" }],
        }),
        ctx.prisma!.pedidoOperacional.findMany({
          where: { dataEntrega: { gte: destino, lte: fimDia(destino) } },
          select: { contaAzulCustomerId: true },
          distinct: ["contaAzulCustomerId"],
        }),
      ]);

      if (pedidosOrigem.length === 0) {
        return { criados: 0, ignorados: 0, origem, destino, mensagem: "Nenhum pedido encontrado na semana anterior." };
      }

      const clientesJaNoDestino = new Set(clientesDestino.map((p) => p.contaAzulCustomerId));
      let criados = 0;
      let ignorados = 0;

      await ctx.prisma!.$transaction(async (tx) => {
        for (const pedidoOrigem of pedidosOrigem) {
          if (clientesJaNoDestino.has(pedidoOrigem.contaAzulCustomerId)) {
            ignorados++;
            continue;
          }

          const novoPedido = await tx.pedidoOperacional.create({
            data: {
              clienteId: pedidoOrigem.clienteId,
              contaAzulCustomerId: pedidoOrigem.contaAzulCustomerId,
              dataEntrega: destino,
              diaSemana: diaSemana(destino),
              tipoVenda: pedidoOrigem.tipoVenda,
              status: "PENDENTE",
              observacoes: pedidoOrigem.observacoes,
              prioridadeEntrega: pedidoOrigem.prioridadeEntrega,
              criadoPorId: usuario.id,
              editadoPorId: usuario.id,
            },
          });

          await tx.pedidoOperacionalItem.createMany({
            data: pedidoOrigem.itens.map((item) => ({
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

          await registrarAuditoria(
            tx as any,
            novoPedido.id,
            { id: usuario.id, nome: usuario.nome },
            "pedido_copiado_semana_anterior",
            null,
            {
              pedidoOrigemId: pedidoOrigem.id,
              dataOrigem: origem.toISOString(),
              dataDestino: destino.toISOString(),
            },
          );
          criados++;
        }
      });

      return { criados, ignorados, origem, destino };
    }),

  dashboard: comercialProcedure
    .input(z.object({ dia: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: { dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) } },
        include: {
          cliente: { include: { regraComercial: { include: { precosEspeciais: { include: { produto: true } } } } } },
          itens: true,
          avarias: true,
        },
        orderBy: [{ prioridadeEntrega: "asc" }, { cliente: { nome: "asc" } }],
      });
      const grupos = new Map<string, { contaAzulCustomerId: string; cliente: unknown; regras: unknown; status: string; prioridadeEntrega: number | null; pedidos: typeof pedidos; itens: unknown[]; avarias: unknown[] }>();
      for (const p of pedidos) {
        const key = p.contaAzulCustomerId;
        const atual = grupos.get(key) ?? {
          contaAzulCustomerId: key,
          cliente: p.cliente,
          regras: p.cliente?.regraComercial ?? null,
          status: p.status,
          prioridadeEntrega: p.prioridadeEntrega,
          pedidos: [],
          itens: [],
          avarias: [],
        };
        atual.pedidos.push(p);
        atual.itens.push(...p.itens.map((i) => ({ ...i, pedidoObservacoes: p.observacoes, tipoVenda: p.tipoVenda })));
        atual.avarias.push(...p.avarias.map((a) => ({ ...a, pedidoObservacoes: p.observacoes, tipoVenda: p.tipoVenda })));
        grupos.set(key, atual);
      }
      return Array.from(grupos.values()).sort((a, b) => (a.prioridadeEntrega ?? 9999) - (b.prioridadeEntrega ?? 9999));
    }),

  atualizarStatusClienteDia: comercialProcedure
    .input(z.object({ contaAzulCustomerId: z.string(), dia: z.coerce.date(), status: statusSchema }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      const where = {
        contaAzulCustomerId: input.contaAzulCustomerId,
        dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) },
      };
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({ where, select: { id: true, status: true } });
      await ctx.prisma!.$transaction(async (tx) => {
        await tx.pedidoOperacional.updateMany({ where, data: { status: input.status, editadoPorId: usuario.id } });
        for (const p of pedidos) {
          await registrarAuditoria(
            tx as any,
            p.id,
            { id: usuario.id, nome: usuario.nome },
            "status_cliente_dia",
            { status: p.status },
            { status: input.status },
          );
        }
      });
      return { success: true, count: pedidos.length };
    }),

  atualizarPrioridadeClienteDia: comercialProcedure
    .use(adminComercial)
    .input(z.object({ contaAzulCustomerId: z.string(), dia: z.coerce.date(), prioridadeEntrega: z.number().int().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      await ctx.prisma!.pedidoOperacional.updateMany({
        where: {
          contaAzulCustomerId: input.contaAzulCustomerId,
          dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) },
        },
        data: { prioridadeEntrega: input.prioridadeEntrega, editadoPorId: usuario.id },
      });
      return { success: true };
    }),

  cancelarPedido: comercialProcedure
    .input(z.object({ pedidoId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      const pedido = await ctx.prisma!.pedidoOperacional.findUnique({
        where: { id: input.pedidoId },
        include: { itens: true, avarias: true },
      });
      if (!pedido) throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
      if (pedido.status === "CANCELADO") return { success: true, alreadyCancelled: true };

      await ctx.prisma!.$transaction(async (tx) => {
        await tx.pedidoOperacional.update({
          where: { id: input.pedidoId },
          data: { status: "CANCELADO", editadoPorId: usuario.id },
        });
        await registrarAuditoria(
          tx as any,
          input.pedidoId,
          { id: usuario.id, nome: usuario.nome },
          "pedido_cancelado",
          { status: pedido.status, itens: pedido.itens, avarias: pedido.avarias },
          { status: "CANCELADO" },
        );
      });

      return { success: true, alreadyCancelled: false };
    }),

  auditoriaPedido: comercialProcedure
    .input(z.object({ pedidoId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma!.pedidoOperacionalAuditoria.findMany({
        where: { pedidoId: input.pedidoId },
        orderBy: { criadoEm: "desc" },
      }),
    ),

  relatorioHistorico: comercialProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
        contaAzulCustomerId: z.string().optional(),
        status: statusSchema.optional(),
        busca: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const busca = input.busca?.trim();
      const pedidos = await ctx.prisma!.pedidoOperacional.findMany({
        where: {
          dataEntrega: { gte: inicioDia(input.inicio), lte: fimDia(input.fim) },
          ...(input.contaAzulCustomerId ? { contaAzulCustomerId: input.contaAzulCustomerId } : {}),
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
          avarias: { include: { produto: true, criadoPor: { select: { nome: true, email: true } } } },
          criadoPor: { select: { nome: true, email: true } },
          editadoPor: { select: { nome: true, email: true } },
          auditoria: { orderBy: { criadoEm: "desc" }, take: 5 },
        },
        orderBy: [{ dataEntrega: "desc" }, { cliente: { nome: "asc" } }, { criadoEm: "desc" }],
        take: 500,
      });
      const vendasContaAzulRaw = await ctx.prisma!.pedido.findMany({
        where: {
          origemPedido: OrigemPedido.CONTA_AZUL,
          dataPedido: { gte: inicioDia(input.inicio), lte: fimDia(input.fim) },
          ...(input.contaAzulCustomerId ? { cliente: { externalId: input.contaAzulCustomerId } } : {}),
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
          cliente: { select: { id: true, externalId: true, nome: true, cnpjCpf: true } },
          itens: true,
        },
        orderBy: [{ dataPedido: "desc" }, { cliente: { nome: "asc" } }],
        take: 500,
      });
      const vendasContaAzul = vendasContaAzulRaw.filter((p) => classificarStatusPedido(p.statusPedido) === "venda");

      const statusResumo = STATUS_PEDIDO.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: 0 }), {});
      const clientes = new Set<string>();
      const produtos = new Map<string, { nome: string; categoria: string | null; quantidade: number; pedidos: number }>();
      const operacionalPorCliente = new Map<string, { clienteNome: string; pedidos: number; unidades: number; valorEstimado: number }>();
      const contaAzulPorCliente = new Map<string, { clienteNome: string; pedidos: number; unidades: number; valorLiquido: number }>();
      let unidades = 0;
      let valorEstimado = 0;
      let unidadesContaAzul = 0;
      let valorContaAzul = 0;

      for (const pedido of pedidos) {
        statusResumo[pedido.status] = (statusResumo[pedido.status] ?? 0) + 1;
        clientes.add(pedido.contaAzulCustomerId);
        const opCliente = operacionalPorCliente.get(pedido.contaAzulCustomerId) ?? {
          clienteNome: pedido.cliente?.nome ?? pedido.contaAzulCustomerId,
          pedidos: 0,
          unidades: 0,
          valorEstimado: 0,
        };
        if (pedido.status !== "CANCELADO") opCliente.pedidos += 1;
        for (const item of pedido.itens) {
          const quantidade = Number(item.quantidade);
          unidades += quantidade;
          const valorItem = quantidade * (money(item.precoUnit) ?? 0);
          valorEstimado += valorItem;
          if (pedido.status !== "CANCELADO") {
            opCliente.unidades += quantidade;
            opCliente.valorEstimado += valorItem;
          }
          const key = item.produtoNome;
          const atual = produtos.get(key) ?? { nome: item.produtoNome, categoria: item.categoria, quantidade: 0, pedidos: 0 };
          atual.quantidade += quantidade;
          atual.pedidos += 1;
          produtos.set(key, atual);
        }
        operacionalPorCliente.set(pedido.contaAzulCustomerId, opCliente);
      }

      for (const venda of vendasContaAzul) {
        const contaAzulCustomerId = venda.cliente.externalId ?? venda.cliente.id;
        const comp = composicaoDoPedidoParaDashboard(venda);
        const totalUnidades = venda.itens.reduce((sum, item) => sum + Number(item.quantidade), 0);
        unidadesContaAzul += totalUnidades;
        valorContaAzul += comp.valorLiquido;
        const atual = contaAzulPorCliente.get(contaAzulCustomerId) ?? {
          clienteNome: venda.cliente.nome,
          pedidos: 0,
          unidades: 0,
          valorLiquido: 0,
        };
        atual.pedidos += 1;
        atual.unidades += totalUnidades;
        atual.valorLiquido += comp.valorLiquido;
        contaAzulPorCliente.set(contaAzulCustomerId, atual);
      }

      const chavesConciliacao = new Set([...Array.from(operacionalPorCliente.keys()), ...Array.from(contaAzulPorCliente.keys())]);
      const conciliacaoContaAzul = Array.from(chavesConciliacao)
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
            contaAzul: ca ?? { pedidos: 0, unidades: 0, valorLiquido: 0 },
            diffPedidos,
            diffUnidades,
            diffValor,
            divergente: diffPedidos !== 0 || Math.abs(diffUnidades) > 0.001 || Math.abs(diffValor) > 0.01,
          };
        })
        .sort((a, b) => Number(b.divergente) - Number(a.divergente) || Math.abs(b.diffValor) - Math.abs(a.diffValor));

      return {
        resumo: {
          pedidos: pedidos.length,
          clientes: clientes.size,
          unidades,
          produtos: produtos.size,
          valorEstimado,
          status: statusResumo,
          contaAzulPedidos: vendasContaAzul.length,
          contaAzulUnidades: unidadesContaAzul,
          contaAzulValor: valorContaAzul,
          diferencaValorContaAzul: valorEstimado - valorContaAzul,
          clientesDivergentesContaAzul: conciliacaoContaAzul.filter((r) => r.divergente).length,
        },
        produtos: Array.from(produtos.values()).sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")),
        pedidos,
        contaAzul: {
          vendas: vendasContaAzul.map((p) => ({ ...p, valorLiquidoDashboard: composicaoDoPedidoParaDashboard(p).valorLiquido })),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const busca = input.busca?.trim();
      const avarias = await ctx.prisma!.pedidoOperacionalAvaria.findMany({
        where: {
          dataEntrega: { gte: inicioDia(input.inicio), lte: fimDia(input.fim) },
          ...(input.contaAzulCustomerId ? { contaAzulCustomerId: input.contaAzulCustomerId } : {}),
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
          pedido: { select: { id: true, status: true, tipoVenda: true, observacoes: true } },
          criadoPor: { select: { nome: true, email: true } },
        },
        orderBy: [{ dataEntrega: "desc" }, { cliente: { nome: "asc" } }, { produtoNome: "asc" }],
        take: 1000,
      });

      const clientes = new Set<string>();
      const produtos = new Map<string, { nome: string; categoria: string | null; quantidade: number; linhas: number }>();
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
        produtos: Array.from(produtos.values()).sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR")),
        avarias,
      };
    }),

  compras: comercialProcedure
    .input(z.object({ dia: z.coerce.date(), incluirOcultos: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const [pedidosDb, produtosDb, cfgRow] = await Promise.all([
        ctx.prisma!.pedidoOperacional.findMany({
          where: {
            dataEntrega: { gte: inicioDia(input.dia), lte: fimDia(input.dia) },
            status: { not: "CANCELADO" },
          },
          include: { itens: { include: { produto: true } } },
        }),
        ctx.prisma!.produtoComercial.findMany({ orderBy: { nome: "asc" } }),
        ctx.prisma!.estoqueVivoConfig.findUnique({ where: { id: "default" } }),
      ]);

      const pedidosLinhas: LinhaPedidoEstoque[] = [];
      for (const pedido of pedidosDb) {
        for (const item of pedido.itens) {
          pedidosLinhas.push({
            nome: item.produto.nome,
            quantidade: Number(item.quantidade),
          });
        }
      }

      const cfgMix = normalizeEstoqueMixFolhaLeve(
        cfgRow
          ? { referenciaProduto: cfgRow.mixReferenciaNome, variedades: cfgRow.mixVariedades }
          : ESTOQUE_MIX_FOLHA_PADRAO,
      );

      const produtosCfg: ConfigProdutoEstoque[] = produtosDb.map((p) => {
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

      const resultado = buildEstoqueVivoDia(pedidosLinhas, produtosCfg, cfgMix, {
        incluirOcultos: input.incluirOcultos,
      });

      const produtoPorId = new Map(produtosDb.map((p) => [p.id, p]));

      return {
        ...resultado,
        linhas: resultado.linhas
          .map((linha) => ({
            ...linha,
            produto: linha.produtoId ? produtoPorId.get(linha.produtoId) ?? null : null,
          }))
          .sort(
            (a, b) =>
              b.quantidadePedido - a.quantidadePedido || a.nome.localeCompare(b.nome, "pt-BR"),
          ),
      };
    }),

  salvarConfigMixFolhaLeve: comercialProcedure
    .use(adminComercial)
    .input(
      z.object({
        referenciaProduto: z.string().min(1),
        variedades: z.array(z.string().min(1)).min(1),
      }),
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
    .use(adminComercial)
    .input(
      z.object({
        produtoId: z.string(),
        modoCompra: modoCompraSchema.optional(),
        fatorCompraUnidade: z.number().positive().nullable().optional(),
        rendimentoPorKg: z.number().positive().nullable().optional(),
        ocultoListaCompra: z.boolean().optional(),
        mixAtivo: z.boolean().optional(),
        mixFolhaLeve: z.boolean().optional(),
        mixProdutoReferenciaId: z.string().nullable().optional(),
        mixVariedades: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma!.produtoComercial.update({
        where: { id: input.produtoId },
        data: {
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
          mixVariedades: input.mixVariedades ? (input.mixVariedades as Prisma.InputJsonValue) : undefined,
        },
      }),
    ),
});
