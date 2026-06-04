import { z } from "zod";
import {
  GRUPOS_CUSTO_PRODUCAO,
  LABEL_GRUPO_CUSTO_PRODUCAO,
  MODOS_CUSTO_PRODUCAO,
  RATEIO_METODOS_CUSTOS,
  custoPorPlantaLinha,
  type GrupoCustoProducao,
  type ModoCustoProducao,
  type RateioMetodoCustos,
} from "@shared/custosProducao";
import type { CustoProducaoItemRow } from "../../drizzle/schema";
import * as db from "../db";
import {
  alocacaoRateioPorVariedade,
  custoDiretoPorPlantaPorVariedade,
  parcelasRateioParaVariedade,
} from "../custosProducaoRateio";
import {
  commercialEditorCustosProducaoProjectProcedure,
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import type { InsertCustoProducaoItem } from "../../drizzle/schema";

const grupoZ = z.enum(GRUPOS_CUSTO_PRODUCAO as unknown as [GrupoCustoProducao, ...GrupoCustoProducao[]]);
const modoZ = z.enum(MODOS_CUSTO_PRODUCAO as unknown as [ModoCustoProducao, ...ModoCustoProducao[]]);
const rateioMetodoZ = z.enum(
  RATEIO_METODOS_CUSTOS as unknown as [RateioMetodoCustos, ...RateioMetodoCustos[]],
);

function enrichLinha(row: CustoProducaoItemRow) {
  const { valor, detalhe } = custoPorPlantaLinha({
    modo: row.modo as ModoCustoProducao,
    precoReferencia: row.precoReferencia,
    quantidadePorPlanta: row.quantidadePorPlanta,
    valorPorPlanta: row.valorPorPlanta,
    valorPorCiclo: row.valorPorCiclo,
    plantasPorCicloEstimado: row.plantasPorCicloEstimado,
    valorMensal: row.valorMensal,
    plantasMesEstimativa: row.plantasMesEstimativa,
    ativo: row.ativo,
  });
  return { ...row, custoPorPlantaCalculado: valor, calculoDetalhe: detalhe };
}

const linhaInputBase = z.object({
  variedadeId: z.number().int().positive().optional().nullable(),
  grupo: grupoZ,
  rubrica: z.string().min(1).max(160),
  descricao: z.string().max(4000).optional().nullable(),
  modo: modoZ,
  rateioMetodo: rateioMetodoZ.optional().nullable(),
  rateioDiasColheita: z.number().int().min(1).max(730).optional().nullable(),
  precoReferencia: z.number().nonnegative().optional().nullable(),
  unidadeCompra: z.string().max(32).optional().nullable(),
  quantidadePorPlanta: z.number().nonnegative().optional().nullable(),
  valorPorPlanta: z.number().nonnegative().optional().nullable(),
  valorPorCiclo: z.number().nonnegative().optional().nullable(),
  plantasPorCicloEstimado: z.number().int().positive().optional().nullable(),
  valorMensal: z.number().nonnegative().optional().nullable(),
  plantasMesEstimativa: z.number().int().positive().optional().nullable(),
  ordem: z.number().int().optional(),
  ativo: z.boolean().optional(),
});

const linhaInput = linhaInputBase.superRefine((val, ctx) => {
  if (val.modo === "rateio_projeto") {
    if (val.variedadeId != null) {
      ctx.addIssue({
        code: "custom",
        message: "Rubrica com rateio entre variedades não deve ter variedade — deixe vazio.",
      });
    }
    if (val.rateioMetodo == null) {
      ctx.addIssue({ code: "custom", message: "Escolha o método de rateio entre variedades." });
    }
    if (val.valorMensal == null || val.valorMensal <= 0) {
      ctx.addIssue({ code: "custom", message: "Informe o valor mensal (R$) total desta rubrica." });
    }
  } else if (val.variedadeId == null) {
    /* Rubrica do projeto sem rateio — referência global; não entra no total por variedade. */
  } else {
    /* Rubrica ligada a uma variedade. */
  }
});

function payloadFromInput(pid: number, input: z.infer<typeof linhaInputBase>): InsertCustoProducaoItem {
  return {
    projetoId: pid,
    variedadeId: input.variedadeId ?? null,
    grupo: input.grupo,
    rubrica: input.rubrica,
    descricao: input.descricao ?? null,
    modo: input.modo,
    rateioMetodo: input.modo === "rateio_projeto" ? input.rateioMetodo ?? null : null,
    rateioDiasColheita: input.modo === "rateio_projeto" ? input.rateioDiasColheita ?? 30 : null,
    precoReferencia: input.precoReferencia != null ? String(input.precoReferencia) : null,
    unidadeCompra: input.unidadeCompra ?? null,
    quantidadePorPlanta: input.quantidadePorPlanta != null ? String(input.quantidadePorPlanta) : null,
    valorPorPlanta: input.valorPorPlanta != null ? String(input.valorPorPlanta) : null,
    valorPorCiclo: input.valorPorCiclo != null ? String(input.valorPorCiclo) : null,
    plantasPorCicloEstimado: input.plantasPorCicloEstimado ?? null,
    valorMensal: input.valorMensal != null ? String(input.valorMensal) : null,
    plantasMesEstimativa: input.plantasMesEstimativa ?? null,
    ordem: input.ordem ?? 0,
    ativo: input.ativo ?? true,
  };
}

export const custosProducaoRouter = router({
  resumo: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const [variedades, itens] = await Promise.all([db.getAllVariedades(pid), db.getAllCustosProducaoItens(pid)]);
    const ids = variedades.map((v) => v.id);
    const shared = itens.filter((r) => r.variedadeId == null);
    const [directMap, alocMensal, pop] = await Promise.all([
      Promise.resolve(custoDiretoPorPlantaPorVariedade(itens, ids)),
      alocacaoRateioPorVariedade(pid, ids, shared),
      db.getPlantasOcupadasPorVariedadeFromFuros(pid),
    ]);

    return variedades.map((v) => {
      const d = directMap.get(v.id) ?? { total: 0, incompletas: 0, linhas: 0 };
      const al = alocMensal.get(v.id) ?? 0;
      const po = Math.max(0, pop.get(v.id) ?? 0);
      const rateioPorPlanta = al > 0 && po > 0 ? al / po : al > 0 ? null : 0;
      const totalPorPlanta = d.total + (rateioPorPlanta ?? 0);
      return {
        variedadeId: v.id,
        variedadeNome: v.nome,
        diasCicloTotal: v.diasMudas + v.diasVegetativa + v.diasMaturacao,
        plantasOcupadasFuros: po,
        custoDiretoPorPlanta: d.total,
        custoRateioPorPlanta: rateioPorPlanta,
        custoRateioMensalReais: al,
        custoTotalPorPlanta: totalPorPlanta,
        linhasCadastradas: d.linhas,
        linhasActivasSemValor: d.incompletas,
      };
    });
  }),

  compartilhados: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const rows = await db.getCustosProducaoCompartilhados(pid);
    return rows.map(enrichLinha);
  }),

  basesRateio: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const variedades = await db.getAllVariedades(pid);
    const ids = variedades.map((v) => v.id);
    const [pop, col30, col90] = await Promise.all([
      db.getPlantasOcupadasPorVariedadeFromFuros(pid),
      db.getColheitaAggPorVariedade(pid, 30),
      db.getColheitaAggPorVariedade(pid, 90),
    ]);
    return {
      variedades: ids.map((id) => {
        const v = variedades.find((x) => x.id === id);
        const c30 = col30.get(id) ?? { kg: 0, plantas: 0 };
        const c90 = col90.get(id) ?? { kg: 0, plantas: 0 };
        return {
          variedadeId: id,
          variedadeNome: v?.nome ?? `#${id}`,
          plantasOcupadas: pop.get(id) ?? 0,
          colheitaKg30d: c30.kg,
          colheitaPlantas30d: c30.plantas,
          colheitaKg90d: c90.kg,
          colheitaPlantas90d: c90.plantas,
          kgPorPlantaColhida30d: c30.plantas > 0 ? c30.kg / c30.plantas : null,
        };
      }),
    };
  }),

  insightsCfo: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const [variedades, itens, col30, pop] = await Promise.all([
      db.getAllVariedades(pid),
      db.getAllCustosProducaoItens(pid),
      db.getColheitaAggPorVariedade(pid, 30),
      db.getPlantasOcupadasPorVariedadeFromFuros(pid),
    ]);
    let estoque: Awaited<ReturnType<typeof db.getAllEstoqueItens>> = [];
    try {
      estoque = await db.getAllEstoqueItens(pid);
    } catch {
      estoque = [];
    }
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
      return { id, total: d.total + rp, direct: d.total, incompletas: d.incompletas, al, po };
    });

    const totals = custosPorVar.map((c) => c.total).filter((t) => t > 0);
    const mediana =
      totals.length === 0
        ? 0
        : [...totals].sort((a, b) => a - b)[Math.floor(totals.length / 2)] ?? 0;

    const alertas: Array<{
      severidade: "alta" | "media" | "baixa";
      titulo: string;
      texto: string;
      acao?: string;
    }> = [];

    for (const c of custosPorVar) {
      if (c.total <= 0) continue;
      if (mediana > 0 && c.total >= mediana * 1.45) {
        const nome = variedades.find((v) => v.id === c.id)?.nome ?? "";
        alertas.push({
          severidade: "alta",
          titulo: `Custo / planta elevado: ${nome}`,
          texto: `Total estimado ~${(c.total / mediana).toFixed(2)}× a mediana das variedades. Revise insumos específicos, desperdício operacional ou rateio desproporcional.`,
          acao: "Abrir detalhe da variedade e comparar rubricas com uma variedade mais barata.",
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
        texto: `${incompletas} rubrica(s) diretas ativas sem valor por planta calculável — o comparativo fica distorcido.`,
        acao: "Completar preços/quantidades ou desativar linhas que ainda não aplicam.",
      });
    }

    const diasParaRateio = new Set<number>();
    for (const raw of shared) {
      if (raw.modo !== "rateio_projeto" || !raw.ativo) continue;
      const metodo = raw.rateioMetodo as RateioMetodoCustos | null;
      if (metodo === "colheita_kg" || metodo === "colheita_plantas") {
        diasParaRateio.add(raw.rateioDiasColheita ?? 30);
      }
    }
    const colheitaPorDias = new Map<number, Map<number, { kg: number; plantas: number }>>();
    for (const d of Array.from(diasParaRateio)) {
      colheitaPorDias.set(d, await db.getColheitaAggPorVariedade(pid, d));
    }

    for (const raw of shared) {
      if (raw.modo !== "rateio_projeto" || !raw.ativo) continue;
      const dias = raw.rateioDiasColheita ?? 30;
      const metodo = raw.rateioMetodo as RateioMetodoCustos | null;
      if (metodo === "colheita_kg" || metodo === "colheita_plantas") {
        const agg = colheitaPorDias.get(dias) ?? new Map();
        const soma = Array.from(agg.values()).reduce((a, x) => a + x.kg + x.plantas, 0);
        if (soma === 0) {
          alertas.push({
            severidade: "media",
            titulo: `Rateio «${raw.rubrica}» sem colheita na janela`,
            texto: `Método ${metodo} nos últimos ${dias}d sem dados — o sistema assume repartição igual entre variedades (pode não refletir a realidade).`,
            acao: "Registar colheitas no campo ou mudar o método de rateio / janela de dias.",
          });
        }
      }
    }

    for (const id of ids) {
      const po = pop.get(id) ?? 0;
      const c = col30.get(id) ?? { kg: 0, plantas: 0 };
      if (po >= 20 && c.plantas === 0 && c.kg === 0) {
        const nome = variedades.find((v) => v.id === id)?.nome ?? "";
        alertas.push({
          severidade: "baixa",
          titulo: `Ocupação sem colheita recente: ${nome}`,
          texto: `${po} plantas «plantado» mas sem colheita registrada nos últimos 30 dias — possível gargalo, ciclo longo ou falta de registro.`,
          acao: "Confirmar operação e disciplina de registro de colheita.",
        });
      }
    }

    const kgPorPlanta = ids
      .map((id) => {
        const c = col30.get(id) ?? { kg: 0, plantas: 0 };
        return { id, r: c.plantas > 0 ? c.kg / c.plantas : null };
      })
      .filter((x) => x.r != null && x.r > 0) as { id: number; r: number }[];
    if (kgPorPlanta.length >= 2) {
      const avg = kgPorPlanta.reduce((a, x) => a + x.r, 0) / kgPorPlanta.length;
      for (const row of kgPorPlanta) {
        if (row.r < avg * 0.55) {
          const nome = variedades.find((v) => v.id === row.id)?.nome ?? "";
          alertas.push({
            severidade: "media",
            titulo: `Rendimento colhido (kg/planta) abaixo da média: ${nome}`,
            texto: `~${((row.r / avg) * 100).toFixed(0)}% da média do projeto nos últimos 30 dias — pode indicar desperdício, genética, nutrição ou registro.`,
            acao: "Cruzar com receita, pH/EC e alertas de inteligência operacional.",
          });
        }
      }
    }

    const grupoAcc = new Map<string, number>();
    for (const i of itens) {
      if (!i.ativo) continue;
      if (i.variedadeId == null && i.modo === "rateio_projeto") {
        const vm = Number(i.valorMensal ?? 0);
        if (vm > 0) grupoAcc.set(i.grupo, (grupoAcc.get(i.grupo) ?? 0) + vm);
        continue;
      }
      if (i.variedadeId == null) continue;
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
      const n = (grupoAcc.get(i.grupo) ?? 0) + valor * Math.max(1, pop.get(i.variedadeId) ?? 1);
      grupoAcc.set(i.grupo, n);
    }
    const drivers = Array.from(grupoAcc.entries())
      .map(([grupo, valor]) => ({
        grupo,
        label: LABEL_GRUPO_CUSTO_PRODUCAO[grupo as GrupoCustoProducao] ?? grupo,
        valorAproximado: valor,
      }))
      .sort((a, b) => b.valorAproximado - a.valorAproximado)
      .slice(0, 6);

    const abaixoMin = estoque.filter(
      (e) => e.nivelMinimo != null && e.quantidadeTotal < e.nivelMinimo,
    );
    if (abaixoMin.length > 0) {
      alertas.push({
        severidade: "alta",
        titulo: "Insumos abaixo do mínimo no estoque",
        texto: `${abaixoMin.length} item(ns) com quantidade abaixo do nível mínimo — risco de paragem e compras de urgência (custo maior).`,
        acao: "Negociar prazo/preço com fornecedores ou ajustar ponto de encomenda.",
      });
    }

    const comPreco = estoque.filter((e) => e.precoUnitario != null && e.precoUnitario > 0);
    if (comPreco.length >= 3) {
      const soma = comPreco.reduce((a, e) => a + e.quantidadeTotal * (e.precoUnitario ?? 0), 0);
      alertas.push({
        severidade: "baixa",
        titulo: "Valor aproximado em stock",
        texto: `Inventário com preço registrado ≈ ${soma.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — use como ordem de grandeza para capital de giro (não substitui contabilidade).`,
        acao: "Manter preços de referência atualizados por SKU.",
      });
    }

    return {
      alertas: alertas.slice(0, 12),
      driversCusto: drivers,
      resumoMedianaPorPlanta: mediana,
    };
  }),

  porVariedade: custosProducaoModuleProcedure
    .input(z.object({ variedadeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const v = await db.getVariedadeById(pid, input.variedadeId);
      if (!v) return { variedade: undefined, itens: [] as ReturnType<typeof enrichLinha>[], parcelasRateio: [] };
      const [rows, variedades, shared] = await Promise.all([
        db.getCustosProducaoItensByVariedade(pid, input.variedadeId),
        db.getAllVariedades(pid),
        db.getCustosProducaoCompartilhados(pid),
      ]);
      const ids = variedades.map((x) => x.id);
      const parcelasRateio = await parcelasRateioParaVariedade(pid, input.variedadeId, ids, shared);
      return { variedade: v, itens: rows.map(enrichLinha), parcelasRateio };
    }),

  create: commercialEditorCustosProducaoProjectProcedure.input(linhaInput).mutation(async ({ ctx, input }) => {
    const pid = projetoIdFromCtx(ctx);
    if (input.variedadeId != null) {
      const row = await db.getVariedadeById(pid, input.variedadeId);
      if (!row) throw new Error("Variedade não encontrada");
    }
    const id = await db.insertCustoProducaoItem(payloadFromInput(pid, input));
    return { id };
  }),

  update: commercialEditorCustosProducaoProjectProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          variedadeId: z.number().int().positive().optional().nullable(),
          grupo: grupoZ.optional(),
          rubrica: z.string().min(1).max(160).optional(),
          descricao: z.string().max(4000).optional().nullable(),
          modo: modoZ.optional(),
          rateioMetodo: rateioMetodoZ.optional().nullable(),
          rateioDiasColheita: z.number().int().min(1).max(730).optional().nullable(),
          precoReferencia: z.number().nonnegative().optional().nullable(),
          unidadeCompra: z.string().max(32).optional().nullable(),
          quantidadePorPlanta: z.number().nonnegative().optional().nullable(),
          valorPorPlanta: z.number().nonnegative().optional().nullable(),
          valorPorCiclo: z.number().nonnegative().optional().nullable(),
          plantasPorCicloEstimado: z.number().int().positive().optional().nullable(),
          valorMensal: z.number().nonnegative().optional().nullable(),
          plantasMesEstimativa: z.number().int().positive().optional().nullable(),
          ordem: z.number().int().optional(),
          ativo: z.boolean().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.modo === "rateio_projeto" || (val.modo === undefined && val.rateioMetodo != null)) {
            if (val.variedadeId != null)
              ctx.addIssue({
                code: "custom",
                message: "Rubrica com rateio entre variedades não deve ter variedade.",
              });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const { id, ...rest } = input;
      const patch: Partial<InsertCustoProducaoItem> = {};
      if (rest.variedadeId !== undefined) patch.variedadeId = rest.variedadeId;
      if (rest.grupo != null) patch.grupo = rest.grupo;
      if (rest.rubrica != null) patch.rubrica = rest.rubrica;
      if (rest.descricao !== undefined) patch.descricao = rest.descricao;
      if (rest.modo != null) patch.modo = rest.modo;
      if (rest.rateioMetodo !== undefined) patch.rateioMetodo = rest.rateioMetodo;
      if (rest.rateioDiasColheita !== undefined) patch.rateioDiasColheita = rest.rateioDiasColheita;
      if (rest.precoReferencia !== undefined)
        patch.precoReferencia = rest.precoReferencia != null ? String(rest.precoReferencia) : null;
      if (rest.unidadeCompra !== undefined) patch.unidadeCompra = rest.unidadeCompra;
      if (rest.quantidadePorPlanta !== undefined)
        patch.quantidadePorPlanta = rest.quantidadePorPlanta != null ? String(rest.quantidadePorPlanta) : null;
      if (rest.valorPorPlanta !== undefined)
        patch.valorPorPlanta = rest.valorPorPlanta != null ? String(rest.valorPorPlanta) : null;
      if (rest.valorPorCiclo !== undefined)
        patch.valorPorCiclo = rest.valorPorCiclo != null ? String(rest.valorPorCiclo) : null;
      if (rest.plantasPorCicloEstimado !== undefined) patch.plantasPorCicloEstimado = rest.plantasPorCicloEstimado;
      if (rest.valorMensal !== undefined)
        patch.valorMensal = rest.valorMensal != null ? String(rest.valorMensal) : null;
      if (rest.plantasMesEstimativa !== undefined) patch.plantasMesEstimativa = rest.plantasMesEstimativa;
      if (rest.ordem !== undefined) patch.ordem = rest.ordem;
      if (rest.ativo !== undefined) patch.ativo = rest.ativo;
      if (rest.modo != null && rest.modo !== "rateio_projeto") {
        patch.rateioMetodo = null;
        patch.rateioDiasColheita = null;
      }
      await db.updateCustoProducaoItem(pid, id, patch);
      return { success: true };
    }),

  delete: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteCustoProducaoItem(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),
});
