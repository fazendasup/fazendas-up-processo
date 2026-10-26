import "dotenv/config";
import mysql from "mysql2/promise";

async function dump(label: string, url: string | undefined, database: string) {
  if (!url) {
    console.log(label, "sem URL");
    return;
  }
  const u = new URL(url.replace(/^mysql:\/\//, "http://"));
  const c = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  });
  try {
    const [proj] = await c.query<any[]>(
      `SELECT id, nome, tipo, status FROM projetos
       WHERE nome NOT LIKE 'Projeto Teste%' ORDER BY id`,
    );
    const [mods] = await c.query<any[]>(
      `SELECT pm.projetoId, p.nome AS projeto, pm.modulo, pm.habilitado
       FROM projeto_modulos pm
       JOIN projetos p ON p.id = pm.projetoId
       WHERE p.nome NOT LIKE 'Projeto Teste%'
       ORDER BY pm.projetoId, pm.modulo`,
    );
    console.log(`\n=== ${label} (${database}) ===`);
    console.log("projetos", proj);
    console.log("modulos count", (mods as any[]).length);
    // pivot
    const byProj = new Map<number, Record<string, boolean>>();
    for (const m of mods as any[]) {
      if (!byProj.has(m.projetoId)) byProj.set(m.projetoId, {});
      byProj.get(m.projetoId)![m.modulo] = Boolean(m.habilitado);
    }
    for (const p of proj as any[]) {
      console.log(`#${p.id} ${p.nome} [${p.tipo}/${p.status}]`, byProj.get(p.id) ?? "(sem rows)");
    }
  } catch (e: any) {
    console.log(label, "ERR", e.code || e.message);
  }
  await c.end();
}

await dump("local", process.env.DATABASE_URL, "fazendas_up");
await dump("railway", process.env.COMERCIAL_DATABASE_URL, "railway");
