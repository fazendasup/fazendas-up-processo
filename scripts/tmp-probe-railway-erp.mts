import "dotenv/config";
import mysql from "mysql2/promise";

const comercial = process.env.COMERCIAL_DATABASE_URL;
if (!comercial) throw new Error("sem COMERCIAL_DATABASE_URL");

// Tenta a mesma instância Railway com schema fazendas_up
const erpUrl = comercial
  .replace(/\/fazendas_comercial(\?|$)/, "/fazendas_up$1")
  .replace(/\/railway(\?|$)/, "/fazendas_up$1");

console.log("tentando", erpUrl.replace(/\/\/[^@]+@/, "//***@"));

try {
  const conn = await mysql.createConnection(erpUrl);
  const [dbs] = await conn.query<any[]>(`SHOW DATABASES`);
  console.log(
    "databases",
    dbs.map((d) => Object.values(d)[0]),
  );
  const [projetos] = await conn.query<any[]>(
    `SELECT id, nome, tipo, status FROM fazendas_up.projetos WHERE tipo='fazenda_vertical' AND status='ativo' AND nome NOT LIKE 'Projeto Teste%' ORDER BY id`,
  );
  console.log("projetos FV", projetos);
  const [ciclos] = await conn.query<any[]>(
    `SELECT id, nome, ativo, frequencia, intervaloDias, ultimaExecucao
     FROM fazendas_up.ciclos WHERE projetoId = 1 AND ativo = 1 ORDER BY nome`,
  );
  console.log("ciclos projeto 1 (ativos)", ciclos);
  const [thyper] = await conn.query<any[]>(
    `SELECT id, nome, ativo FROM fazendas_up.ciclos WHERE nome LIKE '%Thyper%' OR nome LIKE '%Trich%'`,
  );
  console.log("thyper/trich", thyper);
  await conn.end();
} catch (e: any) {
  console.error("FALHOU", e.code || e.message);
}
