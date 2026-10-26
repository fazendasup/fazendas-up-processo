import "dotenv/config";
import mysql from "mysql2/promise";
import {
  adicionarDiasYmd,
  dataPrevistaCicloYmd,
  hojeYmdSaoPaulo,
  ymdCalendario,
} from "../shared/cicloSequencia.ts";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const hoje = hojeYmdSaoPaulo();

const [ciclos] = await conn.query<any[]>(
  `SELECT id, nome, ativo, frequencia, intervaloDias, dataInicio, ultimaExecucao, caixaIds
   FROM ciclos WHERE projetoId = 1 AND ativo = 1
     AND (
       nome LIKE '%Infinito%' OR nome LIKE '%Thyper%' OR nome LIKE '%Cercobin%'
       OR nome LIKE '%Calda%' OR nome LIKE '%Trich%'
     )
   ORDER BY nome`,
);
const [execs] = await conn.query<any[]>(
  `SELECT cicloId, caixaAguaId, ultimaExecucao, dataAgenda FROM ciclo_caixa_execucoes WHERE projetoId = 1`,
);

console.log("HOJE", hoje);
for (const c of ciclos) {
  const caixaIds = Array.isArray(c.caixaIds)
    ? c.caixaIds
    : JSON.parse(c.caixaIds || "[]");
  const amostra = caixaIds[0];
  const passo = {
    id: c.id,
    ativo: true,
    alvo: "caixa",
    frequencia: c.frequencia,
    intervaloDias: c.intervaloDias,
    dataInicio: c.dataInicio,
    nome: c.nome,
    produto: c.nome,
    caixaIds,
    execucoes: execs
      .filter((e) => e.cicloId === c.id)
      .map((e) => ({
        caixaId: e.caixaAguaId,
        ultimaExecucao: e.ultimaExecucao,
        dataAgenda: e.dataAgenda,
      })),
  };
  const prevista = amostra
    ? dataPrevistaCicloYmd(passo, amostra, hoje)
    : ymdCalendario(c.dataInicio);
  const ultimaSample = execs.find((e) => e.cicloId === c.id)?.ultimaExecucao;
  console.log({
    nome: c.nome,
    id: c.id,
    caixas: caixaIds.length,
    execs: execs.filter((e) => e.cicloId === c.id).length,
    ultimaHeader: c.ultimaExecucao,
    ultimaCaixaSample: ultimaSample,
    previstaSample: prevista,
    proximaSeIntervalo14: ultimaSample
      ? adicionarDiasYmd(ymdCalendario(ultimaSample)!, 14)
      : null,
  });
}

await conn.end();
