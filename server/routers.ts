import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// ============================================================
// Fazendas Up — tRPC Routers
// ============================================================

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ---- Full Data Load ----
  fazenda: router({
    loadAll: publicProcedure.query(async () => {
      return db.loadFullFazendaData();
    }),
  }),

  // ---- Variedades ----
  variedades: router({
    list: publicProcedure.query(async () => {
      return db.getAllVariedades();
    }),
    create: publicProcedure
      .input(z.object({
        slug: z.string().optional(),
        nome: z.string(),
        diasMudas: z.number(),
        diasVegetativa: z.number(),
        diasMaturacao: z.number(),
      }))
      .mutation(async ({ input }) => {
        const slug = input.slug || input.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
        return db.createVariedade({ ...input, slug });
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        nome: z.string().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateVariedade(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVariedade(input.id);
        return { success: true };
      }),
  }),

  // ---- Fases Config ----
  fasesConfig: router({
    list: publicProcedure.query(async () => {
      return db.getAllFasesConfig();
    }),
    upsert: publicProcedure
      .input(z.object({
        fase: z.string(),
        label: z.string(),
        ecMin: z.number(),
        ecMax: z.number(),
        phMin: z.number(),
        phMax: z.number(),
        cor: z.string(),
        corLight: z.string(),
        icon: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertFaseConfig(input);
        return { success: true };
      }),
  }),

  // ---- Torres ----
  torres: router({
    list: publicProcedure.query(async () => {
      return db.getAllTorres();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTorreById(input.id);
      }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getTorreBySlug(input.slug);
      }),
  }),

  // ---- Caixas d'Água ----
  caixasAgua: router({
    list: publicProcedure.query(async () => {
      return db.getAllCaixasAgua();
    }),
  }),

  // ---- Medições Caixa ----
  medicoesCaixa: router({
    listByCaixa: publicProcedure
      .input(z.object({ caixaAguaId: z.number() }))
      .query(async ({ input }) => {
        return db.getMedicoesByCaixaId(input.caixaAguaId);
      }),
    create: publicProcedure
      .input(z.object({
        caixaAguaId: z.number(),
        ec: z.number(),
        ph: z.number(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input }) => {
        return db.createMedicaoCaixa(input);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMedicaoCaixa(input.id);
        return { success: true };
      }),
  }),

  // ---- Aplicações Caixa ----
  aplicacoesCaixa: router({
    listByCaixa: publicProcedure
      .input(z.object({ caixaAguaId: z.number() }))
      .query(async ({ input }) => {
        return db.getAplicacoesByCaixaId(input.caixaAguaId);
      }),
    create: publicProcedure
      .input(z.object({
        caixaAguaId: z.number(),
        tipo: z.string(),
        produto: z.string(),
        quantidade: z.string(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input }) => {
        return db.createAplicacaoCaixa(input);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAplicacaoCaixa(input.id);
        return { success: true };
      }),
  }),

  // ---- Andares ----
  andares: router({
    list: publicProcedure.query(async () => {
      return db.getAllAndares();
    }),
    listByTorre: publicProcedure
      .input(z.object({ torreId: z.number() }))
      .query(async ({ input }) => {
        return db.getAndaresByTorreId(input.torreId);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAndarById(input.id);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        dataEntrada: z.date().nullable().optional(),
        lavado: z.boolean().optional(),
        dataColheitaTotal: z.date().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAndar(id, data);
        return { success: true };
      }),
    clearAndar: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAndar(input.id, { dataEntrada: null, lavado: true, dataColheitaTotal: null });
        await db.resetPerfisByAndarId(input.id);
        await db.resetFurosByAndarId(input.id);
        return { success: true };
      }),
  }),

  // ---- Perfis ----
  perfis: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getPerfisByAndarId(input.andarId);
      }),
    update: publicProcedure
      .input(z.object({
        andarId: z.number(),
        perfilIndex: z.number(),
        variedadeId: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { andarId, perfilIndex, ...data } = input;
        await db.updatePerfilByAndarAndIndex(andarId, perfilIndex, data);
        return { success: true };
      }),
    resetByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetPerfisByAndarId(input.andarId);
        return { success: true };
      }),
  }),

  // ---- Furos ----
  furos: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getFurosByAndarId(input.andarId);
      }),
    update: publicProcedure
      .input(z.object({
        andarId: z.number(),
        perfilIndex: z.number(),
        furoIndex: z.number(),
        status: z.string().optional(),
        variedadeId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { andarId, perfilIndex, furoIndex, ...data } = input;
        await db.updateFuroByAndarAndIndex(andarId, perfilIndex, furoIndex, data);
        return { success: true };
      }),
    resetByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetFurosByAndarId(input.andarId);
        return { success: true };
      }),
  }),

  // ---- Aplicações Andar ----
  aplicacoesAndar: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getAplicacoesByAndarId(input.andarId);
      }),
    create: publicProcedure
      .input(z.object({
        andarId: z.number(),
        tipo: z.string(),
        produto: z.string(),
        quantidade: z.string(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input }) => {
        return db.createAplicacaoAndar(input);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAplicacaoAndar(input.id);
        return { success: true };
      }),
  }),

  // ---- Germinação ----
  germinacao: router({
    list: publicProcedure.query(async () => {
      return db.getAllGerminacao();
    }),
    create: publicProcedure
      .input(z.object({
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidade: z.number(),
        dataPlantio: z.date(),
        dataHora: z.date(),
        diasParaTransplantio: z.number().default(1),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createGerminacao(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        germinadas: z.number().optional(),
        naoGerminadas: z.number().optional(),
        transplantadas: z.number().optional(),
        status: z.string().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateGerminacao(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGerminacao(input.id);
        return { success: true };
      }),
  }),

  // ---- Transplantios ----
  transplantios: router({
    list: publicProcedure.query(async () => {
      return db.getAllTransplantios();
    }),
    create: publicProcedure
      .input(z.object({
        dataHora: z.date(),
        faseOrigem: z.string(),
        faseDestino: z.string(),
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidadeTransplantada: z.number(),
        quantidadeDesperdicio: z.number().default(0),
        motivoDesperdicio: z.string().optional(),
        torreDestinoId: z.number().optional(),
        andarDestinoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTransplantio(input);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTransplantio(input.id);
        return { success: true };
      }),
  }),

  // ---- Manutenções ----
  manutencoes: router({
    list: publicProcedure.query(async () => {
      return db.getAllManutencoes();
    }),
    create: publicProcedure
      .input(z.object({
        torreId: z.number(),
        andarNumero: z.number().optional(),
        tipo: z.string(),
        descricao: z.string(),
        dataAbertura: z.date(),
        prazo: z.date().optional(),
        lampadaIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createManutencao(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        dataConclusao: z.date().nullable().optional(),
        solucao: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateManutencao(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteManutencao(input.id);
        return { success: true };
      }),
  }),

  // ---- Ciclos ----
  ciclos: router({
    list: publicProcedure.query(async () => {
      return db.getAllCiclos();
    }),
    create: publicProcedure
      .input(z.object({
        nome: z.string(),
        frequencia: z.string(),
        diasSemana: z.array(z.number()).optional(),
        intervaloDias: z.number().optional(),
        produto: z.string(),
        tipo: z.string(),
        fasesAplicaveis: z.array(z.string()),
        alvo: z.string().default("caixa"),
        ativo: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return db.createCiclo(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        frequencia: z.string().optional(),
        diasSemana: z.array(z.number()).nullable().optional(),
        intervaloDias: z.number().nullable().optional(),
        produto: z.string().optional(),
        tipo: z.string().optional(),
        fasesAplicaveis: z.array(z.string()).optional(),
        alvo: z.string().optional(),
        ultimaExecucao: z.date().nullable().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCiclo(id, data);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCiclo(input.id);
        return { success: true };
      }),
  }),

  // ---- Seed / Reset ----
  admin: router({
    seed: publicProcedure.mutation(async () => {
      const VARIEDADES_PADRAO = [
        { slug: 'alface-crespa', nome: 'Alface Crespa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
        { slug: 'alface-americana', nome: 'Alface Americana', diasMudas: 14, diasVegetativa: 25, diasMaturacao: 35 },
        { slug: 'alface-roxa', nome: 'Alface Roxa', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
        { slug: 'rucula', nome: 'Rúcula', diasMudas: 10, diasVegetativa: 15, diasMaturacao: 20 },
        { slug: 'agriao', nome: 'Agrião', diasMudas: 12, diasVegetativa: 18, diasMaturacao: 25 },
        { slug: 'espinafre', nome: 'Espinafre', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 30 },
        { slug: 'couve', nome: 'Couve', diasMudas: 18, diasVegetativa: 28, diasMaturacao: 35 },
        { slug: 'manjericao', nome: 'Manjericão', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
        { slug: 'salsa', nome: 'Salsa', diasMudas: 18, diasVegetativa: 25, diasMaturacao: 30 },
        { slug: 'cebolinha', nome: 'Cebolinha', diasMudas: 21, diasVegetativa: 28, diasMaturacao: 35 },
        { slug: 'hortela', nome: 'Hortelã', diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 },
        { slug: 'coentro', nome: 'Coentro', diasMudas: 10, diasVegetativa: 18, diasMaturacao: 25 },
      ];

      const FASES_CONFIG_DATA = [
        { fase: 'mudas', label: 'Mudas', ecMin: 1.0, ecMax: 1.2, phMin: 5.8, phMax: 6.2, cor: 'oklch(0.65 0.19 160)', corLight: 'oklch(0.92 0.08 160)', icon: '🌱' },
        { fase: 'vegetativa', label: 'Vegetativa', ecMin: 1.5, ecMax: 2.0, phMin: 5.5, phMax: 6.5, cor: 'oklch(0.55 0.14 220)', corLight: 'oklch(0.92 0.06 220)', icon: '🌿' },
        { fase: 'maturacao', label: 'Maturação', ecMin: 2.0, ecMax: 2.5, phMin: 5.8, phMax: 6.2, cor: 'oklch(0.62 0.18 50)', corLight: 'oklch(0.93 0.06 50)', icon: '🥬' },
      ];

      const ESTRUTURA_FASE: Record<string, { perfis: number; furosPorPerfil: number }> = {
        mudas: { perfis: 12, furosPorPerfil: 0 },
        vegetativa: { perfis: 12, furosPorPerfil: 9 },
        maturacao: { perfis: 6, furosPorPerfil: 6 },
      };

      await db.resetAllData();
      await db.bulkInsertVariedades(VARIEDADES_PADRAO);
      await db.bulkInsertFasesConfig(FASES_CONFIG_DATA);

      const dbInst = await db.getDb();
      if (!dbInst) throw new Error("DB not available");
      const schema = await import("../drizzle/schema");

      // Helper to create torre with andares + perfis + furos
      async function createTorreWithAndares(torreData: { slug: string; nome: string; fase: string; numAndares: number; caixaAguaId: number }, numAndares: number) {
        const torreResult = await dbInst!.insert(schema.torres).values(torreData);
        const torreId = torreResult[0].insertId;
        const est = ESTRUTURA_FASE[torreData.fase];

        for (let a = 1; a <= numAndares; a++) {
          const andarResult = await dbInst!.insert(schema.andares).values({ torreId, numero: a, lavado: true });
          const andarId = andarResult[0].insertId;

          // Perfis
          const perfilData = Array.from({ length: est.perfis }, (_, i) => ({
            andarId, perfilIndex: i, ativo: false,
          }));
          if (perfilData.length > 0) await dbInst!.insert(schema.perfis).values(perfilData);

          // Furos (only for vegetativa/maturacao)
          if (est.furosPorPerfil > 0) {
            const furoData: any[] = [];
            for (let p = 0; p < est.perfis; p++) {
              for (let f = 0; f < est.furosPorPerfil; f++) {
                furoData.push({ andarId, perfilIndex: p, furoIndex: f, status: 'vazio' });
              }
            }
            if (furoData.length > 0) await dbInst!.insert(schema.furos).values(furoData);
          }
        }
        return torreId;
      }

      // 1 Torre de Mudas
      const caixaMudas = await db.createCaixaAgua({ slug: 'ca-mudas-1', nome: 'Caixa Mudas', fase: 'mudas' });
      await createTorreWithAndares({ slug: 't-mudas-1', nome: 'Torre Mudas 1', fase: 'mudas', numAndares: 12, caixaAguaId: caixaMudas.id }, 12);

      // 3 Torres Vegetativas
      for (let t = 1; t <= 3; t++) {
        const caixa = await db.createCaixaAgua({ slug: `ca-veg-${t}`, nome: `Caixa Vegetativa ${t}`, fase: 'vegetativa' });
        await createTorreWithAndares({ slug: `t-veg-${t}`, nome: `Torre Vegetativa ${t}`, fase: 'vegetativa', numAndares: 12, caixaAguaId: caixa.id }, 12);
      }

      // 10 Torres de Maturação
      const matCaixas: number[] = [];
      for (let t = 1; t <= 10; t++) {
        let caixaId: number;
        if (t % 2 === 1) {
          const caixa = await db.createCaixaAgua({ slug: `ca-mat-${Math.ceil(t / 2)}`, nome: `Caixa Maturação ${Math.ceil(t / 2)}`, fase: 'maturacao' });
          caixaId = caixa.id;
          matCaixas.push(caixaId);
        } else {
          caixaId = matCaixas[matCaixas.length - 1];
        }
        await createTorreWithAndares({ slug: `t-mat-${t}`, nome: `Torre Maturação ${t}`, fase: 'maturacao', numAndares: 9, caixaAguaId: caixaId }, 9);
      }

      return { success: true, message: "Dados iniciais criados com sucesso" };
    }),

    reset: publicProcedure.mutation(async () => {
      await db.resetAllData();
      return { success: true, message: "Todos os dados foram removidos" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
