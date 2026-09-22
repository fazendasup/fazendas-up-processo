import { and, asc, eq, sql } from "drizzle-orm";
import {
  estoqueCategorias,
  estoqueItens,
  type EstoqueCategoriaRow,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  CATEGORIAS_ESTOQUE,
  LABEL_CATEGORIA,
  slugifyEstoqueCategoria,
  type EstoqueCategoriaPadrao,
} from "../shared/estoque";

export async function ensureEstoqueCategoriasTable(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`estoque_categorias\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`projetoId\` int NOT NULL,
  \`slug\` varchar(32) NOT NULL,
  \`nome\` varchar(80) NOT NULL,
  \`ordem\` int NOT NULL DEFAULT 0,
  \`padrao\` tinyint(1) NOT NULL DEFAULT 0,
  \`ativo\` tinyint(1) NOT NULL DEFAULT 1,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_estoque_cat_proj_slug\` (\`projetoId\`, \`slug\`),
  KEY \`idx_estoque_cat_proj\` (\`projetoId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|ER_TABLE_EXISTS/i.test(msg)) {
      console.error("[Database] ensureEstoqueCategoriasTable:", err);
    }
  }
}

/** Garante as 5 classes padrão do projeto (idempotente). */
export async function seedEstoqueCategoriasPadrao(
  projetoId: number,
): Promise<void> {
  await ensureEstoqueCategoriasTable();
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select({ slug: estoqueCategorias.slug })
    .from(estoqueCategorias)
    .where(eq(estoqueCategorias.projetoId, projetoId));
  const have = new Set(existing.map(r => r.slug));
  let ordem = 0;
  for (const slug of CATEGORIAS_ESTOQUE) {
    if (!have.has(slug)) {
      await db.insert(estoqueCategorias).values({
        projetoId,
        slug,
        nome: LABEL_CATEGORIA[slug as EstoqueCategoriaPadrao],
        ordem,
        padrao: true,
        ativo: true,
      });
    }
    ordem++;
  }
}

export async function listEstoqueCategorias(
  projetoId: number,
): Promise<EstoqueCategoriaRow[]> {
  await seedEstoqueCategoriasPadrao(projetoId);
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(estoqueCategorias)
    .where(
      and(
        eq(estoqueCategorias.projetoId, projetoId),
        eq(estoqueCategorias.ativo, true),
      ),
    )
    .orderBy(asc(estoqueCategorias.ordem), asc(estoqueCategorias.nome));
}

export async function createEstoqueCategoria(input: {
  projetoId: number;
  nome: string;
  slug?: string;
}): Promise<EstoqueCategoriaRow> {
  await seedEstoqueCategoriasPadrao(input.projetoId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome da classe.");
  let slug = (input.slug?.trim() || slugifyEstoqueCategoria(nome)).slice(0, 32);
  if (!/^[a-z0-9_]+$/.test(slug)) {
    throw new Error("Slug inválido (use letras, números e _).");
  }

  const existentes = await db
    .select()
    .from(estoqueCategorias)
    .where(eq(estoqueCategorias.projetoId, input.projetoId));
  const slugs = new Set(existentes.map(c => c.slug));
  if (slugs.has(slug)) {
    let i = 2;
    const base = slug.slice(0, 28);
    while (slugs.has(`${base}_${i}`) && i < 99) i++;
    slug = `${base}_${i}`.slice(0, 32);
  }

  const maxOrdem = existentes.reduce((m, c) => Math.max(m, c.ordem), -1);
  const [ins] = await db.insert(estoqueCategorias).values({
    projetoId: input.projetoId,
    slug,
    nome: nome.slice(0, 80),
    ordem: maxOrdem + 1,
    padrao: false,
    ativo: true,
  });
  const id = Number(ins.insertId);
  const rows = await db
    .select()
    .from(estoqueCategorias)
    .where(eq(estoqueCategorias.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("Falha ao criar classe de estoque.");
  return rows[0];
}

export async function renameEstoqueCategoria(input: {
  projetoId: number;
  id: number;
  nome: string;
}): Promise<EstoqueCategoriaRow> {
  await ensureEstoqueCategoriasTable();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const nome = input.nome.trim().slice(0, 80);
  if (!nome) throw new Error("Informe o nome.");
  await db
    .update(estoqueCategorias)
    .set({ nome, updatedAt: new Date() })
    .where(
      and(
        eq(estoqueCategorias.projetoId, input.projetoId),
        eq(estoqueCategorias.id, input.id),
      ),
    );
  const rows = await db
    .select()
    .from(estoqueCategorias)
    .where(eq(estoqueCategorias.id, input.id))
    .limit(1);
  if (!rows[0]) throw new Error("Classe não encontrada.");
  return rows[0];
}

/** Soft-delete. Classes padrão não podem ser removidas. Bloqueia se houver itens. */
export async function deleteEstoqueCategoria(input: {
  projetoId: number;
  id: number;
}): Promise<{ ok: true }> {
  await ensureEstoqueCategoriasTable();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(estoqueCategorias)
    .where(
      and(
        eq(estoqueCategorias.projetoId, input.projetoId),
        eq(estoqueCategorias.id, input.id),
      ),
    )
    .limit(1);
  const cat = rows[0];
  if (!cat) throw new Error("Classe não encontrada.");
  if (cat.padrao) {
    throw new Error("Classes padrão (Sementes, Substratos…) não podem ser excluídas.");
  }
  const itens = await db
    .select({ id: estoqueItens.id })
    .from(estoqueItens)
    .where(
      and(
        eq(estoqueItens.projetoId, input.projetoId),
        eq(estoqueItens.categoria, cat.slug),
      ),
    )
    .limit(1);
  if (itens[0]) {
    throw new Error(
      "Há itens nesta classe. Mova ou exclua os itens antes de remover a classe.",
    );
  }
  await db
    .update(estoqueCategorias)
    .set({ ativo: false, updatedAt: new Date() })
    .where(eq(estoqueCategorias.id, input.id));
  return { ok: true };
}

export async function assertEstoqueCategoriaExiste(
  projetoId: number,
  slug: string,
): Promise<void> {
  const cats = await listEstoqueCategorias(projetoId);
  if (!cats.some(c => c.slug === slug)) {
    throw new Error(`Classe de estoque desconhecida: ${slug}`);
  }
}
