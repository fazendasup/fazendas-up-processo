import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  calcularPagamentoDiaTerceiro,
  formatarCpf,
  horaParaMinutos,
  validarCpf,
} from "@shared/terceirosPagamento";
import {
  ajustarRegistroAdmin,
  deleteRegistroAdmin,
  deleteRegistroPrestador,
  getPrestadorById,
  getPrestadorByToken,
  identificarPrestador,
  listAjustesPorPrestador,
  listAjustesPorRegistroIds,
  listPrestadoresAdmin,
  listRegistrosAdmin,
  listRegistrosPrestador,
  setRegistroPago,
  softDeletePrestador,
  updatePrestadorAdmin,
  upsertRegistroPrestador,
} from "../terceirosDb";

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");
const horaHm = z
  .string()
  .min(4)
  .max(8)
  .transform(s => {
    const t = s.trim();
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    return `${m[1]!.padStart(2, "0")}:${m[2]}`;
  })
  .refine(s => /^\d{2}:\d{2}$/.test(s), "Hora inválida (HH:mm)");

function assertHorarios(entrada: string, saida: string) {
  const e = horaParaMinutos(entrada);
  const s = horaParaMinutos(saida);
  if (e == null || s == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Horário inválido.",
    });
  }
  if (s === e) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Hora de saída deve ser diferente da entrada.",
    });
  }
  // s < e = jornada noturna (saída no dia seguinte) — permitido.
}

async function assertToken(token: string) {
  const prestador = await getPrestadorByToken(token);
  if (!prestador) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessão inválida. Identifique-se novamente com CPF e nome.",
    });
  }
  return prestador;
}

function parseDiariaBase(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** MySQL/drizzle pode devolver boolean como 0/1. */
function parseAlmocoOverride(
  raw: boolean | number | string | null | undefined,
): boolean | null {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  return null;
}

function mapAjuste(a: {
  id: number;
  registroId: number;
  tipo: string;
  descricao: string;
  createdAt: Date;
}) {
  return {
    id: a.id,
    registroId: a.registroId,
    tipo: a.tipo,
    descricao: a.descricao,
    createdAt: a.createdAt,
  };
}

/** true = desconta almoço no horário; false = traz o próprio. */
function parseDescontaAlmoco(
  raw: boolean | number | string | null | undefined,
): boolean {
  if (raw === false || raw === 0 || raw === "0") return false;
  return true;
}

function registroComPagamento(
  r: {
    id: number;
    dataServico: string;
    horaEntrada: string;
    horaSaida: string;
    almocouNaEmpresaOverride?: boolean | null;
    pagoAt: Date | null;
    createdAt: Date;
  },
  diariaBase?: number | null,
  ajustes: Array<{
    id: number;
    registroId: number;
    tipo: string;
    descricao: string;
    createdAt: Date;
  }> = [],
  descontaAlmoco = true,
) {
  const override = parseAlmocoOverride(r.almocouNaEmpresaOverride);
  const pagamento = calcularPagamentoDiaTerceiro({
    horaEntrada: r.horaEntrada,
    horaSaida: r.horaSaida,
    diariaBase,
    almocouNaEmpresaOverride: override,
    descontaAlmoco,
  });
  const pago = r.pagoAt != null;
  return {
    id: r.id,
    dataServico: r.dataServico,
    horaEntrada: r.horaEntrada,
    horaSaida: r.horaSaida,
    almocouNaEmpresaOverride: override,
    pago,
    pagoAt: r.pagoAt,
    createdAt: r.createdAt,
    pagamento,
    valorTotal: pagamento?.valorTotal ?? 0,
    ajustes: ajustes.map(mapAjuste),
  };
}

export const terceirosRouter = router({
  /** CPF + nome → cria/atualiza prestador e devolve token de sessão. */
  identificar: publicProcedure
    .input(
      z.object({
        cpf: z.string().min(11).max(18),
        nomeCompleto: z.string().min(3).max(255),
      }),
    )
    .mutation(async ({ input }) => {
      if (!validarCpf(input.cpf)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF inválido.",
        });
      }
      try {
        const p = await identificarPrestador(input);
        return {
          prestadorId: p.id,
          nomeCompleto: p.nomeCompleto,
          cpfMascarado: formatarCpf(p.cpf),
          acessoToken: p.acessoToken,
        };
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Falha ao identificar.",
        });
      }
    }),

  /** Sessão atual (histórico próprio + em aberto + ajustes admin). */
  meuHistorico: publicProcedure
    .input(z.object({ acessoToken: z.string().min(16) }))
    .query(async ({ input }) => {
      const p = await assertToken(input.acessoToken);
      const diaria = parseDiariaBase(p.diariaBase);
      const descontaAlmoco = parseDescontaAlmoco(p.descontaAlmoco);
      const regs = await listRegistrosPrestador(p.id);
      const ajustesAll = await listAjustesPorPrestador(p.id);
      const porReg = new Map<number, typeof ajustesAll>();
      for (const a of ajustesAll) {
        const list = porReg.get(a.registroId) ?? [];
        list.push(a);
        porReg.set(a.registroId, list);
      }
      const registros = regs.map(r =>
        registroComPagamento(
          r,
          diaria,
          porReg.get(r.id) ?? [],
          descontaAlmoco,
        ),
      );
      const emAberto = Math.round(
        registros
          .filter(r => !r.pago)
          .reduce((s, r) => s + r.valorTotal, 0) * 100,
      ) / 100;
      const jaPago = Math.round(
        registros
          .filter(r => r.pago)
          .reduce((s, r) => s + r.valorTotal, 0) * 100,
      ) / 100;
      return {
        prestador: {
          id: p.id,
          nomeCompleto: p.nomeCompleto,
          cpfMascarado: formatarCpf(p.cpf),
          diariaBase: diaria,
          observacao: p.observacao,
          descontaAlmoco,
        },
        registros,
        ajustes: ajustesAll.map(mapAjuste),
        emAberto,
        jaPago,
      };
    }),

  salvarRegistro: publicProcedure
    .input(
      z.object({
        acessoToken: z.string().min(16),
        dataServico: dataIso,
        horaEntrada: horaHm,
        horaSaida: horaHm,
      }),
    )
    .mutation(async ({ input }) => {
      const p = await assertToken(input.acessoToken);
      assertHorarios(input.horaEntrada, input.horaSaida);
      const row = await upsertRegistroPrestador({
        prestadorId: p.id,
        dataServico: input.dataServico,
        horaEntrada: input.horaEntrada,
        horaSaida: input.horaSaida,
      });
      const { dispararPushNotificacao } = await import("../pushService");
      dispararPushNotificacao({
        categoria: "terceiros",
        titulo: "Registro de terceiro",
        corpo: `${p.nomeCompleto} registrou ${input.horaEntrada}–${input.horaSaida} em ${input.dataServico}.`,
        url: "/terceiros-admin",
        tag: `terceiro-${row.id}`,
      });
      const ajustes = await listAjustesPorRegistroIds([row.id]);
      return registroComPagamento(
        row,
        parseDiariaBase(p.diariaBase),
        ajustes,
        parseDescontaAlmoco(p.descontaAlmoco),
      );
    }),

  excluirMeuRegistro: publicProcedure
    .input(
      z.object({
        acessoToken: z.string().min(16),
        registroId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const p = await assertToken(input.acessoToken);
      const regs = await listRegistrosPrestador(p.id);
      const alvo = regs.find(r => r.id === input.registroId);
      if (!alvo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro não encontrado.",
        });
      }
      if (alvo.pagoAt != null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dia já pago não pode ser removido. Contate a administração.",
        });
      }
      await deleteRegistroPrestador(p.id, input.registroId);
      return { ok: true as const };
    }),

  /** Admin: lista prestadores ativos. */
  listPrestadores: adminProcedure.query(async () => {
    const rows = await listPrestadoresAdmin();
    return rows.map(p => ({
      id: p.id,
      cpfMascarado: formatarCpf(p.cpf),
      cpf: p.cpf,
      nomeCompleto: p.nomeCompleto,
      diariaBase: parseDiariaBase(p.diariaBase),
      observacao: p.observacao,
      descontaAlmoco: parseDescontaAlmoco(p.descontaAlmoco),
      createdAt: p.createdAt,
    }));
  }),

  atualizarPrestador: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        diariaBase: z.number().positive().max(10_000).nullable().optional(),
        observacao: z.string().max(2000).nullable().optional(),
        descontaAlmoco: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const p = await updatePrestadorAdmin(input);
      return {
        id: p.id,
        cpfMascarado: formatarCpf(p.cpf),
        cpf: p.cpf,
        nomeCompleto: p.nomeCompleto,
        diariaBase: parseDiariaBase(p.diariaBase),
        observacao: p.observacao,
        descontaAlmoco: parseDescontaAlmoco(p.descontaAlmoco),
      };
    }),

  /** Admin: registros no período com cálculo de pagamento. */
  listRegistros: adminProcedure
    .input(
      z.object({
        inicio: dataIso,
        fim: dataIso,
        prestadorId: z.number().int().positive().nullable().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.fim < input.inicio) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Período inválido.",
        });
      }
      const rows = await listRegistrosAdmin({
        inicioIso: input.inicio,
        fimIso: input.fim,
        prestadorId: input.prestadorId,
      });
      const ajustesAll = await listAjustesPorRegistroIds(rows.map(r => r.id));
      const porReg = new Map<number, typeof ajustesAll>();
      for (const a of ajustesAll) {
        const list = porReg.get(a.registroId) ?? [];
        list.push(a);
        porReg.set(a.registroId, list);
      }

      const itens = rows.map(r => {
        const diaria = parseDiariaBase(r.diariaBase);
        const descontaAlmoco = parseDescontaAlmoco(r.descontaAlmoco);
        const base = registroComPagamento(
          r,
          diaria,
          porReg.get(r.id) ?? [],
          descontaAlmoco,
        );
        return {
          ...base,
          prestadorId: r.prestadorId,
          nomeCompleto: r.nomeCompleto,
          cpfMascarado: formatarCpf(r.cpf),
          diariaBase: diaria,
          observacao: r.observacao,
          descontaAlmoco,
        };
      });

      const porPrestador = new Map<
        number,
        {
          prestadorId: number;
          nomeCompleto: string;
          cpfMascarado: string;
          diariaBase: number | null;
          observacao: string | null;
          descontaAlmoco: boolean;
          dias: number;
          horasTrabalhadas: number;
          horasExtras: number;
          valorTotal: number;
          emAberto: number;
        }
      >();

      for (const it of itens) {
        const cur = porPrestador.get(it.prestadorId) ?? {
          prestadorId: it.prestadorId,
          nomeCompleto: it.nomeCompleto,
          cpfMascarado: it.cpfMascarado,
          diariaBase: it.diariaBase,
          observacao: it.observacao,
          descontaAlmoco: it.descontaAlmoco,
          dias: 0,
          horasTrabalhadas: 0,
          horasExtras: 0,
          valorTotal: 0,
          emAberto: 0,
        };
        cur.dias += 1;
        cur.horasTrabalhadas += it.pagamento?.horasTrabalhadas ?? 0;
        cur.horasExtras += it.pagamento?.horasExtras ?? 0;
        cur.valorTotal += it.valorTotal;
        if (!it.pago) cur.emAberto += it.valorTotal;
        porPrestador.set(it.prestadorId, cur);
      }

      const totais = {
        dias: itens.length,
        valorTotal: itens.reduce((s, i) => s + i.valorTotal, 0),
        emAberto: itens
          .filter(i => !i.pago)
          .reduce((s, i) => s + i.valorTotal, 0),
        horasExtras: itens.reduce(
          (s, i) => s + (i.pagamento?.horasExtras ?? 0),
          0,
        ),
      };

      return {
        itens,
        porPrestador: Array.from(porPrestador.values())
          .map(p => ({
            ...p,
            horasTrabalhadas: Math.round(p.horasTrabalhadas * 100) / 100,
            horasExtras: Math.round(p.horasExtras * 100) / 100,
            valorTotal: Math.round(p.valorTotal * 100) / 100,
            emAberto: Math.round(p.emAberto * 100) / 100,
          }))
          .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR")),
        totais: {
          dias: totais.dias,
          valorTotal: Math.round(totais.valorTotal * 100) / 100,
          emAberto: Math.round(totais.emAberto * 100) / 100,
          horasExtras: Math.round(totais.horasExtras * 100) / 100,
        },
      };
    }),

  /** Admin: ajusta horário e/ou desconto de alimentação; histórico visível ao PJ. */
  ajustarRegistro: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        horaEntrada: horaHm.optional(),
        horaSaida: horaHm.optional(),
        /** null = automático; true = almoço empresa; false = vale R$ 25 */
        almocouNaEmpresaOverride: z.boolean().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        input.horaEntrada != null &&
        input.horaSaida != null
      ) {
        assertHorarios(input.horaEntrada, input.horaSaida);
      } else if (input.horaEntrada != null || input.horaSaida != null) {
        // precisa ambos se alterar horário — busca atual no DB via ajustar
      }
      try {
        const { registro, ajustes } = await ajustarRegistroAdmin({
          id: input.id,
          horaEntrada: input.horaEntrada,
          horaSaida: input.horaSaida,
          almocouNaEmpresaOverride: input.almocouNaEmpresaOverride,
          adminUserId: ctx.user?.id ?? null,
        });
        assertHorarios(registro.horaEntrada, registro.horaSaida);
        const p = await getPrestadorById(registro.prestadorId);
        return registroComPagamento(
          registro,
          parseDiariaBase(p?.diariaBase),
          ajustes,
          parseDescontaAlmoco(p?.descontaAlmoco),
        );
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Falha ao ajustar.",
        });
      }
    }),

  marcarPago: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        pago: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const row = await setRegistroPago(input.id, input.pago);
      const p = await getPrestadorById(row.prestadorId);
      const ajustes = await listAjustesPorRegistroIds([row.id]);
      return registroComPagamento(
        row,
        parseDiariaBase(p?.diariaBase),
        ajustes,
        parseDescontaAlmoco(p?.descontaAlmoco),
      );
    }),

  excluirPrestador: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await softDeletePrestador(input.id);
      return { ok: true as const };
    }),

  excluirRegistro: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteRegistroAdmin(input.id);
      return { ok: true as const };
    }),
});
