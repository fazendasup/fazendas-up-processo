import { z } from "zod";
import { OrigemPedido, StatusRelacionamento } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "../lib/composicao-valor.js";
import {
  classificarStatusPedido,
  pedidoContaOrcamento,
} from "../lib/pedido-status.js";
import { composicaoGerencialDoPedido, mapDescontoBoletoPorClienteId } from "../lib/valor-gerencial.js";
import { mesIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import { router, comercialProcedure } from "../../_core/trpc";
import {
  addMap,
  curvaAbc,
  n,
  periodoAnterior,
  round2,
  variacaoPct,
} from "../services/relatorios-calculos.js";

function diasDesde(data: Date | null): number | null {
  if (!data) return null;
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / 86_400_000));
}

type ClienteAgg = {
  clienteId: string;
  cliente: string;
  tipoCliente: string;
  situacao: string;
  vendas: number;
  valorBruto: number;
  valorLiquido: number;
  quantidadeItens: number;
  custoTotal: number;
  custoQtd: number;
  produtos: Map<string, { produto: string; quantidade: number; valorBruto: number }>;
};

type PedidoRelatorio = {
  clienteId: string;
  statusPedido: string;
  itens: Array<{
    produto: string;
    quantidade: unknown;
    precoUnit: unknown;
    custoUnit?: unknown | null;
  }>;
  cliente: {
    nome: string;
    tipo: string;
    statusRelacionamento: string;
  };
};

const clienteSituacaoFiltroSchema = z
  .enum(["TODOS", "ATIVOS", "INATIVOS"])
  .default("TODOS");

type ClienteSituacaoFiltro = z.infer<typeof clienteSituacaoFiltroSchema>;

function clienteWherePorSituacao(filtro: ClienteSituacaoFiltro) {
  if (filtro === "ATIVOS") {
    return {
      statusRelacionamento: { not: StatusRelacionamento.INATIVO },
    };
  }
  if (filtro === "INATIVOS") {
    return {
      statusRelacionamento: StatusRelacionamento.INATIVO,
    };
  }
  return undefined;
}

function agregarVendasPorCliente(pedidos: PedidoRelatorio[]) {
  const map = new Map<string, ClienteAgg>();
  const produtoGlobal = new Map<string, number>();

  for (const p of pedidos.filter(
    row => classificarStatusPedido(row.statusPedido) === "venda"
  )) {
    const comp = composicaoDoPedidoParaDashboard(
      p as unknown as Parameters<typeof composicaoDoPedidoParaDashboard>[0]
    );
    const qtdPedido = p.itens.reduce(
      (sum: number, item) => sum + n(item.quantidade),
      0
    );
    const row = addMap(map, p.clienteId, () => ({
      clienteId: p.clienteId,
      cliente: p.cliente.nome,
      tipoCliente: p.cliente.tipo,
      situacao: p.cliente.statusRelacionamento,
      vendas: 0,
      valorBruto: 0,
      valorLiquido: 0,
      quantidadeItens: 0,
      custoTotal: 0,
      custoQtd: 0,
      produtos: new Map(),
    }));
    row.vendas += 1;
    row.valorBruto += comp.valorBruto;
    row.valorLiquido += comp.valorLiquido;
    row.quantidadeItens += qtdPedido;

    for (const item of p.itens) {
      const quantidade = n(item.quantidade);
      const valorTotal = n(item.quantidade) * n(item.precoUnit);
      const custo =
        item.custoUnit != null ? n(item.quantidade) * n(item.custoUnit) : null;
      produtoGlobal.set(
        item.produto,
        (produtoGlobal.get(item.produto) ?? 0) + valorTotal
      );
      const prod = addMap(row.produtos, item.produto, () => ({
        produto: item.produto,
        quantidade: 0,
        valorBruto: 0,
      }));
      prod.quantidade += quantidade;
      prod.valorBruto += valorTotal;
      if (custo != null) {
        row.custoTotal += custo;
        row.custoQtd += quantidade;
      }
    }
  }

  return { map, produtoGlobal };
}

function itemValorBruto(item: {
  quantidade: unknown;
  precoUnit: unknown;
}): number {
  return n(item.quantidade) * n(item.precoUnit);
}

function itemCustoTotal(item: {
  quantidade: unknown;
  custoUnit?: unknown | null;
}): number | null {
  if (item.custoUnit == null) return null;
  return n(item.quantidade) * n(item.custoUnit);
}

export const relatoriosRouter = router({
  resumo: comercialProcedure
    .input(
      z.object({
        inicio: z.coerce.date(),
        fim: z.coerce.date(),
        clienteSituacao: clienteSituacaoFiltroSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const prev = periodoAnterior(input.inicio, input.fim);
      const clienteSituacaoWhere = clienteWherePorSituacao(input.clienteSituacao);
      const clientePedidoWhere = clienteSituacaoWhere
        ? { cliente: { is: clienteSituacaoWhere } }
        : {};
      const [pedidos, pedidosAnterior, clientes] = await Promise.all([
        ctx.prisma!.pedido.findMany({
          where: {
            origemPedido: OrigemPedido.CONTA_AZUL,
            dataPedido: { gte: input.inicio, lte: input.fim },
            ...clientePedidoWhere,
          },
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                tipo: true,
                statusRelacionamento: true,
                cnpjCpf: true,
                emailPrincipal: true,
                telefoneWhatsapp: true,
                endereco: true,
              },
            },
            itens: true,
          },
          orderBy: { dataPedido: "desc" },
        }),
        ctx.prisma!.pedido.findMany({
          where: {
            origemPedido: OrigemPedido.CONTA_AZUL,
            dataPedido: { gte: prev.inicio, lte: prev.fim },
            ...clientePedidoWhere,
          },
          include: {
            cliente: {
              select: {
                id: true,
                nome: true,
                tipo: true,
                statusRelacionamento: true,
              },
            },
            itens: true,
          },
        }),
        ctx.prisma!.cliente.findMany({
          where: clienteSituacaoWhere,
          select: {
            id: true,
            nome: true,
            tipo: true,
            statusRelacionamento: true,
            cnpjCpf: true,
            emailPrincipal: true,
            telefoneWhatsapp: true,
            endereco: true,
            pedidos: {
              where: { origemPedido: OrigemPedido.CONTA_AZUL },
              select: { dataPedido: true, statusPedido: true },
              orderBy: { dataPedido: "desc" },
              take: 1,
            },
          },
          orderBy: { nome: "asc" },
        }),
      ]);

      const vendas = pedidos.filter(
        p => classificarStatusPedido(p.statusPedido) === "venda"
      );
      let primeiraVenda: Date | null = null;
      let ultimaVenda: Date | null = null;
      for (const p of vendas) {
        if (!primeiraVenda || p.dataPedido < primeiraVenda) primeiraVenda = p.dataPedido;
        if (!ultimaVenda || p.dataPedido > ultimaVenda) ultimaVenda = p.dataPedido;
      }
      const orcamentos = pedidos.filter(p =>
        pedidoContaOrcamento(p.statusPedido)
      );
      const descontoPorCliente = await mapDescontoBoletoPorClienteId(ctx.prisma!);
      let valorLiquidoContaAzul = 0;
      let descontoBoletoTotal = 0;
      const vendasPorCliente = new Map<
        string,
        {
          clienteId: string;
          cliente: string;
          tipoCliente: string;
          situacao: string;
          vendas: number;
          valorBruto: number;
          valorLiquido: number;
          quantidadeItens: number;
          custoTotal: number;
          custoQtd: number;
          produtos: Map<
            string,
            { produto: string; quantidade: number; valorBruto: number }
          >;
        }
      >();
      const cmvPorProduto = new Map<
        string,
        {
          produto: string;
          categoria: string | null;
          quantidade: number;
          custoTotal: number;
          custoQtd: number;
          valorBruto: number;
          vendas: number;
        }
      >();
      const meses = new Map<
        string,
        {
          mes: string;
          vendas: number;
          quantidadeItens: number;
          custoTotal: number;
          custoQtd: number;
          valorBruto: number;
          valorLiquido: number;
          frete: number;
          desconto: number;
        }
      >();

      const produtosVendidosDetalhados: Array<{
        pedidoId: string;
        cliente: string;
        dataVenda: Date;
        tipoItem: string;
        produto: string;
        categoria: string | null;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
        descontoAplicado: number;
      }> = [];

      const vendasDetalhadas = vendas.map(p => {
        const comp = composicaoDoPedidoParaDashboard(p);
        const pct = descontoPorCliente.get(p.clienteId) ?? 0;
        const gerencial = composicaoGerencialDoPedido(comp, pct);
        valorLiquidoContaAzul += comp.valorLiquido;
        descontoBoletoTotal += gerencial.descontoBoletoValor;
        const qtdPedido = p.itens.reduce(
          (sum, item) => sum + n(item.quantidade),
          0
        );
        const mes = addMap(meses, mesIsoAmericaSp(p.dataPedido), () => ({
          mes: mesIsoAmericaSp(p.dataPedido),
          vendas: 0,
          quantidadeItens: 0,
          custoTotal: 0,
          custoQtd: 0,
          valorBruto: 0,
          valorLiquido: 0,
          frete: 0,
          desconto: 0,
        }));
        mes.vendas += 1;
        mes.quantidadeItens += qtdPedido;
        mes.valorBruto += comp.valorBruto;
        mes.valorLiquido += gerencial.valorGerencial;
        mes.frete += comp.valorFrete;
        mes.desconto += comp.valorDesconto;

        const clienteRow = addMap(vendasPorCliente, p.clienteId, () => ({
          clienteId: p.clienteId,
          cliente: p.cliente.nome,
          tipoCliente: p.cliente.tipo,
          situacao: p.cliente.statusRelacionamento,
          vendas: 0,
          valorBruto: 0,
          valorLiquido: 0,
          quantidadeItens: 0,
          custoTotal: 0,
          custoQtd: 0,
          produtos: new Map(),
        }));
        clienteRow.vendas += 1;
        clienteRow.valorBruto += comp.valorBruto;
        clienteRow.valorLiquido += gerencial.valorGerencial;
        clienteRow.quantidadeItens += qtdPedido;

        for (const item of p.itens) {
          const quantidade = n(item.quantidade);
          const valorTotal = itemValorBruto(item);
          const custoTotal = itemCustoTotal(item);
          const produtoCliente = addMap(
            clienteRow.produtos,
            item.produto,
            () => ({
              produto: item.produto,
              quantidade: 0,
              valorBruto: 0,
            })
          );
          produtoCliente.quantidade += quantidade;
          produtoCliente.valorBruto += valorTotal;
          if (custoTotal != null) {
            clienteRow.custoTotal += custoTotal;
            clienteRow.custoQtd += quantidade;
          }

          const produtoCmv = addMap(cmvPorProduto, item.produto, () => ({
            produto: item.produto,
            categoria: item.categoria,
            quantidade: 0,
            custoTotal: 0,
            custoQtd: 0,
            valorBruto: 0,
            vendas: 0,
          }));
          produtoCmv.quantidade += quantidade;
          produtoCmv.valorBruto += valorTotal;
          produtoCmv.vendas += 1;
          if (custoTotal != null) {
            produtoCmv.custoTotal += custoTotal;
            produtoCmv.custoQtd += quantidade;
            mes.custoTotal += custoTotal;
            mes.custoQtd += quantidade;
          }

          produtosVendidosDetalhados.push({
            pedidoId: p.id,
            cliente: p.cliente.nome,
            dataVenda: p.dataPedido,
            tipoItem: "PRODUTO",
            produto: item.produto,
            categoria: item.categoria,
            quantidade,
            valorUnitario: n(item.precoUnit),
            valorTotal,
            descontoAplicado:
              p.itens.length > 0 ? comp.valorDesconto / p.itens.length : 0,
          });
        }

        return {
          id: p.id,
          cliente: p.cliente.nome,
          vendedor: "Não sincronizado",
          dataVenda: p.dataPedido,
          status: p.statusPedido,
          valorBruto: comp.valorBruto,
          valorLiquido: comp.valorLiquido,
          frete: comp.valorFrete,
          desconto: comp.valorDesconto,
          quantidadeItens: qtdPedido,
        };
      });

      const vendasPorClienteRows = Array.from(vendasPorCliente.values())
        .map(row => ({
          ...row,
          ticketMedio: row.vendas > 0 ? row.valorLiquido / row.vendas : 0,
          produtos: Array.from(row.produtos.values())
            .sort((a, b) => b.valorBruto - a.valorBruto)
            .slice(0, 5),
        }))
        .sort((a, b) => b.valorBruto - a.valorBruto);

      const cmvRows = Array.from(cmvPorProduto.values())
        .map(row => {
          const custoMedio =
            row.custoQtd > 0 ? row.custoTotal / row.custoQtd : null;
          const valorUnitarioMedio =
            row.quantidade > 0 ? row.valorBruto / row.quantidade : 0;
          const lucroBruto =
            custoMedio == null ? null : row.valorBruto - row.custoTotal;
          return {
            produto: row.produto,
            categoria: row.categoria,
            quantidade: row.quantidade,
            custoMedio,
            custoTotal: row.custoQtd > 0 ? row.custoTotal : null,
            valorBruto: row.valorBruto,
            valorUnitarioMedio,
            lucroBruto,
            margemLucro:
              lucroBruto == null || row.valorBruto <= 0
                ? null
                : lucroBruto / row.valorBruto,
          };
        })
        .sort((a, b) => b.valorBruto - a.valorBruto);

      const mesesRows = Array.from(meses.values())
        .map(row => {
          const lucroBruto =
            row.custoQtd > 0 ? row.valorLiquido - row.custoTotal : null;
          return {
            ...row,
            custoMedio: row.custoQtd > 0 ? row.custoTotal / row.custoQtd : null,
            custoTotal: row.custoQtd > 0 ? row.custoTotal : null,
            lucroBruto,
            margemLucro:
              lucroBruto == null || row.valorLiquido <= 0
                ? null
                : lucroBruto / row.valorLiquido,
          };
        })
        .sort((a, b) => a.mes.localeCompare(b.mes));

      const aggAtual = agregarVendasPorCliente(pedidos);
      const aggAnterior = agregarVendasPorCliente(pedidosAnterior);

      const totalBrutoAtual = vendas.reduce(
        (sum, p) => sum + composicaoDoPedidoParaDashboard(p).valorBruto,
        0
      );
      const totalBrutoAnterior = pedidosAnterior
        .filter(p => classificarStatusPedido(p.statusPedido) === "venda")
        .reduce(
          (sum, p) => sum + composicaoDoPedidoParaDashboard(p).valorBruto,
          0
        );
      const totalLiquidoAtual = vendas.reduce((sum, p) => {
        const comp = composicaoDoPedidoParaDashboard(p);
        const pct = descontoPorCliente.get(p.clienteId) ?? 0;
        return sum + composicaoGerencialDoPedido(comp, pct).valorGerencial;
      }, 0);
      const totalLiquidoAnterior = pedidosAnterior
        .filter(p => classificarStatusPedido(p.statusPedido) === "venda")
        .reduce(
          (sum, p) => sum + composicaoDoPedidoParaDashboard(p).valorLiquido,
          0
        );

      const abcClientes = curvaAbc(
        vendasPorClienteRows.map(r => ({
          id: r.clienteId,
          nome: r.cliente,
          valor: r.valorLiquido,
        }))
      );
      const abcProdutos = curvaAbc(
        cmvRows.map(r => ({
          id: r.produto,
          nome: r.produto,
          valor: r.valorBruto,
        }))
      );

      const margemPorCliente = vendasPorClienteRows
        .map(row => {
          const lucro =
            row.custoQtd > 0 ? row.valorLiquido - row.custoTotal : null;
          return {
            clienteId: row.clienteId,
            cliente: row.cliente,
            valorBruto: round2(row.valorBruto),
            valorLiquido: round2(row.valorLiquido),
            custoTotal: row.custoQtd > 0 ? round2(row.custoTotal) : null,
            lucroBruto: lucro == null ? null : round2(lucro),
            margemLucro:
              lucro == null || row.valorLiquido <= 0
                ? null
                : round2(lucro / row.valorLiquido),
            vendas: row.vendas,
            ticketMedio: round2(row.ticketMedio),
          };
        })
        .sort((a, b) => (b.lucroBruto ?? 0) - (a.lucroBruto ?? 0));

      const produtosPopulares = Array.from(aggAtual.produtoGlobal.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([produto]) => produto);

      const mixProdutosCliente = vendasPorClienteRows.slice(0, 40).map(row => {
        const comprados = new Set(row.produtos.map(p => p.produto));
        const oportunidades = produtosPopulares
          .filter(produto => !comprados.has(produto))
          .slice(0, 5);
        return {
          clienteId: row.clienteId,
          cliente: row.cliente,
          valorBruto: round2(row.valorBruto),
          topProdutos: row.produtos.map(p => p.produto).join(", "),
          oportunidadesCrossSell: oportunidades,
        };
      });

      const clientesRisco = Array.from(aggAnterior.map.entries())
        .map(([clienteId, prevRow]) => {
          const atual = aggAtual.map.get(clienteId);
          const valorAnterior = prevRow.valorLiquido;
          const valorAtual = atual?.valorLiquido ?? 0;
          const vendasAnterior = prevRow.vendas;
          const vendasAtual = atual?.vendas ?? 0;
          if (valorAnterior < 300) return null;

          const quedaValor = variacaoPct(valorAtual, valorAnterior);
          const parouComprar = vendasAtual === 0 && vendasAnterior > 0;
          const quedaForte =
            quedaValor != null && quedaValor <= -0.35 && valorAtual > 0;
          const score =
            (parouComprar ? 50 : 0) +
            (quedaForte ? 35 : 0) +
            (quedaValor != null && quedaValor <= -0.2 ? 15 : 0);

          if (score < 35) return null;

          let motivo = "Queda de faturamento";
          if (parouComprar) motivo = "Parou de comprar no período";
          else if (quedaForte) motivo = "Queda forte vs período anterior";

          return {
            clienteId,
            cliente: prevRow.cliente,
            valorAnterior: round2(valorAnterior),
            valorAtual: round2(valorAtual),
            vendasAnterior,
            vendasAtual,
            variacaoValor: quedaValor,
            score,
            motivo,
            acaoSugerida: parouComprar
              ? "Reativar com contato comercial"
              : "Oferecer mix complementar ou condição especial",
          };
        })
        .filter((r): r is NonNullable<typeof r> => r != null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 80);

      return {
        periodo: { inicio: input.inicio, fim: input.fim },
        periodoAnterior: prev,
        comparacaoPeriodo: {
          vendas: {
            atual: vendas.length,
            anterior: pedidosAnterior.filter(
              p => classificarStatusPedido(p.statusPedido) === "venda"
            ).length,
            variacao: variacaoPct(
              vendas.length,
              pedidosAnterior.filter(
                p => classificarStatusPedido(p.statusPedido) === "venda"
              ).length
            ),
          },
          valorBruto: {
            atual: round2(totalBrutoAtual),
            anterior: round2(totalBrutoAnterior),
            variacao: variacaoPct(totalBrutoAtual, totalBrutoAnterior),
          },
          valorLiquido: {
            atual: round2(totalLiquidoAtual),
            anterior: round2(totalLiquidoAnterior),
            variacao: variacaoPct(totalLiquidoAtual, totalLiquidoAnterior),
          },
          valorLiquidoContaAzul: round2(valorLiquidoContaAzul),
          descontoBoletoTotal: round2(descontoBoletoTotal),
          clientesAtivos: {
            atual: vendasPorCliente.size,
            anterior: aggAnterior.map.size,
            variacao: variacaoPct(
              vendasPorCliente.size,
              aggAnterior.map.size
            ),
          },
        },
        abcClientes,
        abcProdutos,
        margemPorCliente,
        mixProdutosCliente,
        clientesRisco,
        disponibilidade: {
          cmv: cmvRows.some(r => r.custoTotal != null),
          impostos: false,
          contratos: false,
          servicos: false,
          vendedor: false,
          notasFiscais: false,
        },
        vendasPorCliente: vendasPorClienteRows,
        cmv: {
          linhas: cmvRows,
          totalCusto: cmvRows.reduce((sum, r) => sum + (r.custoTotal ?? 0), 0),
          totalBruto: cmvRows.reduce((sum, r) => sum + r.valorBruto, 0),
        },
        clientesSemVendas: clientes
          .map(c => {
            const ultima =
              c.pedidos.find(
                p => classificarStatusPedido(p.statusPedido) === "venda"
              )?.dataPedido ?? null;
            return {
              id: c.id,
              cliente: c.nome,
              tipo: c.tipo,
              situacao: c.statusRelacionamento,
              ultimaVenda: ultima,
              diasSemVenda: diasDesde(ultima),
            };
          })
          .sort(
            (a, b) => (b.diasSemVenda ?? 99999) - (a.diasSemVenda ?? 99999)
          ),
        lucroMargemMes: mesesRows,
        maioresClientes: vendasPorClienteRows.map(row => ({
          clienteId: row.clienteId,
          cliente: row.cliente,
          vendas: row.vendas,
          situacao: row.situacao,
          tipoItem: row.produtos[0]?.produto ?? "PRODUTO",
          valorBruto: row.valorBruto,
          valorLiquido: row.valorLiquido,
          totalVendido: row.quantidadeItens,
          ticketMedio: row.ticketMedio,
        })),
        impostos: {
          linhas: [],
          observacao:
            "A Conta Azul não está sincronizando nota fiscal e tributos detalhados (PIS, Cofins, ISS, ICMS, IRRF) para a base comercial.",
        },
        clientes: clientes.map(c => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          situacao: c.statusRelacionamento,
          cnpjCpf: c.cnpjCpf,
          email: c.emailPrincipal,
          telefone: c.telefoneWhatsapp,
          endereco: c.endereco,
        })),
        cobertura: {
          primeiraVenda,
          ultimaVenda,
          vendas: vendas.length,
          linhasProduto: produtosVendidosDetalhados.length,
        },
        vendasDetalhadas,
        produtosVendidosDetalhados: produtosVendidosDetalhados.sort(
          (a, b) => b.dataVenda.getTime() - a.dataVenda.getTime()
        ),
        servicosPrestados: {
          linhas: [],
          observacao:
            "Serviços prestados não estão sincronizados separadamente; os itens disponíveis foram classificados como produtos.",
        },
        situacaoCustoMargemMes: mesesRows,
        contratos: {
          linhas: [],
          observacao:
            "Contratos não estão sincronizados na base comercial atual.",
        },
        orcamentos: orcamentos.map(p => {
          const comp = composicaoDoPedidoParaDashboard(p);
          return {
            id: p.id,
            cliente: p.cliente.nome,
            dataOrcamento: p.dataPedido,
            status: p.statusPedido,
            valorBruto: comp.valorBruto,
          };
        }),
        financeiraClienteServico: {
          linhas: [],
          observacao:
            "Valores em aberto, pagos e vencidos por serviço dependem de títulos/contratos/serviços da Conta Azul, ainda não sincronizados.",
        },
        vendasPorMes: mesesRows.map(m => ({
          mes: m.mes,
          valorBruto: m.valorBruto,
          valorLiquido: m.valorLiquido,
          frete: m.frete,
          desconto: m.desconto,
        })),
        vendasPorVendedor: {
          linhas: [],
          observacao:
            "Vendedor não está persistido no pedido comercial; a API retorna esse campo no detalhe, mas ainda não foi modelado localmente.",
        },
      };
    }),
});
