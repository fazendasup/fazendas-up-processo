import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import bcrypt from "bcryptjs";

// ============================================================
// Fazendas Up — tRPC Routers
// Permissões:
//   publicProcedure   → leitura (dashboard, listagens)
//   protectedProcedure → operador + admin (registrar atividades)
//   adminProcedure     → somente admin (config, CRUD variedades/ciclos, exclusões, seed, users)
// ============================================================

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase().trim());
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou senha inválidos' });
        }
        // Criar sessão JWT usando o mesmo mecanismo do OAuth
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Atualizar último login
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        return {
          success: true,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ---- Full Data Load (público — dashboard) ----
  fazenda: router({
    loadAll: publicProcedure.query(async () => {
      return db.loadFullFazendaData();
    }),
  }),

  // ---- Variedades (leitura pública, escrita admin) ----
  variedades: router({
    list: publicProcedure.query(async () => {
      return db.getAllVariedades();
    }),
    create: adminProcedure
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
    update: adminProcedure
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
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVariedade(input.id);
        return { success: true };
      }),
  }),

  // ---- Fases Config (leitura pública, escrita admin) ----
  fasesConfig: router({
    list: publicProcedure.query(async () => {
      return db.getAllFasesConfig();
    }),
    upsert: adminProcedure
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

  // ---- Torres (leitura pública) ----
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

  // ---- Caixas d'Água (leitura pública) ----
  caixasAgua: router({
    list: publicProcedure.query(async () => {
      return db.getAllCaixasAgua();
    }),
  }),

  // ---- Medições Caixa (leitura pública, escrita operador, exclusão admin) ----
  medicoesCaixa: router({
    listByCaixa: publicProcedure
      .input(z.object({ caixaAguaId: z.number() }))
      .query(async ({ input }) => {
        return db.getMedicoesByCaixaId(input.caixaAguaId);
      }),
    create: protectedProcedure
      .input(z.object({
        caixaAguaId: z.number(),
        ec: z.number(),
        ph: z.number(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createMedicaoCaixa({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMedicaoCaixa(input.id);
        return { success: true };
      }),
  }),

  // ---- Aplicações Caixa (leitura pública, escrita operador, exclusão admin) ----
  aplicacoesCaixa: router({
    listByCaixa: publicProcedure
      .input(z.object({ caixaAguaId: z.number() }))
      .query(async ({ input }) => {
        return db.getAplicacoesByCaixaId(input.caixaAguaId);
      }),
    create: protectedProcedure
      .input(z.object({
        caixaAguaId: z.number(),
        tipo: z.string(),
        produto: z.string(),
        quantidade: z.string(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createAplicacaoCaixa({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAplicacaoCaixa(input.id);
        return { success: true };
      }),
  }),

  // ---- Andares (leitura pública, escrita operador) ----
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
    update: protectedProcedure
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
    clearAndar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAndar(input.id, { dataEntrada: null, lavado: true, dataColheitaTotal: null });
        await db.resetPerfisByAndarId(input.id);
        await db.resetFurosByAndarId(input.id);
        return { success: true };
      }),
    // ---- Movimentação ----
    moverPerfil: protectedProcedure
      .input(z.object({
        origemAndarId: z.number(),
        perfilIndex: z.number(),
        destinoAndarId: z.number(),
        destinoPerfilIndex: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Validate same phase
        const origemAndar = await db.getAndarById(input.origemAndarId);
        const destinoAndar = await db.getAndarById(input.destinoAndarId);
        if (!origemAndar || !destinoAndar) throw new TRPCError({ code: 'NOT_FOUND', message: 'Andar não encontrado' });
        const origemTorre = await db.getTorreById(origemAndar.torreId);
        const destinoTorre = await db.getTorreById(destinoAndar.torreId);
        if (!origemTorre || !destinoTorre) throw new TRPCError({ code: 'NOT_FOUND', message: 'Torre não encontrada' });
        if (origemTorre.fase !== destinoTorre.fase) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Movimentação só é permitida entre torres da mesma fase' });
        }
        await db.moverPerfil(input.origemAndarId, input.perfilIndex, input.destinoAndarId, input.destinoPerfilIndex);
        return { success: true };
      }),
    moverAndar: protectedProcedure
      .input(z.object({
        origemAndarId: z.number(),
        destinoAndarId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Validate same phase
        const origemAndar = await db.getAndarById(input.origemAndarId);
        const destinoAndar = await db.getAndarById(input.destinoAndarId);
        if (!origemAndar || !destinoAndar) throw new TRPCError({ code: 'NOT_FOUND', message: 'Andar não encontrado' });
        const origemTorre = await db.getTorreById(origemAndar.torreId);
        const destinoTorre = await db.getTorreById(destinoAndar.torreId);
        if (!origemTorre || !destinoTorre) throw new TRPCError({ code: 'NOT_FOUND', message: 'Torre não encontrada' });
        if (origemTorre.fase !== destinoTorre.fase) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Movimentação só é permitida entre torres da mesma fase' });
        }
        await db.moverTodosPerfilAndar(input.origemAndarId, input.destinoAndarId);
        return { success: true };
      }),
  }),

  // ---- Perfis (escrita operador) ----
  perfis: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getPerfisByAndarId(input.andarId);
      }),
    update: protectedProcedure
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
    resetByAndar: protectedProcedure
      .input(z.object({ andarId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetPerfisByAndarId(input.andarId);
        return { success: true };
      }),
    batchUpdate: protectedProcedure
      .input(z.object({
        andarId: z.number(),
        updates: z.array(z.object({
          perfilIndex: z.number(),
          variedadeId: z.number().nullable().optional(),
          ativo: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.batchUpdatePerfis(input.andarId, input.updates);
        return { success: true };
      }),
    setAll: protectedProcedure
      .input(z.object({
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { andarId, ...data } = input;
        await db.setAllPerfisOfAndar(andarId, data);
        return { success: true };
      }),
  }),

  // ---- Furos (escrita operador) ----
  furos: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getFurosByAndarId(input.andarId);
      }),
    update: protectedProcedure
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
    resetByAndar: protectedProcedure
      .input(z.object({ andarId: z.number() }))
      .mutation(async ({ input }) => {
        await db.resetFurosByAndarId(input.andarId);
        return { success: true };
      }),
    batchUpdate: protectedProcedure
      .input(z.object({
        andarId: z.number(),
        updates: z.array(z.object({
          perfilIndex: z.number(),
          furoIndex: z.number(),
          status: z.string().optional(),
          variedadeId: z.number().nullable().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.batchUpdateFuros(input.andarId, input.updates);
        return { success: true };
      }),
    setAll: protectedProcedure
      .input(z.object({
        andarId: z.number(),
        status: z.string().optional(),
        variedadeId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { andarId, ...data } = input;
        await db.setAllFurosOfAndar(andarId, data);
        return { success: true };
      }),
  }),

  // ---- Aplicações Andar (escrita operador, exclusão admin) ----
  aplicacoesAndar: router({
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getAplicacoesByAndarId(input.andarId);
      }),
    create: protectedProcedure
      .input(z.object({
        andarId: z.number(),
        tipo: z.string(),
        produto: z.string(),
        quantidade: z.string(),
        dataHora: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createAplicacaoAndar({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAplicacaoAndar(input.id);
        return { success: true };
      }),
  }),

  // ---- Germinação (escrita operador, exclusão admin) ----
  germinacao: router({
    list: publicProcedure.query(async () => {
      return db.getAllGerminacao();
    }),
    create: protectedProcedure
      .input(z.object({
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidade: z.number(),
        dataPlantio: z.date(),
        dataHora: z.date(),
        diasParaTransplantio: z.number().default(1),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createGerminacao({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    update: protectedProcedure
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
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGerminacao(input.id);
        return { success: true };
      }),
  }),

  // ---- Transplantios (escrita operador, exclusão admin) ----
  transplantios: router({
    list: publicProcedure.query(async () => {
      return db.getAllTransplantios();
    }),
    create: protectedProcedure
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
      .mutation(async ({ input, ctx }) => {
        return db.createTransplantio({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTransplantio(input.id);
        return { success: true };
      }),
  }),

  // ---- Manutenções (abertura/atualização operador, exclusão admin) ----
  manutencoes: router({
    list: publicProcedure.query(async () => {
      return db.getAllManutencoes();
    }),
    create: protectedProcedure
      .input(z.object({
        torreId: z.number(),
        andarNumero: z.number().optional(),
        tipo: z.string(),
        descricao: z.string(),
        dataAbertura: z.date(),
        prazo: z.date().optional(),
        lampadaIndex: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createManutencao({
          ...input,
          abertoPorId: ctx.user.id,
          abertoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        dataConclusao: z.date().nullable().optional(),
        solucao: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        // Se está concluindo, registrar quem concluiu
        const updateData: Record<string, any> = { ...data };
        if (data.status === 'concluida' || data.dataConclusao) {
          updateData.concluidoPorId = ctx.user.id;
          updateData.concluidoPorNome = ctx.user.name || 'Usuário';
        }
        await db.updateManutencao(id, updateData);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteManutencao(input.id);
        return { success: true };
      }),
  }),

  // ---- Ciclos (leitura pública, marcar executado operador, CRUD admin) ----
  ciclos: router({
    list: publicProcedure.query(async () => {
      return db.getAllCiclos();
    }),
    create: adminProcedure
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
    update: adminProcedure
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
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCiclo(id, data);
        return { success: true };
      }),
    // Marcar ciclo como executado — operador pode fazer
    marcarExecutado: protectedProcedure
      .input(z.object({
        id: z.number(),
        ultimaExecucao: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateCiclo(input.id, {
          ultimaExecucao: input.ultimaExecucao,
          ultimoExecutorId: ctx.user.id,
          ultimoExecutorNome: ctx.user.name || 'Usuário',
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCiclo(input.id);
        return { success: true };
      }),
  }),

  // ---- Gestão de Usuários (admin) ----
  users: router({
    list: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ input }) => {
        // Verificar se email já existe
        const existing = await db.getUserByEmail(input.email.toLowerCase().trim());
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um usuário com este email' });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const result = await db.createUserWithPassword({
          name: input.name,
          email: input.email.toLowerCase().trim(),
          passwordHash,
          role: input.role,
        });
        return { success: true, id: result.id };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),
    resetPassword: adminProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      }))
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUserPassword(input.id, passwordHash);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Não permitir deletar a si mesmo
        if (ctx.user.id === input.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível excluir seu próprio usuário' });
        }
        await db.deleteUser(input.id);
        return { success: true };
      }),
  }),

  // ---- Receitas de Crescimento (leitura pública, escrita admin) ----
  receitas: router({
    list: publicProcedure.query(async () => {
      return db.getAllReceitas();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getReceitaById(input.id);
      }),
    getByVariedade: publicProcedure
      .input(z.object({ variedadeId: z.number() }))
      .query(async ({ input }) => {
        return db.getReceitasByVariedadeId(input.variedadeId);
      }),
    create: adminProcedure
      .input(z.object({
        nome: z.string(),
        variedadeId: z.number(),
        metodoColheita: z.string().optional(),
        diasGerminacao: z.number().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        ecPorFase: z.any().optional(),
        phPorFase: z.any().optional(),
        temperaturaMin: z.number().nullable().optional(),
        temperaturaMax: z.number().nullable().optional(),
        umidadeMin: z.number().nullable().optional(),
        umidadeMax: z.number().nullable().optional(),
        horasLuz: z.number().nullable().optional(),
        densidadePorPerfil: z.number().nullable().optional(),
        yieldEsperadoGramas: z.number().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createReceita({
          ...input,
          criadoPorId: ctx.user.id,
          criadoPorNome: ctx.user.name || 'Admin',
        });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        variedadeId: z.number().optional(),
        metodoColheita: z.string().optional(),
        diasGerminacao: z.number().optional(),
        diasMudas: z.number().optional(),
        diasVegetativa: z.number().optional(),
        diasMaturacao: z.number().optional(),
        ecPorFase: z.any().optional(),
        phPorFase: z.any().optional(),
        temperaturaMin: z.number().nullable().optional(),
        temperaturaMax: z.number().nullable().optional(),
        umidadeMin: z.number().nullable().optional(),
        umidadeMax: z.number().nullable().optional(),
        horasLuz: z.number().nullable().optional(),
        densidadePorPerfil: z.number().nullable().optional(),
        yieldEsperadoGramas: z.number().nullable().optional(),
        observacoes: z.string().nullable().optional(),
        ativa: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateReceita(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteReceita(input.id);
        return { success: true };
      }),
  }),

  // ---- Tarefas Operacionais (leitura protegida, escrita protegida, admin CRUD completo) ----
  tarefas: router({
    list: protectedProcedure.query(async () => {
      return db.getAllTarefas();
    }),
    create: protectedProcedure
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
      .mutation(async ({ input }) => {
        return db.createTarefa(input);
      }),
    concluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.concluirTarefa(input.id, ctx.user.id, ctx.user.name || 'Usuário');
        return { success: true };
      }),
    update: protectedProcedure
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
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTarefa(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTarefa(input.id);
        return { success: true };
      }),
    gerarAutomaticas: protectedProcedure.mutation(async ({ ctx }) => {
      const data = await db.loadFullFazendaData();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const tarefasCriadas: string[] = [];
      const tarefasHoje = data.tarefas.filter(t => {
        const dv = new Date(t.dataVencimento);
        return dv >= hoje && dv < amanha;
      });
      const titulosExistentes = new Set(tarefasHoje.map(t => t.titulo));

      for (const ciclo of data.ciclos.filter(c => c.ativo)) {
        let pendente = false;
        if (!ciclo.ultimaExecucao) {
          pendente = true;
        } else {
          const ultima = new Date(ciclo.ultimaExecucao);
          if (ciclo.frequencia === 'diario') pendente = ultima < hoje;
          else if (ciclo.frequencia === 'semanal' && Array.isArray(ciclo.diasSemana)) {
            pendente = (ciclo.diasSemana as number[]).includes(hoje.getDay()) && ultima < hoje;
          } else if (ciclo.frequencia === 'intervalo' && ciclo.intervaloDias) {
            pendente = Math.floor((hoje.getTime() - ultima.getTime()) / 86400000) >= ciclo.intervaloDias;
          }
        }
        if (pendente) {
          const titulo = `Ciclo: ${ciclo.nome} — ${ciclo.produto}`;
          if (!titulosExistentes.has(titulo)) {
            await db.createTarefa({ titulo, descricao: `Aplicar ${ciclo.produto} (${ciclo.tipo}) nas fases: ${(ciclo.fasesAplicaveis as string[]).join(', ')}`, tipo: 'ciclo', prioridade: 'alta', dataVencimento: hoje, cicloId: ciclo.id });
            tarefasCriadas.push(titulo);
            titulosExistentes.add(titulo);
          }
        }
      }

      for (const m of data.manutencoes.filter(m => m.status === 'aberta' && m.prazo)) {
        const prazo = new Date(m.prazo!);
        if (prazo <= hoje) {
          const torre = data.torres.find(t => t.id === m.torreId);
          const titulo = `Manutenção URGENTE: ${m.tipo} — ${torre?.nome || 'Torre'}${m.andarNumero ? ` A${m.andarNumero}` : ''}`;
          if (!titulosExistentes.has(titulo)) {
            await db.createTarefa({ titulo, descricao: m.descricao, tipo: 'manutencao', prioridade: 'urgente', dataVencimento: hoje, torreId: m.torreId, andarNumero: m.andarNumero });
            tarefasCriadas.push(titulo);
            titulosExistentes.add(titulo);
          }
        }
      }

      for (const andar of data.andares.filter(a => !a.lavado)) {
        const torre = data.torres.find(t => t.id === andar.torreId);
        const titulo = `Lavagem: ${torre?.nome || 'Torre'} — Andar ${andar.numero}`;
        if (!titulosExistentes.has(titulo)) {
          await db.createTarefa({ titulo, descricao: `Andar ${andar.numero} aguardando lavagem`, tipo: 'lavagem', prioridade: 'media', dataVencimento: hoje, torreId: andar.torreId, andarNumero: andar.numero });
          tarefasCriadas.push(titulo);
          titulosExistentes.add(titulo);
        }
      }

      return { success: true, criadas: tarefasCriadas.length, tarefas: tarefasCriadas };
    }),
  }),

  // ---- Registros de Colheita (escrita operador, leitura pública) ----
  registrosColheita: router({
    list: publicProcedure.query(async () => {
      return db.getAllRegistrosColheita();
    }),
    listByAndar: publicProcedure
      .input(z.object({ andarId: z.number() }))
      .query(async ({ input }) => {
        return db.getRegistrosColheitaByAndarId(input.andarId);
      }),
    create: protectedProcedure
      .input(z.object({
        torreId: z.number(),
        andarId: z.number(),
        variedadeId: z.number().nullable().optional(),
        variedadeNome: z.string().nullable().optional(),
        receitaId: z.number().nullable().optional(),
        dataColheita: z.date(),
        quantidadePlantas: z.number(),
        pesoTotalGramas: z.number().nullable().optional(),
        qualidade: z.string().optional(),
        destino: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createRegistroColheita({
          ...input,
          executadoPorId: ctx.user.id,
          executadoPorNome: ctx.user.name || 'Usuário',
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRegistroColheita(input.id);
        return { success: true };
      }),
  }),

  // ---- Planos de Plantio ----
  planosPlantio: router({
    list: publicProcedure.query(async () => {
      return db.getAllPlanosPlantio();
    }),
    create: adminProcedure
      .input(z.object({
        receitaId: z.number(),
        receitaNome: z.string(),
        variedadeId: z.number(),
        variedadeNome: z.string(),
        quantidadePlantas: z.number(),
        dataInicioGerminacao: z.date(),
        dataTransplantioMudas: z.date(),
        dataTransplantioVeg: z.date(),
        dataTransplantioMat: z.date(),
        dataColheitaPrevista: z.date(),
        torreDestinoId: z.number().nullable().optional(),
        andarDestinoId: z.number().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createPlanoPlantio({
          ...input,
          criadoPorId: ctx.user.id,
          criadoPorNome: ctx.user.name || 'Admin',
        });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        quantidadePlantas: z.number().optional(),
        dataInicioGerminacao: z.date().optional(),
        dataTransplantioMudas: z.date().optional(),
        dataTransplantioVeg: z.date().optional(),
        dataTransplantioMat: z.date().optional(),
        dataColheitaPrevista: z.date().optional(),
        torreDestinoId: z.number().nullable().optional(),
        andarDestinoId: z.number().nullable().optional(),
        status: z.string().optional(),
        observacoes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePlanoPlantio(id, data);
        return { success: true };
      }),
    avancarStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        novoStatus: z.enum(['em_germinacao', 'em_producao', 'colhido', 'cancelado']),
      }))
      .mutation(async ({ input }) => {
        await db.updatePlanoPlantio(input.id, { status: input.novoStatus });
        return { success: true, status: input.novoStatus };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePlanoPlantio(input.id);
        return { success: true };
      }),
  }),

  // ---- Seed / Reset (admin) ----
  admin: router({
    seed: adminProcedure.mutation(async () => {
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

      async function createTorreWithAndares(torreData: { slug: string; nome: string; fase: string; numAndares: number; caixaAguaId: number }, numAndares: number) {
        const torreResult = await dbInst!.insert(schema.torres).values(torreData);
        const torreId = torreResult[0].insertId;
        const est = ESTRUTURA_FASE[torreData.fase];

        for (let a = 1; a <= numAndares; a++) {
          const andarResult = await dbInst!.insert(schema.andares).values({ torreId, numero: a, lavado: true });
          const andarId = andarResult[0].insertId;

          const perfilData = Array.from({ length: est.perfis }, (_, i) => ({
            andarId, perfilIndex: i, ativo: false,
          }));
          if (perfilData.length > 0) await dbInst!.insert(schema.perfis).values(perfilData);

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

    reset: adminProcedure.mutation(async () => {
      await db.resetAllData();
      return { success: true, message: "Todos os dados foram removidos" };
    }),
  }),
});

export type AppRouter = typeof appRouter;
