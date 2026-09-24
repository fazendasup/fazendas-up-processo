import mysql from "mysql2/promise";

/** Segunda-feira 00:00 da semana civil local (igual server/comercial/lib/semana). */
function inicioSemana(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const diff = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const weekStart = inicioSemana(new Date());
const weekStartIso = iso(weekStart);
console.log("week_start", weekStartIso, weekStart.toString());

const conn = await mysql.createConnection({
  uri: process.env.PROBE_URL,
  connectTimeout: 25000,
});
await conn.query("USE fazendas_comercial");

const [[beforeCa]] = await conn.query(
  `SELECT status_conciliacao AS s, COUNT(*) AS c
   FROM pedidos
   WHERE origem_pedido = 'CONTA_AZUL'
     AND status_conciliacao IN ('NAO_CONCILIADA','SUGERIDA','DIVERGENTE')
     AND data_pedido < ?
   GROUP BY status_conciliacao`,
  [weekStartIso],
);
const [[beforeOp]] = await conn.query(
  `SELECT status_conciliacao AS s, COUNT(*) AS c
   FROM pedidos_operacionais
   WHERE status_conciliacao IN ('VINCULO_SUGERIDO','DIVERGENTE')
     AND data_entrega < ?
   GROUP BY status_conciliacao`,
  [weekStartIso],
);
console.log("before_ca", beforeCa);
console.log("before_op_grouped_query_raw");
const [beforeOpRows] = await conn.query(
  `SELECT status_conciliacao AS s, COUNT(*) AS c
   FROM pedidos_operacionais
   WHERE status_conciliacao IN ('VINCULO_SUGERIDO','DIVERGENTE')
     AND data_entrega < ?
   GROUP BY status_conciliacao`,
  [weekStartIso],
);
console.log("before_op", beforeOpRows);

const dry = process.env.DRY_RUN === "1";
if (dry) {
  console.log("DRY_RUN — no writes");
  await conn.end();
  process.exit(0);
}

const [caResult] = await conn.query(
  `UPDATE pedidos
   SET status_conciliacao = 'IGNORADA',
       sugestao_pedido_operacional_id = NULL
   WHERE origem_pedido = 'CONTA_AZUL'
     AND status_conciliacao IN ('NAO_CONCILIADA','SUGERIDA','DIVERGENTE')
     AND data_pedido < ?`,
  [weekStartIso],
);

const [opResult] = await conn.query(
  `UPDATE pedidos_operacionais
   SET status_conciliacao = 'PLANEJADO',
       sugestao_pedido_conta_azul_id = NULL,
       pedido_conta_azul_id = NULL,
       snapshot_conciliacao = NULL
   WHERE status_conciliacao IN ('VINCULO_SUGERIDO','DIVERGENTE')
     AND data_entrega < ?`,
  [weekStartIso],
);

console.log(
  JSON.stringify({
    weekStartIso,
    caIgnored: caResult.affectedRows,
    opReset: opResult.affectedRows,
  }),
);

const [[keepCa]] = await conn.query(
  `SELECT COUNT(*) AS c FROM pedidos
   WHERE origem_pedido='CONTA_AZUL'
     AND status_conciliacao IN ('NAO_CONCILIADA','SUGERIDA','DIVERGENTE')
     AND data_pedido >= ? AND data_pedido < DATE_ADD(?, INTERVAL 7 DAY)`,
  [weekStartIso, weekStartIso],
);
console.log("pending_ca_this_week", Number(keepCa.c));

await conn.end();
