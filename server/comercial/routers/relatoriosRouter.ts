import { z } from "zod";
import { OrigemPedido } from "../generated/prisma/index.js";
import { composicaoDoPedidoParaDashboard } from "../lib/composicao-valor.js";
import {
  classificarStatusPedido,
  pedidoContaOrcamento,
} from "../lib/pedido-status.js";
import { mesIsoAmericaSp } from "@shared/comercial/periodo-america-sp";
import { router, comercialProcedure } from "../../_core/trpc";

function n(v: unknown): number {
  const out = Number(v ?? 0);
  return Number.isFinite(out) ? out : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function diasDesde(data: Date | null): number | null {
  if (!data) return null;
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / 86_400_000));
}

function addMap<T>(map: Map<string, T>, key: string, init: () => T): T {
  const current = map.get(key);
  if (current) return current;
  const created = init();
  map.set(key, created);
  return created;
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
      })
    )
    .query(async ({ ctx, input }) => {
      const [pedidos, clientes] = await Promise.all([
        ctx.prisma!.pedido.findMany({
          where: {
            origemPedido: OrigemPedido.CONTA_AZUL,
            dataPedido: { gte: input.inicio, lte: input.fim },
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
        ctx.prisma!.cliente.findMany({
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
      const orcamentos = pedidos.filter(p =>
        pedidoContaOrcamento(p.statusPedido)
      );
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
        mes.valorLiquido += comp.valorLiquido;
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
          produtos: new Map(),
        }));
        clienteRow.vendas += 1;
        clienteRow.valorBruto += comp.valorBruto;
        clienteRow.valorLiquido += comp.valorLiquido;
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

      return {
        periodo: { inicio: input.inicio, fim: input.fim },
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
