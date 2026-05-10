/**
 * Bases onde `projetos` existe mas a migração 0014 não chegou a criar `projetoId` nas tabelas operacionais:
 * o Drizzle filtra por `projetoId` e o UPDATE legado não atualiza nada — contagens ficam 0.
 * Este módulo aplica os mesmos passos da `drizzle/0014_multi_projetos.sql` de forma idempotente.
 */
import { sql, type SQLWrapper } from "drizzle-orm";

export type EnsureMultiProjetoSchemaResult = {
  fvpId: number;
  columnsAdded: string[];
  steps: string[];
};

export type MultiProjetoDbConn = { execute: (q: string | SQLWrapper) => Promise<unknown> };
type DbConn = MultiProjetoDbConn;

function assertIdent(name: string, label: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Identificador inválido (${label}): ${name}`);
  }
}

export async function columnExists(db: DbConn, table: string, column: string): Promise<boolean> {
  assertIdent(table, "table");
  assertIdent(column, "column");
  const res = await db.execute(
    sql.raw(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'`,
    ),
  );
  const packet = Array.isArray(res) ? res[0] : res;
  const rows = Array.isArray(packet) ? packet : [packet];
  const row = rows[0] as { c?: number | string } | undefined;
  return Number(row?.c ?? 0) > 0;
}

export async function tableExists(db: DbConn, table: string): Promise<boolean> {
  assertIdent(table, "table");
  const res = await db.execute(
    sql.raw(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'`,
    ),
  );
  const packet = Array.isArray(res) ? res[0] : res;
  const rows = Array.isArray(packet) ? packet : [packet];
  const row = rows[0] as { c?: number | string } | undefined;
  return Number(row?.c ?? 0) > 0;
}

function isBenignMysqlError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const errno = (e as { errno?: number }).errno;
  if (errno === 1060 || errno === 1061 || errno === 1091 || errno === 1005 || errno === 1826) return true;
  if (/Duplicate column name/i.test(msg)) return true;
  if (/Duplicate key name/i.test(msg)) return true;
  if (/Can't DROP/i.test(msg) && /check that column\/key exists/i.test(msg)) return true;
  if (/Duplicate foreign key constraint name/i.test(msg)) return true;
  if (/already exists/i.test(msg) && /Foreign key/i.test(msg)) return true;
  return false;
}

async function execRaw(db: DbConn, stmt: string, steps: string[], label: string): Promise<void> {
  try {
    await db.execute(sql.raw(stmt));
    steps.push(`ok ${label}`);
  } catch (e) {
    if (isBenignMysqlError(e)) {
      steps.push(`skip ${label}`);
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    steps.push(`erro ${label}: ${msg.slice(0, 200)}`);
    console.warn(`[ensure-multi-projeto-schema] ${label}:`, e);
  }
}

/**
 * @param fvpId — id do projeto "Fazenda Vertical Principal" (ou equivalente legado).
 */
export async function runEnsureIncompleteMultiProjetoSchema(
  db: DbConn,
  fvpId: number,
): Promise<EnsureMultiProjetoSchemaResult> {
  const pid = Math.floor(Number(fvpId));
  if (!Number.isFinite(pid) || pid < 1) {
    throw new Error("fvpId inválido para ensure-multi-projeto-schema");
  }

  const columnsAdded: string[] = [];
  const steps: string[] = [];

  const addNullColumn = async (table: string, preDropIndex?: string) => {
    if (!(await tableExists(db, table))) return;
    if (await columnExists(db, table, "projetoId")) return;
    if (preDropIndex) {
      await execRaw(
        db,
        `ALTER TABLE \`${table}\` DROP INDEX \`${preDropIndex}\``,
        steps,
        `drop index ${table}.${preDropIndex}`,
      );
    }
    await execRaw(db, `ALTER TABLE \`${table}\` ADD COLUMN \`projetoId\` int NULL`, steps, `add column ${table}.projetoId`);
    columnsAdded.push(table);
  };

  // Raízes (slugs únicos por projeto na 0014)
  await addNullColumn("variedades", "variedades_slug_unique");
  await addNullColumn("fases_config", "fases_config_fase_unique");
  await addNullColumn("caixas_agua", "caixas_agua_slug_unique");
  await addNullColumn("torres", "torres_slug_unique");

  await addNullColumn("medicoes_caixa");
  await addNullColumn("aplicacoes_caixa");
  await addNullColumn("andares");
  await addNullColumn("perfis");
  await addNullColumn("furos");
  await addNullColumn("aplicacoes_andar");
  await addNullColumn("germinacao");
  await addNullColumn("transplantios");
  await addNullColumn("manutencoes");
  await addNullColumn("ciclos");
  await addNullColumn("receitas_crescimento");
  await addNullColumn("tarefas");
  await addNullColumn("registros_colheita");
  await addNullColumn("planos_plantio");
  await addNullColumn("recommendation_rules");
  await addNullColumn("intelligent_alerts");
  await addNullColumn("alert_events");
  await addNullColumn("estoque_itens");

  for (const t of ["bancadas", "caixas_bancada", "medicoes_bancada", "aplicacoes_bancada"] as const) {
    await addNullColumn(t);
  }

  // Backfill (mesma ordem que 0014)
  const u = async (stmt: string, label: string) => execRaw(db, stmt, steps, label);

  await u(`UPDATE \`variedades\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update variedades");
  await u(`UPDATE \`fases_config\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update fases_config");
  await u(`UPDATE \`caixas_agua\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update caixas_agua");
  await u(`UPDATE \`torres\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update torres");

  await u(
    `UPDATE \`medicoes_caixa\` mc INNER JOIN \`caixas_agua\` c ON mc.\`caixaAguaId\` = c.\`id\` SET mc.\`projetoId\` = c.\`projetoId\``,
    "join medicoes_caixa <- caixas_agua",
  );
  await u(`UPDATE \`medicoes_caixa\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback medicoes_caixa");

  await u(
    `UPDATE \`aplicacoes_caixa\` ac INNER JOIN \`caixas_agua\` c ON ac.\`caixaAguaId\` = c.\`id\` SET ac.\`projetoId\` = c.\`projetoId\``,
    "join aplicacoes_caixa <- caixas_agua",
  );
  await u(`UPDATE \`aplicacoes_caixa\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback aplicacoes_caixa");

  await u(
    `UPDATE \`andares\` a INNER JOIN \`torres\` t ON a.\`torreId\` = t.\`id\` SET a.\`projetoId\` = t.\`projetoId\``,
    "join andares <- torres",
  );
  await u(`UPDATE \`andares\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback andares");

  await u(
    `UPDATE \`perfis\` p INNER JOIN \`andares\` a ON p.\`andarId\` = a.\`id\` SET p.\`projetoId\` = a.\`projetoId\``,
    "join perfis <- andares",
  );
  await u(`UPDATE \`perfis\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback perfis");

  await u(
    `UPDATE \`furos\` f INNER JOIN \`andares\` a ON f.\`andarId\` = a.\`id\` SET f.\`projetoId\` = a.\`projetoId\``,
    "join furos <- andares",
  );
  await u(`UPDATE \`furos\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback furos");

  await u(
    `UPDATE \`aplicacoes_andar\` aa INNER JOIN \`andares\` a ON aa.\`andarId\` = a.\`id\` SET aa.\`projetoId\` = a.\`projetoId\``,
    "join aplicacoes_andar <- andares",
  );
  await u(`UPDATE \`aplicacoes_andar\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback aplicacoes_andar");

  await u(`UPDATE \`germinacao\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update germinacao");
  await u(`UPDATE \`transplantios\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update transplantios");

  await u(
    `UPDATE \`manutencoes\` m INNER JOIN \`torres\` t ON m.\`torreId\` = t.\`id\` SET m.\`projetoId\` = t.\`projetoId\``,
    "join manutencoes <- torres",
  );
  await u(`UPDATE \`manutencoes\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback manutencoes");

  await u(`UPDATE \`ciclos\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update ciclos");
  await u(`UPDATE \`receitas_crescimento\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update receitas_crescimento");

  await u(
    `UPDATE \`tarefas\` tf
LEFT JOIN \`torres\` t ON tf.\`torreId\` = t.\`id\`
LEFT JOIN \`caixas_agua\` c ON tf.\`caixaAguaId\` = c.\`id\`
SET tf.\`projetoId\` = COALESCE(t.\`projetoId\`, c.\`projetoId\`, ${pid})`,
    "update tarefas coalesce",
  );

  await u(
    `UPDATE \`registros_colheita\` rc INNER JOIN \`torres\` t ON rc.\`torreId\` = t.\`id\` SET rc.\`projetoId\` = t.\`projetoId\``,
    "join registros_colheita <- torres",
  );
  await u(`UPDATE \`registros_colheita\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback registros_colheita");

  await u(`UPDATE \`planos_plantio\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update planos_plantio");
  await u(`UPDATE \`recommendation_rules\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update recommendation_rules");
  await u(`UPDATE \`intelligent_alerts\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update intelligent_alerts");

  await u(
    `UPDATE \`alert_events\` ae INNER JOIN \`intelligent_alerts\` ia ON ae.\`alertaId\` = ia.\`id\` SET ae.\`projetoId\` = ia.\`projetoId\``,
    "join alert_events <- intelligent_alerts",
  );
  await u(`UPDATE \`alert_events\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "fallback alert_events");

  await u(`UPDATE \`estoque_itens\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, "update estoque_itens");

  for (const t of ["bancadas", "caixas_bancada", "medicoes_bancada", "aplicacoes_bancada"] as const) {
    if (await tableExists(db, t)) {
      await u(`UPDATE \`${t}\` SET \`projetoId\` = ${pid} WHERE \`projetoId\` IS NULL`, `update ${t}`);
    }
  }

  // NOT NULL + FK + índices compostos (idempotente)
  const finalize = async (
    table: string,
    fkName: string,
    uniqueIdx?: { name: string; cols: string },
  ) => {
    if (!(await tableExists(db, table))) return;
    if (!(await columnExists(db, table, "projetoId"))) return;
    await execRaw(
      db,
      `ALTER TABLE \`${table}\` MODIFY \`projetoId\` int NOT NULL`,
      steps,
      `modify not null ${table}`,
    );
    await execRaw(
      db,
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fkName}\` FOREIGN KEY (\`projetoId\`) REFERENCES \`projetos\`(\`id\`)`,
      steps,
      `fk ${table}`,
    );
    if (uniqueIdx) {
      await execRaw(
        db,
        `CREATE UNIQUE INDEX \`${uniqueIdx.name}\` ON \`${table}\` (${uniqueIdx.cols})`,
        steps,
        `unique ${uniqueIdx.name}`,
      );
    }
  };

  await finalize("variedades", "variedades_projeto_fk", { name: "variedades_projeto_slug", cols: "`projetoId`, `slug`" });
  await finalize("fases_config", "fases_config_projeto_fk", { name: "fases_config_projeto_fase", cols: "`projetoId`, `fase`" });
  await finalize("caixas_agua", "caixas_agua_projeto_fk", { name: "caixas_agua_projeto_slug", cols: "`projetoId`, `slug`" });
  await finalize("torres", "torres_projeto_fk", { name: "torres_projeto_slug", cols: "`projetoId`, `slug`" });

  for (const [tbl, fk] of [
    ["medicoes_caixa", "medicoes_caixa_projeto_fk"],
    ["aplicacoes_caixa", "aplicacoes_caixa_projeto_fk"],
    ["andares", "andares_projeto_fk"],
    ["perfis", "perfis_projeto_fk"],
    ["furos", "furos_projeto_fk"],
    ["aplicacoes_andar", "aplicacoes_andar_projeto_fk"],
    ["germinacao", "germinacao_projeto_fk"],
    ["transplantios", "transplantios_projeto_fk"],
    ["manutencoes", "manutencoes_projeto_fk"],
    ["ciclos", "ciclos_projeto_fk"],
    ["receitas_crescimento", "receitas_crescimento_projeto_fk"],
    ["tarefas", "tarefas_projeto_fk"],
    ["registros_colheita", "registros_colheita_projeto_fk"],
    ["planos_plantio", "planos_plantio_projeto_fk"],
    ["recommendation_rules", "recommendation_rules_projeto_fk"],
    ["intelligent_alerts", "intelligent_alerts_projeto_fk"],
    ["alert_events", "alert_events_projeto_fk"],
    ["estoque_itens", "estoque_itens_projeto_fk"],
  ] as const) {
    await finalize(tbl, fk);
  }

  for (const [tbl, fk] of [
    ["bancadas", "bancadas_projeto_fk"],
    ["caixas_bancada", "caixas_bancada_projeto_fk"],
    ["medicoes_bancada", "medicoes_bancada_projeto_fk"],
    ["aplicacoes_bancada", "aplicacoes_bancada_projeto_fk"],
  ] as const) {
    if (await tableExists(db, tbl)) {
      await finalize(tbl, fk);
    }
  }

  // Índices auxiliares (0014)
  const idxStmts: [string, string][] = [
    ["idx_variedades_projeto", "CREATE INDEX `idx_variedades_projeto` ON `variedades` (`projetoId`)"],
    ["idx_torres_projeto", "CREATE INDEX `idx_torres_projeto` ON `torres` (`projetoId`)"],
    ["idx_andares_projeto", "CREATE INDEX `idx_andares_projeto` ON `andares` (`projetoId`)"],
    ["idx_ciclos_projeto", "CREATE INDEX `idx_ciclos_projeto` ON `ciclos` (`projetoId`)"],
    ["idx_tarefas_projeto", "CREATE INDEX `idx_tarefas_projeto` ON `tarefas` (`projetoId`)"],
    ["idx_manutencoes_projeto", "CREATE INDEX `idx_manutencoes_projeto` ON `manutencoes` (`projetoId`)"],
    ["idx_estoque_itens_projeto", "CREATE INDEX `idx_estoque_itens_projeto` ON `estoque_itens` (`projetoId`)"],
    ["idx_registros_colheita_projeto", "CREATE INDEX `idx_registros_colheita_projeto` ON `registros_colheita` (`projetoId`)"],
    ["idx_germinacao_projeto", "CREATE INDEX `idx_germinacao_projeto` ON `germinacao` (`projetoId`)"],
    ["idx_transplantios_projeto", "CREATE INDEX `idx_transplantios_projeto` ON `transplantios` (`projetoId`)"],
    ["idx_medicoes_caixa_projeto", "CREATE INDEX `idx_medicoes_caixa_projeto` ON `medicoes_caixa` (`projetoId`)"],
    ["idx_aplicacoes_caixa_projeto", "CREATE INDEX `idx_aplicacoes_caixa_projeto` ON `aplicacoes_caixa` (`projetoId`)"],
    ["idx_aplicacoes_andar_projeto", "CREATE INDEX `idx_aplicacoes_andar_projeto` ON `aplicacoes_andar` (`projetoId`)"],
    ["idx_furos_projeto", "CREATE INDEX `idx_furos_projeto` ON `furos` (`projetoId`)"],
    ["idx_perfis_projeto", "CREATE INDEX `idx_perfis_projeto` ON `perfis` (`projetoId`)"],
    ["idx_planos_plantio_projeto", "CREATE INDEX `idx_planos_plantio_projeto` ON `planos_plantio` (`projetoId`)"],
    ["idx_intelligent_alerts_projeto", "CREATE INDEX `idx_intelligent_alerts_projeto` ON `intelligent_alerts` (`projetoId`)"],
    ["idx_alert_events_projeto", "CREATE INDEX `idx_alert_events_projeto` ON `alert_events` (`projetoId`)"],
    ["idx_recommendation_rules_projeto", "CREATE INDEX `idx_recommendation_rules_projeto` ON `recommendation_rules` (`projetoId`)"],
    ["idx_receitas_crescimento_projeto", "CREATE INDEX `idx_receitas_crescimento_projeto` ON `receitas_crescimento` (`projetoId`)"],
    ["idx_fases_config_projeto", "CREATE INDEX `idx_fases_config_projeto` ON `fases_config` (`projetoId`)"],
    ["idx_caixas_agua_projeto", "CREATE INDEX `idx_caixas_agua_projeto` ON `caixas_agua` (`projetoId`)"],
    ["idx_bancadas_projeto", "CREATE INDEX `idx_bancadas_projeto` ON `bancadas` (`projetoId`)"],
    ["idx_caixas_bancada_projeto", "CREATE INDEX `idx_caixas_bancada_projeto` ON `caixas_bancada` (`projetoId`)"],
  ];
  for (const [label, stmt] of idxStmts) {
    await execRaw(db, stmt, steps, label);
  }

  if (columnsAdded.length > 0) {
    console.log(
      `[ensure-multi-projeto-schema] Colunas projetoId adicionadas (${columnsAdded.length}): ${columnsAdded.join(", ")}`,
    );
  }

  return { fvpId: pid, columnsAdded, steps };
}
