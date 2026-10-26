/**
 * Desativa ciclos legados que poluem dashboard/Ciclos:
 * Peróxido, Bio, Sialex/Kasumin órfãos sem caixas.
 * Garante Thyper ativo no projeto 1.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL ausente");

const conn = await mysql.createConnection(url);

const [antes] = await conn.query<any[]>(
  `SELECT id, projetoId, nome, ativo FROM ciclos
   WHERE nome IN ('Peróxido','Bio','Controle de algas - Sialex','Controle de algas - Kasumin + Sialex')
      OR nome LIKE 'Thyper%'
   ORDER BY projetoId, id`,
);
console.log("antes", antes);

await conn.query(
  `UPDATE ciclos SET ativo = 0
   WHERE nome IN ('Peróxido','Bio','Controle de algas - Sialex','Controle de algas - Kasumin + Sialex')
     AND ativo = 1`,
);

await conn.query(
  `UPDATE ciclos SET ativo = 1, frequencia = 'personalizada', intervaloDias = 2
   WHERE nome LIKE 'Thyper%' AND projetoId = 1`,
);

const [depois] = await conn.query<any[]>(
  `SELECT id, projetoId, nome, ativo, frequencia, intervaloDias FROM ciclos
   WHERE nome IN ('Peróxido','Bio','Controle de algas - Sialex','Controle de algas - Kasumin + Sialex')
      OR nome LIKE 'Thyper%'
   ORDER BY projetoId, id`,
);
console.log("depois", depois);

await conn.end();
