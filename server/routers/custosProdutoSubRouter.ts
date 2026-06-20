import { z } from "zod";
import {
  CATEGORIAS_PRODUTO_CUSTO,
  TIPOS_COMPONENTE_CUSTO,
  TIPOS_ETAPA_PROCESSO,
  TIPOS_FICHA_CUSTO_PRODUTO,
  UNIDADES_VENDA_PRODUTO,
  calcularCustoProduto,
  type TipoComponenteCusto,
  type TipoEtapaProcesso,
  type TipoFichaCustoProduto,
} from "@shared/custosProduto";
import { REGIMES_MO_ETAPA, type RegimeMoEtapa } from "@shared/custosMoEquipe";
import {
  etapasProcessoPadraoParaProduto,
  inferirCategoriaProdutoCusto,
  type CustosProdutoProcessoConfig,
  type EtapaProcessoPadrao,
} from "@shared/custosProdutoProcessoPadrao";
import {
  commercialEditorCustosProducaoProjectProcedure,
  custosProducaoModuleProcedure,
  projetoIdFromCtx,
  router,
} from "../_core/trpc";
import * as custosProdutoDb from "../custosProdutoDb";
import * as processoDb from "../custosProdutoProcessoDb";
import { getComercialPrisma } from "../comercial/db";
import type {
  CustoProdutoComponenteRow,
  CustoProdutoEtapaRow,
  CustoProdutoFichaRow,
  InsertCustoProdutoFicha,
} from "../../drizzle/schema";
import {
  calcularFichaCompleta,
  catalogosCustosProduto,
  fichaParaCalculoInput,
} from "../custosProdutoResolver";

const tipoFichaZ = z.enum(TIPOS_FICHA_CUSTO_PRODUTO);
const categoriaZ = z.enum(CATEGORIAS_PRODUTO_CUSTO);
const unidadeZ = z.enum(UNIDADES_VENDA_PRODUTO);
const tipoCompZ = z.enum(TIPOS_COMPONENTE_CUSTO);
const tipoEtapaZ = z.enum(TIPOS_ETAPA_PROCESSO);
const regimeMoZ = z.enum(REGIMES_MO_ETAPA);

const processoConfigInput = z.object({
  embalagemMicroverdeUn: z.number().nonnegative(),
  embalagemOutrosUn: z.number().nonnegative(),
  lavagemMinutosUn: z.number().nonnegative().nullable().optional(),
  embalagemMinutosUn: z.number().nonnegative().nullable().optional(),
  corteMinutosUn: z.number().nonnegative().nullable().optional(),
  adesivoCustoUn: z.number().nonnegative().nullable().optional(),
  regimeMoPadrao: regimeMoZ.default("qualquer"),
  incluirLavagem: z.boolean().default(true),
  incluirCorte: z.boolean().default(false),
  incluirAdesivo: z.boolean().default(true),
});

function etapasPadraoParaDb(etapas: EtapaProcessoPadrao[]) {
  return etapas.map((e, i) => ({
    tipo: e.tipo as TipoEtapaProcesso,
    nome: e.nome,
    custoPorUnidade: String(e.custoPorUnidade),
    custoPorKgProcessado: e.custoPorKgProcessado != null ? String(e.custoPorKgProcessado) : null,
    custoPercentual: e.custoPercentual != null ? String(e.custoPercentual) : null,
    minutosPorUnidade: e.minutosPorUnidade != null ? String(e.minutosPorUnidade) : null,
    regimeMo: e.regimeMo,
    ordem: i,
  }));
}

function previewProcesso(config: CustosProdutoProcessoConfig) {
  return {
    microverde: etapasProcessoPadraoParaProduto("microverde", config),
    outros: etapasProcessoPadraoParaProduto("outros", config),
  };
}

const componenteInput = z.object({
  tipo: tipoCompZ,
  variedadeId: z.number().int().positive().optional().nullable(),
  estoqueItemId: z.number().int().positive().optional().nullable(),
  produtoComercialId: z.string().optional().nullable(),
  componenteFichaId: z.number().int().positive().optional().nullable(),
  nomeManual: z.string().max(200).optional().nullable(),
  quantidadePorUnidade: z.number().positive(),
  unidadeComponente: z.string().max(32).default("kg"),
  custoUnitarioManual: z.number().nonnegative().optional().nullable(),
  ordem: z.number().int().optional(),
});

const etapaInput = z.object({
  tipo: tipoEtapaZ,
  nome: z.string().min(1).max(160),
  custoPorUnidade: z.number().nonnegative().default(0),
  custoPorKgProcessado: z.number().nonnegative().optional().nullable(),
  custoPercentual: z.number().min(0).max(100).optional().nullable(),
  minutosPorUnidade: z.number().nonnegative().optional().nullable(),
  regimeMo: regimeMoZ.optional().default("qualquer"),
  ordem: z.number().int().optional(),
});

const fichaInput = z
  .object({
    id: z.number().int().positive().optional(),
    tipo: tipoFichaZ,
    categoria: categoriaZ.default("outros"),
    nome: z.string().min(1).max(200),
    produtoComercialId: z.string().max(64).optional().nullable(),
    unidadeVenda: unidadeZ.default("unidade"),
    precoVendaReferencia: z.number().nonnegative().optional().nullable(),
    precoCompraKg: z.number().nonnegative().optional().nullable(),
    kgBrutoPorUnidade: z.number().nonnegative().optional().nullable(),
    perdaLavagemPct: z.number().min(0).max(100).optional().nullable(),
    perdaDescasquePct: z.number().min(0).max(100).optional().nullable(),
    perdaSelecaoPct: z.number().min(0).max(100).optional().nullable(),
    variedadeId: z.number().int().positive().optional().nullable(),
    kgColhidoPorPlanta: z.number().nonnegative().optional().nullable(),
    kgProducaoPorUnidade: z.number().nonnegative().optional().nullable(),
    observacoes: z.string().max(4000).optional().nullable(),
    ordem: z.number().int().optional(),
    ativo: z.boolean().optional(),
    componentes: z.array(componenteInput).default([]),
    etapas: z.array(etapaInput).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === "mix" && val.componentes.length < 2) {
      ctx.addIssue({ code: "custom", message: "Mix exige ao menos 2 componentes." });
    }
    if (val.tipo === "revenda_processada") {
      if (val.precoCompraKg == null || val.kgBrutoPorUnidade == null) {
        ctx.addIssue({
          code: "custom",
          message: "Revenda processada exige preço de compra (R$/kg) e kg bruto por unidade.",
        });
      }
    }
    if (val.tipo === "producao_propria") {
      if (val.variedadeId == null || val.kgColhidoPorPlanta == null || val.kgProducaoPorUnidade == null) {
        ctx.addIssue({
          code: "custom",
          message: "Produção própria exige variedade, kg colhido/planta e kg usado por unidade.",
        });
      }
    }
  });

function fichaPayload(pid: number, input: z.infer<typeof fichaInput>): InsertCustoProdutoFicha {
  return {
    projetoId: pid,
    tipo: input.tipo as TipoFichaCustoProduto,
    categoria: input.categoria,
    nome: input.nome,
    produtoComercialId: input.produtoComercialId ?? null,
    unidadeVenda: input.unidadeVenda,
    precoVendaReferencia:
      input.precoVendaReferencia != null ? String(input.precoVendaReferencia) : null,
    precoCompraKg: input.precoCompraKg != null ? String(input.precoCompraKg) : null,
    kgBrutoPorUnidade: input.kgBrutoPorUnidade != null ? String(input.kgBrutoPorUnidade) : null,
    perdaLavagemPct: input.perdaLavagemPct != null ? String(input.perdaLavagemPct) : null,
    perdaDescasquePct: input.perdaDescasquePct != null ? String(input.perdaDescasquePct) : null,
    perdaSelecaoPct: input.perdaSelecaoPct != null ? String(input.perdaSelecaoPct) : null,
    variedadeId: input.variedadeId ?? null,
    kgColhidoPorPlanta: input.kgColhidoPorPlanta != null ? String(input.kgColhidoPorPlanta) : null,
    kgProducaoPorUnidade:
      input.kgProducaoPorUnidade != null ? String(input.kgProducaoPorUnidade) : null,
    observacoes: input.observacoes ?? null,
    ordem: input.ordem ?? 0,
    ativo: input.ativo ?? true,
  };
}

export const custosProdutoSubRouter = router({
  catalogos: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    return catalogosCustosProduto(projetoIdFromCtx(ctx));
  }),

  listarFichas: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const fichas = await custosProdutoDb.listCustosProdutoFichas(pid);
    const ids = fichas.map((f) => f.id);
    const [componentes, etapas] = await Promise.all([
      custosProdutoDb.listComponentesByFichaIds(ids),
      custosProdutoDb.listEtapasByFichaIds(ids),
    ]);
    const compByFicha = new Map<number, typeof componentes>();
    const etapByFicha = new Map<number, typeof etapas>();
    for (const c of componentes) {
      const arr = compByFicha.get(c.fichaId) ?? [];
      arr.push(c);
      compByFicha.set(c.fichaId, arr);
    }
    for (const e of etapas) {
      const arr = etapByFicha.get(e.fichaId) ?? [];
      arr.push(e);
      etapByFicha.set(e.fichaId, arr);
    }
    const itens = await Promise.all(
      fichas.map(async (f) => {
        const resultado = await calcularFichaCompleta(pid, f);
        return {
          ficha: f,
          componentes: compByFicha.get(f.id) ?? [],
          etapas: etapByFicha.get(f.id) ?? [],
          resultado,
        };
      }),
    );
    return itens;
  }),

  obterFicha: custosProducaoModuleProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const ficha = await custosProdutoDb.getCustoProdutoFichaById(pid, input.id);
      if (!ficha) return null;
      const [componentes, etapas] = await Promise.all([
        custosProdutoDb.listComponentesByFichaIds([ficha.id]),
        custosProdutoDb.listEtapasByFichaIds([ficha.id]),
      ]);
      const resultado = await calcularFichaCompleta(pid, ficha);
      return { ficha, componentes, etapas, resultado };
    }),

  salvarFicha: commercialEditorCustosProducaoProjectProcedure
    .input(fichaInput)
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const payload = fichaPayload(pid, input);
      let fichaId = input.id;
      if (fichaId) {
        await custosProdutoDb.updateCustoProdutoFicha(pid, fichaId, payload);
      } else {
        fichaId = await custosProdutoDb.insertCustoProdutoFicha(payload);
      }
      await custosProdutoDb.replaceComponentesEtapas(
        fichaId,
        input.componentes.map((c, i) => ({
          tipo: c.tipo as TipoComponenteCusto,
          variedadeId: c.variedadeId ?? null,
          estoqueItemId: c.estoqueItemId ?? null,
          produtoComercialId: c.produtoComercialId ?? null,
          componenteFichaId: c.componenteFichaId ?? null,
          nomeManual: c.nomeManual ?? null,
          quantidadePorUnidade: String(c.quantidadePorUnidade),
          unidadeComponente: c.unidadeComponente,
          custoUnitarioManual:
            c.custoUnitarioManual != null ? String(c.custoUnitarioManual) : null,
          ordem: c.ordem ?? i,
        })),
        input.etapas.map((e, i) => ({
          tipo: e.tipo as TipoEtapaProcesso,
          nome: e.nome,
          custoPorUnidade: String(e.custoPorUnidade),
          custoPorKgProcessado:
            e.custoPorKgProcessado != null ? String(e.custoPorKgProcessado) : null,
          custoPercentual:
            e.custoPercentual != null ? String(e.custoPercentual) : null,
          minutosPorUnidade:
            e.minutosPorUnidade != null ? String(e.minutosPorUnidade) : null,
          regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
          ordem: e.ordem ?? i,
        })),
      );
      const ficha = await custosProdutoDb.getCustoProdutoFichaById(pid, fichaId);
      if (!ficha) throw new Error("Ficha não encontrada após salvar");
      const resultado = await calcularFichaCompleta(pid, ficha);
      return { id: fichaId, resultado };
    }),

  excluirFicha: commercialEditorCustosProducaoProjectProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await custosProdutoDb.deleteCustoProdutoFicha(projetoIdFromCtx(ctx), input.id);
      return { success: true };
    }),

  simularCusto: custosProducaoModuleProcedure
    .input(fichaInput.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const payload = fichaPayload(pid, input);
      const fichaFake = {
        id: 0,
        projetoId: payload.projetoId,
        tipo: payload.tipo ?? input.tipo,
        categoria: payload.categoria ?? input.categoria,
        nome: payload.nome,
        produtoComercialId: payload.produtoComercialId ?? null,
        unidadeVenda: payload.unidadeVenda ?? input.unidadeVenda,
        precoVendaReferencia: payload.precoVendaReferencia ?? null,
        precoCompraKg: payload.precoCompraKg ?? null,
        kgBrutoPorUnidade: payload.kgBrutoPorUnidade ?? null,
        perdaLavagemPct: payload.perdaLavagemPct ?? null,
        perdaDescasquePct: payload.perdaDescasquePct ?? null,
        perdaSelecaoPct: payload.perdaSelecaoPct ?? null,
        variedadeId: payload.variedadeId ?? null,
        kgColhidoPorPlanta: payload.kgColhidoPorPlanta ?? null,
        kgProducaoPorUnidade: payload.kgProducaoPorUnidade ?? null,
        observacoes: payload.observacoes ?? null,
        ordem: payload.ordem ?? 0,
        ativo: payload.ativo ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies CustoProdutoFichaRow;
      const componentes: CustoProdutoComponenteRow[] = input.componentes.map((c, i) => ({
        id: i,
        fichaId: 0,
        tipo: c.tipo as TipoComponenteCusto,
        variedadeId: c.variedadeId ?? null,
        estoqueItemId: c.estoqueItemId ?? null,
        produtoComercialId: c.produtoComercialId ?? null,
        componenteFichaId: c.componenteFichaId ?? null,
        nomeManual: c.nomeManual ?? null,
        quantidadePorUnidade: String(c.quantidadePorUnidade),
        unidadeComponente: c.unidadeComponente,
        custoUnitarioManual:
          c.custoUnitarioManual != null ? String(c.custoUnitarioManual) : null,
        ordem: c.ordem ?? i,
      }));
      const etapas: CustoProdutoEtapaRow[] = input.etapas.map((e, i) => ({
        id: i,
        fichaId: 0,
        tipo: e.tipo as TipoEtapaProcesso,
        nome: e.nome,
        custoPorUnidade: String(e.custoPorUnidade),
        custoPorKgProcessado:
          e.custoPorKgProcessado != null ? String(e.custoPorKgProcessado) : null,
        custoPercentual:
          e.custoPercentual != null ? String(e.custoPercentual) : null,
        minutosPorUnidade:
          e.minutosPorUnidade != null ? String(e.minutosPorUnidade) : null,
        regimeMo: (e.regimeMo ?? "qualquer") as RegimeMoEtapa,
        ordem: e.ordem ?? i,
      }));
      const calcInput = await fichaParaCalculoInput(pid, fichaFake, componentes, etapas);
      const moEquipeDbMod = await import("../custosMoEquipeDb");
      const { mapMoEquipeRowToInput } = await import("../moEquipeMapper");
      const { mapaCustoHoraProcessamento } = await import("@shared/custosMoEquipe");
      const [equipesRows, modoMo] = await Promise.all([
        moEquipeDbMod.listMoEquipes(pid),
        moEquipeDbMod.getModoCustoMoEquipe(pid),
      ]);
      calcInput.custoHoraMo = mapaCustoHoraProcessamento(
        equipesRows.map(mapMoEquipeRowToInput),
        modoMo,
      );
      return calcularCustoProduto(calcInput);
    }),

  processoConfig: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const config = await processoDb.getProcessoConfig(projetoIdFromCtx(ctx));
    return { config, preview: previewProcesso(config) };
  }),

  salvarProcessoConfig: commercialEditorCustosProducaoProjectProcedure
    .input(processoConfigInput)
    .mutation(async ({ ctx, input }) => {
      const config = await processoDb.setProcessoConfig(projetoIdFromCtx(ctx), {
        embalagemMicroverdeUn: input.embalagemMicroverdeUn,
        embalagemOutrosUn: input.embalagemOutrosUn,
        lavagemMinutosUn: input.lavagemMinutosUn ?? null,
        embalagemMinutosUn: input.embalagemMinutosUn ?? null,
        corteMinutosUn: input.corteMinutosUn ?? null,
        adesivoCustoUn: input.adesivoCustoUn ?? null,
        regimeMoPadrao: input.regimeMoPadrao,
        incluirLavagem: input.incluirLavagem,
        incluirCorte: input.incluirCorte,
        incluirAdesivo: input.incluirAdesivo,
      });
      return { config, preview: previewProcesso(config) };
    }),

  produtosSemFicha: custosProducaoModuleProcedure.query(async ({ ctx }) => {
    const pid = projetoIdFromCtx(ctx);
    const fichas = await custosProdutoDb.listCustosProdutoFichas(pid);
    const comFicha = new Set(
      fichas.filter((f) => f.produtoComercialId).map((f) => f.produtoComercialId as string),
    );
    try {
      const prisma = getComercialPrisma();
      const produtos = await prisma.produtoComercial.findMany({
        where: { ativo: true, importadoOperacao: true },
        select: { id: true, nome: true, sku: true, precoBase: true, categoria: true },
        orderBy: { nome: "asc" },
      });
      return produtos
        .filter((p) => !comFicha.has(p.id))
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          sku: p.sku,
          precoBase: p.precoBase != null ? Number(p.precoBase) : null,
          categoria: p.categoria,
          categoriaCusto: inferirCategoriaProdutoCusto(p.nome, p.categoria),
        }));
    } catch {
      return [];
    }
  }),

  gerarFichasContaAzul: commercialEditorCustosProducaoProjectProcedure
    .input(
      z.object({
        produtoIds: z.array(z.string().min(1)).optional(),
        sobrescreverEtapas: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pid = projetoIdFromCtx(ctx);
      const config = await processoDb.getProcessoConfig(pid);
      const prisma = getComercialPrisma();
      const [produtos, fichas] = await Promise.all([
        prisma.produtoComercial.findMany({
          where: { ativo: true, importadoOperacao: true },
          select: { id: true, nome: true, sku: true, precoBase: true, categoria: true },
          orderBy: { nome: "asc" },
        }),
        custosProdutoDb.listCustosProdutoFichas(pid),
      ]);
      const fichaPorProduto = new Map(
        fichas.filter((f) => f.produtoComercialId).map((f) => [f.produtoComercialId as string, f]),
      );
      const alvo =
        input.produtoIds && input.produtoIds.length > 0
          ? produtos.filter((p) => input.produtoIds!.includes(p.id))
          : produtos.filter((p) => !fichaPorProduto.has(p.id));

      let inseridos = 0;
      let atualizados = 0;
      const nomes: string[] = [];

      for (const p of alvo) {
        const categoria = inferirCategoriaProdutoCusto(p.nome, p.categoria);
        const etapas = etapasPadraoParaDb(etapasProcessoPadraoParaProduto(categoria, config));
        const prev = fichaPorProduto.get(p.id);

        if (prev) {
          if (!input.sobrescreverEtapas) continue;
          await custosProdutoDb.replaceComponentesEtapas(prev.id, [], etapas);
          atualizados += 1;
          nomes.push(p.nome);
          continue;
        }

        const fichaId = await custosProdutoDb.insertCustoProdutoFicha({
          projetoId: pid,
          tipo: "manual",
          categoria,
          nome: p.nome.trim(),
          produtoComercialId: p.id,
          unidadeVenda: "unidade",
          precoVendaReferencia: p.precoBase != null ? String(p.precoBase) : null,
          observacoes:
            "Ficha gerada do Conta Azul. Complete matéria-prima (produção própria ou revenda) — processo industrial veio do modelo comum.",
          ordem: 0,
          ativo: true,
        });
        await custosProdutoDb.replaceComponentesEtapas(fichaId, [], etapas);
        fichaPorProduto.set(p.id, { id: fichaId } as (typeof fichas)[number]);
        inseridos += 1;
        nomes.push(p.nome);
      }

      return { inseridos, atualizados, nomes, totalAlvo: alvo.length };
    }),
});
