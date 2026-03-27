import { eq, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  variedades, InsertVariedade,
  fasesConfig, InsertFaseConfig,
  torres, InsertTorre,
  caixasAgua, InsertCaixaAgua,
  medicoesCaixa, InsertMedicaoCaixa,
  aplicacoesCaixa, InsertAplicacaoCaixa,
  andares, InsertAndar,
  perfis, InsertPerfil,
  furos, InsertFuro,
  aplicacoesAndar, InsertAplicacaoAndar,
  germinacao, InsertGerminacao,
  transplantios, InsertTransplantio,
  manutencoes, InsertManutencao,
  ciclos, InsertCiclo,
  receitasCrescimento, InsertReceitaCrescimento,
  tarefas, InsertTarefa,
  registrosColheita, InsertRegistroColheita,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// Users
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// Variedades
// ============================================================

export async function getAllVariedades() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(variedades);
}

export async function getVariedadeBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(variedades).where(eq(variedades.slug, slug)).limit(1);
  return result[0];
}

export async function createVariedade(data: InsertVariedade) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(variedades).values(data);
  return { id: result[0].insertId };
}

export async function updateVariedade(id: number, data: Partial<InsertVariedade>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(variedades).set(data).where(eq(variedades.id, id));
}

export async function deleteVariedade(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(variedades).where(eq(variedades.id, id));
}

// ============================================================
// Fases Config
// ============================================================

export async function getAllFasesConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fasesConfig);
}

export async function upsertFaseConfig(data: InsertFaseConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(fasesConfig).values(data).onDuplicateKeyUpdate({
    set: {
      label: data.label,
      ecMin: data.ecMin,
      ecMax: data.ecMax,
      phMin: data.phMin,
      phMax: data.phMax,
      cor: data.cor,
      corLight: data.corLight,
      icon: data.icon,
    },
  });
}

// ============================================================
// Torres
// ============================================================

export async function getAllTorres() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(torres);
}

export async function getTorreById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(torres).where(eq(torres.id, id)).limit(1);
  return result[0];
}

export async function getTorreBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(torres).where(eq(torres.slug, slug)).limit(1);
  return result[0];
}

export async function createTorre(data: InsertTorre) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(torres).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// Caixas d'Água
// ============================================================

export async function getAllCaixasAgua() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caixasAgua);
}

export async function createCaixaAgua(data: InsertCaixaAgua) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(caixasAgua).values(data);
  return { id: result[0].insertId };
}

// ============================================================
// Medições Caixa
// ============================================================

export async function getMedicoesByCaixaId(caixaAguaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(medicoesCaixa).where(eq(medicoesCaixa.caixaAguaId, caixaAguaId));
}

export async function createMedicaoCaixa(data: InsertMedicaoCaixa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(medicoesCaixa).values(data);
  return { id: result[0].insertId };
}

export async function deleteMedicaoCaixa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(medicoesCaixa).where(eq(medicoesCaixa.id, id));
}

// ============================================================
// Aplicações Caixa
// ============================================================

export async function getAplicacoesByCaixaId(caixaAguaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aplicacoesCaixa).where(eq(aplicacoesCaixa.caixaAguaId, caixaAguaId));
}

export async function createAplicacaoCaixa(data: InsertAplicacaoCaixa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aplicacoesCaixa).values(data);
  return { id: result[0].insertId };
}

export async function deleteAplicacaoCaixa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aplicacoesCaixa).where(eq(aplicacoesCaixa.id, id));
}

// ============================================================
// Andares
// ============================================================

export async function getAllAndares() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(andares);
}

export async function getAndaresByTorreId(torreId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(andares).where(eq(andares.torreId, torreId));
}

export async function getAndarById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(andares).where(eq(andares.id, id)).limit(1);
  return result[0];
}

export async function updateAndar(id: number, data: Partial<InsertAndar>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(andares).set(data).where(eq(andares.id, id));
}

// ============================================================
// Perfis
// ============================================================

export async function getPerfisByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(perfis).where(eq(perfis.andarId, andarId));
}

export async function updatePerfilByAndarAndIndex(andarId: number, perfilIndex: number, data: Partial<InsertPerfil>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(perfis).set(data).where(and(eq(perfis.andarId, andarId), eq(perfis.perfilIndex, perfilIndex)));
}

export async function resetPerfisByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(perfis).set({ ativo: false, variedadeId: null }).where(eq(perfis.andarId, andarId));
}

// ============================================================
// Furos
// ============================================================

export async function getFurosByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(furos).where(eq(furos.andarId, andarId));
}

export async function updateFuroByAndarAndIndex(andarId: number, perfilIndex: number, furoIndex: number, data: Partial<InsertFuro>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(furos).set(data).where(
    and(eq(furos.andarId, andarId), eq(furos.perfilIndex, perfilIndex), eq(furos.furoIndex, furoIndex))
  );
}

export async function resetFurosByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(furos).set({ status: "vazio", variedadeId: null }).where(eq(furos.andarId, andarId));
}

// Batch update all furos of an andar
export async function batchUpdateFuros(
  andarId: number,
  updates: Array<{ perfilIndex: number; furoIndex: number; status?: string; variedadeId?: number | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Use Promise.all for parallel DB writes within one request
  await Promise.all(
    updates.map((u) => {
      const data: Partial<InsertFuro> = {};
      if (u.status !== undefined) data.status = u.status;
      if (u.variedadeId !== undefined) data.variedadeId = u.variedadeId;
      return db.update(furos).set(data).where(
        and(eq(furos.andarId, andarId), eq(furos.perfilIndex, u.perfilIndex), eq(furos.furoIndex, u.furoIndex))
      );
    })
  );
}

// Batch update all perfis of an andar
export async function batchUpdatePerfis(
  andarId: number,
  updates: Array<{ perfilIndex: number; variedadeId?: number | null; ativo?: boolean }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await Promise.all(
    updates.map((u) => {
      const data: Partial<InsertPerfil> = {};
      if (u.variedadeId !== undefined) data.variedadeId = u.variedadeId;
      if (u.ativo !== undefined) data.ativo = u.ativo;
      return db.update(perfis).set(data).where(
        and(eq(perfis.andarId, andarId), eq(perfis.perfilIndex, u.perfilIndex))
      );
    })
  );
}

// Set all furos of an andar to a single status/variedade in one query
export async function setAllFurosOfAndar(
  andarId: number,
  data: { status?: string; variedadeId?: number | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const setData: Partial<InsertFuro> = {};
  if (data.status !== undefined) setData.status = data.status;
  if (data.variedadeId !== undefined) setData.variedadeId = data.variedadeId;
  await db.update(furos).set(setData).where(eq(furos.andarId, andarId));
}

// Set all perfis of an andar
export async function setAllPerfisOfAndar(
  andarId: number,
  data: { variedadeId?: number | null; ativo?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const setData: Partial<InsertPerfil> = {};
  if (data.variedadeId !== undefined) setData.variedadeId = data.variedadeId;
  if (data.ativo !== undefined) setData.ativo = data.ativo;
  await db.update(perfis).set(setData).where(eq(perfis.andarId, andarId));
}

// ============================================================
// Aplicações Andar
// ============================================================

export async function getAplicacoesByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aplicacoesAndar).where(eq(aplicacoesAndar.andarId, andarId));
}

export async function createAplicacaoAndar(data: InsertAplicacaoAndar) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aplicacoesAndar).values(data);
  return { id: result[0].insertId };
}

export async function deleteAplicacaoAndar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aplicacoesAndar).where(eq(aplicacoesAndar.id, id));
}

// ============================================================
// Germinação
// ============================================================

export async function getAllGerminacao() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(germinacao);
}

export async function createGerminacao(data: InsertGerminacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(germinacao).values(data);
  return { id: result[0].insertId };
}

export async function updateGerminacao(id: number, data: Partial<InsertGerminacao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(germinacao).set(data).where(eq(germinacao.id, id));
}

export async function deleteGerminacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(germinacao).where(eq(germinacao.id, id));
}

// ============================================================
// Transplantios
// ============================================================

export async function getAllTransplantios() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transplantios);
}

export async function createTransplantio(data: InsertTransplantio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transplantios).values(data);
  return { id: result[0].insertId };
}

export async function deleteTransplantio(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transplantios).where(eq(transplantios.id, id));
}

// ============================================================
// Manutenções
// ============================================================

export async function getAllManutencoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(manutencoes);
}

export async function createManutencao(data: InsertManutencao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(manutencoes).values(data);
  return { id: result[0].insertId };
}

export async function updateManutencao(id: number, data: Partial<InsertManutencao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(manutencoes).set(data).where(eq(manutencoes.id, id));
}

export async function deleteManutencao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(manutencoes).where(eq(manutencoes.id, id));
}

// ============================================================
// Ciclos
// ============================================================

export async function getAllCiclos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ciclos);
}

export async function createCiclo(data: InsertCiclo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ciclos).values(data);
  return { id: result[0].insertId };
}

export async function updateCiclo(id: number, data: Partial<InsertCiclo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ciclos).set(data).where(eq(ciclos.id, id));
}

export async function deleteCiclo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ciclos).where(eq(ciclos.id, id));
}

// ============================================================
// Full data load (for dashboard/context)
// ============================================================

export async function loadFullFazendaData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [
    allTorres,
    allCaixas,
    allAndares,
    allPerfis,
    allFuros,
    allMedicoes,
    allAplicacoesCaixa,
    allAplicacoesAndar,
    allVariedades,
    allFasesConfig,
    allGerminacao,
    allTransplantios,
    allManutencoes,
    allCiclos,
    allReceitas,
    allTarefas,
    allRegistrosColheita,
  ] = await Promise.all([
    db.select().from(torres),
    db.select().from(caixasAgua),
    db.select().from(andares),
    db.select().from(perfis),
    db.select().from(furos),
    db.select().from(medicoesCaixa),
    db.select().from(aplicacoesCaixa),
    db.select().from(aplicacoesAndar),
    db.select().from(variedades),
    db.select().from(fasesConfig),
    db.select().from(germinacao),
    db.select().from(transplantios),
    db.select().from(manutencoes),
    db.select().from(ciclos),
    db.select().from(receitasCrescimento),
    db.select().from(tarefas),
    db.select().from(registrosColheita),
  ]);

  return {
    torres: allTorres,
    caixasAgua: allCaixas,
    andares: allAndares,
    perfis: allPerfis,
    furos: allFuros,
    medicoesCaixa: allMedicoes,
    aplicacoesCaixa: allAplicacoesCaixa,
    aplicacoesAndar: allAplicacoesAndar,
    variedades: allVariedades,
    fasesConfig: allFasesConfig,
    germinacao: allGerminacao,
    transplantios: allTransplantios,
    manutencoes: allManutencoes,
    ciclos: allCiclos,
    receitas: allReceitas,
    tarefas: allTarefas,
    registrosColheita: allRegistrosColheita,
  };
}

// ============================================================
// Reset all data (for re-seed)
// ============================================================

export async function resetAllData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(aplicacoesAndar);
  await db.delete(aplicacoesCaixa);
  await db.delete(medicoesCaixa);
  await db.delete(furos);
  await db.delete(perfis);
  await db.delete(andares);
  await db.delete(torres);
  await db.delete(caixasAgua);
  await db.delete(germinacao);
  await db.delete(transplantios);
  await db.delete(manutencoes);
  await db.delete(ciclos);
  await db.delete(variedades);
  await db.delete(fasesConfig);
  await db.delete(receitasCrescimento);
  await db.delete(tarefas);
  await db.delete(registrosColheita);
}

// ============================================================
// Bulk operations for seeding
// ============================================================

export async function bulkInsertVariedades(data: InsertVariedade[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(variedades).values(data);
}

export async function bulkInsertFasesConfig(data: InsertFaseConfig[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  for (const fc of data) {
    await upsertFaseConfig(fc);
  }
}

// ============================================================
// User management (admin)
// ============================================================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: 'password',
    role: data.role,
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, openId };
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users);
}

export async function updateUserRole(id: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ============================================================
// Receitas de Crescimento
// ============================================================

export async function getAllReceitas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receitasCrescimento);
}

export async function getReceitaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(receitasCrescimento).where(eq(receitasCrescimento.id, id)).limit(1);
  return result[0];
}

export async function getReceitasByVariedadeId(variedadeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receitasCrescimento).where(eq(receitasCrescimento.variedadeId, variedadeId));
}

export async function createReceita(data: InsertReceitaCrescimento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(receitasCrescimento).values(data);
  return { id: result[0].insertId };
}

export async function updateReceita(id: number, data: Partial<InsertReceitaCrescimento>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receitasCrescimento).set(data).where(eq(receitasCrescimento.id, id));
}

export async function deleteReceita(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(receitasCrescimento).where(eq(receitasCrescimento.id, id));
}

// ============================================================
// Tarefas Operacionais
// ============================================================

export async function getAllTarefas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tarefas);
}

export async function getTarefasByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];
  // Retorna todas as tarefas — filtragem por data é feita no frontend
  return db.select().from(tarefas);
}

export async function createTarefa(data: InsertTarefa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tarefas).values(data);
  return { id: result[0].insertId };
}

export async function updateTarefa(id: number, data: Partial<InsertTarefa>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tarefas).set(data).where(eq(tarefas.id, id));
}

export async function deleteTarefa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tarefas).where(eq(tarefas.id, id));
}

export async function concluirTarefa(id: number, userId: number, userName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tarefas).set({
    status: 'concluida',
    concluidoPorId: userId,
    concluidoPorNome: userName,
    concluidoEm: new Date(),
  }).where(eq(tarefas.id, id));
}

// ============================================================
// Registros de Colheita
// ============================================================

export async function getAllRegistrosColheita() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrosColheita);
}

export async function getRegistrosColheitaByAndarId(andarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrosColheita).where(eq(registrosColheita.andarId, andarId));
}

export async function createRegistroColheita(data: InsertRegistroColheita) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(registrosColheita).values(data);
  return { id: result[0].insertId };
}

export async function deleteRegistroColheita(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(registrosColheita).where(eq(registrosColheita.id, id));
}
