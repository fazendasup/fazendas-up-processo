/**
 * Simula o que a UI vê após transform + cicloPendenteNoProtocolo (projeto 1 local).
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { transformFazendaLoadAllResponse } from "../client/src/lib/fazendaTransform.ts";
import { cicloPendenteNoProtocolo } from "../client/src/lib/utils-farm.ts";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const projetoId = 1;

const [ciclos] = await conn.query<any[]>(`SELECT * FROM ciclos WHERE projetoId=?`, [projetoId]);
const [execs] = await conn.query<any[]>(`SELECT * FROM ciclo_caixa_execucoes WHERE projetoId=?`, [projetoId]);
const [caixas] = await conn.query<any[]>(`SELECT * FROM caixas_agua WHERE projetoId=?`, [projetoId]);
const [torres] = await conn.query<any[]>(`SELECT * FROM torres WHERE projetoId=?`, [projetoId]);

const raw = {
  ciclos,
  cicloCaixaExecucoes: execs,
  caixasAgua: caixas,
  torres,
  andares: [],
  perfis: [],
  furos: [],
  medicoesCaixa: [],
  aplicacoesCaixa: [],
  aplicacoesAndar: [],
  variedades: [],
  fasesConfig: [],
  germinacao: [],
  transplantios: [],
  manutencoes: [],
  receitas: [],
  tarefas: [],
  registrosColheita: [],
  planosPlantio: [],
  estoqueItens: [],
};

const data = transformFazendaLoadAllResponse(raw);
console.log("ciclos transformados:", data.ciclos.length);
for (const c of data.ciclos) {
  const pend = cicloPendenteNoProtocolo(c, data.ciclos);
  const agendas = (c.execucoesCaixa ?? []).map((e) => e.dataAgenda).filter(Boolean);
  console.log({
    nome: c.nome,
    ativo: c.ativo,
    freq: c.frequencia,
    intervalo: c.intervaloDias,
    caixas: c.caixaIds?.length ?? 0,
    execs: c.execucoesCaixa?.length ?? 0,
    ultima: c.ultimaExecucao?.slice?.(0, 10) ?? c.ultimaExecucao,
    inicio: c.dataInicio,
    agendasSample: agendas.slice(0, 2),
    pendenteHoje: pend,
  });
}

const pendentes = data.ciclos.filter((c) => cicloPendenteNoProtocolo(c, data.ciclos));
console.log(
  "\nPENDENTES HOJE:",
  pendentes.map((c) => c.nome),
);

await conn.end();
