import { calcularRentabilidade, somarCustoOperacionalSugerido } from "@shared/custosRentabilidade";
import {
  somarOverheadItensIncluidos,
  type ModoOverheadRentabilidade,
} from "@shared/custosRentabilidadeOverhead";
import {
  calcularCustoMensalEquipe,
  mapaCustoHoraProcessamento,
  somarMoOverheadEquipes,
  type CustoHoraPorRegime,
} from "@shared/custosMoEquipe";
import {
  custoPorPlantaLinha,
  LABEL_GRUPO_CUSTO_PRODUCAO,
  type GrupoCustoProducao,
  type ModoCustoProducao,
  type RateioMetodoCustos,
} from "@shared/custosProducao";
import type { CustoRentabilidadePeriodoRow } from "../drizzle/schema";
import * as db from "./db";
import {
  alocacaoRateioPorVariedade,
  custoDiretoPorPlantaPorVariedade,
} from "./custosProducaoRateio";
import * as moEquipeDb from "./custosMoEquipeDb";
import * as custosProdutoDb from "./custosProdutoDb";
import * as processoModelosDb from "./custosProdutoProcessoModelosDb";
import * as rentabilidadeDb from "./custosRentabilidadeDb";
import { calcularFichaCompleta } from "./custosProdutoResolver";
import { mapMoEquipeRowToInput } from "./moEquipeMapper";
import type { FullFazendaData } from "./chat-context";

export type ModuleAssistantResumo =
  | {
      disponivel: true;
      paginas: Record<string, unknown>;
      insights?: string[];
    }
  | { disponivel: false; motivo: string };

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function serializeMapaHora(mapa: CustoHoraPorRegime) {
  return {
    clt: mapa.clt != null ? round2(mapa.clt) : null,
    pj: mapa.pj != null ? round2(mapa.pj) : null,
    misto: mapa.misto != null ? round2(mapa.misto) : null,
  };
}

function periodoCobreMes(inicio: Date, fim: Date, ref = new Date()): boolean {
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const mesInicio = new Date(ano, mes, 1);
  const mesFim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
  return inicio <= mesFim && fim >= mesInicio;
}

function rankingMargemRentabilidade(
  linhas: Array<{
    produto: string;
    margemBrutaPct: number | null;
    contribuicao: number | null;
    lucroBruto: number | null;
    status: string;
  }>,
) {
  return [...linhas]
    .filter((l) => l.margemBrutaPct != null || l.contribuicao != null)
    .sort((a, b) => {
      const ca = a.contribuicao ?? a.lucroBruto ?? Number.NEGATIVE_INFINITY;
      const cb = b.contribuicao ?? b.lucroBruto ?? Number.NEGATIVE_INFINITY;
      return ca - cb;
    })
    .slice(0, 20)
    .map((l) => ({
      produto: l.produto,
      margemBrutaPct: l.margemBrutaPct,
      contribuicao: l.contribuicao,
      lucroBruto: l.lucroBruto,
      status: l.status,
    }));
}

function resolveModoOverhead(periodo: CustoRentabilidadePeriodoRow): ModoOverheadRentabilidade {
  if (periodo.modoOverhead) return periodo.modoOverhead as ModoOverheadRentabilidade;
  return periodo.usarCustoSugerido ? "sugerido" : "manual";
}

function mapOverheadDb(row: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeOverheadItens>>[number]) {
  return {
    id: row.id,
    origem: row.origem,
    grupo: row.grupo,
    rubrica: row.rubrica,
    valor: num(row.valor),
    incluido: row.incluido,
  };
}

async function custoOperacionalSugeridoProjeto(projetoId: number) {
  const compartilhados = await db.getCustosProducaoCompartilhados(projetoId);
  const rubricasCompartilhados = somarCustoOperacionalSugerido(compartilhados);
  const [equipesRows, modoMo] = await Promise.all([
    moEquipeDb.listMoEquipes(projetoId),
    moEquipeDb.getModoCustoMoEquipe(projetoId),
  ]);
  const equipesInput = equipesRows.map(mapMoEquipeRowToInput);
  const moOverhead = somarMoOverheadEquipes(equipesInput, modoMo);
  return {
    total: rubricasCompartilhados + moOverhead,
    rubricasCompartilhados,
    moOverhead,
    compartilhados,
    equipes: equipesRows,
  };
}

async function custoUnitarioPorFicha(projetoId: number, fichaIds: number[]) {
  const map = new Map<number, number | null>();
  if (fichaIds.length === 0) return map;
  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  const alvo = new Set(fichaIds);
  await Promise.all(
    fichas
      .filter((f) => alvo.has(f.id))
      .map(async (f) => {
        const r = await calcularFichaCompleta(projetoId, f);
        map.set(f.id, r.custoPorUnidade ?? null);
      }),
  );
  return map;
}

async function montarRentabilidadePeriodo(
  projetoId: number,
  periodo: CustoRentabilidadePeriodoRow,
  linhasDb: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeLinhas>>,
  overheadDb: Awaited<ReturnType<typeof rentabilidadeDb.listRentabilidadeOverheadItens>>,
) {
  const sugerido = await custoOperacionalSugeridoProjeto(projetoId);
  const modoOverhead = resolveModoOverhead(periodo);
  const overheadItens = overheadDb.map(mapOverheadDb);
  let custoOperacional: number;
  if (modoOverhead === "sugerido") {
    custoOperacional = sugerido.total;
  } else if (modoOverhead === "manual") {
    custoOperacional = num(periodo.custoOperacionalTotal);
  } else {
    custoOperacional = somarOverheadItensIncluidos(overheadItens);
  }

  const fichaIds = linhasDb.map((l) => l.fichaId).filter((id): id is number => id != null);
  const custosFicha = await custoUnitarioPorFicha(projetoId, fichaIds);
  const calculo = calcularRentabilidade({
    custoOperacionalTotal: custoOperacional,
    linhas: linhasDb.map((l) => ({
      id: l.id,
      fichaId: l.fichaId,
      nomeProduto: l.nomeProduto,
      quantidade: num(l.quantidade),
      receitaTotal: num(l.receitaTotal),
      custoUnitarioManual: numOrNull(l.custoUnitarioManual),
      custoUnitarioFicha: l.fichaId != null ? (custosFicha.get(l.fichaId) ?? null) : null,
    })),
  });

  return {
    periodo: {
      id: periodo.id,
      titulo: periodo.titulo,
      inicio: ymd(periodo.inicio),
      fim: ymd(periodo.fim),
      modoOverhead,
      custoOperacionalTotal: round2(custoOperacional),
    },
    totais: calculo.totais,
    viabilidade: calculo.viabilidade,
    linhas: calculo.linhas.slice(0, 40).map((l) => ({
      produto: l.nomeProduto,
      quantidade: l.quantidade,
      receita: round2(l.receitaTotal),
      custoUnitario: l.custoUnitario,
      cmv: l.cmv,
      lucroBruto: l.lucroBruto,
      margemBrutaPct: l.margemBrutaPct,
      contribuicao: l.contribuicao,
      status: l.status,
    })),
  };
}

async function buildInsightsCfo(pid: number) {
  const [variedades, itens, col30, pop] = await Promise.all([
    db.getAllVariedades(pid),
    db.getAllCustosProducaoItens(pid),
    db.getColheitaAggPorVariedade(pid, 30),
    db.getPlantasOcupadasPorVariedadeFromFuros(pid),
  ]);
  const ids = variedades.map((v) => v.id);
  const shared = itens.filter((r) => r.variedadeId == null);
  const [directMap, alocMensal] = await Promise.all([
    Promise.resolve(custoDiretoPorPlantaPorVariedade(itens, ids)),
    alocacaoRateioPorVariedade(pid, ids, shared),
  ]);

  const custosPorVar = ids.map((id) => {
    const d = directMap.get(id) ?? { total: 0, incompletas: 0, linhas: 0 };
    const al = alocMensal.get(id) ?? 0;
    const po = Math.max(0, pop.get(id) ?? 0);
    const rp = al > 0 && po > 0 ? al / po : 0;
    return { id, total: d.total + rp, incompletas: d.incompletas };
  });

  const totals = custosPorVar.map((c) => c.total).filter((t) => t > 0);
  const mediana =
    totals.length === 0 ? 0 : [...totals].sort((a, b) => a - b)[Math.floor(totals.length / 2)] ?? 0;

  const alertas: Array<{ severidade: string; titulo: string; texto: string }> = [];
  for (const c of custosPorVar) {
    if (c.total <= 0 || mediana <= 0) continue;
    if (c.total >= mediana * 1.45) {
      const nome = variedades.find((v) => v.id === c.id)?.nome ?? "";
      alertas.push({
        severidade: "alta",
        titulo: `Custo/planta elevado: ${nome}`,
        texto: `~${(c.total / mediana).toFixed(2)}× a mediana.`,
      });
    }
  }

  let incompletas = 0;
  for (const i of itens) {
    if (!i.ativo || i.variedadeId == null) continue;
    const { valor } = custoPorPlantaLinha({
      modo: i.modo as ModoCustoProducao,
      precoReferencia: i.precoReferencia,
      quantidadePorPlanta: i.quantidadePorPlanta,
      valorPorPlanta: i.valorPorPlanta,
      valorPorCiclo: i.valorPorCiclo,
      plantasPorCicloEstimado: i.plantasPorCicloEstimado,
      valorMensal: i.valorMensal,
      plantasMesEstimativa: i.plantasMesEstimativa,
      ativo: i.ativo,
    });
    if (valor == null) incompletas += 1;
  }
  if (incompletas > 0) {
    alertas.push({
      severidade: "media",
      titulo: "Dados de custo incompletos",
      texto: `${incompletas} rubrica(s) sem valor calculável.`,
    });
  }

  const grupoAcc = new Map<string, number>();
  for (const i of itens) {
    if (!i.ativo || i.variedadeId == null) continue;
    const { valor } = custoPorPlantaLinha({
      modo: i.modo as ModoCustoProducao,
      precoReferencia: i.precoReferencia,
      quantidadePorPlanta: i.quantidadePorPlanta,
      valorPorPlanta: i.valorPorPlanta,
      valorPorCiclo: i.valorPorCiclo,
      plantasPorCicloEstimado: i.plantasPorCicloEstimado,
      valorMensal: i.valorMensal,
      plantasMesEstimativa: i.plantasMesEstimativa,
      ativo: i.ativo,
    });
    if (valor == null) continue;
    grupoAcc.set(i.grupo, (grupoAcc.get(i.grupo) ?? 0) + valor * Math.max(1, pop.get(i.variedadeId) ?? 1));
  }

  return {
    alertas: alertas.slice(0, 8),
    resumoMedianaPorPlanta: round2(mediana),
    driversCusto: Array.from(grupoAcc.entries())
      .map(([grupo, valor]) => ({
        grupo,
        label: LABEL_GRUPO_CUSTO_PRODUCAO[grupo as GrupoCustoProducao] ?? grupo,
        valorAproximado: round2(valor),
      }))
      .sort((a, b) => b.valorAproximado - a.valorAproximado)
      .slice(0, 6),
    colheita30d: ids.map((id) => {
      const c = col30.get(id) ?? { kg: 0, plantas: 0 };
      const v = variedades.find((x) => x.id === id);
      return {
        variedade: v?.nome ?? `#${id}`,
        kg: round2(c.kg),
        plantas: c.plantas,
        kgPorPlanta: c.plantas > 0 ? round2(c.kg / c.plantas) : null,
      };
    }),
  };
}

export async function buildCustosAssistantResumo(
  pid: number,
  enabled: boolean,
): Promise<ModuleAssistantResumo | null> {
  if (!enabled) return null;
  try {
    const [variedades, itens, fichas, equipesRows, modoMo, modelos, periodos] = await Promise.all([
      db.getAllVariedades(pid),
      db.getAllCustosProducaoItens(pid),
      custosProdutoDb.listCustosProdutoFichas(pid),
      moEquipeDb.listMoEquipes(pid),
      moEquipeDb.getModoCustoMoEquipe(pid),
      processoModelosDb.listProcessoModelos(pid),
      rentabilidadeDb.listRentabilidadePeriodos(pid),
    ]);

    const ids = variedades.map((v) => v.id);
    const shared = itens.filter((r) => r.variedadeId == null);
    const [directMap, alocMensal, pop, insightsCfo, compartilhadosRows] = await Promise.all([
      Promise.resolve(custoDiretoPorPlantaPorVariedade(itens, ids)),
      alocacaoRateioPorVariedade(pid, ids, shared),
      db.getPlantasOcupadasPorVariedadeFromFuros(pid),
      buildInsightsCfo(pid),
      db.getCustosProducaoCompartilhados(pid),
    ]);

    const porVariedade = variedades.map((v) => {
      const d = directMap.get(v.id) ?? { total: 0, incompletas: 0, linhas: 0 };
      const al = alocMensal.get(v.id) ?? 0;
      const po = Math.max(0, pop.get(v.id) ?? 0);
      const rateioPorPlanta = al > 0 && po > 0 ? al / po : al > 0 ? null : 0;
      return {
        variedade: v.nome,
        plantasOcupadas: po,
        custoDiretoPorPlanta: round2(d.total),
        custoRateioPorPlanta: rateioPorPlanta != null ? round2(rateioPorPlanta) : null,
        custoTotalPorPlanta: round2(d.total + (rateioPorPlanta ?? 0)),
        linhasIncompletas: d.incompletas,
      };
    });

    const equipesInput = equipesRows.map(mapMoEquipeRowToInput);
    const mapaHora = mapaCustoHoraProcessamento(equipesInput, modoMo);
    const equipesMo = equipesRows.map((e) => ({
      nome: e.nome,
      regime: e.regime,
      finalidade: e.finalidade,
      ativo: e.ativo,
      custoMensal: round2(calcularCustoMensalEquipe(mapMoEquipeRowToInput(e), modoMo)),
    }));

    const fichasAtivas = fichas.filter((f) => f.ativo).slice(0, 30);
    const fichasResumoResults = await Promise.allSettled(
      fichasAtivas.map(async (f) => {
        const calc = await calcularFichaCompleta(pid, f);
        return {
          id: f.id,
          nome: f.nome,
          tipo: f.tipo,
          unidadeVenda: f.unidadeVenda,
          produtoComercialId: f.produtoComercialId,
          variedadeId: f.variedadeId,
          precoVendaReferencia: numOrNull(f.precoVendaReferencia),
          custoPorUnidade: calc.custoPorUnidade != null ? round2(calc.custoPorUnidade) : null,
          margemReferenciaPct:
            calc.custoPorUnidade != null && numOrNull(f.precoVendaReferencia)
              ? round2(
                  ((num(f.precoVendaReferencia) - calc.custoPorUnidade) / num(f.precoVendaReferencia)) * 100,
                )
              : null,
          detalhesCusto: calc.detalhes?.slice(0, 8).map((e) => ({
            grupo: e.grupo,
            label: e.label,
            valor: round2(e.valor),
          })),
        };
      }),
    );
    const fichasResumo: Array<{
      id: number;
      nome: string;
      tipo: string;
      unidadeVenda: string;
      produtoComercialId: string | null;
      variedadeId: number | null;
      precoVendaReferencia: number | null;
      custoPorUnidade: number | null;
      margemReferenciaPct: number | null;
      detalhesCusto: Array<{ grupo: string; label: string; valor: number }>;
    }> = [];
    let fichasErros = 0;
    for (const r of fichasResumoResults) {
      if (r.status === "fulfilled") fichasResumo.push(r.value);
      else fichasErros += 1;
    }

    const rentabilidadeDetalhes = new Map<number, Awaited<ReturnType<typeof montarRentabilidadePeriodo>>>();
    const periodosDetalheIds = new Set<number>();
    if (periodos[0]) periodosDetalheIds.add(periodos[0].id);
    for (const p of periodos) {
      if (periodoCobreMes(p.inicio, p.fim)) periodosDetalheIds.add(p.id);
    }
    await Promise.all(
      Array.from(periodosDetalheIds).map(async (periodoId) => {
        const p = periodos.find((x) => x.id === periodoId);
        if (!p) return;
        const [linhas, overhead] = await Promise.all([
          rentabilidadeDb.listRentabilidadeLinhas(p.id),
          rentabilidadeDb.listRentabilidadeOverheadItens(p.id),
        ]);
        rentabilidadeDetalhes.set(p.id, await montarRentabilidadePeriodo(pid, p, linhas, overhead));
      }),
    );

    const rentabilidadeUltimo = periodos[0] ? rentabilidadeDetalhes.get(periodos[0].id) ?? null : null;
    const rentabilidadeMesCorrente = periodos.find((p) => periodoCobreMes(p.inicio, p.fim));
    const rentabilidadeMesCorrenteDetalhe = rentabilidadeMesCorrente
      ? (rentabilidadeDetalhes.get(rentabilidadeMesCorrente.id) ?? null)
      : null;

    const compartilhados = compartilhadosRows.map((r) => {
      const { valor, detalhe } = custoPorPlantaLinha({
        modo: r.modo as ModoCustoProducao,
        precoReferencia: r.precoReferencia,
        quantidadePorPlanta: r.quantidadePorPlanta,
        valorPorPlanta: r.valorPorPlanta,
        valorPorCiclo: r.valorPorCiclo,
        plantasPorCicloEstimado: r.plantasPorCicloEstimado,
        valorMensal: r.valorMensal,
        plantasMesEstimativa: r.plantasMesEstimativa,
        ativo: r.ativo,
      });
      return {
        rubrica: r.rubrica,
        grupo: r.grupo,
        modo: r.modo,
        rateioMetodo: r.rateioMetodo as RateioMetodoCustos | null,
        valorMensal: numOrNull(r.valorMensal),
        custoPorPlantaCalculado: valor,
        calculoDetalhe: detalhe,
        ativo: r.ativo,
      };
    });

    const insights = [
      `${fichas.filter((f) => f.ativo).length} ficha(s) ativa(s); ${equipesRows.filter((e) => e.ativo).length} equipe(s) MO.`,
      insightsCfo.alertas[0]?.titulo ?? "Sem alertas CFO críticos no momento.",
      periodos[0]
        ? `Último período rentabilidade: ${periodos[0].titulo} (${ymd(periodos[0].inicio)} a ${ymd(periodos[0].fim)}).`
        : "Nenhum período de rentabilidade salvo ainda.",
      rentabilidadeMesCorrenteDetalhe
        ? `Período do mês corrente: ${rentabilidadeMesCorrenteDetalhe.periodo.titulo}; resultado R$ ${round2(rentabilidadeMesCorrenteDetalhe.totais.resultado)}.`
        : "Sem período de rentabilidade cadastrado para o mês corrente.",
      fichasErros > 0 ? `${fichasErros} ficha(s) não puderam ser calculadas no resumo.` : "",
    ].filter(Boolean);

    return {
      disponivel: true,
      insights,
      paginas: {
        "Custos — Painel CFO": insightsCfo,
        "Custos — Por variedade": { variedades: porVariedade },
        "Custos — Produtos vendidos": {
          fichas: fichasResumo,
          modelosProcesso: modelos.slice(0, 20).map((m) => ({
            id: m.id,
            nome: m.nome,
            familia: m.familia,
            padrao: m.isDefault,
          })),
          totalFichas: fichas.length,
        },
        "Custos — Comuns (rateio)": { rubricas: compartilhados },
        "Custos — Equipes MO": {
          modoMo,
          mapaHora: serializeMapaHora(mapaHora),
          equipes: equipesMo,
        },
        "Custos — Rentabilidade": {
          periodos: periodos.slice(0, 12).map((p) => ({
            id: p.id,
            titulo: p.titulo,
            inicio: ymd(p.inicio),
            fim: ymd(p.fim),
            mesCorrente: periodoCobreMes(p.inicio, p.fim),
          })),
          ultimoPeriodo: rentabilidadeUltimo,
          periodoMesCorrente: rentabilidadeMesCorrenteDetalhe,
          piorMargemMesCorrente: rentabilidadeMesCorrenteDetalhe
            ? rankingMargemRentabilidade(rentabilidadeMesCorrenteDetalhe.linhas).slice(0, 5)
            : null,
          resultadoPorProdutoMesCorrente: rentabilidadeMesCorrenteDetalhe?.linhas ?? null,
        },
      },
    };
  } catch (err) {
    return {
      disponivel: false,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function buildInteligenciaAssistantResumo(
  pid: number,
  enabled: boolean,
): Promise<ModuleAssistantResumo | null> {
  if (!enabled) return null;
  try {
    const alertas = await db.getAllAlerts(pid);
    const porStatus: Record<string, number> = {};
    const porSeveridade: Record<string, number> = {};
    for (const a of alertas) {
      porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
      porSeveridade[a.severidade] = (porSeveridade[a.severidade] ?? 0) + 1;
    }

    const abertos = alertas.filter((a) => a.status !== "resolvido" && a.status !== "ignorado");
    const lista = abertos
      .sort((a, b) => {
        const sev = { critica: 0, alta: 1, media: 2, baixa: 3 };
        const sa = sev[a.severidade as keyof typeof sev] ?? 9;
        const sb = sev[b.severidade as keyof typeof sev] ?? 9;
        return sa - sb || (a.prioridade ?? 99) - (b.prioridade ?? 99);
      })
      .slice(0, 35)
      .map((a) => ({
        id: a.id,
        titulo: a.titulo,
        severidade: a.severidade,
        status: a.status,
        entidade: a.entidadeNome ?? a.entidadeTipo,
        fase: a.fase,
        descricao: a.descricao?.slice(0, 240) ?? null,
        sugestaoAcao: a.sugestaoAcao?.slice(0, 160) ?? null,
      }));

    return {
      disponivel: true,
      insights: [
        `${abertos.length} alerta(s) aberto(s) de ${alertas.length} total.`,
        porSeveridade.critica || porSeveridade.alta
          ? `${(porSeveridade.critica ?? 0) + (porSeveridade.alta ?? 0)} alerta(s) crítico(s)/alto(s).`
          : "Nenhum alerta crítico/alto no momento.",
      ],
      paginas: {
        Inteligência: {
          porStatus,
          porSeveridade,
          alertasAbertos: lista,
        },
      },
    };
  } catch (err) {
    return {
      disponivel: false,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function buildVisaoAssistantResumo(
  pid: number,
  enabled: boolean,
): Promise<ModuleAssistantResumo | null> {
  if (!enabled) return null;
  try {
    const [analises, amostras] = await Promise.all([
      db.listVisionAnalyses(pid, 25),
      db.listVisionTrainingSamplesMeta(pid, 15),
    ]);

    const porRotulo = new Map<string, number>();
    for (const a of analises) {
      try {
        const json = typeof a.resultadoJson === "string" ? JSON.parse(a.resultadoJson) : a.resultadoJson;
        const rotulo = json?.rotuloPrincipal ?? json?.label ?? "outro";
        porRotulo.set(String(rotulo), (porRotulo.get(String(rotulo)) ?? 0) + 1);
      } catch {
        porRotulo.set("outro", (porRotulo.get("outro") ?? 0) + 1);
      }
    }

    return {
      disponivel: true,
      insights: [
        `${analises.length} análise(s) recente(s); ${amostras.length} amostra(s) de treino catalogada(s).`,
      ],
      paginas: {
        "Visão do cultivo": {
          analisesRecentes: analises.slice(0, 20).map((a) => ({
            id: a.id,
            torre: a.torreSlug,
            variedade: a.variedadeNome,
            criadaEm: a.createdAt?.toISOString?.()?.slice(0, 16) ?? null,
            notas: a.contextoNotas?.slice(0, 120) ?? null,
          })),
          distribuicaoRotulos: Object.fromEntries(porRotulo),
          amostrasTreino: amostras.slice(0, 10).map((s) => ({
            id: s.id,
            rotulo: s.rotuloPrincipal,
            split: s.splitTreino,
          })),
        },
      },
    };
  } catch (err) {
    return {
      disponivel: false,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildAutomacaoAssistantResumo(
  data: FullFazendaData,
  enabled: boolean,
): ModuleAssistantResumo | null {
  if (!enabled) return null;
  const ciclosAtivos = data.ciclos.filter((c) => c.ativo);
  const porTipo = new Map<string, number>();
  for (const c of data.ciclos) {
    porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + 1);
  }

  return {
    disponivel: true,
    insights: [
      `${ciclosAtivos.length} ciclo(s) ativo(s) de ${data.ciclos.length} cadastrado(s).`,
      `${data.medicoesCaixa.length} medição(ões) recente(s) de caixa d'água no resumo operacional.`,
    ],
    paginas: {
      Automação: {
        ciclosAtivos: ciclosAtivos.slice(0, 25).map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          produto: c.produto,
          alvo: c.alvo,
          dosagem: c.dosagem,
        })),
        ciclosPorTipo: Object.fromEntries(porTipo),
        medicoesCaixaRecentes: data.medicoesCaixa.slice(-6).map((m) => ({
          data: m.dataHora?.toISOString?.()?.slice(0, 16) ?? null,
          ph: m.ph,
          ec: m.ec,
        })),
      },
    },
  };
}
