import { and, eq, inArray, sql } from "drizzle-orm";
import {
  pushPreferencias,
  pushSubscriptions,
  users,
  projetoUsuarios,
  type InsertPushSubscription,
  type PushPreferenciaRow,
  type PushSubscriptionRow,
  type User,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  normalizarPreferenciasPush,
  preferenciasPushPadrao,
  type PreferenciasPush,
  type PushCategoria,
  categoriasPermitidasParaPerfil,
} from "@shared/pushNotificacoes";

export async function ensurePushTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`endpoint\` text NOT NULL,
  \`p256dh\` varchar(255) NOT NULL,
  \`auth\` varchar(128) NOT NULL,
  \`userAgent\` varchar(512) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_push_subscriptions_endpoint\` (\`endpoint\`(500)),
  KEY \`idx_push_subscriptions_user\` (\`userId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensurePushTables subscriptions:", err);
    }
  }
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`push_preferencias\` (
  \`userId\` int NOT NULL,
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`categorias\` json NOT NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`userId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensurePushTables preferencias:", err);
    }
  }
}

export async function upsertPushSubscription(
  input: InsertPushSubscription,
): Promise<void> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existentes = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1);

  if (existentes[0]) {
    await db
      .update(pushSubscriptions)
      .set({
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      })
      .where(eq(pushSubscriptions.id, existentes[0].id));
    return;
  }

  await db.insert(pushSubscriptions).values(input);
}

export async function deletePushSubscriptionByEndpoint(
  userId: number,
  endpoint: string,
): Promise<void> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

export async function deletePushSubscriptionById(id: number): Promise<void> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}

export async function listPushSubscriptionsByUserIds(
  userIds: number[],
): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  await ensurePushTables();
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
}

export async function countPushSubscriptionsForUser(
  userId: number,
): Promise<number> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return rows.length;
}

export async function getPushPreferencias(
  userId: number,
): Promise<PushPreferenciaRow | null> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(pushPreferencias)
    .where(eq(pushPreferencias.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function savePushPreferencias(
  userId: number,
  preferencias: PreferenciasPush,
): Promise<PreferenciasPush> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const categorias: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(preferencias.categorias)) {
    categorias[k] = v === true;
  }

  const existente = await getPushPreferencias(userId);
  if (existente) {
    await db
      .update(pushPreferencias)
      .set({ ativo: preferencias.ativo, categorias })
      .where(eq(pushPreferencias.userId, userId));
  } else {
    await db.insert(pushPreferencias).values({
      userId,
      ativo: preferencias.ativo,
      categorias,
    });
  }
  return preferencias;
}

export function preferenciasFromRow(
  row: PushPreferenciaRow | null,
  permitidas: readonly PushCategoria[],
): PreferenciasPush {
  if (!row) return preferenciasPushPadrao(permitidas);
  return normalizarPreferenciasPush(
    { ativo: row.ativo, categorias: row.categorias },
    permitidas,
  );
}

export async function listUsersByIds(userIds: number[]): Promise<User[]> {
  if (userIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(inArray(users.id, userIds));
}

/** Membros do projeto + admins da plataforma (sempre elegíveis se tiverem push). */
export async function listUserIdsElegiveisProjeto(
  projetoId: number | null | undefined,
): Promise<number[] | null> {
  if (projetoId == null) return null;
  const db = await getDb();
  if (!db) return [];
  const membros = await db
    .select({ userId: projetoUsuarios.userId })
    .from(projetoUsuarios)
    .where(eq(projetoUsuarios.projetoId, projetoId));
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(users.role, ["admin", "platform_admin"]),
    );
  return Array.from(
    new Set([...membros.map((m) => m.userId), ...admins.map((a) => a.id)]),
  );
}

export async function listAllSubscriptionUserIds(): Promise<number[]> {
  await ensurePushTables();
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  return Array.from(new Set(rows.map((r) => r.userId)));
}
