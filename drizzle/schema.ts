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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---- Variedades de Plantas ----
export const variedades = mysqlTable("variedades", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  diasMudas: int("diasMudas").notNull().default(14),
  diasVegetativa: int("diasVegetativa").notNull().default(21),
  diasMaturacao: int("diasMaturacao").notNull().default(28),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Variedade = typeof variedades.$inferSelect;
export type InsertVariedade = typeof variedades.$inferInsert;

// ---- Configuração de Fases ----
export const fasesConfig = mysqlTable("fases_config", {
  id: int("id").autoincrement().primaryKey(),
  fase: varchar("fase", { length: 32 }).notNull().unique(),
  label: varchar("label", { length: 64 }).notNull(),
  ecMin: float("ecMin").notNull(),
  ecMax: float("ecMax").notNull(),
  phMin: float("phMin").notNull(),
  phMax: float("phMax").notNull(),
  cor: varchar("cor", { length: 64 }).notNull(),
  corLight: varchar("corLight", { length: 64 }).notNull(),
  icon: varchar("icon", { length: 16 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FaseConfigRow = typeof fasesConfig.$inferSelect;
export type InsertFaseConfig = typeof fasesConfig.$inferInsert;

// ---- Caixas d'Água ----
export const caixasAgua = mysqlTable("caixas_agua", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  fase: varchar("fase", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaixaAgua = typeof caixasAgua.$inferSelect;
export type InsertCaixaAgua = typeof caixasAgua.$inferInsert;

// ---- Torres ----
export const torres = mysqlTable("torres", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  fase: varchar("fase", { length: 32 }).notNull(),
  numAndares: int("numAndares").notNull().default(10),
  caixaAguaId: int("caixaAguaId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Torre = typeof torres.$inferSelect;
export type InsertTorre = typeof torres.$inferInsert;

// ---- Medições de Caixa d'Água ----
export const medicoesCaixa = mysqlTable("medicoes_caixa", {
  id: int("id").autoincrement().primaryKey(),
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
  andarId: int("andarId").notNull(),
  perfilIndex: int("perfilIndex").notNull(),
  variedadeId: int("variedadeId"),
  ativo: boolean("ativo").notNull().default(false),
});

export type Perfil = typeof perfis.$inferSelect;
export type InsertPerfil = typeof perfis.$inferInsert;

// ---- Furos por Andar ----
export const furos = mysqlTable("furos", {
  id: int("id").autoincrement().primaryKey(),
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
  dataHora: timestamp("dataHora").notNull(),
  faseOrigem: varchar("faseOrigem", { length: 32 }).notNull(),
  faseDestino: varchar("faseDestino", { length: 32 }).notNull(),
  variedadeId: int("variedadeId").notNull(),
  variedadeNome: varchar("variedadeNome", { length: 128 }).notNull(),
  quantidadeTransplantada: int("quantidadeTransplantada").notNull(),
  quantidadeDesperdicio: int("quantidadeDesperdicio").notNull().default(0),
  motivoDesperdicio: varchar("motivoDesperdicio", { length: 64 }),
  torreDestinoId: int("torreDestinoId"),
  andarDestinoId: int("andarDestinoId"),
  executadoPorId: int("executadoPorId"),
  executadoPorNome: varchar("executadoPorNome", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transplantio = typeof transplantios.$inferSelect;
export type InsertTransplantio = typeof transplantios.$inferInsert;

// ---- Manutenções ----
export const manutencoes = mysqlTable("manutencoes", {
  id: int("id").autoincrement().primaryKey(),
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
  nome: varchar("nome", { length: 128 }).notNull(),
  frequencia: varchar("frequencia", { length: 32 }).notNull(),
  diasSemana: json("diasSemana"),
  intervaloDias: int("intervaloDias"),
  produto: varchar("produto", { length: 256 }).notNull(),
  tipo: varchar("tipo", { length: 64 }).notNull(),
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
