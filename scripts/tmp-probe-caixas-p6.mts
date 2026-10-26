import "dotenv/config";
import { eq } from "drizzle-orm";
import { caixasAgua } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("no db");
const rows = await db.select().from(caixasAgua).where(eq(caixasAgua.projetoId, 6));
for (const r of rows) console.log(r.id, r.nome, r.fase);
console.log("total", rows.length);
await closeDb();
