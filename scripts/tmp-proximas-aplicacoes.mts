import "dotenv/config";
import mysql from "mysql2/promise";
import {
  adicionarDiasYmd,
  dataPrevistaCicloYmd,
  folgaMinimaDias,
  chaveAplicacaoProtocolo,
  hojeYmdSaoPaulo,
  ymdCalendario,
  type PassoCicloAgenda,
} from "../shared/cicloSequencia.ts";

const PROJETO_ID = 1;
const hoje = hojeYmdSaoPaulo();
const conn = await mysql.createConnection(process.env.DATABASE_URL!);

const [ciclos] = await conn.query<any[]>(
  `SELECT * FROM ciclos WHERE projetoId = ? AND ativo = 1 ORDER BY nome`,
  [PROJETO_ID],
);
const [execs] = await conn.query<any[]>(
  `SELECT * FROM ciclo_caixa_execucoes WHERE projetoId = ?`,
  [PROJETO_ID],
);
const [caixas] = await conn.query<any[]>(
  `SELECT id, nome, fase FROM caixas_agua WHERE projetoId = ?`,
  [PROJETO_ID],
);
const caixaMap = new Map(caixas.map((c) => [c.id, c]));

function parseIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const passos: PassoCicloAgenda<number>[] = ciclos.map((c) => ({
  id: c.id,
  ativo: true,
  alvo: c.alvo,
  frequencia: c.frequencia,
  diasSemana: Array.isArray(c.diasSemana) ? c.diasSemana : c.diasSemana ? JSON.parse(c.diasSemana) : null,
  intervaloDias: c.intervaloDias,
  dataInicio: c.dataInicio,
  nome: c.nome,
  produto: c.produto,
  caixaIds: parseIds(c.caixaIds),
  execucoes: execs
    .filter((e) => e.cicloId === c.id)
    .map((e) => ({
      caixaId: e.caixaAguaId,
      ultimaExecucao: e.ultimaExecucao,
      dataAgenda: e.dataAgenda,
    })),
}));

const DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

console.log(`HOJE (SP): ${hoje}\n`);
console.log("=== RESUMO POR CICLO (amostra 1ª caixa / regra global) ===\n");

for (const passo of passos) {
  const chave = chaveAplicacaoProtocolo(passo.nome ?? "", passo.produto ?? "");
  if (passo.alvo === "andar" || passo.caixaIds.length === 0) {
    // caldas / sem caixa
    const dias = passo.diasSemana ?? [];
    const ultima = ymdCalendario(
      ciclos.find((c) => c.id === passo.id)?.ultimaExecucao,
    );
    const inicio = ymdCalendario(passo.dataInicio);
    console.log({
      ciclo: passo.nome,
      alvo: passo.alvo,
      freq: passo.frequencia,
      diasSemana: dias.map((d) => DIA[d]),
      inicio,
      ultima,
      chave,
      nota: "aplicação em andares (sem caixa)",
    });
    continue;
  }

  const amostra = passo.caixaIds[0];
  const prevista = dataPrevistaCicloYmd(passo, amostra, hoje);
  const ultimaSample = ymdCalendario(
    passo.execucoes.find((e) => e.caixaId === amostra)?.ultimaExecucao ??
      ciclos.find((c) => c.id === passo.id)?.ultimaExecucao,
  );
  const agendaSample = ymdCalendario(
    passo.execucoes.find((e) => e.caixaId === amostra)?.dataAgenda,
  );

  // status: vencido / hoje / futuro
  let status = "—";
  if (prevista) {
    if (prevista < hoje) status = `ATRASADO desde ${prevista}`;
    else if (prevista === hoje) status = "HOJE";
    else status = `próxima ${prevista}`;
  }

  console.log({
    ciclo: passo.nome,
    chave,
    freq: `${passo.frequencia}${passo.intervaloDias ? ` / ${passo.intervaloDias}d` : ""}`,
    caixas: passo.caixaIds.length,
    ultima: ultimaSample,
    agenda: agendaSample,
    prevista,
    status,
  });
}

// Folgas de segurança relevantes
console.log("\n=== REGRAS DE FOLGA (dias mínimos) ===");
const pares = [
  ["infinito", "cercobin"],
  ["infinito", "thyper"],
  ["thyper", "cercobin"],
  ["thyper", "bio"],
  ["cercobin", "thyper"],
  ["cercobin", "infinito"],
  ["bio", "infinito"],
];
for (const [a, b] of pares) {
  console.log(`  ${a} → ${b}: ${folgaMinimaDias(a, b)} dia(s)`);
}

// Agenda prática próximos 14 dias para veg (caixa 92) e mudas (107)
console.log("\n=== CALENDÁRIO PRÓXIMOS 14 DIAS (caixa veg #92 e mudas #107) ===\n");
for (const caixaId of [92, 107]) {
  const cx = caixaMap.get(caixaId);
  console.log(`-- ${cx?.nome} (${cx?.fase}) --`);
  for (let i = 0; i < 14; i++) {
    const ymd = adicionarDiasYmd(hoje, i);
    const doDia: string[] = [];
    for (const passo of passos) {
      if (passo.alvo === "andar") {
        if (passo.frequencia === "semanal" && passo.diasSemana?.length) {
          const [y, m, d] = ymd.split("-").map(Number);
          const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          if (passo.diasSemana.includes(dow)) {
            const inicio = ymdCalendario(passo.dataInicio);
            if (!inicio || inicio <= ymd) doDia.push(passo.nome ?? "?");
          }
        }
        continue;
      }
      if (!passo.caixaIds.includes(caixaId)) continue;
      const prev = dataPrevistaCicloYmd(passo, caixaId, ymd);
      if (prev === ymd) doDia.push(passo.nome ?? "?");
      // também mostrar se atrasado e ainda "devido" hoje relativo a ymd
      if (prev && prev < ymd) {
        // só lista no primeiro dia do horizonte se ainda atrasado
        if (ymd === hoje) doDia.push(`${passo.nome} (atrasado desde ${prev})`);
      }
    }
    if (doDia.length) {
      console.log(`  ${ymd} (${DIA[new Date(ymd + "T12:00:00Z").getUTCDay()]}): ${doDia.join(" · ")}`);
    }
  }
  console.log("");
}

await conn.end();
