import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  terceirosPrestadores,
  terceirosRegistros,
  type InsertTerceiroPrestador,
  type InsertTerceiroRegistro,
  type TerceiroPrestadorRow,
  type TerceiroRegistroRow,
} from "../drizzle/schema";
import { getDb } from "./db";
import { normalizarCpf } from "@shared/terceirosPagamento";

export async function ensureTerceirosTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`terceiros_prestadores\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`cpf\` varchar(11) NOT NULL,
  \`nomeCompleto\` varchar(255) NOT NULL,
  \`acessoToken\` varchar(64) NOT NULL,
  \`ativo\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_terceiros_prestadores_cpf\` (\`cpf\`),
  UNIQUE KEY \`uq_terceiros_prestadores_token\` (\`acessoToken\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureTerceirosTables prestadores:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`terceiros_registros\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`prestadorId\` int NOT NULL,
  \`dataServico\` varchar(10) NOT NULL,
  \`horaEntrada\` varchar(5) NOT NULL,
  \`horaSaida\` varchar(5) NOT NULL,
  \`pagoAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_terceiros_registros_prest_dia\` (\`prestadorId\`,\`dataServico\`),
  KEY \`idx_terceiros_registros_data\` (\`dataServico\`),
  KEY \`idx_terceiros_registros_prest\` (\`prestadorId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureTerceirosTables registros:", err);
    }
  }
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE \`terceiros_registros\` ADD COLUMN \`pagoAt\` timestamp NULL`,
      ),
    );
  } catch {
    // coluna já existe
  }
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE \`terceiros_prestadores\` ADD COLUMN \`diariaBase\` decimal(10, 2) NULL`,
      ),
    );
  } catch {
    // coluna já existe
  }
  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE \`terceiros_prestadores\` ADD COLUMN \`observacao\` text NULL`,
      ),
    );
  } catch {
    // coluna já existe
  }
  // Acordo do Reinaldo Bentes Mendonça (diária R$ 116 + almoço R$ 25 no turno diurno).
  // Só preenche se ainda não houver diária/observação (não sobrescreve edição manual).
  try {
    await db.execute(
      sql.raw(
        `UPDATE \`terceiros_prestadores\` SET \`diariaBase\` = COALESCE(\`diariaBase\`, 116.00), \`observacao\` = COALESCE(NULLIF(TRIM(\`observacao\`), ''), 'Diária R$ 116 (8h de trabalho). Almoço R$ 25 descontado porque trabalha de dia.') WHERE \`cpf\` = '77046609268'`,
      ),
    );
  } catch (err) {
    console.error("[Database] seed diária Reinaldo:", err);
  }
}

function novoToken(): string {
  return randomBytes(24).toString("hex");
}

export async function identificarPrestador(input: {
  cpf: string;
  nomeCompleto: string;
}): Promise<TerceiroPrestadorRow> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cpf = normalizarCpf(input.cpf);
  const nomeCompleto = input.nomeCompleto.trim().replace(/\s+/g, " ");
  if (!nomeCompleto) throw new Error("Nome completo obrigatório.");

  const existing = await db
    .select()
    .from(terceirosPrestadores)
    .where(eq(terceirosPrestadores.cpf, cpf))
    .limit(1);

  const token = novoToken();

  if (existing[0]) {
    if (!existing[0].ativo) {
      throw new Error("Cadastro desativado. Contate a administração.");
    }
    await db
      .update(terceirosPrestadores)
      .set({
        nomeCompleto,
        acessoToken: token,
      })
      .where(eq(terceirosPrestadores.id, existing[0].id));
    const row = await db
      .select()
      .from(terceirosPrestadores)
      .where(eq(terceirosPrestadores.id, existing[0].id))
      .limit(1);
    return row[0]!;
  }

  const payload: InsertTerceiroPrestador = {
    cpf,
    nomeCompleto,
    acessoToken: token,
    ativo: true,
  };
  await db.insert(terceirosPrestadores).values(payload);
  const row = await db
    .select()
    .from(terceirosPrestadores)
    .where(eq(terceirosPrestadores.cpf, cpf))
    .limit(1);
  return row[0]!;
}

export async function getPrestadorById(
  id: number,
): Promise<TerceiroPrestadorRow | null> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(terceirosPrestadores)
    .where(eq(terceirosPrestadores.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPrestadorByToken(
  token: string,
): Promise<TerceiroPrestadorRow | null> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) return null;
  const t = token.trim();
  if (!t) return null;
  const rows = await db
    .select()
    .from(terceirosPrestadores)
    .where(
      and(
        eq(terceirosPrestadores.acessoToken, t),
        eq(terceirosPrestadores.ativo, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listRegistrosPrestador(
  prestadorId: number,
): Promise<TerceiroRegistroRow[]> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(terceirosRegistros)
    .where(eq(terceirosRegistros.prestadorId, prestadorId))
    .orderBy(desc(terceirosRegistros.dataServico));
}

export async function upsertRegistroPrestador(input: {
  prestadorId: number;
  dataServico: string;
  horaEntrada: string;
  horaSaida: string;
}): Promise<TerceiroRegistroRow> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dataServico = input.dataServico.trim();
  const horaEntrada = input.horaEntrada.trim().slice(0, 5);
  const horaSaida = input.horaSaida.trim().slice(0, 5);

  const existing = await db
    .select()
    .from(terceirosRegistros)
    .where(
      and(
        eq(terceirosRegistros.prestadorId, input.prestadorId),
        eq(terceirosRegistros.dataServico, dataServico),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(terceirosRegistros)
      .set({ horaEntrada, horaSaida })
      .where(eq(terceirosRegistros.id, existing[0].id));
    const row = await db
      .select()
      .from(terceirosRegistros)
      .where(eq(terceirosRegistros.id, existing[0].id))
      .limit(1);
    return row[0]!;
  }

  const payload: InsertTerceiroRegistro = {
    prestadorId: input.prestadorId,
    dataServico,
    horaEntrada,
    horaSaida,
  };
  await db.insert(terceirosRegistros).values(payload);
  const row = await db
    .select()
    .from(terceirosRegistros)
    .where(
      and(
        eq(terceirosRegistros.prestadorId, input.prestadorId),
        eq(terceirosRegistros.dataServico, dataServico),
      ),
    )
    .limit(1);
  return row[0]!;
}

export async function deleteRegistroPrestador(
  prestadorId: number,
  registroId: number,
): Promise<void> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(terceirosRegistros)
    .where(
      and(
        eq(terceirosRegistros.id, registroId),
        eq(terceirosRegistros.prestadorId, prestadorId),
      ),
    );
}

export async function listPrestadoresAdmin(): Promise<TerceiroPrestadorRow[]> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(terceirosPrestadores)
    .where(eq(terceirosPrestadores.ativo, true))
    .orderBy(asc(terceirosPrestadores.nomeCompleto));
}

export async function listRegistrosAdmin(opts: {
  inicioIso: string;
  fimIso: string;
  prestadorId?: number | null;
}): Promise<
  Array<
    TerceiroRegistroRow & {
      cpf: string;
      nomeCompleto: string;
      diariaBase: string | null;
      observacao: string | null;
    }
  >
> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) return [];

  const conds = [
    gte(terceirosRegistros.dataServico, opts.inicioIso),
    lte(terceirosRegistros.dataServico, opts.fimIso),
  ];
  if (opts.prestadorId != null) {
    conds.push(eq(terceirosRegistros.prestadorId, opts.prestadorId));
  }

  const rows = await db
    .select({
      id: terceirosRegistros.id,
      prestadorId: terceirosRegistros.prestadorId,
      dataServico: terceirosRegistros.dataServico,
      horaEntrada: terceirosRegistros.horaEntrada,
      horaSaida: terceirosRegistros.horaSaida,
      pagoAt: terceirosRegistros.pagoAt,
      createdAt: terceirosRegistros.createdAt,
      updatedAt: terceirosRegistros.updatedAt,
      cpf: terceirosPrestadores.cpf,
      nomeCompleto: terceirosPrestadores.nomeCompleto,
      diariaBase: terceirosPrestadores.diariaBase,
      observacao: terceirosPrestadores.observacao,
    })
    .from(terceirosRegistros)
    .innerJoin(
      terceirosPrestadores,
      eq(terceirosRegistros.prestadorId, terceirosPrestadores.id),
    )
    .where(and(...conds))
    .orderBy(
      desc(terceirosRegistros.dataServico),
      asc(terceirosPrestadores.nomeCompleto),
    );

  return rows;
}

export async function updatePrestadorAdmin(input: {
  id: number;
  diariaBase?: number | null;
  observacao?: string | null;
}): Promise<TerceiroPrestadorRow> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const patch: Partial<InsertTerceiroPrestador> = {};
  if (input.diariaBase !== undefined) {
    patch.diariaBase =
      input.diariaBase == null || !Number.isFinite(input.diariaBase)
        ? null
        : String(Math.round(input.diariaBase * 100) / 100);
  }
  if (input.observacao !== undefined) {
    const t = input.observacao?.trim() ?? "";
    patch.observacao = t.length ? t : null;
  }
  if (Object.keys(patch).length === 0) {
    const cur = await db
      .select()
      .from(terceirosPrestadores)
      .where(eq(terceirosPrestadores.id, input.id))
      .limit(1);
    if (!cur[0]) throw new Error("Prestador não encontrado.");
    return cur[0];
  }

  await db
    .update(terceirosPrestadores)
    .set(patch)
    .where(eq(terceirosPrestadores.id, input.id));
  const row = await db
    .select()
    .from(terceirosPrestadores)
    .where(eq(terceirosPrestadores.id, input.id))
    .limit(1);
  if (!row[0]) throw new Error("Prestador não encontrado.");
  return row[0];
}

export async function softDeletePrestador(id: number): Promise<void> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(terceirosPrestadores)
    .set({ ativo: false, acessoToken: novoToken() })
    .where(eq(terceirosPrestadores.id, id));
}

export async function deleteRegistroAdmin(id: number): Promise<void> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(terceirosRegistros).where(eq(terceirosRegistros.id, id));
}

export async function setRegistroPago(
  id: number,
  pago: boolean,
): Promise<TerceiroRegistroRow> {
  await ensureTerceirosTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(terceirosRegistros)
    .set({ pagoAt: pago ? new Date() : null })
    .where(eq(terceirosRegistros.id, id));
  const row = await db
    .select()
    .from(terceirosRegistros)
    .where(eq(terceirosRegistros.id, id))
    .limit(1);
  if (!row[0]) throw new Error("Registro não encontrado.");
  return row[0];
}
