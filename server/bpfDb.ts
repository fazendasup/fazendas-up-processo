import { desc, eq, sql } from "drizzle-orm";
import { bpfEstado, bpfRevisoes } from "../drizzle/schema";
import { getDb } from "./db";
import { semFotosBpf } from "@shared/bpfDocumento";

export type BpfRevisaoResumo = {
  id: number;
  resumo: string;
  userName: string | null;
  createdAt: Date | string;
};

const REVISAO_INTERVALO_MS = 15 * 60 * 1000;

export async function ensureBpfTables(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`bpf_estado\` (
  \`id\` int NOT NULL,
  \`conteudoJson\` longtext NOT NULL,
  \`atualizadoPorId\` int NULL,
  \`atualizadoPorNome\` varchar(255) NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS \`bpf_revisoes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`resumo\` varchar(255) NOT NULL,
  \`conteudoJson\` longtext NOT NULL,
  \`userId\` int NULL,
  \`userName\` varchar(255) NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_bpf_revisoes_created\` (\`createdAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`));
}

export async function obterBpfEstado(): Promise<{
  conteudo: unknown;
  atualizadoPorNome: string | null;
  updatedAt: Date | string | null;
} | null> {
  await ensureBpfTables();
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(bpfEstado)
    .where(eq(bpfEstado.id, 1))
    .limit(1);
  const row = rows[0];
  if (!row?.conteudoJson) return null;
  try {
    return {
      conteudo: JSON.parse(row.conteudoJson),
      atualizadoPorNome: row.atualizadoPorNome ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function listarRevisoesBpf(limite = 30): Promise<BpfRevisaoResumo[]> {
  await ensureBpfTables();
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: bpfRevisoes.id,
      resumo: bpfRevisoes.resumo,
      userName: bpfRevisoes.userName,
      createdAt: bpfRevisoes.createdAt,
    })
    .from(bpfRevisoes)
    .orderBy(desc(bpfRevisoes.id))
    .limit(limite);
  return rows;
}

export async function salvarBpfEstado(input: {
  conteudo: unknown;
  resumo: string;
  registrarRevisao: boolean;
  userId: number | null;
  userName: string | null;
}): Promise<void> {
  await ensureBpfTables();
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const json = JSON.stringify(input.conteudo);
  if (json.length > 45_000_000) {
    throw new Error("Documento grande demais para salvar.");
  }
  await db
    .insert(bpfEstado)
    .values({
      id: 1,
      conteudoJson: json,
      atualizadoPorId: input.userId,
      atualizadoPorNome: input.userName,
    })
    .onDuplicateKeyUpdate({
      set: {
        conteudoJson: json,
        atualizadoPorId: input.userId,
        atualizadoPorNome: input.userName,
      },
    });

  const texto = JSON.stringify(semFotosBpf(input.conteudo));
  const deveRevisar =
    input.registrarRevisao || (await revisaoEnvelheceu(texto));
  if (!deveRevisar) return;
  const resumo = input.resumo.trim().slice(0, 255) || "Alteração";
  await db.insert(bpfRevisoes).values({
    resumo,
    conteudoJson: texto,
    userId: input.userId,
    userName: input.userName,
  });
}

export async function restaurarRevisaoBpf(
  id: number,
  userId: number | null,
  userName: string | null,
): Promise<unknown> {
  await ensureBpfTables();
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const rows = await db
    .select()
    .from(bpfRevisoes)
    .where(eq(bpfRevisoes.id, id))
    .limit(1);
  const row = rows[0];
  if (!row?.conteudoJson) throw new Error("Revisão não encontrada.");
  const conteudo = JSON.parse(row.conteudoJson) as unknown;
  await salvarBpfEstado({
    conteudo,
    resumo: `Restaurado: ${row.resumo}`,
    registrarRevisao: true,
    userId,
    userName,
  });
  return conteudo;
}

async function revisaoEnvelheceu(textoAtual: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({
      conteudoJson: bpfRevisoes.conteudoJson,
      createdAt: bpfRevisoes.createdAt,
    })
    .from(bpfRevisoes)
    .orderBy(desc(bpfRevisoes.id))
    .limit(1);
  const row = rows[0];
  if (!row) return true;
  if (row.conteudoJson === textoAtual) return false;
  return Date.now() - new Date(row.createdAt).getTime() >= REVISAO_INTERVALO_MS;
}
