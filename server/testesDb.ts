import { asc, desc, eq, sql } from "drizzle-orm";
import {
  testeDosagens,
  testeParcelas,
  testesExperimentos,
  type InsertTesteDosagem,
  type InsertTesteParcela,
  type TesteDosagem,
  type TesteExperimento,
  type TesteParcela,
} from "../drizzle/schema";
import {
  ALFACES_CHLORELLA_SEED,
  CHLORELLA_DOSE_ML_POR_L,
  CHLORELLA_LEMBRETE_DIAS,
  CHLORELLA_PROTOCOLO_RESUMO,
  CHLORELLA_TESTE_SLUG,
  MICROVERDES_CHLORELLA_SEED,
  doseTotalMl,
} from "../shared/testesChlorellaSeed";
import { getDb } from "./db";

function ymd(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYmd(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return ymd(dt);
}

export async function ensureTestesTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS \`testes_experimentos\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`slug\` varchar(64) NOT NULL,
  \`titulo\` varchar(255) NOT NULL,
  \`produto\` varchar(255) NOT NULL,
  \`status\` varchar(32) NOT NULL DEFAULT 'ativo',
  \`protocoloResumo\` text NULL,
  \`doseAlvoMlPorL\` float NOT NULL DEFAULT 0.2,
  \`intervaloLembreteDias\` int NOT NULL DEFAULT 2,
  \`notas\` text NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_testes_experimentos_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`teste_parcelas\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`testeId\` int NOT NULL,
  \`cultura\` varchar(32) NOT NULL,
  \`variedadeNome\` varchar(128) NOT NULL,
  \`variedadeId\` int NULL,
  \`ativo\` boolean NOT NULL DEFAULT true,
  \`diasEscuro\` int NULL,
  \`diasFotoperiodo\` int NULL,
  \`horasLuz\` int NULL,
  \`diasMudas\` int NULL,
  \`diasVegetativa\` int NULL,
  \`diasMaturacao\` int NULL,
  \`biomassaEsperadaGramas\` float NULL,
  \`biomassaObservadaGramas\` float NULL,
  \`dataInicio\` date NULL,
  \`dataColheita\` date NULL,
  \`observacoes\` text NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_teste_parcelas_teste\` (\`testeId\`),
  KEY \`idx_teste_parcelas_cultura\` (\`testeId\`, \`cultura\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`teste_dosagens\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`testeId\` int NOT NULL,
  \`cultura\` varchar(32) NOT NULL,
  \`fase\` varchar(32) NULL,
  \`tipoAplicacao\` varchar(48) NOT NULL DEFAULT 'tanque',
  \`doseMlPorL\` float NOT NULL,
  \`volumeTanqueLitros\` int NOT NULL,
  \`doseTotalMl\` float NOT NULL,
  \`dataAplicacao\` date NOT NULL,
  \`proximaPrevista\` date NULL,
  \`observacoes\` text NULL,
  \`registradoPorId\` int NULL,
  \`registradoPorNome\` varchar(128) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_teste_dosagens_teste\` (\`testeId\`),
  KEY \`idx_teste_dosagens_cultura\` (\`testeId\`, \`cultura\`, \`dataAplicacao\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
        console.error("[Database] ensureTestesTables:", err);
      }
    }
  }
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE \`teste_parcelas\` ADD COLUMN \`ativo\` boolean NOT NULL DEFAULT true`,
      ),
    );
  } catch {
    // coluna já existe
  }
  await ensureChlorellaSeed();
}

async function ensureChlorellaSeed(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existentes = await db
    .select()
    .from(testesExperimentos)
    .where(eq(testesExperimentos.slug, CHLORELLA_TESTE_SLUG))
    .limit(1);
  let teste = existentes[0];
  if (!teste) {
    const inserted = await db.insert(testesExperimentos).values({
      slug: CHLORELLA_TESTE_SLUG,
      titulo: "Extrato de algas — Chlorella",
      produto: "Extrato líquido de Chlorella",
      status: "ativo",
      protocoloResumo: CHLORELLA_PROTOCOLO_RESUMO,
      doseAlvoMlPorL: CHLORELLA_DOSE_ML_POR_L,
      intervaloLembreteDias: CHLORELLA_LEMBRETE_DIAS,
    });
    const id = Number(inserted[0]?.insertId ?? 0);
    if (!id) return;
    const reloaded = await db
      .select()
      .from(testesExperimentos)
      .where(eq(testesExperimentos.id, id))
      .limit(1);
    teste = reloaded[0];
  } else if (teste.protocoloResumo !== CHLORELLA_PROTOCOLO_RESUMO) {
    await db
      .update(testesExperimentos)
      .set({ protocoloResumo: CHLORELLA_PROTOCOLO_RESUMO })
      .where(eq(testesExperimentos.id, teste.id));
    teste = { ...teste, protocoloResumo: CHLORELLA_PROTOCOLO_RESUMO };
  }
  if (!teste) return;

  const parcelas = await db
    .select()
    .from(testeParcelas)
    .where(eq(testeParcelas.testeId, teste.id));
  if (parcelas.length === 0) {
    const rows: InsertTesteParcela[] = [
      ...MICROVERDES_CHLORELLA_SEED.map(v => ({
        testeId: teste!.id,
        cultura: "microverdes" as const,
        variedadeNome: v.variedadeNome,
        ativo: true,
        diasEscuro: v.diasEscuro,
        diasFotoperiodo: v.diasFotoperiodo,
        horasLuz: v.horasLuz,
        biomassaEsperadaGramas: v.biomassaEsperadaGramas,
      })),
      ...ALFACES_CHLORELLA_SEED.map(v => ({
        testeId: teste!.id,
        cultura: "alface" as const,
        variedadeNome: v.variedadeNome,
        ativo: true,
        diasMudas: v.diasMudas,
        diasVegetativa: v.diasVegetativa,
        diasMaturacao: v.diasMaturacao,
        biomassaEsperadaGramas: v.biomassaEsperadaGramas,
      })),
    ];
    if (rows.length) await db.insert(testeParcelas).values(rows);
  }
}

export async function listTestes(): Promise<TesteExperimento[]> {
  await ensureTestesTables();
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testesExperimentos).orderBy(asc(testesExperimentos.titulo));
}

export async function getTesteBySlug(slug: string): Promise<{
  teste: TesteExperimento;
  parcelas: TesteParcela[];
  dosagens: TesteDosagem[];
  lembretes: Array<{
    cultura: string;
    fase: string | null;
    ultimaData: string | null;
    proximaPrevista: string | null;
    atrasado: boolean;
    diasAteProxima: number | null;
  }>;
} | null> {
  await ensureTestesTables();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(testesExperimentos)
    .where(eq(testesExperimentos.slug, slug))
    .limit(1);
  const teste = rows[0];
  if (!teste) return null;
  const parcelas = await db
    .select()
    .from(testeParcelas)
    .where(eq(testeParcelas.testeId, teste.id))
    .orderBy(asc(testeParcelas.cultura), asc(testeParcelas.variedadeNome));
  const dosagens = await db
    .select()
    .from(testeDosagens)
    .where(eq(testeDosagens.testeId, teste.id))
    .orderBy(desc(testeDosagens.dataAplicacao), desc(testeDosagens.id));

  const hoje = ymd(new Date());
  const keys = new Map<string, TesteDosagem>();
  for (const d of dosagens) {
    const key = `${d.cultura}::${d.fase ?? ""}`;
    if (!keys.has(key)) keys.set(key, d);
  }
  const lembretes = Array.from(keys.entries()).map(([key, d]) => {
    const [cultura, faseRaw] = key.split("::");
    const fase = faseRaw || null;
    const prox = d.proximaPrevista ? ymd(String(d.proximaPrevista)) : null;
    let diasAteProxima: number | null = null;
    let atrasado = false;
    if (prox) {
      const a = new Date(hoje + "T12:00:00");
      const b = new Date(prox + "T12:00:00");
      diasAteProxima = Math.round((b.getTime() - a.getTime()) / 86_400_000);
      atrasado = diasAteProxima < 0;
    }
    return {
      cultura: cultura!,
      fase,
      ultimaData: d.dataAplicacao ? ymd(String(d.dataAplicacao)) : null,
      proximaPrevista: prox,
      atrasado,
      diasAteProxima,
    };
  });

  return { teste, parcelas, dosagens, lembretes };
}

export async function updateTeste(
  id: number,
  data: Partial<{
    titulo: string;
    status: string;
    protocoloResumo: string | null;
    doseAlvoMlPorL: number;
    intervaloLembreteDias: number;
    notas: string | null;
  }>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testesExperimentos).set(data).where(eq(testesExperimentos.id, id));
}

export async function updateParcela(
  id: number,
  data: Partial<InsertTesteParcela>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { id: _ignore, testeId: _t, ...rest } = data as InsertTesteParcela & {
    id?: number;
  };
  await db.update(testeParcelas).set(rest).where(eq(testeParcelas.id, id));
}

export async function createDosagem(input: {
  testeId: number;
  cultura: string;
  fase?: string | null;
  tipoAplicacao: string;
  doseMlPorL: number;
  volumeTanqueLitros: number;
  dataAplicacao: string | Date;
  observacoes?: string | null;
  registradoPorId?: number | null;
  registradoPorNome?: string | null;
  intervaloLembreteDias?: number;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const dataAplicacao = ymd(input.dataAplicacao);
  const intervalo =
    input.intervaloLembreteDias ??
    (
      await db
        .select()
        .from(testesExperimentos)
        .where(eq(testesExperimentos.id, input.testeId))
        .limit(1)
    )[0]?.intervaloLembreteDias ??
    CHLORELLA_LEMBRETE_DIAS;
  const doseTotal = doseTotalMl(input.doseMlPorL, input.volumeTanqueLitros);
  const row: InsertTesteDosagem = {
    testeId: input.testeId,
    cultura: input.cultura,
    fase: input.fase ?? null,
    tipoAplicacao: input.tipoAplicacao,
    doseMlPorL: input.doseMlPorL,
    volumeTanqueLitros: input.volumeTanqueLitros,
    doseTotalMl: doseTotal,
    dataAplicacao: dataAplicacao as unknown as Date,
    proximaPrevista: addDaysYmd(dataAplicacao, intervalo) as unknown as Date,
    observacoes: input.observacoes ?? null,
    registradoPorId: input.registradoPorId ?? null,
    registradoPorNome: input.registradoPorNome ?? null,
  };
  const result = await db.insert(testeDosagens).values(row);
  return { id: result[0].insertId };
}

export async function deleteDosagem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testeDosagens).where(eq(testeDosagens.id, id));
}

export async function addParcela(data: InsertTesteParcela): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(testeParcelas).values(data);
  return { id: result[0].insertId };
}

export async function deleteParcela(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testeParcelas).where(eq(testeParcelas.id, id));
}
