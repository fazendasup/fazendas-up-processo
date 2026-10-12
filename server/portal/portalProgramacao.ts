import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { MIN_ORDER_RECORRENTE_REAIS, entregaPermitida } from "./portalCalendario";
import { LojaErro, produtoVisivelNaLoja } from "./portalLoja";
import {
  diaDaData,
  ocorrenciasDaProgramacao,
  validarProgramacao,
  type DiaProgramado,
} from "./programacaoRecorrente";

const OBSERVACAO = "Programação recorrente pelo site.";

export type ItemProgramacao = {
  produtoId: string;
  nome: string;
  quantidade: number;
  preco: number | null;
};

export type ProgramacaoCliente = {
  minimoReais: number;
  dias: Array<{ diaSemana: number; itens: ItemProgramacao[] }>;
  proximas: Array<{ data: string; diaSemana: number; total: number }>;
};

function dinheiro(valor: unknown): number | null {
  if (valor == null) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100) / 100;
}

function ymdManaus(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function instanteDaEntrega(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

async function precosDoCliente(prisma: PrismaClient, contaAzulCustomerId: string | null) {
  if (!contaAzulCustomerId) return new Map<string, number>();
  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId },
    include: { precosEspeciais: true },
  });
  const mapa = new Map<string, number>();
  for (const item of regra?.precosEspeciais ?? []) {
    const preco = dinheiro(item.preco);
    if (preco != null) mapa.set(item.produtoId, preco);
  }
  return mapa;
}

export async function lerProgramacao(
  prisma: PrismaClient,
  clienteId: string,
  contaAzulId: string | null,
  now = new Date(),
): Promise<ProgramacaoCliente> {
  const programacao = await prisma.portalProgramacao.findUnique({
    where: { clienteId },
    include: {
      dias: {
        orderBy: { diaSemana: "asc" },
        include: { itens: { include: { produto: true } } },
      },
    },
  });
  const especiais = await precosDoCliente(prisma, contaAzulId);
  const dias = (programacao?.dias ?? []).map((dia) => ({
    diaSemana: dia.diaSemana,
    itens: dia.itens.map((item) => ({
      produtoId: item.produtoId,
      nome: item.produto.nome,
      quantidade: Number(item.quantidade),
      preco: especiais.get(item.produtoId) ?? dinheiro(item.produto.precoBase),
    })),
  }));
  const proximas = ocorrenciasDaProgramacao(
    dias.map((dia) => dia.diaSemana),
    now,
  ).map((ocorrencia) => {
    const dia = dias.find((item) => item.diaSemana === ocorrencia.diaSemana);
    const total = (dia?.itens ?? []).reduce((soma, item) => soma + (item.preco ?? 0) * item.quantidade, 0);
    return {
      data: ocorrencia.data,
      diaSemana: ocorrencia.diaSemana,
      total: Math.round(total * 100) / 100,
    };
  });
  return { minimoReais: MIN_ORDER_RECORRENTE_REAIS, dias, proximas };
}

export async function salvarProgramacao(
  prisma: PrismaClient,
  clienteId: string,
  contaAzulId: string,
  dias: DiaProgramado[],
  now = new Date(),
) {
  const erro = validarProgramacao(dias);
  if (erro) throw new LojaErro(400, erro);

  const ids = Array.from(new Set(dias.flatMap((dia) => dia.itens.map((item) => item.produtoId))));
  const produtos = await prisma.produtoComercial.findMany({
    where: {
      id: { in: ids },
      ativo: true,
      visivelPortal: true,
      importadoOperacao: true,
      contaAzulProdutoId: { not: null },
    },
  });
  if (produtos.length !== ids.length) throw new LojaErro(400, "Um ou mais produtos não estão disponíveis.");
  const porId = new Map(produtos.map((produto) => [produto.id, produto]));
  const especiais = await precosDoCliente(prisma, contaAzulId);
  if (
    produtos.some(
      (produto) =>
        !produtoVisivelNaLoja({
          visivel: produto.visivelPortal,
          exclusivo: produto.exclusivoPortal,
          temPrecoEspecial: especiais.has(produto.id),
          logado: true,
        }),
    )
  ) {
    throw new LojaErro(400, "Um ou mais produtos não estão disponíveis.");
  }

  const linhasPorDia = new Map<
    number,
    Array<{
      produtoId: string;
      produtoNome: string;
      categoria: string | null;
      quantidade: number;
      preco: number;
      especial: boolean;
    }>
  >();
  for (const dia of dias) {
    let total = 0;
    const linhas = dia.itens.map((item) => {
      const produto = porId.get(item.produtoId)!;
      const especial = especiais.get(produto.id);
      const preco = especial ?? dinheiro(produto.precoBase);
      if (preco == null || preco <= 0) throw new LojaErro(400, "Há produto sem preço.");
      total += preco * item.quantidade;
      return {
        produtoId: produto.id,
        produtoNome: produto.nome,
        categoria: produto.categoria,
        quantidade: item.quantidade,
        preco,
        especial: especial != null,
      };
    });
    if (Math.round(total * 100) / 100 < MIN_ORDER_RECORRENTE_REAIS) {
      throw new LojaErro(
        400,
        `Cada dia de entrega precisa chegar a R$ ${MIN_ORDER_RECORRENTE_REAIS.toFixed(2).replace(".", ",")}.`,
      );
    }
    linhasPorDia.set(dia.diaSemana, linhas);
  }

  const ocorrencias = ocorrenciasDaProgramacao(
    dias.map((dia) => dia.diaSemana),
    now,
  );
  const desejadas = new Set(ocorrencias.map((item) => item.data));

  const resumo = await prisma.$transaction(
    async (tx) => {
      const programacao = await tx.portalProgramacao.upsert({
        where: { clienteId },
        create: { clienteId },
        update: {},
      });
      await tx.portalProgramacaoDia.deleteMany({ where: { programacaoId: programacao.id } });
      for (const dia of dias) {
        await tx.portalProgramacaoDia.create({
          data: {
            programacaoId: programacao.id,
            diaSemana: dia.diaSemana,
            itens: {
              create: dia.itens.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade.toFixed(3),
              })),
            },
          },
        });
      }

      const links = await tx.portalProgramacaoEntrega.findMany({
        where: { programacaoId: programacao.id },
        include: { pedido: { select: { id: true, status: true, dataEntrega: true } } },
      });
      const porData = new Map(links.map((link) => [ymdManaus(link.dataEntrega), link]));
      let criadas = 0;
      let atualizadas = 0;
      let mantidas = 0;
      let canceladas = 0;

      for (const ocorrencia of ocorrencias) {
        const linhas = linhasPorDia.get(ocorrencia.diaSemana) ?? [];
        const link = porData.get(ocorrencia.data);
        if (link) {
          if (link.pedido.status !== "PENDENTE" || !entregaPermitida(ocorrencia.data, now)) {
            mantidas += 1;
            continue;
          }
          await tx.pedidoOperacionalItem.deleteMany({ where: { pedidoId: link.pedidoId } });
          await tx.pedidoOperacionalItem.createMany({
            data: linhas.map((linha) => ({
              pedidoId: link.pedidoId,
              produtoId: linha.produtoId,
              produtoNome: linha.produtoNome,
              categoria: linha.categoria,
              quantidade: linha.quantidade.toFixed(3),
              precoUnit: linha.preco.toFixed(2),
              precoEspecial: linha.especial,
            })),
          });
          await tx.pedidoOperacional.update({
            where: { id: link.pedidoId },
            data: {
              tipoVenda: "RECORRENTE_SEMANAL",
              observacoes: OBSERVACAO,
              diaSemana: diaDaData(ocorrencia.data),
            },
          });
          atualizadas += 1;
          continue;
        }
        const pedido = await tx.pedidoOperacional.create({
          data: {
            clienteId,
            contaAzulCustomerId: contaAzulId,
            dataEntrega: instanteDaEntrega(ocorrencia.data),
            diaSemana: diaDaData(ocorrencia.data),
            tipoVenda: "RECORRENTE_SEMANAL",
            observacoes: OBSERVACAO,
            itens: {
              create: linhas.map((linha) => ({
                produtoId: linha.produtoId,
                produtoNome: linha.produtoNome,
                categoria: linha.categoria,
                quantidade: linha.quantidade.toFixed(3),
                precoUnit: linha.preco.toFixed(2),
                precoEspecial: linha.especial,
              })),
            },
          },
        });
        await tx.portalProgramacaoEntrega.create({
          data: {
            programacaoId: programacao.id,
            dataEntrega: instanteDaEntrega(ocorrencia.data),
            pedidoId: pedido.id,
          },
        });
        criadas += 1;
      }

      for (const link of links) {
        const data = ymdManaus(link.dataEntrega);
        if (desejadas.has(data)) continue;
        if (link.pedido.status !== "PENDENTE" || !entregaPermitida(data, now)) {
          mantidas += 1;
          continue;
        }
        await tx.pedidoOperacional.update({
          where: { id: link.pedidoId },
          data: { status: "CANCELADO" },
        });
        canceladas += 1;
      }

      return { criadas, atualizadas, mantidas, canceladas };
    },
    { timeout: 20000 },
  );

  const leitura = await lerProgramacao(prisma, clienteId, contaAzulId, now);
  return { ...leitura, ...resumo };
}
