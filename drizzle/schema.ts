import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  json,
  decimal,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// Fazendas Up — Schema do Banco de Dados
// Sistema supervisório para fazenda vertical hidropônica
// ============================================================

// ---- Usuários (auth) ----
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** VARCHAR na BD (mig. 0027): evita ENUM desalinhado com `platform_admin` em hosts antigos. */
  role: varchar("role", { length: 32 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- Projetos (multi-tenant) ----
export const projetos = mysqlTable("projetos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["fazenda_vertical", "hidroponia", "microverdes"]).notNull(),
  descricao: text("descricao"),
  endereco: varchar("endereco", { length: 500 }),
  responsavelId: int("responsavelId"),
  /** Em `microverdes`: permite usar o módulo de caixas d'água (rega automática futura). FV/hidroponia: normalmente true. */
  usarCaixaAgua: boolean("usarCaixaAgua").notNull().default(true),
  status: mysqlEnum("status", ["ativo", "inativo", "planejamento"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjetoRow = typeof projetos.$inferSelect;
export type InsertProjeto = typeof projetos.$inferInsert;

export const projetoUsuarios = mysqlTable(
  "projeto_usuarios",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["admin", "operador", "visualizador"]).default("operador").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    unqProjetoUser: uniqueIndex("projeto_usuarios_projeto_user").on(t.projetoId, t.userId),
  }),
);

export type ProjetoUsuarioRow = typeof projetoUsuarios.$inferSelect;
export type InsertProjetoUsuario = typeof projetoUsuarios.$inferInsert;

/** Módulos SaaS opcionais por projeto (estoque, automação, etc.). */
export const projetoModulos = mysqlTable(
  "projeto_modulos",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    modulo: varchar("modulo", { length: 32 }).notNull(),
    habilitado: boolean("habilitado").notNull().default(false),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    uqProjetoModulo: uniqueIndex("uq_projeto_modulo").on(t.projetoId, t.modulo),
  }),
);


export type ProjetoModuloRow = typeof projetoModulos.$inferSelect;
export type InsertProjetoModulo = typeof projetoModulos.$inferInsert;

// ---- Hidroponia: bancadas ----
export const bancadas = mysqlTable(
  "bancadas",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    codigo: varchar("codigo", { length: 50 }),
    /** Fase operacional alinhada às torres (mudas / vegetativa / maturacao). */
    fase: varchar("fase", { length: 32 }).notNull().default("vegetativa"),
    quantidadeCaixas: int("quantidadeCaixas").notNull().default(1),
    tipoCultivo: varchar("tipoCultivo", { length: 100 }),
    comprimentoMetros: decimal("comprimentoMetros", { precision: 5, scale: 2 }),
    status: mysqlEnum("status", ["ativa", "inativa", "manutencao"]).default("ativa").notNull(),
    ativa: boolean("ativa").notNull().default(true),
    /** Uma linha física/lógica alimenta várias caixas (nutriente compartilhado). */
    compartilhada: boolean("compartilhada").notNull().default(false),
    /** Plantio único da linha (sem andar/perfil): referência à variedade na tabela `variedades`. */
    plantioVariedadeId: int("plantioVariedadeId"),
    plantioDataEntrada: timestamp("plantioDataEntrada"),
    plantioPrevisaoColheita: timestamp("plantioPrevisaoColheita"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    bancadasProjetoSlug: uniqueIndex("bancadas_projeto_slug").on(t.projetoId, t.slug),
  }),
);

export type BancadaRow = typeof bancadas.$inferSelect;
export type InsertBancada = typeof bancadas.$inferInsert;

export const caixasBancada = mysqlTable("caixas_bancada", {
  id: int("id").autoincrement().primaryKey(),
  bancadaId: int("bancadaId").notNull(),
  projetoId: int("projetoId").notNull(),
  posicao: int("posicao").notNull(),
  variedadeId: int("variedadeId"),
  status: mysqlEnum("status", ["vazia", "plantada", "germinando", "colheita"]).default("vazia").notNull(),
  dataPlantio: timestamp("dataPlantio"),
  dataPrevisaoColheita: timestamp("dataPrevisaoColheita"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaixaBancadaRow = typeof caixasBancada.$inferSelect;
export type InsertCaixaBancada = typeof caixasBancada.$inferInsert;

export const medicoesBancada = mysqlTable("medicoes_bancada", {
  id: int("id").autoincrement().primaryKey(),
  bancadaId: int("bancadaId").notNull(),
  projetoId: int("projetoId").notNull(),
  ph: decimal("ph", { precision: 4, scale: 2 }),
  ec: decimal("ec", { precision: 5, scale: 2 }),
  temperaturaAgua: decimal("temperaturaAgua", { precision: 4, scale: 1 }),
  temperaturaAmbiente: decimal("temperaturaAmbiente", { precision: 4, scale: 1 }),
  umidade: decimal("umidade", { precision: 4, scale: 1 }),
  observacoes: text("observacoes"),
  medidoPor: int("medidoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicaoBancadaRow = typeof medicoesBancada.$inferSelect;
export type InsertMedicaoBancada = typeof medicoesBancada.$inferInsert;

export const aplicacoesBancada = mysqlTable("aplicacoes_bancada", {
  id: int("id").autoincrement().primaryKey(),
  bancadaId: int("bancadaId").notNull(),
  projetoId: int("projetoId").notNull(),
  tipoAplicacao: varchar("tipoAplicacao", { length: 100 }).notNull(),
  produto: varchar("produto", { length: 255 }).notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 3 }),
  unidade: varchar("unidade", { length: 20 }),
  observacoes: text("observacoes"),
  aplicadoPor: int("aplicadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AplicacaoBancadaRow = typeof aplicacoesBancada.$inferSelect;
export type InsertAplicacaoBancada = typeof aplicacoesBancada.$inferInsert;

// ---- Variedades de Plantas ----
export const variedades = mysqlTable(
  "variedades",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nome: varchar("nome", { length: 128 }).notNull(),
    diasMudas: int("diasMudas").notNull().default(14),
    diasVegetativa: int("diasVegetativa").notNull().default(21),
    diasMaturacao: int("diasMaturacao").notNull().default(28),
    /** Torres 12×6: 2 células/furo em veg/mat; dobra sementes no planejamento contínuo. */
    babyLeaf: boolean("babyLeaf").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    variedadesProjetoSlug: uniqueIndex("variedades_projeto_slug").on(t.projetoId, t.slug),
  }),
);

export type Variedade = typeof variedades.$inferSelect;
export type InsertVariedade = typeof variedades.$inferInsert;

// ---- Configuração de Fases ----
export const fasesConfig = mysqlTable(
  "fases_config",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    fase: varchar("fase", { length: 32 }).notNull(),
    label: varchar("label", { length: 64 }).notNull(),
  ecMin: float("ecMin").notNull(),
  ecMax: float("ecMax").notNull(),
  phMin: float("phMin").notNull(),
  phMax: float("phMax").notNull(),
  cor: varchar("cor", { length: 64 }).notNull(),
  corLight: varchar("corLight", { length: 64 }).notNull(),
    icon: varchar("icon", { length: 16 }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    fasesConfigProjetoFase: uniqueIndex("fases_config_projeto_fase").on(t.projetoId, t.fase),
  }),
);

export type FaseConfigRow = typeof fasesConfig.$inferSelect;
export type InsertFaseConfig = typeof fasesConfig.$inferInsert;

// ---- Caixas d'Água ----
export const caixasAgua = mysqlTable(
  "caixas_agua",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nome: varchar("nome", { length: 128 }).notNull(),
    fase: varchar("fase", { length: 32 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    caixasAguaProjetoSlug: uniqueIndex("caixas_agua_projeto_slug").on(t.projetoId, t.slug),
  }),
);

export type CaixaAgua = typeof caixasAgua.$inferSelect;
export type InsertCaixaAgua = typeof caixasAgua.$inferInsert;

// ---- Torres ----
export const torres = mysqlTable(
  "torres",
  {
    id: int("id").autoincrement().primaryKey(),
    projetoId: int("projetoId").notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nome: varchar("nome", { length: 128 }).notNull(),
  fase: varchar("fase", { length: 32 }).notNull(),
  /** Número operacional fixo por projeto (ordenação, relatórios); independente do nome exibido. */
  numeroTorre: int("numeroTorre").notNull().default(1),
  /** JSON opcional: override por fase `{ "vegetativa": { "perfis":12, "furosPorPerfil":6 } }`. */
  estruturaOverrideJson: text("estruturaOverrideJson"),
  numAndares: int("numAndares").notNull().default(10),
  caixaAguaId: int("caixaAguaId"),
    ativa: boolean("ativa").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    torresProjetoSlug: uniqueIndex("torres_projeto_slug").on(t.projetoId, t.slug),
    torresProjetoNumero: uniqueIndex("torres_projeto_numero").on(t.projetoId, t.numeroTorre),
  }),
);

export type Torre = typeof torres.$inferSelect;
export type InsertTorre = typeof torres.$inferInsert;

// ---- Medições de Caixa d'Água ----
export const medicoesCaixa = mysqlTable("medicoes_caixa", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  caixaAguaId: int("caixaAguaId").notNull(),
  ec: float("ec").notNull(),
  ph: float("ph").notNull(),
  dataHora: timestamp("dataHora").notNull(),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicaoCaixa = typeof medicoesCaixa.$inferSelect;
export type InsertMedicaoCaixa = typeof medicoesCaixa.$inferInsert;

// ---- Aplicações em Caixa d'Água ----
export const aplicacoesCaixa = mysqlTable("aplicacoes_caixa", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  caixaAguaId: int("caixaAguaId").notNull(),
  tipo: varchar("tipo", { length: 32 }).notNull(),
  produto: varchar("produto", { length: 256 }).notNull(),
  quantidade: varchar("quantidade", { length: 128 }).notNull(),
  dataHora: timestamp("dataHora").notNull(),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AplicacaoCaixa = typeof aplicacoesCaixa.$inferSelect;
export type InsertAplicacaoCaixa = typeof aplicacoesCaixa.$inferInsert;

// ---- Andares ----
export const andares = mysqlTable("andares", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  torreId: int("torreId").notNull(),
  numero: int("numero").notNull(),
  dataEntrada: timestamp("dataEntrada"),
  lavado: boolean("lavado").notNull().default(true),
  dataColheitaTotal: timestamp("dataColheitaTotal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AndarRow = typeof andares.$inferSelect;
export type InsertAndar = typeof andares.$inferInsert;

// ---- Perfis por Andar ----
export const perfis = mysqlTable("perfis", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  andarId: int("andarId").notNull(),
  perfilIndex: int("perfilIndex").notNull(),
  variedadeId: int("variedadeId"),
  /** Receita de crescimento usada nos prazos deste perfil (desempate com várias receitas por variedade). */
  receitaId: int("receitaId"),
  ativo: boolean("ativo").notNull().default(false),
  dataEntrada: timestamp("dataEntrada"),
  /** Microverdes iluminação: vazio | plantado | colhido (sem furos por bandeja). */
  cultivoStatus: varchar("cultivoStatus", { length: 16 }),
});

export type Perfil = typeof perfis.$inferSelect;
export type InsertPerfil = typeof perfis.$inferInsert;

// ---- Furos por Andar ----
export const furos = mysqlTable("furos", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  andarId: int("andarId").notNull(),
  perfilIndex: int("perfilIndex").notNull(),
  furoIndex: int("furoIndex").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("vazio"),
  variedadeId: int("variedadeId"),
});

export type FuroRow = typeof furos.$inferSelect;
export type InsertFuro = typeof furos.$inferInsert;

// ---- Aplicações em Andar ----
export const aplicacoesAndar = mysqlTable("aplicacoes_andar", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  andarId: int("andarId").notNull(),
  tipo: varchar("tipo", { length: 32 }).notNull(),
  produto: varchar("produto", { length: 256 }).notNull(),
  quantidade: varchar("quantidade", { length: 128 }).notNull(),
  dataHora: timestamp("dataHora").notNull(),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AplicacaoAndar = typeof aplicacoesAndar.$inferSelect;
export type InsertAplicacaoAndar = typeof aplicacoesAndar.$inferInsert;

// ---- Germinação (Lotes) ----
export const germinacao = mysqlTable("germinacao", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  variedadeId: int("variedadeId").notNull(),
  variedadeNome: varchar("variedadeNome", { length: 128 }).notNull(),
  quantidade: int("quantidade").notNull(),
  dataPlantio: timestamp("dataPlantio").notNull(),
  dataHora: timestamp("dataHora").notNull(),
  diasParaTransplantio: int("diasParaTransplantio").notNull().default(1),
  germinadas: int("germinadas").notNull().default(0),
  naoGerminadas: int("naoGerminadas").notNull().default(0),
  transplantadas: int("transplantadas").notNull().default(0),
  status: varchar("status", { length: 32 }).notNull().default("germinando"),
  observacoes: text("observacoes"),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GerminacaoRow = typeof germinacao.$inferSelect;
export type InsertGerminacao = typeof germinacao.$inferInsert;

// ---- Registros de Transplantio ----
export const transplantios = mysqlTable("transplantios", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  dataHora: timestamp("dataHora").notNull(),
  // Origem (para rastreabilidade)
  torreOrigemId: int("torreOrigemId"),
  andarOrigemId: int("andarOrigemId"),
  faseOrigem: varchar("faseOrigem", { length: 32 }).notNull(),
  faseDestino: varchar("faseDestino", { length: 32 }).notNull(),
  variedadeId: int("variedadeId").notNull(),
  variedadeNome: varchar("variedadeNome", { length: 128 }).notNull(),
  quantidadeTransplantada: int("quantidadeTransplantada").notNull(),
  quantidadeDesperdicio: int("quantidadeDesperdicio").notNull().default(0),
  motivoDesperdicio: varchar("motivoDesperdicio", { length: 64 }),
  torreDestinoId: int("torreDestinoId"),
  andarDestinoId: int("andarDestinoId"),
  observacoes: text("observacoes"),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transplantio = typeof transplantios.$inferSelect;
export type InsertTransplantio = typeof transplantios.$inferInsert;

// ---- Manutenções ----
export const manutencoes = mysqlTable("manutencoes", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  torreId: int("torreId").notNull(),
  andarNumero: int("andarNumero"),
  tipo: varchar("tipo", { length: 32 }).notNull(),
  descricao: text("descricao").notNull(),
  dataAbertura: timestamp("dataAbertura").notNull(),
  prazo: timestamp("prazo"),
  dataConclusao: timestamp("dataConclusao"),
  solucao: text("solucao"),
  status: varchar("status", { length: 32 }).notNull().default("aberta"),
  lampadaIndex: int("lampadaIndex"),
  abertoPorId: int("abertoPorId"),
  abertoPorNome: varchar("abertoPorNome", { length: 128 }),
  concluidoPorId: int("concluidoPorId"),
  concluidoPorNome: varchar("concluidoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManutencaoRow = typeof manutencoes.$inferSelect;
export type InsertManutencao = typeof manutencoes.$inferInsert;

// ---- Ciclos de Aplicação ----
export const ciclos = mysqlTable("ciclos", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  nome: varchar("nome", { length: 128 }).notNull(),
  frequencia: varchar("frequencia", { length: 32 }).notNull(),
  diasSemana: json("diasSemana"),
  intervaloDias: int("intervaloDias"),
  produto: varchar("produto", { length: 256 }).notNull(),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  dosagem: varchar("dosagem", { length: 128 }),
  fasesAplicaveis: json("fasesAplicaveis").notNull(),
  alvo: varchar("alvo", { length: 16 }).notNull().default("caixa"),
  ultimaExecucao: timestamp("ultimaExecucao"),
  ultimoExecutorId: int("ultimoExecutorId"),
  ultimoExecutorNome: varchar("ultimoExecutorNome", { length: 128 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CicloRow = typeof ciclos.$inferSelect;
export type InsertCiclo = typeof ciclos.$inferInsert;

// ---- Receitas de Crescimento ----
export const receitasCrescimento = mysqlTable("receitas_crescimento", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  nome: varchar("nome", { length: 256 }).notNull(),
  variedadeId: int("variedadeId").notNull(),
  metodoColheita: varchar("metodoColheita", { length: 32 }).notNull().default("corte_unico"),
  diasGerminacao: int("diasGerminacao").notNull().default(5),
  diasMudas: int("diasMudas").notNull().default(14),
  diasVegetativa: int("diasVegetativa").notNull().default(21),
  diasMaturacao: int("diasMaturacao").notNull().default(28),
  ecPorFase: json("ecPorFase"), // { mudas: { min, max }, vegetativa: { min, max }, maturacao: { min, max } }
  /** Legado: pH por fase; preferir `ph` (único para todas as fases). */
  phPorFase: json("phPorFase"),
  /** pH único para germinação, mudas, vegetativa e maturação. */
  ph: float("ph"),
  /** Média °C (substitui min/max para novos cadastros). */
  temperaturaMedia: float("temperaturaMedia"),
  temperaturaMin: float("temperaturaMin"),
  temperaturaMax: float("temperaturaMax"),
  /** Média % (substitui min/max para novos cadastros). */
  umidadeMedia: float("umidadeMedia"),
  umidadeMin: float("umidadeMin"),
  umidadeMax: float("umidadeMax"),
  /** Legado: mesma luz para todas as fases. Preferir `horasLuzPorFase`. */
  horasLuz: int("horasLuz"),
  /** Horas de luz por fase (mudas, vegetativa, maturacao; germinação no escuro). */
  horasLuzPorFase: json("horasLuzPorFase"),
  densidadePorPerfil: int("densidadePorPerfil"),
  yieldEsperadoGramas: float("yieldEsperadoGramas"),
  observacoes: text("observacoes"),
  ativa: boolean("ativa").notNull().default(true),
  criadoPorId: int("criadoPorId"),
  criadoPorNome: varchar("criadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReceitaCrescimento = typeof receitasCrescimento.$inferSelect;
export type InsertReceitaCrescimento = typeof receitasCrescimento.$inferInsert;

// ---- Tarefas Operacionais ----
export const tarefas = mysqlTable("tarefas", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  titulo: varchar("titulo", { length: 256 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 32 }).notNull().default("outro"),
  // tipos: ciclo, transplantio, colheita, lavagem, medicao, manutencao, outro
  prioridade: varchar("prioridade", { length: 16 }).notNull().default("media"),
  // prioridades: baixa, media, alta, urgente
  dataVencimento: timestamp("dataVencimento").notNull(),
  torreId: int("torreId"),
  andarNumero: int("andarNumero"),
  caixaAguaId: int("caixaAguaId"),
  cicloId: int("cicloId"),
  atribuidoParaId: int("atribuidoParaId"),
  atribuidoParaNome: varchar("atribuidoParaNome", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull().default("pendente"),
  // status: pendente, em_andamento, concluida, cancelada
  concluidoPorId: int("concluidoPorId"),
  concluidoPorNome: varchar("concluidoPorNome", { length: 128 }),
  concluidoEm: timestamp("concluidoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tarefa = typeof tarefas.$inferSelect;
export type InsertTarefa = typeof tarefas.$inferInsert;

// ---- Registros de Colheita ----
export const registrosColheita = mysqlTable("registros_colheita", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  torreId: int("torreId").notNull(),
  andarId: int("andarId").notNull(),
  variedadeId: int("variedadeId"),
  variedadeNome: varchar("variedadeNome", { length: 128 }),
  receitaId: int("receitaId"),
  dataColheita: timestamp("dataColheita").notNull(),
  quantidadePlantas: int("quantidadePlantas").notNull().default(0),
  pesoTotalGramas: float("pesoTotalGramas"),
  qualidade: varchar("qualidade", { length: 8 }).default("B"),
  // qualidade: A (excelente), B (boa), C (abaixo)
  destino: varchar("destino", { length: 256 }),
  observacoes: text("observacoes"),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RegistroColheita = typeof registrosColheita.$inferSelect;
export type InsertRegistroColheita = typeof registrosColheita.$inferInsert;

// ---- Planos de Plantio ----
export const planosPlantio = mysqlTable("planos_plantio", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  receitaId: int("receitaId").notNull(),
  receitaNome: varchar("receitaNome", { length: 256 }).notNull(),
  variedadeId: int("variedadeId").notNull(),
  variedadeNome: varchar("variedadeNome", { length: 128 }).notNull(),
  quantidadePlantas: int("quantidadePlantas").notNull(),
  dataInicioGerminacao: timestamp("dataInicioGerminacao").notNull(),
  dataTransplantioMudas: timestamp("dataTransplantioMudas").notNull(),
  dataTransplantioVeg: timestamp("dataTransplantioVeg").notNull(),
  dataTransplantioMat: timestamp("dataTransplantioMat").notNull(),
  dataColheitaPrevista: timestamp("dataColheitaPrevista").notNull(),
  torreDestinoId: int("torreDestinoId"),
  andarDestinoId: int("andarDestinoId"),
  status: varchar("status", { length: 32 }).notNull().default("planejado"),
  // status: planejado, em_germinacao, em_producao, colhido, cancelado
  /** Contagem operacional na bandeja (mesmo conceito do antigo módulo germinação). */
  germinadas: int("germinadas").notNull().default(0),
  naoGerminadas: int("naoGerminadas").notNull().default(0),
  transplantadasGerminacao: int("transplantadasGerminacao").notNull().default(0),
  /** pendente | germinando | pronto_mudas — só relevante em planejado/em_germinacao */
  germinacaoFase: varchar("germinacaoFase", { length: 32 }).notNull().default("pendente"),
  observacoes: text("observacoes"),
  criadoPorId: int("criadoPorId"),
  criadoPorNome: varchar("criadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlanoPlantio = typeof planosPlantio.$inferSelect;
export type InsertPlanoPlantio = typeof planosPlantio.$inferInsert;

// ---- Regras de Recomendação (Intelligence) ----
export const recommendationRules = mysqlTable("recommendation_rules", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  nome: varchar("nome", { length: 256 }).notNull(),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  // tipos: risco_atraso, torre_subutilizada, lote_fora_padrao, manutencao_critica,
  //        capacidade_disponivel, sequencia_incompleta, inconsistencia_plano,
  //        desempenho_abaixo, concentracao_risco, oportunidade_antecipacao
  gatilho: text("gatilho").notNull(),
  condicao: text("condicao").notNull(),
  acaoSugerida: text("acaoSugerida").notNull(),
  faseAplicavel: varchar("faseAplicavel", { length: 32 }),
  prioridadePadrao: varchar("prioridadePadrao", { length: 16 }).notNull().default("media"),
  severidadePadrao: varchar("severidadePadrao", { length: 16 }).notNull().default("media"),
  ativo: boolean("ativo").notNull().default(true),
  versao: int("versao").notNull().default(1),
  criadoPorId: int("criadoPorId"),
  criadoPorNome: varchar("criadoPorNome", { length: 128 }),
  aprovadoPorId: int("aprovadoPorId"),
  aprovadoPorNome: varchar("aprovadoPorNome", { length: 128 }),
  fonte: varchar("fonte", { length: 256 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecommendationRule = typeof recommendationRules.$inferSelect;
export type InsertRecommendationRule = typeof recommendationRules.$inferInsert;

// ---- Alertas Inteligentes ----
export const intelligentAlerts = mysqlTable("intelligent_alerts", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  severidade: varchar("severidade", { length: 16 }).notNull().default("media"),
  // severidade: baixa, media, alta, critica
  prioridade: varchar("prioridade", { length: 16 }).notNull().default("media"),
  // prioridade: baixa, media, alta, urgente
  titulo: varchar("titulo", { length: 512 }).notNull(),
  descricao: text("descricao").notNull(),
  entidadeTipo: varchar("entidadeTipo", { length: 32 }),
  // entidadeTipo: torre, andar, perfil, caixa_agua, manutencao, ciclo, plano, germinacao
  entidadeId: int("entidadeId"),
  entidadeNome: varchar("entidadeNome", { length: 256 }),
  fase: varchar("fase", { length: 32 }),
  origem: varchar("origem", { length: 64 }).notNull().default("motor_regras"),
  // origem: motor_regras, manual
  ruleId: int("ruleId"),
  dadosSnapshot: json("dadosSnapshot"),
  sugestaoAcao: text("sugestaoAcao").notNull(),
  nivelConfianca: varchar("nivelConfianca", { length: 16 }).notNull().default("alta"),
  // nivelConfianca: alta, media, baixa
  status: varchar("status", { length: 16 }).notNull().default("novo"),
  // status: novo, lido, em_andamento, resolvido, ignorado
  lidoPorId: int("lidoPorId"),
  lidoPorNome: varchar("lidoPorNome", { length: 128 }),
  resolvidoPorId: int("resolvidoPorId"),
  resolvidoPorNome: varchar("resolvidoPorNome", { length: 128 }),
  ignoradoPorId: int("ignoradoPorId"),
  ignoradoPorNome: varchar("ignoradoPorNome", { length: 128 }),
  ignoradoMotivo: text("ignoradoMotivo"),
  ignoradoPrazo: timestamp("ignoradoPrazo"),
  gerarTarefa: boolean("gerarTarefa").notNull().default(false),
  tarefaGeradaId: int("tarefaGeradaId"),
  hashUnico: varchar("hashUnico", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntelligentAlert = typeof intelligentAlerts.$inferSelect;
export type InsertIntelligentAlert = typeof intelligentAlerts.$inferInsert;

// ---- Eventos de Alerta (Histórico/Auditoria) ----
export const alertEvents = mysqlTable("alert_events", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  alertaId: int("alertaId").notNull(),
  eventoTipo: varchar("eventoTipo", { length: 32 }).notNull(),
  // eventoTipo: criado, lido, em_andamento, resolvido, ignorado, tarefa_criada, reaberto, atualizado
  usuarioId: int("usuarioId"),
  usuarioNome: varchar("usuarioNome", { length: 128 }),
  observacao: text("observacao"),
  dadosExtra: json("dadosExtra"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AlertEvent = typeof alertEvents.$inferSelect;
export type InsertAlertEvent = typeof alertEvents.$inferInsert;

// ---- Estoque (insumos) ----
export const estoqueItens = mysqlTable("estoque_itens", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  categoria: varchar("categoria", { length: 32 }).notNull(),
  nome: varchar("nome", { length: 256 }).notNull(),
  quantidadeTotal: float("quantidadeTotal").notNull().default(0),
  unidadeTipo: varchar("unidadeTipo", { length: 16 }).notNull().default("unidade"),
  /** Consumo por utilização (mesma unidade de `quantidadeTotal`). */
  usoPorEvento: float("usoPorEvento").notNull().default(0),
  /** Intervalo médio em dias entre utilizações (ex.: 7 = semanal). */
  frequenciaDias: float("frequenciaDias").notNull().default(1),
  prazoEntregaDias: int("prazoEntregaDias").notNull().default(7),
  /** Dias antes do esgotamento para sugerir encomenda (além do prazo de entrega). */
  diasMargemCompra: int("diasMargemCompra").notNull().default(7),
  nivelMinimo: float("nivelMinimo"),
  precoUnitario: float("precoUnitario"),
  fornecedor: varchar("fornecedor", { length: 256 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EstoqueItemRow = typeof estoqueItens.$inferSelect;
export type InsertEstoqueItem = typeof estoqueItens.$inferInsert;

/** Rubricas de custo de produção por variedade (R$/planta ou derivados). */
export const custosProducaoItens = mysqlTable("custos_producao_itens", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  /** Null = rubrica do projeto (com ou sem rateio entre variedades). */
  variedadeId: int("variedadeId"),
  grupo: varchar("grupo", { length: 64 }).notNull(),
  rubrica: varchar("rubrica", { length: 160 }).notNull(),
  descricao: text("descricao"),
  modo: mysqlEnum("modo", [
    "calculado",
    "por_planta",
    "por_ciclo",
    "mensal_rateio",
    "rateio_projeto",
  ])
    .notNull()
    .default("por_planta"),
  /** Para `rateio_projeto`: como repartir o valor mensal entre variedades. */
  rateioMetodo: varchar("rateioMetodo", { length: 24 }),
  /** Janela em dias para agregar colheitas quando o método usar dados de colheita. */
  rateioDiasColheita: int("rateioDiasColheita"),
  /** Preço da unidade de compra (R$), ex.: R$/kg — usado com quantidadePorPlanta */
  precoReferencia: decimal("precoReferencia", { precision: 18, scale: 8 }),
  unidadeCompra: varchar("unidadeCompra", { length: 32 }),
  quantidadePorPlanta: decimal("quantidadePorPlanta", { precision: 20, scale: 10 }),
  valorPorPlanta: decimal("valorPorPlanta", { precision: 14, scale: 6 }),
  valorPorCiclo: decimal("valorPorCiclo", { precision: 14, scale: 2 }),
  plantasPorCicloEstimado: int("plantasPorCicloEstimado"),
  valorMensal: decimal("valorMensal", { precision: 14, scale: 2 }),
  plantasMesEstimativa: int("plantasMesEstimativa"),
  ordem: int("ordem").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustoProducaoItemRow = typeof custosProducaoItens.$inferSelect;
export type InsertCustoProducaoItem = typeof custosProducaoItens.$inferInsert;

/** Análises de imagens do cultivo (visão computacional). */
export const visionCultivoAnalyses = mysqlTable("vision_cultivo_analyses", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  torreSlug: varchar("torreSlug", { length: 64 }),
  variedadeNome: varchar("variedadeNome", { length: 256 }),
  contextoNotas: varchar("contextoNotas", { length: 512 }),
  mimeType: varchar("mimeType", { length: 64 }).notNull().default("image/jpeg"),
  imageSha256: varchar("imageSha256", { length: 64 }).notNull(),
  resultadoJson: json("resultadoJson").notNull(),
  modeloVersao: varchar("modeloVersao", { length: 32 }).notNull().default("stub-v1"),
  storageKey: varchar("storageKey", { length: 512 }),
  imagemArmazenada: text("imagemArmazenada"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisionCultivoAnalysisRow = typeof visionCultivoAnalyses.$inferSelect;
export type InsertVisionCultivoAnalysis = typeof visionCultivoAnalyses.$inferInsert;

/** Amostras rotuladas para treino supervisionado do modelo de visão. */
export const visionTrainingSamples = mysqlTable("vision_training_samples", {
  id: int("id").autoincrement().primaryKey(),
  projetoId: int("projetoId").notNull(),
  analysisId: int("analysisId"),
  createdByUserId: int("createdByUserId").notNull(),
  rotuloPrincipal: varchar("rotuloPrincipal", { length: 64 }).notNull(),
  rotulosExtras: json("rotulosExtras"),
  splitTreino: mysqlEnum("splitTreino", ["treino", "validacao", "teste"]).notNull().default("treino"),
  imagemSha256: varchar("imagemSha256", { length: 64 }).notNull(),
  imagemBase64: text("imagemBase64").notNull(),
  mimeType: varchar("mimeType", { length: 64 }).notNull().default("image/jpeg"),
  confirmadoPorAdmin: boolean("confirmadoPorAdmin").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisionTrainingSampleRow = typeof visionTrainingSamples.$inferSelect;
export type InsertVisionTrainingSample = typeof visionTrainingSamples.$inferInsert;
