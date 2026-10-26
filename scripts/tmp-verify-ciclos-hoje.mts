import "dotenv/config";
import mysql from "mysql2/promise";
import {
  dataPrevistaCicloYmd,
  hojeYmdSaoPaulo,
  ymdCalendario,
} from "../shared/cicloSequencia.ts";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const hoje = hojeYmdSaoPaulo();
const [ciclos] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, intervaloDias, ultimaExecucao, caixaIds
   FROM ciclos WHERE projetoId = 1 AND ativo = 1
     AND (nome LIKE '%Thyper%' OR nome LIKE '%Cercobin%' OR nome LIKE '%Infinito%'
       OR nome LIKE '%Trich%' OR nome LIKE '%Calda%' OR nome LIKE '%Bio%' OR nome LIKE '%Peróx%')`,
);
const [execs] = await conn.query<any[]>(
  `SELECT cicloId, caixaAguaId, ultimaExecucao, dataAgenda FROM ciclo_caixa_execucoes WHERE projetoId = 1`,
);

function parseIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw).map(Number);
    } catch {
      return [];
    }
  }
  return [];
}

console.log("HOJE", hoje);
console.log("GIT/código: já em origin/main (folgas Thyper)");
console.log("");

for (const c of ciclos) {
  const ids = parseIds(c.caixaIds);
  const amostra = ids[0];
  const passo = {
    id: c.id,
    ativo: true,
    alvo: ids.length ? "caixa" : "andar",
    frequencia: c.frequencia,
    intervaloDias: c.intervaloDias,
    dataInicio: null,
    nome: c.nome,
    produto: c.nome,
    caixaIds: ids,
    execucoes: execs
      .filter((e) => e.cicloId === c.id)
      .map((e) => ({
        caixaId: e.caixaAguaId,
        ultimaExecucao: e.ultimaExecucao,
        dataAgenda: e.dataAgenda,
      })),
  };
  const prev = amostra ? dataPrevistaCicloYmd(passo as any, amostra, hoje) : null;
  console.log({
    nome: c.nome,
    ultima: ymdCalendario(c.ultimaExecucao) ?? ymdCalendario(passo.execucoes[0]?.ultimaExecucao),
    agenda: ymdCalendario(passo.execucoes[0]?.dataAgenda),
    prevista: prev,
    hoje: prev === hoje ? "SIM — na fila" : prev && prev < hoje ? "atrasado" : "depois",
  });
}

await conn.end();
