import { precoVendaMedio } from "@shared/custosPrecoVendaMedio";
import { PRODUTO_VENDA_SEM_ITENS_CHAVE } from "@shared/custosRentabilidadeVendasCa";
import { buscarVendasContaAzulPorPeriodo } from "./custosRentabilidadeContaAzul";
import * as custosProdutoDb from "./custosProdutoDb";

export type PrecoVendaMedioCaDetalhe = {
  fichaId: number;
  produtoNome: string;
  quantidade: number;
  receitaTotal: number;
  precoMedio: number;
  atualizado: boolean;
};

export type SincronizarPrecoVendaReferenciaResultado = {
  periodo: { inicio: Date; fim: Date };
  fichasComVenda: number;
  atualizados: number;
  detalhes: PrecoVendaMedioCaDetalhe[];
};

function precoGravadoDiferente(atual: unknown, novo: number): boolean {
  const n = Number(atual);
  if (!Number.isFinite(n)) return true;
  return Math.abs(n - novo) >= 0.005;
}

export async function sincronizarPrecoVendaReferenciaDasVendas(
  projetoId: number,
  inicio: Date,
  fim: Date,
): Promise<SincronizarPrecoVendaReferenciaResultado> {
  const vendas = await buscarVendasContaAzulPorPeriodo(projetoId, inicio, fim);
  const fichas = await custosProdutoDb.listCustosProdutoFichas(projetoId);
  const fichaPorId = new Map(fichas.map((f) => [f.id, f]));

  const detalhes: PrecoVendaMedioCaDetalhe[] = [];
  let atualizados = 0;

  for (const p of vendas.produtos) {
    if (p.chave === PRODUTO_VENDA_SEM_ITENS_CHAVE) continue;
    if (p.fichaId == null) continue;

    const preco = precoVendaMedio(p.receitaTotal, p.quantidade);
    if (preco == null) continue;

    const ficha = fichaPorId.get(p.fichaId);
    if (!ficha) continue;
    if ((ficha.precoVendaReferenciaModo ?? "automatico") === "manual") continue;

    const atualizado = precoGravadoDiferente(ficha.precoVendaReferencia, preco);
    if (atualizado) {
      await custosProdutoDb.updateCustoProdutoFicha(projetoId, p.fichaId, {
        precoVendaReferencia: String(preco),
      });
      ficha.precoVendaReferencia = String(preco);
      atualizados += 1;
    }

    detalhes.push({
      fichaId: p.fichaId,
      produtoNome: p.produtoNome,
      quantidade: p.quantidade,
      receitaTotal: p.receitaTotal,
      precoMedio: preco,
      atualizado,
    });
  }

  detalhes.sort((a, b) => b.receitaTotal - a.receitaTotal);

  return {
    periodo: { inicio, fim },
    fichasComVenda: detalhes.length,
    atualizados,
    detalhes,
  };
}
