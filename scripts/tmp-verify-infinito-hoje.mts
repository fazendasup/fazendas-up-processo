import "dotenv/config";
import { eq } from "drizzle-orm";
import { cicloCaixaExecucoes } from "../drizzle/schema";
import { closeDb, getDb } from "../server/db";
import { dataPrevistaCicloYmd, hojeYmdSaoPaulo, ymdCalendario } from "../shared/cicloSequencia";
import { ciclos } from "../drizzle/schema";

const db = await getDb();
if (!db) throw new Error("no db");
const hoje = hojeYmdSaoPaulo();
const inf = (await db.select().from(ciclos).where(eq(ciclos.id, 14)))[0]!;
const execs = await db.select().from(cicloCaixaExecucoes).where(eq(cicloCaixaExecucoes.cicloId, 14));
const passo = {
  id: inf.id,
  ativo: true,
  alvo: inf.alvo,
  frequencia: inf.frequencia,
  intervaloDias: inf.intervaloDias,
  dataInicio: inf.dataInicio,
  nome: inf.nome,
  produto: inf.produto,
  caixaIds: (inf.caixaIds as number[]) ?? [],
  execucoes: execs.map((e) => ({
    caixaId: e.caixaAguaId,
    ultimaExecucao: e.ultimaExecucao,
    dataAgenda: e.dataAgenda,
  })),
};
const previstas = passo.caixaIds
  .map((id) => ({ id, ymd: dataPrevistaCicloYmd(passo, id, hoje) }))
  .filter((x) => x.ymd);
console.log("hoje", hoje);
console.log(
  "agendas",
  [...new Set(execs.map((e) => ymdCalendario(e.dataAgenda)))],
);
console.log(
  "previstas hoje",
  previstas.filter((p) => p.ymd === hoje).length,
  "/",
  previstas.length,
);
await closeDb();
