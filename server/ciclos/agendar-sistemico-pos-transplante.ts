import { and, eq } from "drizzle-orm";
import { agendaSistemicoPosTransplante } from "../../shared/sistemicoPosTransplante";
import {
  hojeYmdSaoPaulo,
  instanteMeioDia,
  ymdCalendario,
} from "../../shared/cicloSequencia";
import { cicloCaixaExecucoes, ciclos, torres } from "../../drizzle/schema";
import { getDb } from "../db";

function chaveProduto(nome: string, produto: string): "infinito" | "cercobin" | "thyper" | null {
  const t = `${nome} ${produto}`
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (t.includes("infinito")) return "infinito";
  if (t.includes("cercobin")) return "cercobin";
  if (t.includes("thyper") || t.includes("peroxido") || t.includes("h2o2")) return "thyper";
  return null;
}

async function upsertAgendaCaixa(input: {
  projetoId: number;
  cicloId: number;
  caixaAguaId: number;
  dataAgendaYmd: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const dataAgenda = instanteMeioDia(input.dataAgendaYmd);
  const existente = await db
    .select()
    .from(cicloCaixaExecucoes)
    .where(
      and(
        eq(cicloCaixaExecucoes.cicloId, input.cicloId),
        eq(cicloCaixaExecucoes.caixaAguaId, input.caixaAguaId),
      ),
    )
    .limit(1);
  if (existente[0]) {
    await db
      .update(cicloCaixaExecucoes)
      .set({ dataAgenda })
      .where(eq(cicloCaixaExecucoes.id, existente[0].id));
    return;
  }
  await db.insert(cicloCaixaExecucoes).values({
    projetoId: input.projetoId,
    cicloId: input.cicloId,
    caixaAguaId: input.caixaAguaId,
    dataAgenda,
    ultimaExecucao: null,
  });
}

/**
 * Após transplantio para vegetativa/maturação: puxa Infinito (e Cercobin)
 * na caixa da torre destino se o lote novo ainda não tem cobertura recente.
 */
export async function agendarSistemicoPosTransplante(input: {
  projetoId: number;
  torreDestinoId: number | null | undefined;
  faseDestino: string;
  agora?: Date;
}): Promise<{ infinito: boolean; cercobin: boolean }> {
  const vazio = { infinito: false, cercobin: false };
  if (!input.torreDestinoId) return vazio;
  const fase = input.faseDestino.trim().toLowerCase();
  if (fase !== "vegetativa" && fase !== "maturacao") return vazio;

  const db = await getDb();
  if (!db) return vazio;

  const torre = (
    await db
      .select()
      .from(torres)
      .where(and(eq(torres.projetoId, input.projetoId), eq(torres.id, input.torreDestinoId)))
      .limit(1)
  )[0];
  if (!torre?.caixaAguaId) return vazio;

  const lista = await db.select().from(ciclos).where(eq(ciclos.projetoId, input.projetoId));
  const ativos = lista.filter((c) => c.ativo !== false);
  const infinito = ativos.find((c) => chaveProduto(c.nome, c.produto) === "infinito");
  const cercobin = ativos.find((c) => chaveProduto(c.nome, c.produto) === "cercobin");
  const thyper = ativos.find((c) => chaveProduto(c.nome, c.produto) === "thyper");
  if (!infinito) return vazio;

  const caixaId = torre.caixaAguaId;
  const execs = await db
    .select()
    .from(cicloCaixaExecucoes)
    .where(eq(cicloCaixaExecucoes.projetoId, input.projetoId));

  const execInf = execs.find((e) => e.cicloId === infinito.id && e.caixaAguaId === caixaId);
  const execCer = cercobin
    ? execs.find((e) => e.cicloId === cercobin.id && e.caixaAguaId === caixaId)
    : undefined;
  const execThy = thyper
    ? execs.find((e) => e.cicloId === thyper.id && e.caixaAguaId === caixaId)
    : undefined;

  const hoje = hojeYmdSaoPaulo(input.agora ?? new Date());
  const plano = agendaSistemicoPosTransplante({
    hojeYmd: hoje,
    faseDestino: fase,
    ultimaInfinitoYmd: execInf?.ultimaExecucao ?? infinito.ultimaExecucao,
    ultimaCercobinYmd: execCer?.ultimaExecucao ?? cercobin?.ultimaExecucao,
    ultimaThyperYmd: execThy?.ultimaExecucao ?? thyper?.ultimaExecucao,
    agendaInfinitoYmd: execInf?.dataAgenda,
  });

  let marcouInf = false;
  let marcouCer = false;
  if (plano.infinitoYmd) {
    await upsertAgendaCaixa({
      projetoId: input.projetoId,
      cicloId: infinito.id,
      caixaAguaId: caixaId,
      dataAgendaYmd: plano.infinitoYmd,
    });
    marcouInf = true;
  }
  if (plano.cercobinYmd && cercobin) {
    const agendaAtual = ymdCalendario(execCer?.dataAgenda);
    if (!agendaAtual || agendaAtual < plano.cercobinYmd) {
      await upsertAgendaCaixa({
        projetoId: input.projetoId,
        cicloId: cercobin.id,
        caixaAguaId: caixaId,
        dataAgendaYmd: plano.cercobinYmd,
      });
      marcouCer = true;
    }
  }

  return { infinito: marcouInf, cercobin: marcouCer };
}
