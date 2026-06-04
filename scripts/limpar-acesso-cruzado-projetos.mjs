/**
 * Limpa vínculos espúrios em `projeto_usuarios` criados pelo bug do bootstrap
 * (que ligava TODOS os usuários ao projeto legado "Fazenda Vertical Principal").
 *
 * Regra segura: remove o vínculo de um usuário ao projeto legado SOMENTE quando
 * esse usuário também pertence a outro projeto (ou seja, foi criado para outro projeto
 * e recebeu o legado por engano). Usuários cujo ÚNICO projeto é o legado NÃO são tocados.
 *
 * Uso:
 *   node scripts/limpar-acesso-cruzado-projetos.mjs            # pré-visualização (dry-run)
 *   node scripts/limpar-acesso-cruzado-projetos.mjs --apply    # aplica a remoção
 *
 * Variáveis:
 *   DATABASE_URL              (obrigatória)
 *   PROJETO_LEGADO_NOME       (opcional; default "Fazenda Vertical Principal")
 *
 * Segurança: este script nunca deve mirar o projeto produtivo "Fazenda Vertical - FUP".
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const LEGADO_NOME = process.env.PROJETO_LEGADO_NOME?.trim() || "Fazenda Vertical Principal";
const PROJETOS_PROTEGIDOS = new Set(["Fazenda Vertical - FUP"]);

if (PROJETOS_PROTEGIDOS.has(LEGADO_NOME)) {
  console.error(`Projeto protegido "${LEGADO_NOME}". Este script não pode remover vínculos desse projeto.`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente.");
  process.exit(1);
}

const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
try {
  const [legadoRows] = await conn.query(
    "SELECT id, nome FROM `projetos` WHERE nome = ? LIMIT 1",
    [LEGADO_NOME],
  );
  if (!legadoRows.length) {
    console.error(`Projeto legado "${LEGADO_NOME}" não encontrado. Ajuste PROJETO_LEGADO_NOME.`);
    process.exit(1);
  }
  const legadoId = legadoRows[0].id;
  console.log(`Projeto legado: #${legadoId} | ${legadoRows[0].nome}`);

  // Vínculos ao legado de usuários que TAMBÉM pertencem a outro projeto.
  const [spurios] = await conn.query(
    `SELECT pu.userId, u.email, u.name, u.role
       FROM projeto_usuarios pu
       JOIN users u ON u.id = pu.userId
      WHERE pu.projetoId = ?
        AND u.role <> 'platform_admin'
        AND EXISTS (
          SELECT 1 FROM projeto_usuarios o
           WHERE o.userId = pu.userId AND o.projetoId <> ?
        )`,
    [legadoId, legadoId],
  );

  if (!spurios.length) {
    console.log("Nenhum vínculo espúrio encontrado. Nada a fazer.");
    process.exit(0);
  }

  console.log(`\nVínculos ao legado que serão REMOVIDOS (${spurios.length}):`);
  for (const r of spurios) {
    console.log(`  - userId=${r.userId} | ${r.email ?? "(sem email)"} | ${r.name ?? ""} | role=${r.role}`);
  }

  if (!APPLY) {
    console.log("\n[dry-run] Nada foi alterado. Rode com --apply para remover.");
    process.exit(0);
  }

  const [res] = await conn.query(
    `DELETE pu FROM projeto_usuarios pu
       JOIN users u ON u.id = pu.userId
      WHERE pu.projetoId = ?
        AND u.role <> 'platform_admin'
        AND EXISTS (
          SELECT 1 FROM (
            SELECT userId FROM projeto_usuarios WHERE projetoId <> ?
          ) o WHERE o.userId = pu.userId
        )`,
    [legadoId, legadoId],
  );
  console.log(`\n[OK] Removidos ${res.affectedRows} vínculo(s) espúrio(s) ao projeto legado.`);
} finally {
  await conn.end();
}
