/**
 * Inverte a numeração exibida das torres de maturação 1–14 (14→1 … 1→14).
 * Mantém id, slug, estrutura, cultivo, andares, caixaAguaId e históricos.
 * Atualiza nome + numeroTorre (ordenação) e nomes das caixas d'água ligadas.
 *
 * Uso: npx tsx scripts/invert-maturacao-1-14.mts [--dry-run] [--projeto=2]
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DRY = process.argv.includes("--dry-run");
const projetoArg = process.argv.find((a) => a.startsWith("--projeto="));
const PROJETO_ID = projetoArg ? Number(projetoArg.split("=")[1]) : 2;
const MAX_LABEL = 14;

function parseMysqlUrl(raw: string) {
  const u = new URL(raw.replace(/^mysql:\/\//, "http://"));
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

function labelMaturacao(nome: string): number | null {
  const m = nome.match(/Matura[cç][aã]o\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

function rewriteLabel(nome: string, newLabel: number): string {
  return nome.replace(/(Matura[cç][aã]o\s+)\d+/i, `$1${newLabel}`);
}

type TorreRow = {
  id: number;
  nome: string;
  numeroTorre: number;
  caixaAguaId: number | null;
  fase: string;
};

const cfg = parseMysqlUrl(process.env.COMERCIAL_DATABASE_URL!);
const db = await mysql.createConnection({ ...cfg, database: "railway" });

try {
  const [rows] = await db.query(
    `SELECT id, nome, numeroTorre, caixaAguaId, fase
     FROM torres
     WHERE projetoId = ? AND fase = 'maturacao'
     ORDER BY numeroTorre, id`,
    [PROJETO_ID],
  );
  const torres = rows as TorreRow[];

  const byLabel = new Map<number, TorreRow>();
  for (const t of torres) {
    const label = labelMaturacao(t.nome);
    if (label == null || label < 1 || label > MAX_LABEL) continue;
    if (byLabel.has(label)) {
      throw new Error(`Label Maturação ${label} duplicado: ids ${byLabel.get(label)!.id} e ${t.id}`);
    }
    byLabel.set(label, t);
  }

  for (let n = 1; n <= MAX_LABEL; n++) {
    if (!byLabel.has(n)) {
      throw new Error(`Falta Torre Maturação ${n} no projeto ${PROJETO_ID}`);
    }
  }

  type Plan = {
    id: number;
    fromLabel: number;
    toLabel: number;
    fromNome: string;
    toNome: string;
    fromNumero: number;
    toNumero: number;
    caixaAguaId: number | null;
  };

  const plans: Plan[] = [];
  for (let n = 1; n <= MAX_LABEL / 2; n++) {
    const a = byLabel.get(n)!;
    const b = byLabel.get(MAX_LABEL + 1 - n)!;
    plans.push({
      id: a.id,
      fromLabel: n,
      toLabel: MAX_LABEL + 1 - n,
      fromNome: a.nome,
      toNome: rewriteLabel(a.nome, MAX_LABEL + 1 - n),
      fromNumero: a.numeroTorre,
      toNumero: b.numeroTorre,
      caixaAguaId: a.caixaAguaId,
    });
    plans.push({
      id: b.id,
      fromLabel: MAX_LABEL + 1 - n,
      toLabel: n,
      fromNome: b.nome,
      toNome: rewriteLabel(b.nome, n),
      fromNumero: b.numeroTorre,
      toNumero: a.numeroTorre,
      caixaAguaId: b.caixaAguaId,
    });
  }

  console.log(`Projeto ${PROJETO_ID} — ${DRY ? "DRY-RUN" : "APPLY"}`);
  for (const p of plans.sort((x, y) => x.toLabel - y.toLabel)) {
    console.log(
      `  id=${p.id}: "${p.fromNome}" (n.º ${p.fromNumero}) → "${p.toNome}" (n.º ${p.toNumero})`,
    );
  }

  if (DRY) {
    console.log("Dry-run: nenhuma alteração.");
    process.exit(0);
  }

  await db.beginTransaction();

  // 1) Liberar unique (projetoId, numeroTorre) com temporários
  for (const p of plans) {
    await db.query(`UPDATE torres SET numeroTorre = ? WHERE id = ? AND projetoId = ?`, [
      900_000 + p.id,
      p.id,
      PROJETO_ID,
    ]);
  }

  // 2) Aplicar nome + numeroTorre finais
  for (const p of plans) {
    await db.query(
      `UPDATE torres SET nome = ?, numeroTorre = ? WHERE id = ? AND projetoId = ?`,
      [p.toNome, p.toNumero, p.id, PROJETO_ID],
    );
  }

  // 3) Renomear caixas d'água pelas torres ligadas (menor label após invert)
  const caixaIds = [...new Set(plans.map((p) => p.caixaAguaId).filter((x): x is number => x != null))];
  for (const caixaId of caixaIds) {
    const [linked] = await db.query(
      `SELECT id, nome FROM torres WHERE projetoId = ? AND caixaAguaId = ?`,
      [PROJETO_ID, caixaId],
    );
    const linkedTorres = linked as { id: number; nome: string }[];
    if (linkedTorres.length === 0) continue;

    const sorted = [...linkedTorres].sort((a, b) => {
      const la = labelMaturacao(a.nome) ?? 10_000;
      const lb = labelMaturacao(b.nome) ?? 10_000;
      return la - lb || a.nome.localeCompare(b.nome, "pt-BR");
    });
    const primary = sorted[0]!;
    const newCaixaNome = primary.nome.startsWith("Torre ")
      ? `Caixa ${primary.nome}`
      : `Caixa Torre ${primary.nome}`;

    const [caixaRows] = await db.query(`SELECT id, nome FROM caixas_agua WHERE id = ? AND projetoId = ?`, [
      caixaId,
      PROJETO_ID,
    ]);
    const caixa = (caixaRows as { id: number; nome: string }[])[0];
    if (!caixa) continue;
    if (caixa.nome === newCaixaNome) {
      console.log(`  caixa id=${caixaId}: nome já ok "${caixa.nome}"`);
      continue;
    }
    console.log(`  caixa id=${caixaId}: "${caixa.nome}" → "${newCaixaNome}"`);
    await db.query(`UPDATE caixas_agua SET nome = ? WHERE id = ? AND projetoId = ?`, [
      newCaixaNome,
      caixaId,
      PROJETO_ID,
    ]);
  }

  // 4) Caixas órfãs/espelho com "Maturação N" (1–14) sem torre ligada — só renomeia o número no nome
  const [orphanCaixas] = await db.query(
    `SELECT id, nome FROM caixas_agua WHERE projetoId = ? AND fase = 'maturacao'`,
    [PROJETO_ID],
  );
  for (const c of orphanCaixas as { id: number; nome: string }[]) {
    if (caixaIds.includes(c.id)) continue;
    const label = labelMaturacao(c.nome);
    if (label == null || label < 1 || label > MAX_LABEL) continue;
    const toLabel = MAX_LABEL + 1 - label;
    const newNome = rewriteLabel(c.nome, toLabel);
    if (newNome === c.nome) continue;
    console.log(`  caixa órfã id=${c.id}: "${c.nome}" → "${newNome}"`);
    await db.query(`UPDATE caixas_agua SET nome = ? WHERE id = ? AND projetoId = ?`, [
      newNome,
      c.id,
      PROJETO_ID,
    ]);
  }

  await db.commit();

  const [after] = await db.query(
    `SELECT id, nome, numeroTorre, caixaAguaId
     FROM torres
     WHERE projetoId = ? AND fase = 'maturacao'
       AND nome REGEXP 'Matura[cç][aã]o[[:space:]]+(1[0-4]|[1-9])([^0-9]|$)'
     ORDER BY numeroTorre, id`,
    [PROJETO_ID],
  );
  console.log("\nResultado (Maturação 1–14):");
  for (const t of after as TorreRow[]) {
    const label = labelMaturacao(t.nome);
    if (label == null || label > MAX_LABEL) continue;
    console.log(`  id=${t.id} n.º ${t.numeroTorre} "${t.nome}" caixa=${t.caixaAguaId}`);
  }
  console.log("OK");
} catch (err) {
  try {
    await db.rollback();
  } catch {
    /* ignore */
  }
  console.error(err);
  process.exit(1);
} finally {
  await db.end();
}
