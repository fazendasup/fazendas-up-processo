import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { programacaoCiclos, type CicloProgramado } from "../../client/src/data/cicloFases14d";
import { caixasAgua, cicloCaixaExecucoes, ciclos, projetos } from "../../drizzle/schema";
import { closeDb, getDb } from "../db";

function hojeSaoPaulo(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return partes;
}

function meioDiaSaoPaulo(ymd: string): Date {
  return new Date(`${ymd}T15:00:00.000Z`);
}

function texto(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function chaveDoCiclo(nome: string, produto: string): CicloProgramado["chave"] | null {
  const nomeCalda = texto(nome);
  if (nomeCalda.startsWith("calda a")) return "A";
  if (nomeCalda.startsWith("calda b")) return "B";
  const bruto = texto(`${nome} ${produto}`);
  if (bruto.includes("cercobin")) return "cercobin";
  if (bruto.includes("infinito")) return "infinito";
  // Protocolo atual usa Thyper; Peróxido legado casa na mesma chave para não duplicar.
  if (bruto.includes("thyper") || bruto.includes("peroxido") || bruto.includes("h2o2")) {
    return "thyper";
  }
  if (/\bkoh\b/.test(bruto)) return "koh";
  if (texto(produto).trim() === "bio" || texto(nome).trim() === "bio") return "bio";
  return null;
}

function cicloCasaComChave(
  ciclo: { nome: string; produto: string },
  chave: CicloProgramado["chave"],
): boolean {
  return chaveDoCiclo(ciclo.nome, ciclo.produto) === chave;
}

function preferirCicloAtivo<T extends { id: number; nome: string; produto: string; ativo: boolean }>(
  mesmos: T[],
): T | undefined {
  const ativos = mesmos.filter((c) => c.ativo);
  if (ativos.length === 0) return undefined;
  const thyper = ativos.find((c) => texto(`${c.nome} ${c.produto}`).includes("thyper"));
  return thyper ?? ativos[0];
}

function misturaAsCaldas(nome: string, produto: string): boolean {
  const t = texto(`${nome} ${produto}`);
  if (t.startsWith("calda a") || t.startsWith("calda b")) return false;
  const temForticell = t.includes("forticell");
  const temCaldaA = t.includes("magleaf") || t.includes("biozenith") || t.includes("nutrisolve");
  return temForticell && temCaldaA;
}

/** Primeiro dia da agenda recomeçada. Datas anteriores são reancoradas uma vez. */
const REINICIO_AGENDA = "2026-10-07";

function ymdInicio(valor: unknown): string | null {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  const prefixo = String(valor).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(prefixo) ? prefixo : null;
}

function foliarDentroDaCaixa(nome: string, produto: string, alvo: string): boolean {
  const t = texto(`${nome} ${produto}`);
  // Caldas foliares oficiais nunca são desligadas pelo ensure.
  if (t.startsWith("calda a") || t.startsWith("calda b")) return false;
  if (alvo === "andar") return false;
  // Só desliga misturas soltas de foliar cadastradas por engano na caixa.
  return ["nutrisolve", "biozenith", "magleaf", "forticell"].some((item) => t.includes(item));
}

/** Grava a agenda do protocolo nas fazendas verticais que têm caixa. */
export async function ensureProgramacaoCiclosProtocolo(agora = new Date()): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const hoje = hojeSaoPaulo(agora);
  const agenda = programacaoCiclos(hoje);
  const fazendas = await db
    .select({ id: projetos.id, nome: projetos.nome, tipo: projetos.tipo, status: projetos.status })
    .from(projetos);
  let gravados = 0;

  for (const fazenda of fazendas) {
    if (fazenda.status !== "ativo") continue;
    if (fazenda.tipo !== "fazenda_vertical" && fazenda.tipo !== "hidroponia") continue;
    if (fazenda.nome.startsWith("Projeto Teste")) continue;

    const caixas = await db
      .select({ id: caixasAgua.id, fase: caixasAgua.fase })
      .from(caixasAgua)
      .where(eq(caixasAgua.projetoId, fazenda.id));
    if (caixas.length === 0) continue;

    const existentes = await db
      .select()
      .from(ciclos)
      .where(eq(ciclos.projetoId, fazenda.id));

    const reiniciar = existentes.some((ciclo) => {
      const chave = chaveDoCiclo(ciclo.nome, ciclo.produto);
      if (!chave || !ciclo.ativo) return false;
      if (chave === "koh") return true;
      const inicio = ymdInicio(ciclo.dataInicio);
      return inicio == null || inicio < REINICIO_AGENDA;
    });

    for (const ciclo of existentes) {
      const chave = chaveDoCiclo(ciclo.nome, ciclo.produto);
      const desligar =
        chave === "koh" ||
        misturaAsCaldas(ciclo.nome, ciclo.produto) ||
        foliarDentroDaCaixa(ciclo.nome, ciclo.produto, ciclo.alvo);
      if (!desligar || !ciclo.ativo) continue;
      await db
        .update(ciclos)
        .set({ ativo: false })
        .where(and(eq(ciclos.id, ciclo.id), eq(ciclos.projetoId, fazenda.id)));
    }

    for (const item of agenda) {
      const caixaIds =
        item.caixas === "nenhuma"
          ? []
          : item.caixas === "sem-mudas"
            ? caixas.filter((caixa) => caixa.fase !== "mudas").map((caixa) => caixa.id)
            : caixas.map((caixa) => caixa.id);
      const alvo = item.caixas === "nenhuma" ? "andar" : "caixa";
      const dados = {
        nome: item.nome,
        produto: item.produto,
        tipo: item.tipo,
        frequencia: item.frequencia,
        intervaloDias: item.intervaloDias ?? null,
        diasSemana: item.diasSemana ?? null,
        fasesAplicaveis: item.fases,
        dosagem: item.dosagem,
        alvo,
        caixaIds,
        dataInicio: meioDiaSaoPaulo(item.dataInicio),
        ativo: true,
      };
      const mesmos = existentes.filter((ciclo) =>
        cicloCasaComChave(ciclo, item.chave),
      );
      const ja = preferirCicloAtivo(mesmos);
      // Apaga duplicatas da mesma chave (ativos ou inativos), mantém só o escolhido.
      const idsRemovidos = new Set<number>();
      if (ja) {
        const idsLixo = mesmos.filter(c => c.id !== ja.id).map(c => c.id);
        if (idsLixo.length > 0) {
          await db
            .delete(cicloCaixaExecucoes)
            .where(inArray(cicloCaixaExecucoes.cicloId, idsLixo));
          await db
            .delete(ciclos)
            .where(
              and(inArray(ciclos.id, idsLixo), eq(ciclos.projetoId, fazenda.id)),
            );
          for (const idLixo of idsLixo) idsRemovidos.add(idLixo);
          for (let i = existentes.length - 1; i >= 0; i--) {
            if (idsLixo.includes(existentes[i]!.id)) existentes.splice(i, 1);
          }
        }
      }
      // Se o operador desativou o único ciclo desta chave, não recria nem mexe.
      const temInativo = mesmos.some(
        (ciclo) => !ciclo.ativo && !idsRemovidos.has(ciclo.id),
      );
      if (!ja && temInativo) continue;
      // Caldas: não sobrescreve dias/agenda definidos na fazenda.
      if (
        ja &&
        !reiniciar &&
        (item.chave === "A" || item.chave === "B") &&
        Array.isArray(ja.diasSemana)
      ) {
        continue;
      }
      if (ja) {
        const legadoPeroxido =
          item.chave === "thyper" &&
          !texto(`${ja.nome} ${ja.produto}`).includes("thyper");
        await db
          .update(ciclos)
          .set({
            ...dados,
            // Mantém nome/produto salvos, exceto Peróxido legado → Thyper do protocolo.
            nome: legadoPeroxido ? dados.nome : ja.nome,
            produto: legadoPeroxido ? dados.produto : ja.produto,
            tipo: legadoPeroxido ? dados.tipo : ja.tipo,
            dosagem: legadoPeroxido ? dados.dosagem : ja.dosagem,
            dataInicio: reiniciar ? dados.dataInicio : (ja.dataInicio ?? dados.dataInicio),
            ...(reiniciar
              ? { ultimaExecucao: null, ultimoExecutorId: null, ultimoExecutorNome: null }
              : {}),
          })
          .where(and(eq(ciclos.id, ja.id), eq(ciclos.projetoId, fazenda.id)));
        if (reiniciar) {
          await db
            .update(cicloCaixaExecucoes)
            .set({ ultimaExecucao: null, dataAgenda: null })
            .where(eq(cicloCaixaExecucoes.cicloId, ja.id));
        }
      } else {
        await db.insert(ciclos).values({ ...dados, projetoId: fazenda.id });
      }
      gravados += 1;
    }
  }

  return gravados;
}

if (process.argv[1]?.includes("ensure-programacao-protocolo")) {
  ensureProgramacaoCiclosProtocolo()
    .then(async (n) => {
      console.log("ciclos programados", n);
      await closeDb();
    })
    .catch(async (erro) => {
      console.error(erro instanceof Error ? erro.message : erro);
      await closeDb();
      process.exit(1);
    });
}
