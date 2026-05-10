import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { variedadePulaVegetativa } from "@shared/variedadesFase";
import { getSessionCookieOptions } from "../_core/cookies";
import { projetoIdFromCtx, adminProjectProcedure, projectProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addDays } from "date-fns";
import * as db from "../db";
import type { InsertPlanoPlantio } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import {
  resolveIanaTimeZone,
  ymdInTimeZone,
  zonedStartOfDay,
  zonedDayOfWeek,
} from "../zoned-day";

type FuroRowLike = { andarId: number; perfilIndex: number; status: string };

/**
 * Transplantio/colheita automáticos só fazem sentido com cultivo real no andar.
 * - Mudas: não há furos; perfil ativo é a referência de ocupação.
 * - Vegetativa / Maturação: exige pelo menos um furo `plantado` naquele perfil.
 */
function perfilTemCultivoReferencia(
  faseTorre: string,
  perfil: { perfilIndex: number; ativo: boolean },
  andarId: number,
  furos: FuroRowLike[],
): boolean {
  if (faseTorre === "mudas") {
    return perfil.ativo === true;
  }
  return furos.some(
    (f) =>
      f.andarId === andarId &&
      f.perfilIndex === perfil.perfilIndex &&
      f.status === "plantado",
  );
}

export const tarefasRouter = router({
    list: projectProcedure.query(async ({ ctx }) => {
      return db.getAllTarefas(projetoIdFromCtx(ctx));
    }),
    create: projectProcedure
      .input(z.object({
        titulo: z.string(),
        descricao: z.string().nullable().optional(),
        tipo: z.string().optional(),
        prioridade: z.string().optional(),
        dataVencimento: z.date(),
        torreId: z.number().nullable().optional(),
        andarNumero: z.number().nullable().optional(),
        caixaAguaId: z.number().nullable().optional(),
        cicloId: z.number().nullable().optional(),
        atribuidoParaId: z.number().nullable().optional(),
        atribuidoParaNome: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createTarefa({ ...input, projetoId: projetoIdFromCtx(ctx) });
      }),
    concluir: projectProcedure
      .input(z.object({ id: z.number(), observacoes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const tarefa = await db.getTarefaById(projetoIdFromCtx(ctx), input.id);
        if (!tarefa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });

        // Mantém dados existentes: se operador enviar observações, anexamos à descrição (não sobrescreve).
        if (input.observacoes?.trim()) {
          const stamp = new Date().toLocaleString('pt-BR');
          const prefix = `\n\n[Check-in ${stamp} — ${ctx.user.name || 'Usuário'}]\n${input.observacoes.trim()}`;
          await db.updateTarefa(projetoIdFromCtx(ctx), input.id, { descricao: `${tarefa.descricao ?? ''}${prefix}` });
        }

        await db.concluirTarefa(projetoIdFromCtx(ctx), input.id, ctx.user.id, ctx.user.name || 'Usuário');
        return { success: true, status: 'concluida' as const };
      }),

    /** Quick check-in: confirma em 2 cliques, com warning de duplicidade (ciclos). */
    quickConfirm: projectProcedure
      .input(z.object({
        tarefaId: z.number(),
        observacoes: z.string().optional(),
        force: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tarefa = await db.getTarefaById(projetoIdFromCtx(ctx), input.tarefaId);
        if (!tarefa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });

        if (tarefa.status === 'concluida') {
          return { success: true, alreadyDone: true as const };
        }

        // Duplicidade: mesmo ciclo concluído hoje.
        if (tarefa.tipo === 'ciclo' && tarefa.cicloId) {
          const all = await db.getAllTarefas(projetoIdFromCtx(ctx));
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 1);

          const duplicates = all.filter(t =>
            t.id !== tarefa.id &&
            t.tipo === 'ciclo' &&
            t.cicloId === tarefa.cicloId &&
            t.status === 'concluida' &&
            t.concluidoEm &&
            new Date(t.concluidoEm) >= start &&
            new Date(t.concluidoEm) < end
          );

          if (duplicates.length > 0 && !input.force) {
            const ultima = duplicates
              .map(d => new Date(d.concluidoEm!))
              .sort((a, b) => b.getTime() - a.getTime())[0];
            return {
              success: false,
              blocked: true as const,
              reason: 'duplicada_hoje' as const,
              ultimaAplicacao: ultima?.toISOString() ?? null,
            };
          }
        }

        // Reusar lógica de concluir (inclui observações anexadas).
        const obs = input.observacoes?.trim();
        if (obs) {
          const stamp = new Date().toLocaleString('pt-BR');
          const prefix = `\n\n[Check-in ${stamp} — ${ctx.user.name || 'Usuário'}]\n${obs}`;
          await db.updateTarefa(projetoIdFromCtx(ctx), tarefa.id, { descricao: `${tarefa.descricao ?? ''}${prefix}` });
        }
        await db.concluirTarefa(projetoIdFromCtx(ctx), tarefa.id, ctx.user.id, ctx.user.name || 'Usuário');

        return { success: true, status: 'concluida' as const };
      }),

    /** Adia a tarefa alterando dataVencimento (não perde histórico). */
    adiar: projectProcedure
      .input(z.object({ tarefaId: z.number(), horas: z.number().int().min(1).max(24 * 30) }))
      .mutation(async ({ input, ctx }) => {
        const tarefa = await db.getTarefaById(projetoIdFromCtx(ctx), input.tarefaId);
        if (!tarefa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tarefa não encontrada' });
        if (tarefa.status === 'concluida' || tarefa.status === 'cancelada') {
          return { success: true, skipped: true as const };
        }
        const base = new Date();
        const nova = new Date(base);
        nova.setHours(nova.getHours() + input.horas);
        await db.updateTarefa(projetoIdFromCtx(ctx), input.tarefaId, { dataVencimento: nova });
        return { success: true, dataVencimento: nova };
      }),
    update: projectProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().nullable().optional(),
        tipo: z.string().optional(),
        prioridade: z.string().optional(),
        dataVencimento: z.date().optional(),
        status: z.string().optional(),
        atribuidoParaId: z.number().nullable().optional(),
        atribuidoParaNome: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateTarefa(projetoIdFromCtx(ctx), id, data);
        return { success: true };
      }),
    delete: adminProjectProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteTarefa(projetoIdFromCtx(ctx), input.id);
        return { success: true };
      }),
    gerarAutomaticas: projectProcedure
      .input(
        z
          .object({
            /** IANA, ex. America/Caracas — deve ser o mesmo fuso do navegador em "Hoje". */
            timeZone: z.string().max(120).optional(),
          })
          .optional(),
      )
      .mutation(async ({ input, ctx }) => {
        let data = await db.loadFullFazendaData(projetoIdFromCtx(ctx));
        const defaultTz =
        process.env.FARM_OPERATIONS_TIMEZONE?.trim() || "America/Sao_Paulo";
        const tz = resolveIanaTimeZone(input?.timeZone, defaultTz);
        const now = new Date();
        const ymdHoje = ymdInTimeZone(now, tz);
        const inicioDia = zonedStartOfDay(now, tz);
        const tarefasCriadas: string[] = [];
        // Regera tarefas automáticas do dia para refletir dados atuais (ex.: ciclo editado).
        // Mantém tarefas manuais e históricas; limpa automáticas até hoje (inclui atrasadas).
        // Não apaga automáticas com vencimento > hoje (ex.: adiadas para amanhã).
        const prefixosAuto = [
          'Ciclo: ',
          'Manutenção URGENTE: ',
          'Lavagem: ',
          'Transplantio: ',
          'Colheita: ',
        ];
        const isAutoTitulo = (titulo: string) => prefixosAuto.some((p) => titulo.startsWith(p));

        for (const t of data.tarefas) {
          if (t.status !== 'pendente' && t.status !== 'em_andamento') continue;
          if (!isAutoTitulo(t.titulo)) continue;
          const ymdV = ymdInTimeZone(t.dataVencimento, tz);
          if (!ymdV || ymdV > ymdHoje) continue;
          await db.deleteTarefa(projetoIdFromCtx(ctx), t.id);
        }

        data = await db.loadFullFazendaData(projetoIdFromCtx(ctx));

        const tarefasHoje = data.tarefas.filter(
          (t) => ymdInTimeZone(t.dataVencimento, tz) === ymdHoje,
        );
        const titulosExistentes = new Set(
          tarefasHoje
            .filter((t) => !isAutoTitulo(t.titulo) || t.status === 'concluida' || t.status === 'cancelada')
            .map((t) => t.titulo)
        );

        for (const ciclo of data.ciclos.filter(c => c.ativo)) {
          let pendente = false;
          if (!ciclo.ultimaExecucao) {
            pendente = true;
          } else {
            const ultima = new Date(ciclo.ultimaExecucao);
            if (ciclo.frequencia === 'diaria' || ciclo.frequencia === 'diario') {
              pendente = ultima < inicioDia;
            }
            else if (ciclo.frequencia === 'semanal' && Array.isArray(ciclo.diasSemana)) {
              pendente =
                (ciclo.diasSemana as number[]).includes(zonedDayOfWeek(now, tz)) &&
                ultima < inicioDia;
            } else if (ciclo.frequencia === 'quinzenal') {
              pendente = Math.floor((inicioDia.getTime() - ultima.getTime()) / 86400000) >= 14;
            } else if (ciclo.frequencia === 'mensal') {
              pendente = Math.floor((inicioDia.getTime() - ultima.getTime()) / 86400000) >= 30;
            } else if (
              (ciclo.frequencia === 'personalizada' || ciclo.frequencia === 'intervalo') &&
              ciclo.intervaloDias
            ) {
              pendente = Math.floor((inicioDia.getTime() - ultima.getTime()) / 86400000) >= ciclo.intervaloDias;
            }
          }
          if (pendente) {
            const titulo = `Ciclo: ${ciclo.nome} — ${ciclo.produto}`;
            if (!titulosExistentes.has(titulo)) {
              const dose = ciclo.dosagem ? ` | dosagem: ${ciclo.dosagem}` : '';
              await db.createTarefa({ projetoId: projetoIdFromCtx(ctx), titulo, descricao: `Aplicar ${ciclo.produto} (${ciclo.tipo})${dose} nas fases: ${(ciclo.fasesAplicaveis as string[]).join(', ')}`, tipo: 'ciclo', prioridade: 'alta', dataVencimento: inicioDia, cicloId: ciclo.id });
              tarefasCriadas.push(titulo);
              titulosExistentes.add(titulo);
            }
          }
        }

        for (const m of data.manutencoes.filter(m => m.status === 'aberta' && m.prazo)) {
          const prazo = new Date(m.prazo!);
          const ymdP = ymdInTimeZone(prazo, tz);
          if (ymdP && ymdP <= ymdHoje) {
            const torre = data.torres.find(t => t.id === m.torreId);
            const titulo = `Manutenção URGENTE: ${m.tipo} — ${torre?.nome || 'Torre'}${m.andarNumero ? ` A${m.andarNumero}` : ''}`;
            if (!titulosExistentes.has(titulo)) {
              await db.createTarefa({ projetoId: projetoIdFromCtx(ctx), titulo, descricao: m.descricao, tipo: 'manutencao', prioridade: 'urgente', dataVencimento: inicioDia, torreId: m.torreId, andarNumero: m.andarNumero });
              tarefasCriadas.push(titulo);
              titulosExistentes.add(titulo);
            }
          }
        }

        for (const andar of data.andares.filter(a => !a.lavado)) {
          const torre = data.torres.find(t => t.id === andar.torreId);
          const titulo = `Lavagem: ${torre?.nome || 'Torre'} — Andar ${andar.numero}`;
          if (!titulosExistentes.has(titulo)) {
            await db.createTarefa({ projetoId: projetoIdFromCtx(ctx), titulo, descricao: `Andar ${andar.numero} aguardando lavagem`, tipo: 'lavagem', prioridade: 'media', dataVencimento: inicioDia, torreId: andar.torreId, andarNumero: andar.numero });
            tarefasCriadas.push(titulo);
            titulosExistentes.add(titulo);
          }
        }

        // ---- Transplantios e Colheitas pendentes (por perfil) ----
        const variedadesMap = new Map(data.variedades.map(v => [v.id, v]));
        const torresMap = new Map(data.torres.map(t => [t.id, t]));
        const andaresMap = new Map(data.andares.map(a => [a.id, a]));

        // Agrupar perfis ativos por andar para gerar tarefas por andar
        const perfisAtivos = data.perfis.filter(p => p.ativo && p.variedadeId);
        const perfisPorAndar = new Map<number, typeof perfisAtivos>();
        for (const p of perfisAtivos) {
          const arr = perfisPorAndar.get(p.andarId) || [];
          arr.push(p);
          perfisPorAndar.set(p.andarId, arr);
        }

        for (const [andarId, perfisAndar] of Array.from(perfisPorAndar)) {
          const andar = andaresMap.get(andarId);
          if (!andar) continue;
          const torre = torresMap.get(andar.torreId);
          if (!torre) continue;

          // Determinar dias da fase para cada perfil
          const prontosTransplantio: number[] = [];
          const prontosColheita: number[] = [];

          for (const perfil of perfisAndar) {
            const variedade = variedadesMap.get(perfil.variedadeId!);
            if (!variedade) continue;

            // Data de entrada: prioridade perfil > andar
            const dataEntrada = perfil.dataEntrada || andar.dataEntrada;
            if (!dataEntrada) continue;

            const entrada = zonedStartOfDay(new Date(dataEntrada), tz);
            const diasPassados = Math.floor((inicioDia.getTime() - entrada.getTime()) / 86400000);

            const pulaVeg = variedadePulaVegetativa(variedade.slug, variedade.nome);
            // Determinar dias da fase atual
            let diasFase = 0;
            if (torre.fase === 'mudas') diasFase = variedade.diasMudas;
            else if (torre.fase === 'vegetativa') {
              if (pulaVeg) continue;
              diasFase = variedade.diasVegetativa;
            } else if (torre.fase === 'maturacao') diasFase = variedade.diasMaturacao;

            if (diasFase > 0 && diasPassados >= diasFase) {
              if (
                !perfilTemCultivoReferencia(
                  torre.fase,
                  perfil,
                  andar.id,
                  data.furos as FuroRowLike[],
                )
              ) {
                continue;
              }
              if (torre.fase === 'maturacao') {
                prontosColheita.push(perfil.perfilIndex + 1);
              } else {
                prontosTransplantio.push(perfil.perfilIndex + 1);
              }
            }
          }

          // Gerar tarefa de transplantio se há perfis prontos
          if (prontosTransplantio.length > 0) {
            const mudasParaLabel = () => {
              const prontos = perfisAndar.filter((pf) => {
                const va = variedadesMap.get(pf.variedadeId!);
                if (!va) return false;
                const de = pf.dataEntrada || andar.dataEntrada;
                if (!de) return false;
                const ent = zonedStartOfDay(new Date(de), tz);
                const dp = Math.floor((inicioDia.getTime() - ent.getTime()) / 86400000);
                return torre.fase === 'mudas' && dp >= va.diasMudas;
              });
              if (prontos.length === 0) return 'Vegetativa';
              const labels = prontos.map((pf) => {
                const va = variedadesMap.get(pf.variedadeId!)!;
                return variedadePulaVegetativa(va.slug, va.nome) ? 'Matur' : 'Veg';
              });
              if (labels.every((x) => x === 'Matur')) return 'Maturação';
              if (labels.every((x) => x === 'Veg')) return 'Vegetativa';
              return 'Vegetativa ou Maturação (conforme variedade)';
            };
            const proxFase = torre.fase === 'mudas' ? mudasParaLabel() : 'Maturação';
            const titulo = `Transplantio: ${torre.nome} — Andar ${andar.numero} → ${proxFase}`;
            if (!titulosExistentes.has(titulo)) {
              const desc = `${prontosTransplantio.length} perfil(is) pronto(s) para transplantio: P${prontosTransplantio.join(', P')}. Mover de ${torre.fase} para ${proxFase}.`;
              await db.createTarefa({ projetoId: projetoIdFromCtx(ctx), titulo, descricao: desc, tipo: 'transplantio', prioridade: 'alta', dataVencimento: inicioDia, torreId: torre.id, andarNumero: andar.numero });
              tarefasCriadas.push(titulo);
              titulosExistentes.add(titulo);
            }
          }

          // Gerar tarefa de colheita se há perfis prontos
          if (prontosColheita.length > 0) {
            const titulo = `Colheita: ${torre.nome} — Andar ${andar.numero}`;
            if (!titulosExistentes.has(titulo)) {
              const desc = `${prontosColheita.length} perfil(is) pronto(s) para colheita: P${prontosColheita.join(', P')}. Fase de maturação concluída.`;
              await db.createTarefa({ projetoId: projetoIdFromCtx(ctx), titulo, descricao: desc, tipo: 'colheita', prioridade: 'alta', dataVencimento: inicioDia, torreId: torre.id, andarNumero: andar.numero });
              tarefasCriadas.push(titulo);
              titulosExistentes.add(titulo);
            }
          }
        }

        return { success: true, criadas: tarefasCriadas.length, tarefas: tarefasCriadas };
      }),
});
