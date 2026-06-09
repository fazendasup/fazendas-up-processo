import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { comercialProcedure, comercialRequirePerfis, publicProcedure, router } from "../../_core/trpc";
import { getComercialPrisma } from "../db";

const podeGerenciarEntregas = comercialRequirePerfis("ADMIN", "GERENTE_COMERCIAL", "COMERCIAL", "OPERACOES", "LOGISTICA");
const podeUsarModoEntregador = comercialRequirePerfis(
  "ADMIN",
  "GERENTE_COMERCIAL",
  "COMERCIAL",
  "OPERACOES",
  "LOGISTICA",
);
const paradaStatusSchema = z.enum(["PENDENTE", "EM_ROTA", "ENTREGUE", "PROBLEMA", "PULADA"]);
const localizacaoEntregaSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precisaoMetros: z.number().nullable().optional(),
});

type RegraOrdenacaoEntrega = {
  periodoEntrega?: string | null;
  horarioMaximoEntrega?: string | null;
};

function tokenPublico(prefixo: string) {
  return `${prefixo}_${randomBytes(16).toString("hex")}`;
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

function minutosDoHorario(horario: string | null | undefined): number | null {
  if (!horario) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(horario.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos) || horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
    return null;
  }
  return horas * 60 + minutos;
}

function prioridadeEntregaAutomatica(regra: RegraOrdenacaoEntrega | null | undefined): number {
  const periodoBase =
    regra?.periodoEntrega === "MANHA"
      ? 0
      : regra?.periodoEntrega === "TARDE"
        ? 12 * 60
        : 24 * 60;
  return minutosDoHorario(regra?.horarioMaximoEntrega) ?? periodoBase;
}

function localizacaoRota(rota: {
  compartilhamentoAtivo: boolean;
  ultimaLatitude: unknown;
  ultimaLongitude: unknown;
  ultimaPrecisaoMetros: unknown;
  ultimaLocalizacaoEm: Date | null;
}) {
  if (!rota.compartilhamentoAtivo || rota.ultimaLatitude == null || rota.ultimaLongitude == null) return null;
  return {
    latitude: Number(rota.ultimaLatitude),
    longitude: Number(rota.ultimaLongitude),
    precisaoMetros: rota.ultimaPrecisaoMetros == null ? null : Number(rota.ultimaPrecisaoMetros),
    atualizadaEm: rota.ultimaLocalizacaoEm,
  };
}

function previsaoEntregaPorFila(posicao: number | null) {
  if (!posicao) return null;
  const minimo = posicao === 1 ? 10 : 10 + (posicao - 1) * 20;
  const maximo = minimo + 15;
  return { minutosMin: minimo, minutosMax: maximo };
}

function resumirItens(itens: Array<{ produtoNome: string; quantidade: unknown; categoria: string | null }>) {
  return itens.slice(0, 5).map((item) => ({
    produtoNome: item.produtoNome,
    categoria: item.categoria,
    quantidade: Number(item.quantidade),
  }));
}

async function resolverEntregador(
  prisma: ReturnType<typeof getComercialPrisma>,
  entregadorId: string | null | undefined,
): Promise<{ entregadorId: string | null; entregadorNome: string | null }> {
  if (!entregadorId) return { entregadorId: null, entregadorNome: null };
  const entregador = await prisma.usuario.findUnique({
    where: { id: entregadorId },
    select: { nome: true, status: true },
  });
  if (!entregador || entregador.status !== "ATIVO") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Entregador inválido." });
  }
  return { entregadorId, entregadorNome: entregador.nome };
}

async function clientesPlanejados(prisma: ReturnType<typeof getComercialPrisma>, dia: Date) {
  const pedidos = await prisma.pedidoOperacional.findMany({
    where: {
      dataEntrega: { gte: inicioDia(dia), lte: fimDia(dia) },
      status: { not: "CANCELADO" },
    },
    include: {
      cliente: { include: { regraComercial: true } },
      itens: true,
      avarias: true,
    },
    orderBy: [{ cliente: { nome: "asc" } }, { criadoEm: "asc" }],
  });

  const grupos = new Map<
    string,
    {
      contaAzulCustomerId: string;
      cliente: (typeof pedidos)[number]["cliente"];
      prioridade: number;
      pedidos: typeof pedidos;
      itens: Array<{ produtoNome: string; quantidade: unknown; categoria: string | null }>;
      avariasCount: number;
    }
  >();

  for (const pedido of pedidos) {
    const key = pedido.contaAzulCustomerId;
    const prioridadeManual = pedido.prioridadeEntrega;
    const prioridade = prioridadeManual ?? prioridadeEntregaAutomatica(pedido.cliente?.regraComercial);
    const atual = grupos.get(key) ?? {
      contaAzulCustomerId: key,
      cliente: pedido.cliente,
      prioridade,
      pedidos: [],
      itens: [],
      avariasCount: 0,
    };
    atual.prioridade = Math.min(atual.prioridade, prioridade);
    atual.pedidos.push(pedido);
    atual.itens.push(...pedido.itens);
    atual.avariasCount += pedido.avarias.length;
    grupos.set(key, atual);
  }

  return Array.from(grupos.values())
    .sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      return (a.cliente?.nome ?? "").localeCompare(b.cliente?.nome ?? "", "pt-BR");
    })
    .map((grupo, index) => ({
      contaAzulCustomerId: grupo.contaAzulCustomerId,
      clienteId: grupo.cliente?.id ?? null,
      clienteNome: grupo.cliente?.nome ?? "Cliente sem cadastro",
      endereco: grupo.cliente?.endereco ?? null,
      telefoneWhatsapp: grupo.cliente?.telefoneWhatsapp ?? null,
      contatoPrincipal: grupo.cliente?.contatoPrincipal ?? null,
      periodoEntrega: grupo.cliente?.regraComercial?.periodoEntrega ?? null,
      horarioMaximoEntrega: grupo.cliente?.regraComercial?.horarioMaximoEntrega ?? null,
      prioridade: grupo.prioridade,
      ordemSugerida: index + 1,
      pedidosCount: grupo.pedidos.length,
      itensResumo: resumirItens(grupo.itens),
      itensCount: grupo.itens.length,
      avariasCount: grupo.avariasCount,
      statusPedidos: Array.from(new Set(grupo.pedidos.map((p) => p.status))),
    }));
}

function paradaParaResposta(parada: {
  id: string;
  rotaId: string;
  ordem: number;
  status: string;
  tokenPublico: string;
  contaAzulCustomerId: string;
  clienteId: string | null;
  observacoes: string | null;
  observacoesProblema: string | null;
  entregueEm: Date | null;
  problemaEm: Date | null;
  cliente?: {
    nome: string;
    endereco: string | null;
    telefoneWhatsapp: string | null;
    contatoPrincipal: string | null;
    regraComercial?: RegraOrdenacaoEntrega | null;
  } | null;
}) {
  return {
    id: parada.id,
    rotaId: parada.rotaId,
    ordem: parada.ordem,
    status: parada.status,
    tokenPublico: parada.tokenPublico,
    trackingUrl: `/rastreio/${parada.tokenPublico}`,
    contaAzulCustomerId: parada.contaAzulCustomerId,
    clienteId: parada.clienteId,
    clienteNome: parada.cliente?.nome ?? "Cliente sem cadastro",
    endereco: parada.cliente?.endereco ?? null,
    telefoneWhatsapp: parada.cliente?.telefoneWhatsapp ?? null,
    contatoPrincipal: parada.cliente?.contatoPrincipal ?? null,
    periodoEntrega: parada.cliente?.regraComercial?.periodoEntrega ?? null,
    horarioMaximoEntrega: parada.cliente?.regraComercial?.horarioMaximoEntrega ?? null,
    observacoes: parada.observacoes ?? null,
    observacoesProblema: parada.observacoesProblema ?? null,
    entregueEm: parada.entregueEm ?? null,
    problemaEm: parada.problemaEm ?? null,
  };
}

async function carregarRoteiro(prisma: ReturnType<typeof getComercialPrisma>, dia: Date) {
  const [rota, planejadas] = await Promise.all([
    prisma.rotaEntrega.findUnique({
      where: { dataEntrega: inicioDia(dia) },
      include: {
        paradas: {
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
          include: { cliente: { include: { regraComercial: true } } },
        },
        entregador: { select: { id: true, nome: true, email: true } },
      },
    }),
    clientesPlanejados(prisma, dia),
  ]);

  return {
    rota: rota
      ? {
          id: rota.id,
          dataEntrega: rota.dataEntrega,
          nome: rota.nome,
          status: rota.status,
          entregadorId: rota.entregadorId,
          entregadorNome: rota.entregadorNome ?? rota.entregador?.nome ?? null,
          compartilhamentoAtivo: rota.compartilhamentoAtivo,
          iniciadoEm: rota.iniciadoEm,
          encerradoEm: rota.encerradoEm,
          localizacao: localizacaoRota(rota),
          paradas: rota.paradas.map(paradaParaResposta),
        }
      : null,
    planejadas,
  };
}

async function sincronizarPedidosEntregue(
  prisma: ReturnType<typeof getComercialPrisma>,
  contaAzulCustomerId: string,
  dia: Date,
  usuarioId: string | null,
) {
  await prisma.pedidoOperacional.updateMany({
    where: {
      contaAzulCustomerId,
      dataEntrega: { gte: inicioDia(dia), lte: fimDia(dia) },
      status: { not: "CANCELADO" },
    },
    data: { status: "ENTREGUE", editadoPorId: usuarioId },
  });
}

export const entregasRouter = router({
  roteiro: comercialProcedure
    .use(podeUsarModoEntregador)
    .input(z.object({ dia: z.coerce.date() }))
    .query(async ({ ctx, input }) => carregarRoteiro(ctx.prisma!, input.dia)),

  listarEntregadores: comercialProcedure
    .use(podeGerenciarEntregas)
    .query(async ({ ctx }) =>
      ctx.prisma!.usuario.findMany({
        where: {
          status: "ATIVO",
          perfil: { in: ["LOGISTICA", "OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"] },
        },
        select: { id: true, nome: true, email: true, perfil: true },
        orderBy: { nome: "asc" },
      }),
    ),

  criarRotaManual: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(
      z.object({
        dia: z.coerce.date(),
        nome: z.string().optional(),
        entregadorId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED" });
      const dataEntrega = inicioDia(input.dia);
      const existente = await ctx.prisma!.rotaEntrega.findUnique({ where: { dataEntrega } });
      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma rota para este dia." });
      }
      const entregador = await resolverEntregador(ctx.prisma!, input.entregadorId);
      await ctx.prisma!.rotaEntrega.create({
        data: {
          dataEntrega,
          nome: input.nome?.trim() || `Rota manual ${dataEntrega.toLocaleDateString("pt-BR")}`,
          entregadorId: entregador.entregadorId,
          entregadorNome: entregador.entregadorNome,
          tokenPublico: tokenPublico("rota"),
          criadoPorId: usuario.id,
          atualizadoPorId: usuario.id,
        },
      });
      return carregarRoteiro(ctx.prisma!, input.dia);
    }),

  atualizarRota: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(
      z.object({
        rotaId: z.string(),
        nome: z.string().optional(),
        entregadorId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED" });
      const rota = await ctx.prisma!.rotaEntrega.findUnique({ where: { id: input.rotaId } });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      const entregador = await resolverEntregador(ctx.prisma!, input.entregadorId);
      await ctx.prisma!.rotaEntrega.update({
        where: { id: rota.id },
        data: {
          nome: input.nome?.trim() || rota.nome,
          entregadorId: input.entregadorId === undefined ? rota.entregadorId : entregador.entregadorId,
          entregadorNome: input.entregadorId === undefined ? rota.entregadorNome : entregador.entregadorNome,
          atualizadoPorId: usuario.id,
        },
      });
      return { success: true };
    }),

  excluirRota: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(z.object({ rotaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rota = await ctx.prisma!.rotaEntrega.findUnique({ where: { id: input.rotaId } });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      if (rota.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível excluir uma rota em andamento." });
      }
      await ctx.prisma!.rotaEntrega.delete({ where: { id: rota.id } });
      return { success: true };
    }),

  adicionarParadaManual: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(z.object({ rotaId: z.string(), contaAzulCustomerId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rota = await ctx.prisma!.rotaEntrega.findUnique({
        where: { id: input.rotaId },
        include: { paradas: { select: { ordem: true } } },
      });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      if (rota.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível adicionar parada em rota em andamento." });
      }
      const cliente = await ctx.prisma!.cliente.findUnique({
        where: { externalId: input.contaAzulCustomerId },
        select: { id: true },
      });
      if (!cliente) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      const [jaExiste, pedidosProgramados] = await Promise.all([
        ctx.prisma!.paradaEntrega.count({
          where: {
            rotaId: rota.id,
            contaAzulCustomerId: input.contaAzulCustomerId,
          },
        }),
        ctx.prisma!.pedidoOperacional.count({
          where: {
            contaAzulCustomerId: input.contaAzulCustomerId,
            dataEntrega: { gte: inicioDia(rota.dataEntrega), lte: fimDia(rota.dataEntrega) },
            status: { not: "CANCELADO" },
          },
        }),
      ]);
      if (jaExiste > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Cliente já está nesta rota." });
      }
      if (pedidosProgramados === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este cliente não possui entrega programada para o dia da rota.",
        });
      }
      const ordem = Math.max(0, ...rota.paradas.map((p) => p.ordem)) + 1;
      await ctx.prisma!.paradaEntrega.create({
        data: {
          rotaId: rota.id,
          contaAzulCustomerId: input.contaAzulCustomerId,
          clienteId: cliente.id,
          ordem,
          tokenPublico: tokenPublico("parada"),
        },
      });
      return carregarRoteiro(ctx.prisma!, rota.dataEntrega);
    }),

  removerParada: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(z.object({ paradaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const parada = await ctx.prisma!.paradaEntrega.findUnique({
        where: { id: input.paradaId },
        include: { rota: true },
      });
      if (!parada) throw new TRPCError({ code: "NOT_FOUND", message: "Parada não encontrada." });
      if (parada.rota.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível remover parada de rota em andamento." });
      }
      await ctx.prisma!.$transaction(async (tx) => {
        await tx.paradaEntrega.delete({ where: { id: parada.id } });
        const restantes = await tx.paradaEntrega.findMany({
          where: { rotaId: parada.rotaId },
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
          select: { id: true },
        });
        for (let index = 0; index < restantes.length; index++) {
          await tx.paradaEntrega.update({
            where: { id: restantes[index]!.id },
            data: { ordem: index + 1 },
          });
        }
      });
      return { success: true };
    }),

  gerarRoteiro: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(
      z.object({
        dia: z.coerce.date(),
        nome: z.string().optional(),
        entregadorId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED" });

      const planejadas = await clientesPlanejados(ctx.prisma!, input.dia);
      if (planejadas.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não há entregas planejadas para este dia." });
      }

      let entregadorNome: string | null = null;
      if (input.entregadorId) {
        const entregador = await ctx.prisma!.usuario.findUnique({
          where: { id: input.entregadorId },
          select: { nome: true, status: true },
        });
        if (!entregador || entregador.status !== "ATIVO") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Entregador inválido." });
        }
        entregadorNome = entregador.nome;
      }

      const dataEntrega = inicioDia(input.dia);
      const existente = await ctx.prisma!.rotaEntrega.findUnique({
        where: { dataEntrega },
        include: { paradas: true },
      });

      if (existente?.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A rota já está em andamento. Encerre antes de regenerar." });
      }

      const paradasExistentes = new Map(existente?.paradas.map((p) => [p.contaAzulCustomerId, p]) ?? []);

      const rota = existente
        ? await ctx.prisma!.rotaEntrega.update({
            where: { id: existente.id },
            data: {
              nome: input.nome?.trim() || existente.nome,
              entregadorId: input.entregadorId ?? existente.entregadorId,
              entregadorNome: entregadorNome ?? existente.entregadorNome,
              atualizadoPorId: usuario.id,
              status: existente.status === "CONCLUIDA" ? "PLANEJADA" : existente.status,
            },
          })
        : await ctx.prisma!.rotaEntrega.create({
            data: {
              dataEntrega,
              nome: input.nome?.trim() || `Rota ${dataEntrega.toLocaleDateString("pt-BR")}`,
              entregadorId: input.entregadorId ?? null,
              entregadorNome,
              tokenPublico: tokenPublico("rota"),
              criadoPorId: usuario.id,
              atualizadoPorId: usuario.id,
            },
          });

      const idsMantidos = new Set<string>();
      for (let index = 0; index < planejadas.length; index++) {
        const planejada = planejadas[index]!;
        const anterior = paradasExistentes.get(planejada.contaAzulCustomerId);
        if (anterior) {
          idsMantidos.add(anterior.id);
          await ctx.prisma!.paradaEntrega.update({
            where: { id: anterior.id },
            data: {
              ordem: index + 1,
              clienteId: planejada.clienteId,
            },
          });
        } else {
          await ctx.prisma!.paradaEntrega.create({
            data: {
              rotaId: rota.id,
              contaAzulCustomerId: planejada.contaAzulCustomerId,
              clienteId: planejada.clienteId,
              ordem: index + 1,
              tokenPublico: tokenPublico("parada"),
            },
          });
        }
      }

      if (existente) {
        await ctx.prisma!.paradaEntrega.deleteMany({
          where: {
            rotaId: rota.id,
            id: { notIn: Array.from(idsMantidos) },
            status: { in: ["PENDENTE", "PULADA"] },
          },
        });
      }

      return carregarRoteiro(ctx.prisma!, input.dia);
    }),

  salvarOrdem: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(z.object({ rotaId: z.string(), paradaIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const rota = await ctx.prisma!.rotaEntrega.findUnique({
        where: { id: input.rotaId },
        include: { paradas: true },
      });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      if (rota.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível reordenar rota em andamento." });
      }
      if (rota.paradas.length !== input.paradaIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Lista de paradas incompleta." });
      }
      const idsRota = new Set(rota.paradas.map((p) => p.id));
      if (!input.paradaIds.every((id) => idsRota.has(id))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Parada inválida para esta rota." });
      }

      await ctx.prisma!.$transaction(
        input.paradaIds.map((paradaId, index) =>
          ctx.prisma!.paradaEntrega.update({
            where: { id: paradaId },
            data: { ordem: index + 1 },
          }),
        ),
      );

      return { success: true };
    }),

  atribuirEntregador: comercialProcedure
    .use(podeGerenciarEntregas)
    .input(z.object({ rotaId: z.string(), entregadorId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      if (!usuario) throw new TRPCError({ code: "UNAUTHORIZED" });

      let entregadorNome: string | null = null;
      if (input.entregadorId) {
        const entregador = await ctx.prisma!.usuario.findUnique({
          where: { id: input.entregadorId },
          select: { nome: true, status: true },
        });
        if (!entregador || entregador.status !== "ATIVO") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Entregador inválido." });
        }
        entregadorNome = entregador.nome;
      }

      await ctx.prisma!.rotaEntrega.update({
        where: { id: input.rotaId },
        data: {
          entregadorId: input.entregadorId,
          entregadorNome,
          atualizadoPorId: usuario.id,
        },
      });
      return { success: true };
    }),

  iniciarRota: comercialProcedure
    .use(podeUsarModoEntregador)
    .input(z.object({ rotaId: z.string(), aceitouCompartilhamento: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.aceitouCompartilhamento) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "É necessário aceitar o compartilhamento de localização para iniciar a rota.",
        });
      }
      const rota = await ctx.prisma!.rotaEntrega.findUnique({
        where: { id: input.rotaId },
        include: { paradas: { orderBy: { ordem: "asc" } } },
      });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      if (rota.status === "CONCLUIDA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta rota já foi concluída." });
      }
      if (rota.status === "EM_ROTA") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta rota já está em andamento." });
      }
      if (rota.paradas.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A rota não possui paradas." });
      }

      const primeiraPendente = rota.paradas.find((p) => p.status === "PENDENTE");
      if (!primeiraPendente) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A rota não possui paradas pendentes." });
      }
      await ctx.prisma!.$transaction(async (tx) => {
        await tx.rotaEntrega.update({
          where: { id: rota.id },
          data: {
            status: "EM_ROTA",
            compartilhamentoAtivo: true,
            iniciadoEm: rota.iniciadoEm ?? new Date(),
            encerradoEm: null,
            atualizadoPorId: ctx.comercialUsuario?.id ?? null,
          },
        });
        if (primeiraPendente) {
          await tx.paradaEntrega.update({
            where: { id: primeiraPendente.id },
            data: { status: "EM_ROTA" },
          });
        }
      });

      return { success: true };
    }),

  encerrarRota: comercialProcedure
    .use(podeUsarModoEntregador)
    .input(z.object({ rotaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma!.rotaEntrega.update({
        where: { id: input.rotaId },
        data: {
          status: "CONCLUIDA",
          compartilhamentoAtivo: false,
          encerradoEm: new Date(),
          atualizadoPorId: ctx.comercialUsuario?.id ?? null,
        },
      });
      return { success: true };
    }),

  atualizarLocalizacao: comercialProcedure
    .use(podeUsarModoEntregador)
    .input(
      z.object({
        rotaId: z.string(),
        ...localizacaoEntregaSchema.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rota = await ctx.prisma!.rotaEntrega.findUnique({ where: { id: input.rotaId } });
      if (!rota) throw new TRPCError({ code: "NOT_FOUND", message: "Rota não encontrada." });
      if (rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A rota não está compartilhando localização." });
      }

      const agora = new Date();
      await ctx.prisma!.$transaction([
        ctx.prisma!.rotaEntrega.update({
          where: { id: input.rotaId },
          data: {
            ultimaLatitude: input.latitude,
            ultimaLongitude: input.longitude,
            ultimaPrecisaoMetros: input.precisaoMetros ?? null,
            ultimaLocalizacaoEm: agora,
          },
        }),
        ctx.prisma!.historicoLocalizacaoEntrega.create({
          data: {
            rotaId: input.rotaId,
            latitude: input.latitude,
            longitude: input.longitude,
            precisaoMetros: input.precisaoMetros ?? null,
          },
        }),
      ]);

      return { success: true, atualizadaEm: agora };
    }),

  atualizarParada: comercialProcedure
    .use(podeUsarModoEntregador)
    .input(
      z.object({
        paradaId: z.string(),
        status: paradaStatusSchema,
        observacoesProblema: z.string().optional(),
        localizacao: localizacaoEntregaSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usuario = ctx.comercialUsuario;
      const parada = await ctx.prisma!.paradaEntrega.findUnique({
        where: { id: input.paradaId },
        include: { rota: true },
      });
      if (!parada) throw new TRPCError({ code: "NOT_FOUND", message: "Parada não encontrada." });

      const agora = new Date();
      if (
        input.localizacao &&
        parada.rota.status === "EM_ROTA" &&
        parada.rota.compartilhamentoAtivo
      ) {
        await ctx.prisma!.$transaction([
          ctx.prisma!.rotaEntrega.update({
            where: { id: parada.rotaId },
            data: {
              ultimaLatitude: input.localizacao.latitude,
              ultimaLongitude: input.localizacao.longitude,
              ultimaPrecisaoMetros: input.localizacao.precisaoMetros ?? null,
              ultimaLocalizacaoEm: agora,
            },
          }),
          ctx.prisma!.historicoLocalizacaoEntrega.create({
            data: {
              rotaId: parada.rotaId,
              latitude: input.localizacao.latitude,
              longitude: input.localizacao.longitude,
              precisaoMetros: input.localizacao.precisaoMetros ?? null,
            },
          }),
        ]);
      }

      await ctx.prisma!.paradaEntrega.update({
        where: { id: parada.id },
        data: {
          status: input.status,
          observacoesProblema:
            input.status === "PROBLEMA" ? input.observacoesProblema?.trim() || "Problema na entrega" : null,
          entregueEm: input.status === "ENTREGUE" ? agora : parada.entregueEm,
          problemaEm: input.status === "PROBLEMA" ? agora : parada.problemaEm,
        },
      });

      if (input.status === "ENTREGUE") {
        await sincronizarPedidosEntregue(
          ctx.prisma!,
          parada.contaAzulCustomerId,
          parada.rota.dataEntrega,
          usuario?.id ?? null,
        );
      }

      if (input.status === "ENTREGUE" || input.status === "PROBLEMA" || input.status === "PULADA") {
        const proxima = await ctx.prisma!.paradaEntrega.findFirst({
          where: {
            rotaId: parada.rotaId,
            ordem: { gt: parada.ordem },
            status: { in: ["PENDENTE", "PULADA"] },
          },
          orderBy: { ordem: "asc" },
        });
        if (proxima) {
          await ctx.prisma!.paradaEntrega.update({
            where: { id: proxima.id },
            data: { status: parada.rota.status === "EM_ROTA" ? "EM_ROTA" : "PENDENTE" },
          });
        } else if (parada.rota.status === "EM_ROTA") {
          const pendentes = await ctx.prisma!.paradaEntrega.count({
            where: {
              rotaId: parada.rotaId,
              status: { in: ["PENDENTE", "EM_ROTA"] },
            },
          });
          if (pendentes === 0) {
            await ctx.prisma!.rotaEntrega.update({
              where: { id: parada.rotaId },
              data: {
                status: "CONCLUIDA",
                compartilhamentoAtivo: false,
                encerradoEm: agora,
              },
            });
          }
        }
      }

      return { success: true };
    }),

  rastrearPublico: publicProcedure
    .input(z.object({ token: z.string().min(8) }))
    .query(async ({ input }) => {
      const prisma = getComercialPrisma();
      const parada = await prisma.paradaEntrega.findUnique({
        where: { tokenPublico: input.token },
        include: {
          cliente: { select: { nome: true } },
          rota: {
            include: {
              paradas: {
                orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
                select: { id: true, ordem: true, status: true },
              },
            },
          },
        },
      });
      if (!parada) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rastreamento não encontrado." });
      }

      const compartilhando =
        parada.rota.compartilhamentoAtivo &&
        parada.rota.status === "EM_ROTA" &&
        (parada.status === "EM_ROTA" || parada.status === "PENDENTE");
      const fila = parada.rota.paradas.filter((p) => p.status === "EM_ROTA" || p.status === "PENDENTE");
      const filaIndex = fila.findIndex((p) => p.id === parada.id);
      const posicaoFila = compartilhando && filaIndex >= 0 ? filaIndex + 1 : null;
      const totalFila = compartilhando ? fila.length : null;
      const previsao = compartilhando ? previsaoEntregaPorFila(posicaoFila) : null;

      return {
        clienteNome: parada.cliente?.nome ?? "Sua entrega",
        statusParada: parada.status,
        statusRota: parada.rota.status,
        compartilhando,
        fila: {
          posicao: posicaoFila,
          total: totalFila,
          previsaoMinutos: previsao,
        },
        localizacao: compartilhando ? localizacaoRota(parada.rota) : null,
        entregueEm: parada.entregueEm,
        problemaEm: parada.problemaEm,
        observacoesProblema: parada.status === "PROBLEMA" ? parada.observacoesProblema : null,
      };
    }),
});
