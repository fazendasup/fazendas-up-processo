import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma, TipoCliente } from "../generated/prisma/index.js";
import { comercialProcedure, comercialRequirePerfis, router } from "../../_core/trpc";
import { GO_LIVE_PEDIDOS, inicioSemana, rotuloSemana } from "../lib/semana.js";

const editorComercial = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL", "COMERCIAL", "OPERACOES");

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

async function registrarAuditoriaPedido(
  prisma: Prisma.TransactionClient,
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

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const varejoRouter = router({
  // ---------------- Redes (grupos de clientes) ----------------

  listarRedes: comercialProcedure
    .input(z.object({ apenasSupermercado: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const redes = await ctx.prisma!.grupoCliente.findMany({
        where: input?.apenasSupermercado ? { tipo: "SUPERMERCADO" } : {},
        orderBy: { nome: "asc" },
        include: {
          clientes: {
            select: { id: true, nome: true, externalId: true, tipo: true, statusRelacionamento: true },
            orderBy: { nome: "asc" },
          },
        },
      });
      return redes.map((r) => ({
        id: r.id,
        nome: r.nome,
        tipo: r.tipo,
        observacoes: r.observacoes,
        unidades: r.clientes,
        totalUnidades: r.clientes.length,
      }));
    }),

  salvarRede: comercialProcedure
    .use(editorComercial)
    .input(
      z.object({
        id: z.string().optional(),
        nome: z.string().min(1, "Nome da rede é obrigatório"),
        tipo: z.nativeEnum(TipoCliente).default("SUPERMERCADO"),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        nome: input.nome.trim(),
        tipo: input.tipo,
        observacoes: input.observacoes?.trim() || null,
      };
      return input.id
        ? ctx.prisma!.grupoCliente.update({ where: { id: input.id }, data })
        : ctx.prisma!.grupoCliente.create({ data });
    }),

  excluirRede: comercialProcedure
    .use(editorComercial)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Desvincula as unidades antes de remover a rede (o onDelete já é SetNull, mas deixamos explícito).
      await ctx.prisma!.cliente.updateMany({ where: { grupoId: input.id }, data: { grupoId: null } });
      await ctx.prisma!.grupoCliente.delete({ where: { id: input.id } });
      return { success: true };
    }),

  vincularUnidades: comercialProcedure
    .use(editorComercial)
    .input(z.object({ grupoId: z.string(), clienteIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma!.cliente.updateMany({
        where: { id: { in: input.clienteIds } },
        data: { grupoId: input.grupoId },
      });
      return { success: true, count: input.clienteIds.length };
    }),

  desvincularUnidade: comercialProcedure
    .use(editorComercial)
    .input(z.object({ clienteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma!.cliente.update({ where: { id: input.clienteId }, data: { grupoId: null } });
      return { success: true };
    }),

  /** Clientes do tipo supermercado (para montar redes e o filtro de unidade). */
  clientesSupermercado: comercialProcedure.query(async ({ ctx }) => {
    return ctx.prisma!.cliente.findMany({
      where: { tipo: "SUPERMERCADO" },
      select: { id: true, nome: true, externalId: true, grupoId: true, statusRelacionamento: true },
      orderBy: { nome: "asc" },
    });
  }),

  registrarAvariaCampo: comercialProcedure
    .input(
      z.object({
        clienteId: z.string().min(1, "Unidade é obrigatória"),
        dataEntrega: z.coerce.date(),
        pedidoOperacionalId: z.string().optional(),
        produtoId: z.string().min(1, "Variedade é obrigatória"),
        quantidade: z.number().positive("Quantidade deve ser maior que zero"),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário comercial não identificado" });
      }

      const [cliente, produto] = await Promise.all([
        ctx.prisma!.cliente.findUnique({ where: { id: input.clienteId } }),
        ctx.prisma!.produtoComercial.findFirst({
          where: {
            id: input.produtoId,
            ativo: true,
            importadoOperacao: true,
            contaAzulProdutoId: { not: null },
          },
        }),
      ]);

      if (!cliente?.externalId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unidade sem vínculo com Conta Azul. Vincule a unidade antes de lançar avarias.",
        });
      }
      if (!produto) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Variedade não encontrada ou inativa." });
      }
      if (antesDoCortePedidos(input.dataEntrega)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pedidos operacionais começam em 01/06/2026." });
      }

      const dataEntrega = inicioDia(input.dataEntrega);
      const observacoes = input.observacoes?.trim() || null;

      return ctx.prisma!.$transaction(async (tx) => {
        let pedido = input.pedidoOperacionalId
          ? await tx.pedidoOperacional.findFirst({
              where: {
                id: input.pedidoOperacionalId,
                contaAzulCustomerId: cliente.externalId!,
                status: { not: "CANCELADO" },
              },
              include: { avarias: true, itens: true, pedidoContaAzul: { select: { numeroVenda: true } } },
            })
          : await tx.pedidoOperacional.findFirst({
              where: {
                contaAzulCustomerId: cliente.externalId!,
                dataEntrega: { gte: dataEntrega, lte: fimDia(dataEntrega) },
                status: { not: "CANCELADO" },
              },
              include: { avarias: true, itens: true, pedidoContaAzul: { select: { numeroVenda: true } } },
              orderBy: { criadoEm: "asc" },
            });
        let pedidoCriado = false;

        if (input.pedidoOperacionalId && !pedido) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Pedido operacional selecionado não encontrado para esta unidade.",
          });
        }

        if (!pedido) {
          pedido = await tx.pedidoOperacional.create({
            data: {
              clienteId: cliente.id,
              contaAzulCustomerId: cliente.externalId!,
              dataEntrega,
              diaSemana: dataEntrega.getDay(),
              tipoVenda: "AVULSO",
              observacoes: "Registro criado automaticamente por lançamento de avaria em campo.",
              criadoPorId: usuario.id,
              editadoPorId: usuario.id,
            },
            include: { avarias: true, itens: true, pedidoContaAzul: { select: { numeroVenda: true } } },
          });
          pedidoCriado = true;
        }

        const avaria = await tx.pedidoOperacionalAvaria.create({
          data: {
            pedidoId: pedido.id,
            clienteId: cliente.id,
            contaAzulCustomerId: cliente.externalId!,
            dataEntrega,
            produtoId: produto.id,
            produtoNome: produto.nome,
            categoria: produto.categoria,
            quantidade: new Prisma.Decimal(input.quantidade),
            observacoes,
            criadoPorId: usuario.id,
          },
        });

        await registrarAuditoriaPedido(
          tx,
          pedido.id,
          { id: usuario.id, nome: usuario.nome },
          "avaria_campo_registrada",
          pedidoCriado ? null : { avariasAntes: pedido.avarias.length },
          {
            avariaId: avaria.id,
            produtoId: produto.id,
            produtoNome: produto.nome,
            quantidade: input.quantidade,
            dataEntrega,
            observacoes,
            origem: "acompanhamento_avarias",
            pedidoCriado,
            numeroVenda: pedido.pedidoContaAzul?.numeroVenda ?? null,
          },
        );

        return {
          success: true,
          pedidoId: pedido.id,
          avariaId: avaria.id,
          pedidoCriado,
          numeroVenda: pedido.pedidoContaAzul?.numeroVenda ?? null,
        };
      });
    }),

  // ---------------- Relatório de varejo (vendas + avarias) ----------------

  relatorio: comercialProcedure
    .input(
      z
        .object({
          grupoId: z.string().optional(),
          unidadeClienteId: z.string().optional(),
          inicio: z.coerce.date(),
          fim: z.coerce.date(),
        })
        .refine((v) => v.grupoId || v.unidadeClienteId, {
          message: "Informe uma rede ou uma unidade.",
        }),
    )
    .query(async ({ ctx, input }) => {
      const prisma = ctx.prisma!;

      // Resolve as unidades-alvo (Clientes).
      const unidades = input.unidadeClienteId
        ? await prisma.cliente.findMany({ where: { id: input.unidadeClienteId } })
        : await prisma.cliente.findMany({ where: { grupoId: input.grupoId } });

      if (unidades.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma unidade encontrada para o filtro informado." });
      }

      const externalIds = unidades.map((u) => u.externalId).filter((x): x is string => !!x);
      const nomePorConta = new Map(unidades.map((u) => [u.externalId ?? "", u.nome]));
      const inicio = inicioDia(input.inicio);
      const fim = fimDia(input.fim);

      if (externalIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "As unidades selecionadas não têm vínculo com a Conta Azul (external_id).",
        });
      }

      const [pedidos, avarias, regras, produtos] = await Promise.all([
        prisma.pedidoOperacional.findMany({
          where: { contaAzulCustomerId: { in: externalIds }, dataEntrega: { gte: inicio, lte: fim } },
          include: { itens: true },
        }),
        prisma.pedidoOperacionalAvaria.findMany({
          where: { contaAzulCustomerId: { in: externalIds }, dataEntrega: { gte: inicio, lte: fim } },
          include: {
            criadoPor: { select: { nome: true, email: true } },
            pedido: { select: { id: true, status: true, tipoVenda: true } },
          },
        }),
        prisma.regraComercialCliente.findMany({
          where: { contaAzulCustomerId: { in: externalIds } },
          include: { precosEspeciais: true },
        }),
        prisma.produtoComercial.findMany({
          where: { contaAzulProdutoId: { not: null }, importadoOperacao: true, ativo: true },
          select: { id: true, nome: true, precoBase: true, categoria: true },
        }),
      ]);

      // Mapa de preço por (cliente, produto) com base nas regras comerciais; fallback no precoBase.
      const precoBasePorProduto = new Map(produtos.map((p) => [p.id, num(p.precoBase)]));
      const precoEspecial = new Map<string, number>(); // `${contaAzulCustomerId}:${produtoId}` -> preco
      for (const regra of regras) {
        for (const pe of regra.precosEspeciais) {
          precoEspecial.set(`${regra.contaAzulCustomerId}:${pe.produtoId}`, num(pe.preco));
        }
      }
      const precoUnitario = (contaAzulCustomerId: string, produtoId: string): number => {
        return precoEspecial.get(`${contaAzulCustomerId}:${produtoId}`) ?? precoBasePorProduto.get(produtoId) ?? 0;
      };

      // ----- Pedidos entregues: volume validado (sem expor faturamento no relatório do cliente) -----
      let volumeEntregue = 0;
      let pedidosEntregues = 0;
      let pedidosCancelados = 0;
      let pedidosTotais = pedidos.length;

      const entregueQtdPorProduto = new Map<string, number>();
      const sugestaoPorUnidadeProduto = new Map<
        string,
        {
          contaAzulCustomerId: string;
          unidade: string;
          produtoId: string;
          produtoNome: string;
          categoria: string | null;
          entregueQtd: number;
          avariaQtd: number;
          datasEntrega: Set<string>;
        }
      >();
      const serie = new Map<number, { entregue: number; avaria: number; valorPerdido: number; rotulo: string }>();
      const porUnidade = new Map<
        string,
        { contaAzulCustomerId: string; nome: string; entregueQtd: number; avariaQtd: number; valorPerdido: number }
      >();

      const initSerie = (d: Date) => {
        const k = inicioSemana(d).getTime();
        if (!serie.has(k)) serie.set(k, { entregue: 0, avaria: 0, valorPerdido: 0, rotulo: rotuloSemana(inicioSemana(d)) });
        return serie.get(k)!;
      };
      const initUnidade = (conta: string) => {
        if (!porUnidade.has(conta)) {
          porUnidade.set(conta, {
            contaAzulCustomerId: conta,
            nome: nomePorConta.get(conta) ?? conta,
            entregueQtd: 0,
            avariaQtd: 0,
            valorPerdido: 0,
          });
        }
        return porUnidade.get(conta)!;
      };
      const initSugestao = (conta: string, produtoId: string, produtoNome: string, categoria: string | null) => {
        const key = `${conta}:${produtoId}`;
        if (!sugestaoPorUnidadeProduto.has(key)) {
          sugestaoPorUnidadeProduto.set(key, {
            contaAzulCustomerId: conta,
            unidade: nomePorConta.get(conta) ?? conta,
            produtoId,
            produtoNome,
            categoria,
            entregueQtd: 0,
            avariaQtd: 0,
            datasEntrega: new Set<string>(),
          });
        }
        return sugestaoPorUnidadeProduto.get(key)!;
      };

      for (const p of pedidos) {
        if (p.status === "ENTREGUE") {
          pedidosEntregues++;
          const u = initUnidade(p.contaAzulCustomerId);
          const s = initSerie(p.dataEntrega);
          for (const item of p.itens) {
            const q = num(item.quantidade);
            volumeEntregue += q;
            u.entregueQtd += q;
            s.entregue += q;
            entregueQtdPorProduto.set(item.produtoId, (entregueQtdPorProduto.get(item.produtoId) ?? 0) + q);
            const sugestao = initSugestao(p.contaAzulCustomerId, item.produtoId, item.produtoNome, item.categoria);
            sugestao.entregueQtd += q;
            sugestao.datasEntrega.add(inicioDia(p.dataEntrega).toISOString());
          }
        } else if (p.status === "CANCELADO") {
          pedidosCancelados++;
        }
      }

      // ----- Avarias: quantidade, valor perdido, recortes -----
      let avariaQtdTotal = 0;
      let valorPerdidoTotal = 0;
      const avariaPorProduto = new Map<
        string,
        { produtoId: string; nome: string; categoria: string | null; quantidade: number; valorPerdido: number }
      >();
      const avariaPorCategoria = new Map<string, number>();
      const avariaPorDiaSemana = new Array(7).fill(0) as number[];

      for (const a of avarias) {
        const q = num(a.quantidade);
        const preco = precoUnitario(a.contaAzulCustomerId, a.produtoId);
        const valor = q * preco;
        avariaQtdTotal += q;
        valorPerdidoTotal += valor;

        const prod = avariaPorProduto.get(a.produtoId) ?? {
          produtoId: a.produtoId,
          nome: a.produtoNome,
          categoria: a.categoria,
          quantidade: 0,
          valorPerdido: 0,
        };
        prod.quantidade += q;
        prod.valorPerdido += valor;
        avariaPorProduto.set(a.produtoId, prod);

        const cat = a.categoria || "Sem categoria";
        avariaPorCategoria.set(cat, (avariaPorCategoria.get(cat) ?? 0) + q);
        avariaPorDiaSemana[new Date(a.dataEntrega).getDay()] += q;

        const u = initUnidade(a.contaAzulCustomerId);
        u.avariaQtd += q;
        u.valorPerdido += valor;
        const sugestao = initSugestao(a.contaAzulCustomerId, a.produtoId, a.produtoNome, a.categoria);
        sugestao.avariaQtd += q;
        const s = initSerie(a.dataEntrega);
        s.avaria += q;
        s.valorPerdido += valor;
      }

      const taxaAvaria = volumeEntregue > 0 ? (avariaQtdTotal / volumeEntregue) * 100 : 0;
      const totalResolvidos = pedidosEntregues + pedidosCancelados;
      const pontualidade = totalResolvidos > 0 ? (pedidosEntregues / totalResolvidos) * 100 : 0;

      // Top produtos por taxa de avaria % (avaria / entregue do produto)
      const topProdutosAvaria = Array.from(avariaPorProduto.values())
        .map((p) => {
          const entregue = entregueQtdPorProduto.get(p.produtoId) ?? 0;
          const taxa = entregue > 0 ? (p.quantidade / entregue) * 100 : null;
          return { ...p, entregueQtd: entregue, taxaAvaria: taxa };
        })
        .sort((a, b) => (b.taxaAvaria ?? 999) - (a.taxaAvaria ?? 999) || b.quantidade - a.quantidade)
        .slice(0, 10);

      const serieSemanal = Array.from(serie.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v);

      const avariaCategorias = Array.from(avariaPorCategoria.entries())
        .map(([categoria, quantidade]) => ({ categoria, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);

      const avariaDias = avariaPorDiaSemana.map((quantidade, dia) => ({ dia: DIAS_SEMANA[dia], quantidade }));

      const breakdownUnidades = Array.from(porUnidade.values())
        .map((u) => ({
          ...u,
          taxaAvaria: u.entregueQtd > 0 ? (u.avariaQtd / u.entregueQtd) * 100 : null,
        }))
        .sort((a, b) => b.valorPerdido - a.valorPerdido);

      const sugestoesPedido = Array.from(sugestaoPorUnidadeProduto.values())
        .filter((s) => s.entregueQtd > 0)
        .map((s) => {
          const entregas = Math.max(1, s.datasEntrega.size);
          const mediaEntregue = s.entregueQtd / entregas;
          const mediaAvaria = s.avariaQtd / entregas;
          const taxaAvariaProduto = s.entregueQtd > 0 ? (s.avariaQtd / s.entregueQtd) * 100 : 0;
          const fatorReducao = taxaAvariaProduto >= 10 ? 1 : taxaAvariaProduto >= 5 ? 0.5 : 0;
          const quantidadeSugerida = Math.max(0, mediaEntregue - mediaAvaria * fatorReducao);
          const acao =
            taxaAvariaProduto >= 10
              ? "reduzir"
              : taxaAvariaProduto >= 5
                ? "ajustar"
                : "manter";
          const confianca = entregas >= 4 ? "alta" : entregas >= 2 ? "media" : "baixa";
          const motivo =
            acao === "reduzir"
              ? `Avaria alta (${taxaAvariaProduto.toFixed(1)}%). Sugestão reduz a média entregue pela média de perda.`
              : acao === "ajustar"
                ? `Avaria moderada (${taxaAvariaProduto.toFixed(1)}%). Sugestão reduz metade da perda média.`
                : `Avaria controlada (${taxaAvariaProduto.toFixed(1)}%). Manter média histórica.`;
          return {
            unidade: s.unidade,
            contaAzulCustomerId: s.contaAzulCustomerId,
            produtoId: s.produtoId,
            produtoNome: s.produtoNome,
            categoria: s.categoria,
            mediaEntregue,
            mediaAvaria,
            taxaAvaria: taxaAvariaProduto,
            quantidadeSugerida: Math.round(quantidadeSugerida * 10) / 10,
            entregasConsideradas: entregas,
            acao,
            confianca,
            motivo,
          };
        })
        .sort((a, b) => {
          const prioridade = { reduzir: 0, ajustar: 1, manter: 2 } as const;
          return prioridade[a.acao as keyof typeof prioridade] - prioridade[b.acao as keyof typeof prioridade] || b.taxaAvaria - a.taxaAvaria;
        })
        .slice(0, 16);

      // ----- Insights automáticos -----
      const insights: { tipo: "alerta" | "atencao" | "ok"; texto: string }[] = [];
      if (taxaAvaria >= 7) {
        insights.push({
          tipo: "alerta",
          texto: `Taxa de avaria de ${taxaAvaria.toFixed(1)}% no período — acima do saudável (>7%). Revise volumes de pedido.`,
        });
      } else if (taxaAvaria > 0 && taxaAvaria < 3) {
        insights.push({ tipo: "ok", texto: `Taxa de avaria de ${taxaAvaria.toFixed(1)}% — dentro do saudável (<3%).` });
      }
      const piorProduto = topProdutosAvaria.find((p) => p.taxaAvaria != null && p.taxaAvaria >= 10);
      if (piorProduto) {
        insights.push({
          tipo: "atencao",
          texto: `${piorProduto.nome}: ${piorProduto.taxaAvaria!.toFixed(1)}% de avaria. Considere reduzir o volume entregue desse item.`,
        });
      }
      const piorDia = avariaDias.reduce((acc, d) => (d.quantidade > acc.quantidade ? d : acc), avariaDias[0]);
      if (piorDia && piorDia.quantidade > 0 && avariaQtdTotal > 0) {
        insights.push({
          tipo: "atencao",
          texto: `Avarias concentradas na entrega de ${piorDia.dia.toLowerCase()} (${piorDia.quantidade} un). Avalie reduzir o volume desse dia.`,
        });
      }

      return {
        periodo: { inicio, fim },
        unidadesConsideradas: unidades.map((u) => ({ id: u.id, nome: u.nome, externalId: u.externalId })),
        kpis: {
          volumeEntregue,
          avariaQtdTotal,
          valorPerdidoTotal,
          taxaAvaria,
          pontualidade,
          pedidosTotais,
          pedidosEntregues,
          pedidosCancelados,
        },
        topProdutosAvaria,
        avariaCategorias,
        avariaDias,
        serieSemanal,
        breakdownUnidades,
        sugestoesPedido,
        lancamentosRecentes: avarias
          .slice()
          .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
          .slice(0, 20)
          .map((a) => ({
            id: a.id,
            pedidoId: a.pedidoId,
            unidade: nomePorConta.get(a.contaAzulCustomerId) ?? a.contaAzulCustomerId,
            dataEntrega: a.dataEntrega,
            produtoNome: a.produtoNome,
            categoria: a.categoria,
            quantidade: num(a.quantidade),
            observacoes: a.observacoes,
            criadoEm: a.criadoEm,
            criadoPorNome: a.criadoPor?.nome ?? a.criadoPor?.email ?? null,
            statusPedido: a.pedido.status,
          })),
        insights,
      };
    }),
});
