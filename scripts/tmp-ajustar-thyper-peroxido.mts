/**
 * Thyper S-50 substitui o Peróxido a cada 2 dias (não é quinzenal).
 * - Thyper: personalizada / 2 dias
 * - Peróxido: desativado (substituído pelo Thyper)
 * - Próxima a partir da última 20/10 → 22/10, 24/10, …
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { adicionarDiasYmd, instanteMeioDia, ymdCalendario } from "../shared/cicloSequencia.ts";

const PROJETO_ID = 1;
const DRY = process.env.DRY_RUN === "1";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [ciclos] = await conn.query<any[]>(
  `SELECT id, nome, produto, ativo, frequencia, intervaloDias, ultimaExecucao, caixaIds
   FROM ciclos WHERE projetoId = ? AND (
     nome LIKE '%Thyper%' OR nome LIKE '%Peróx%' OR nome LIKE '%Perox%' OR produto LIKE '%H₂O₂%' OR produto LIKE '%H2O2%'
   )`,
  [PROJETO_ID],
);
console.log("ANTES", ciclos);

const thyper = ciclos.find((c) => String(c.nome).toLowerCase().includes("thyper"));
const peroxido = ciclos.find(
  (c) =>
    String(c.nome).toLowerCase().includes("perox") ||
    String(c.produto || "").toLowerCase().includes("h2o2") ||
    String(c.produto || "").includes("H₂O₂"),
);

if (!thyper) throw new Error("Thyper não encontrado");

const ultima = ymdCalendario(thyper.ultimaExecucao) ?? "2026-10-20";
const proxima = adicionarDiasYmd(ultima, 2);

console.log({ thyperId: thyper.id, ultima, proxima, peroxidoId: peroxido?.id });

if (!DRY) {
  await conn.query(
    `UPDATE ciclos
     SET frequencia = 'personalizada',
         intervaloDias = 2,
         tipo = 'sanitizante',
         dosagem = COALESCE(NULLIF(dosagem, ''), 'Substitui o peróxido. A cada 2 dias. Conforme SOP.'),
         ativo = 1
     WHERE id = ? AND projetoId = ?`,
    [thyper.id, PROJETO_ID],
  );

  // Limpa agenda deslocada nas caixas (próxima sai de ultima+2)
  await conn.query(
    `UPDATE ciclo_caixa_execucoes SET dataAgenda = NULL WHERE projetoId = ? AND cicloId = ?`,
    [PROJETO_ID, thyper.id],
  );

  if (peroxido) {
    await conn.query(
      `UPDATE ciclos SET ativo = 0 WHERE id = ? AND projetoId = ?`,
      [peroxido.id, PROJETO_ID],
    );
    console.log("Peróxido desativado (id", peroxido.id, ")");
  }
}

const [depois] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, intervaloDias, ultimaExecucao, dosagem
   FROM ciclos WHERE projetoId = ? AND id IN (?, ?)`,
  [PROJETO_ID, thyper.id, peroxido?.id ?? 0],
);
console.log("DEPOIS", depois);
console.log(
  DRY ? "Dry-run." : `Ok. Thyper a cada 2 dias; última ${ultima} → próxima ${proxima}.`,
);

await conn.end();
