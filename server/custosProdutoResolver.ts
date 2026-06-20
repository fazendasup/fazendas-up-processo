import type { ComponenteCalculoInput, EtapaCalculoInput, FichaCalculoInput } from "@shared/custosProduto";
import { calcularCustoProduto } from "@shared/custosProduto";
import { mapaCustoHoraProcessamento, type MoEquipeInput } from "@shared/custosMoEquipe";
import type {
  CustoProdutoComponenteRow,
  CustoProdutoEtapaRow,
  CustoProdutoFichaRow,
} from "../drizzle/schema";
import { getComercialPrisma } from "./comercial/db";
import * as db from "./db";
import { custoDiretoPorPlantaPorVariedade } from "./custosProducaoRateio";
import * as moEquipeDb from "./custosMoEquipeDb";
import { mapMoEquipeRowToInput } from "./moEquipeMapper";

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function mapaCustoPorVariedade(projetoId: number): Promise<Map<number, number>> {
  const [variedades, itens] = await Promise.all([
    db.getAllVariedades(projetoId),
    db.getAllCustosProducaoItens(projetoId),
  ]);
  const ids = variedades.map((v) => v.id);
  const direct = custoDiretoPorPlantaPorVariedade(itens, ids);
  const shared = itens.filter((r) => r.variedadeId == null);
  const { alocacaoRateioPorVariedade } = await import("./custosProducaoRateio");
  const aloc = await alocacaoRateioPorVariedade(projetoId, ids, shared);
  const pop = await db.getPlantasOcupadasPorVariedadeFromFuros(projetoId);
  const out = new Map<number, number>();
  for (const id of ids) {
    const d = direct.get(id)?.total ?? 0;
    const al = aloc.get(id) ?? 0;
    const po = Math.max(0, pop.get(id) ?? 0);
    const rateio = al > 0 && po > 0 ? al / po : 0;
    out.set(id, d + rateio);
  }
  return out;
}

async function resolveCustoUnitarioComponente(
  projetoId: number,
  row: CustoProdutoComponenteRow,
  custoVariedade: Map<number, number>,
  fichaCustoCache: Map<number, number | null>,
): Promise<{ nome: string; custoUnitario: number | null }> {
  const nome =
    row.nomeManual ??
    (row.tipo === "variedade" && row.variedadeId != null
      ? `Variedade #${row.variedadeId}`
      : row.tipo === "estoque" && row.estoqueItemId != null
        ? `Estoque #${row.estoqueItemId}`
        : row.tipo === "produto_comercial" && row.produtoComercialId
          ? `Produto ${row.produtoComercialId}`
          : "Componente");

  if (row.tipo === "manual") {
    return { nome, custoUnitario: num(row.custoUnitarioManual) };
  }
  if (row.tipo === "variedade" && row.variedadeId != null) {
    const cpp = custoVariedade.get(row.variedadeId) ?? null;
    const variedade = await db.getVariedadeById(projetoId, row.variedadeId);
    const label = variedade?.nome ?? nome;
    if (cpp == null) return { nome: label, custoUnitario: null };
    const col = await db.getColheitaAggPorVariedade(projetoId, 90);
    const agg = col.get(row.variedadeId);
    const kgPlanta = agg && agg.plantas > 0 ? agg.kg / agg.plantas : null;
    const un = row.unidadeComponente.toLowerCase();
    if (un === "planta" || un === "unidade") {
      return { nome: label, custoUnitario: cpp };
    }
    if (kgPlanta != null && kgPlanta > 0) {
      return { nome: label, custoUnitario: cpp / kgPlanta };
    }
    return { nome: label, custoUnitario: cpp };
  }
  if (row.tipo === "estoque" && row.estoqueItemId != null) {
    const item = await db.getEstoqueItemById(projetoId, row.estoqueItemId);
    if (!item) return { nome, custoUnitario: null };
    return { nome: item.nome, custoUnitario: item.precoUnitario };
  }
  if (row.tipo === "produto_comercial" && row.produtoComercialId) {
    try {
      const custosDb = await import("./custosProdutoDb");
      const fichas = await custosDb.listCustosProdutoFichas(projetoId);
      const linked = fichas.find((f) => f.produtoComercialId === row.produtoComercialId);
      if (linked) {
        const calc = await calcularFichaCompleta(projetoId, linked);
        return {
          nome: linked.nome,
          custoUnitario: calc.custoPorUnidade,
        };
      }
      const prisma = getComercialPrisma();
      const p = await prisma.produtoComercial.findUnique({
        where: { id: row.produtoComercialId },
        select: { nome: true },
      });
      return { nome: p?.nome ?? nome, custoUnitario: null };
    } catch {
      return { nome, custoUnitario: null };
    }
  }
  if (row.tipo === "ficha" && row.componenteFichaId != null) {
    if (!fichaCustoCache.has(row.componenteFichaId)) {
      const ficha = await import("./custosProdutoDb").then((m) =>
        m.getCustoProdutoFichaById(projetoId, row.componenteFichaId!),
      );
      if (!ficha) {
        fichaCustoCache.set(row.componenteFichaId, null);
      } else {
        const calc = await calcularFichaCompleta(projetoId, ficha);
        fichaCustoCache.set(row.componenteFichaId, calc.custoPorUnidade);
      }
    }
    return { nome: `Ficha #${row.componenteFichaId}`, custoUnitario: fichaCustoCache.get(row.componenteFichaId) ?? null };
  }
  return { nome, custoUnitario: null };
}

export async function fichaParaCalculoInput(
  projetoId: number,
  ficha: CustoProdutoFichaRow,
  componentes: CustoProdutoComponenteRow[],
  etapas: CustoProdutoEtapaRow[],
): Promise<FichaCalculoInput> {
  const custoVariedade = await mapaCustoPorVariedade(projetoId);
  const fichaCache = new Map<number, number | null>();
  const componentesCalculo: ComponenteCalculoInput[] = [];
  for (const c of componentes) {
    const resolved = await resolveCustoUnitarioComponente(projetoId, c, custoVariedade, fichaCache);
    componentesCalculo.push({
      tipo: c.tipo as ComponenteCalculoInput["tipo"],
      nome: resolved.nome,
      quantidadePorUnidadeFinal: num(c.quantidadePorUnidade) ?? 0,
      unidadeComponente: c.unidadeComponente,
      custoUnitario: resolved.custoUnitario,
    });
  }
  const etapasCalculo: EtapaCalculoInput[] = etapas.map((e) => ({
    tipo: e.tipo as EtapaCalculoInput["tipo"],
    nome: e.nome,
    custoPorUnidadeFinal: num(e.custoPorUnidade) ?? 0,
    custoPorKgProcessado: num(e.custoPorKgProcessado),
    custoPercentual: num(e.custoPercentual),
    minutosPorUnidade: num(e.minutosPorUnidade),
    regimeMo: (e.regimeMo ?? "qualquer") as EtapaCalculoInput["regimeMo"],
  }));

  const variedadeId = ficha.variedadeId;
  const custoVp =
    variedadeId != null ? (custoVariedade.get(variedadeId) ?? null) : null;

  return {
    tipo: ficha.tipo as FichaCalculoInput["tipo"],
    unidadeVenda: ficha.unidadeVenda as FichaCalculoInput["unidadeVenda"],
    precoVendaReferencia: num(ficha.precoVendaReferencia),
    precoCompraKg: num(ficha.precoCompraKg),
    custoCompraUn: num(ficha.custoCompraUn),
    modoCompraMp: (ficha.modoCompraMp ?? "kg") as FichaCalculoInput["modoCompraMp"],
    kgBrutoPorUnidade: num(ficha.kgBrutoPorUnidade),
    perdaLavagemPct: num(ficha.perdaLavagemPct) ?? 0,
    perdaDescasquePct: num(ficha.perdaDescasquePct) ?? 0,
    perdaSelecaoPct: num(ficha.perdaSelecaoPct) ?? 0,
    custoVariedadePorPlanta: custoVp,
    kgColhidoPorPlanta: num(ficha.kgColhidoPorPlanta),
    kgProducaoPorUnidade: num(ficha.kgProducaoPorUnidade),
    componentes: componentesCalculo,
    etapas: etapasCalculo,
  };
}

export async function calcularFichaCompleta(projetoId: number, ficha: CustoProdutoFichaRow) {
  const { listComponentesByFichaIds, listEtapasByFichaIds } = await import("./custosProdutoDb");
  const moEquipeDb = await import("./custosMoEquipeDb");
  const [componentes, etapas, equipesRows, modoMo] = await Promise.all([
    listComponentesByFichaIds([ficha.id]),
    listEtapasByFichaIds([ficha.id]),
    moEquipeDb.listMoEquipes(projetoId),
    moEquipeDb.getModoCustoMoEquipe(projetoId),
  ]);
  const equipes: MoEquipeInput[] = equipesRows.map(mapMoEquipeRowToInput);
  const input = await fichaParaCalculoInput(projetoId, ficha, componentes, etapas);
  input.custoHoraMo = mapaCustoHoraProcessamento(equipes, modoMo);
  return calcularCustoProduto(input);
}

export async function catalogosCustosProduto(projetoId: number) {
  const [variedades, estoque, custoVar] = await Promise.all([
    db.getAllVariedades(projetoId),
    db.getAllEstoqueItens(projetoId),
    mapaCustoPorVariedade(projetoId),
  ]);
  let produtosComerciais: Array<{ id: string; nome: string; precoBase: number | null; categoria: string | null }> =
    [];
  try {
    const prisma = getComercialPrisma();
    const rows = await prisma.produtoComercial.findMany({
      where: { ativo: true, importadoOperacao: true },
      select: { id: true, nome: true, precoBase: true, categoria: true },
      orderBy: { nome: "asc" },
      take: 500,
    });
    produtosComerciais = rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      precoBase: r.precoBase != null ? Number(r.precoBase) : null,
      categoria: r.categoria,
    }));
  } catch {
    produtosComerciais = [];
  }
  return {
    variedades: variedades.map((v) => ({
      id: v.id,
      nome: v.nome,
      custoPorPlanta: custoVar.get(v.id) ?? null,
    })),
    estoque: estoque.map((e) => ({
      id: e.id,
      nome: e.nome,
      categoria: e.categoria,
      precoUnitario: e.precoUnitario,
      unidadeTipo: e.unidadeTipo,
    })),
    produtosComerciais,
  };
}
