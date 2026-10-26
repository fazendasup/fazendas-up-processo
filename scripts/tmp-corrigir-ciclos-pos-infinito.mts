/**
 * Corrige agenda do projeto 1 (Fazenda Vertical - FUP) após:
 * - Infinito em vegetativa/maturação em 19/10/2026
 * - Thyper S-50 em 20/10/2026
 *
 * Não apaga ciclos existentes. Cria Thyper/Trichoderma se faltarem.
 * Uso: npx tsx scripts/tmp-corrigir-ciclos-pos-infinito.mts
 * Dry-run: DRY_RUN=1 npx tsx scripts/tmp-corrigir-ciclos-pos-infinito.mts
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { instanteMeioDia } from "../shared/cicloSequencia.ts";

const PROJETO_ID = 1;
const DRY = process.env.DRY_RUN === "1";
const INFINITO_YMD = "2026-10-19";
const THYPER_YMD = "2026-10-20";
/** Folga mínimo Infinito → Cercobin = 3 dias → 22/10 */
const CERCOBIN_AGENDA_YMD = "2026-10-22";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

function parseCaixaIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((n) => Number.isFinite(n))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function upsertExecucao(opts: {
  cicloId: number;
  caixaId: number;
  ultima: Date | null;
  agenda: Date | null;
}) {
  const [rows] = await conn.query<any[]>(
    `SELECT id FROM ciclo_caixa_execucoes WHERE cicloId = ? AND caixaAguaId = ? LIMIT 1`,
    [opts.cicloId, opts.caixaId],
  );
  if (rows[0]) {
    if (DRY) {
      console.log("  update exec", { ...opts, id: rows[0].id });
      return;
    }
    await conn.query(
      `UPDATE ciclo_caixa_execucoes
       SET ultimaExecucao = ?, dataAgenda = ?, executorNome = 'Correção agenda', executorId = NULL
       WHERE id = ?`,
      [opts.ultima, opts.agenda, rows[0].id],
    );
    return;
  }
  if (DRY) {
    console.log("  insert exec", opts);
    return;
  }
  await conn.query(
    `INSERT INTO ciclo_caixa_execucoes
      (projetoId, cicloId, caixaAguaId, ultimaExecucao, dataAgenda, executorNome)
     VALUES (?, ?, ?, ?, ?, 'Correção agenda')`,
    [PROJETO_ID, opts.cicloId, opts.caixaId, opts.ultima, opts.agenda],
  );
}

const [ciclos] = await conn.query<any[]>(
  `SELECT * FROM ciclos WHERE projetoId = ? ORDER BY id`,
  [PROJETO_ID],
);

let infinito = ciclos.find((c) => String(c.nome).toLowerCase().includes("infinito"));
let cercobin = ciclos.find((c) => String(c.nome).toLowerCase().includes("cercobin"));
let thyper = ciclos.find(
  (c) =>
    String(c.nome).toLowerCase().includes("thyper") ||
    String(c.produto).toLowerCase().includes("thyper"),
);
let trichoderma = ciclos.find(
  (c) =>
    String(c.nome).toLowerCase().includes("trich") ||
    String(c.produto).toLowerCase().includes("trich"),
);

const caixasInfinito = parseCaixaIds(infinito?.caixaIds);
if (!infinito || caixasInfinito.length === 0) {
  throw new Error("Infinito não encontrado ou sem caixaIds no projeto 1");
}
if (!cercobin) throw new Error("Cercobin não encontrado");

console.log(DRY ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log("Infinito", infinito.id, "caixas", caixasInfinito.length);
console.log("Cercobin", cercobin.id);

// 1) Criar Thyper se faltar
if (!thyper) {
  console.log("Criando ciclo Thyper S-50…");
  if (!DRY) {
    const [r] = await conn.query<any>(
      `INSERT INTO ciclos
        (projetoId, nome, frequencia, intervaloDias, produto, tipo, dosagem, fasesAplicaveis, alvo, caixaIds, dataInicio, ativo)
       VALUES (?, 'Thyper S-50', 'quinzenal', 14, 'Thyper S-50', 'fungicida',
               'Conforme SOP / rótulo. Vegetativa e maturação.',
               ?, 'caixa', ?, ?, 1)`,
      [
        PROJETO_ID,
        JSON.stringify(["vegetativa", "maturacao"]),
        JSON.stringify(caixasInfinito),
        instanteMeioDia(THYPER_YMD),
      ],
    );
    const id = Number(r.insertId);
    const [created] = await conn.query<any[]>(`SELECT * FROM ciclos WHERE id = ?`, [id]);
    thyper = created[0];
  } else {
    thyper = { id: -1, nome: "Thyper S-50 (novo)", caixaIds: caixasInfinito };
  }
} else {
  // garantir mesmas caixas do Infinito
  if (!DRY) {
    await conn.query(
      `UPDATE ciclos SET caixaIds = ?, fasesAplicaveis = ?, ativo = 1, frequencia = 'quinzenal', intervaloDias = 14
       WHERE id = ? AND projetoId = ?`,
      [
        JSON.stringify(caixasInfinito),
        JSON.stringify(["vegetativa", "maturacao"]),
        thyper.id,
        PROJETO_ID,
      ],
    );
  }
}
console.log("Thyper", thyper.id);

// 2) Criar Trichoderma mudas se faltar
const [mudas] = await conn.query<any[]>(
  `SELECT id FROM caixas_agua WHERE projetoId = ? AND fase = 'mudas' ORDER BY id`,
  [PROJETO_ID],
);
const mudasIds = mudas.map((c) => c.id);
if (!trichoderma) {
  console.log("Criando Prevenção com Trichoderma - MUDAS…", mudasIds);
  if (!DRY) {
    const [r] = await conn.query<any>(
      `INSERT INTO ciclos
        (projetoId, nome, frequencia, intervaloDias, produto, tipo, dosagem, fasesAplicaveis, alvo, caixaIds, dataInicio, ativo)
       VALUES (?, 'Prevenção com Trichoderma - MUDAS', 'personalizada', 7, 'Trichoderma', 'biologico',
               'Conforme SOP / rótulo. Somente mudas.',
               ?, 'caixa', ?, ?, 1)`,
      [
        PROJETO_ID,
        JSON.stringify(["mudas"]),
        JSON.stringify(mudasIds),
        instanteMeioDia("2026-10-23"),
      ],
    );
    trichoderma = { id: Number(r.insertId) };
  }
} else {
  console.log("Trichoderma já existe", trichoderma.id);
}

const dtInfinito = instanteMeioDia(INFINITO_YMD);
const dtThyper = instanteMeioDia(THYPER_YMD);
const dtCercobinAgenda = instanteMeioDia(CERCOBIN_AGENDA_YMD);

// 3) Registrar Infinito 19/10 em todas as caixas + cabeçalho do ciclo
console.log("Registrando Infinito em", INFINITO_YMD);
if (!DRY) {
  await conn.query(
    `UPDATE ciclos
     SET ultimaExecucao = ?, ultimoExecutorNome = 'Correção agenda', dataInicio = ?
     WHERE id = ? AND projetoId = ?`,
    [dtInfinito, dtInfinito, infinito.id, PROJETO_ID],
  );
}
for (const caixaId of caixasInfinito) {
  await upsertExecucao({
    cicloId: infinito.id,
    caixaId,
    ultima: dtInfinito,
    agenda: null,
  });
}

// 4) Registrar Thyper 20/10
console.log("Registrando Thyper em", THYPER_YMD);
if (!DRY && thyper.id > 0) {
  await conn.query(
    `UPDATE ciclos
     SET ultimaExecucao = ?, ultimoExecutorNome = 'Correção agenda', dataInicio = ?, ativo = 1
     WHERE id = ? AND projetoId = ?`,
    [dtThyper, dtThyper, thyper.id, PROJETO_ID],
  );
}
if (thyper.id > 0) {
  for (const caixaId of caixasInfinito) {
    await upsertExecucao({
      cicloId: thyper.id,
      caixaId,
      ultima: dtThyper,
      agenda: null,
    });
  }
}

// 5) Cercobin: próxima agenda 22/10 (folga 3d após Infinito 19)
console.log("Agendando Cercobin para", CERCOBIN_AGENDA_YMD);
if (!DRY) {
  await conn.query(
    `UPDATE ciclos
     SET dataInicio = ?, ultimaExecucao = NULL, ultimoExecutorNome = NULL
     WHERE id = ? AND projetoId = ?`,
    [dtCercobinAgenda, cercobin.id, PROJETO_ID],
  );
}
for (const caixaId of caixasInfinito) {
  await upsertExecucao({
    cicloId: cercobin.id,
    caixaId,
    ultima: null,
    agenda: dtCercobinAgenda,
  });
}

// Resumo previsto
console.log("\n=== PRÓXIMAS DATAS ESPERADAS ===");
console.log("Infinito: última 19/10 → próxima ~02/11 (14d)");
console.log("Thyper:   última 20/10 → próxima ~03/11 (14d)");
console.log("Cercobin: agenda 22/10 (já vencido/venceu; pode aplicar agora)");
console.log("Calda A:  semanal sextas (mantida)");
console.log("Calda B:  semanal segundas (mantida)");
console.log("Trichoderma mudas: a cada 7 dias a partir de 23/10 (se criado agora)");

await conn.end();
console.log(DRY ? "\nDry-run ok." : "\nCorreção aplicada.");
