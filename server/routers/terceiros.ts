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
  deleteRegistroAdmin,
  deleteRegistroPrestador,
  getPrestadorByToken,
  identificarPrestador,
  listPrestadoresAdmin,
  listRegistrosAdmin,
  listRegistrosPrestador,
  setRegistroPago,
  softDeletePrestador,
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
  if (s <= e) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Hora de saída deve ser depois da entrada.",
    });
  }
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

function registroComPagamento(r: {
  id: number;
  dataServico: string;
  horaEntrada: string;
  horaSaida: string;
  pagoAt: Date | null;
  createdAt: Date;
}) {
  const pagamento = calcularPagamentoDiaTerceiro({
    horaEntrada: r.horaEntrada,
    horaSaida: r.horaSaida,
  });
  const pago = r.pagoAt != null;
  return {
    id: r.id,
    dataServico: r.dataServico,
    horaEntrada: r.horaEntrada,
    horaSaida: r.horaSaida,
    pago,
    pagoAt: r.pagoAt,
    createdAt: r.createdAt,
    pagamento,
    valorTotal: pagamento?.valorTotal ?? 0,
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

  /** Sessão atual (histórico próprio + em aberto). */
  meuHistorico: publicProcedure
    .input(z.object({ acessoToken: z.string().min(16) }))
    .query(async ({ input }) => {
      const p = await assertToken(input.acessoToken);
      const regs = await listRegistrosPrestador(p.id);
      const registros = regs.map(registroComPagamento);
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
        },
        registros,
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
      return registroComPagamento(row);
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
      createdAt: p.createdAt,
    }));
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

      const itens = rows.map(r => {
        const base = registroComPagamento(r);
        return {
          ...base,
          prestadorId: r.prestadorId,
          nomeCompleto: r.nomeCompleto,
          cpfMascarado: formatarCpf(r.cpf),
        };
      });

      const porPrestador = new Map<
        number,
        {
          prestadorId: number;
          nomeCompleto: string;
          cpfMascarado: string;
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

  marcarPago: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        pago: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const row = await setRegistroPago(input.id, input.pago);
      return registroComPagamento(row);
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
