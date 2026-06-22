import { OrigemPedido } from "../generated/prisma/index.js";
import type { PrismaClient } from "../generated/prisma/index.js";
import {
  calcularConciliacaoSemanal,
  type ClienteConciliacaoSemanal,
} from "./conciliacao-semanal.js";
import {
  calcularDivergenciasAgregadas,
  carregarProdutosConciliacao,
  clienteAcumulaFaturamento,
  confirmarVinculoConciliacao,
  confirmarVinculoMultiploConciliacao,
  documentoContaAzulConciliavel,
  janelaCandidatosVinculo,
  pedidoCriadoAPartirDoContaAzul,
  reconciliarDivergenciasAcumuloEsperadas,
  scoreSugestaoVinculo,
} from "./conciliacao-pedidos.js";
import { criarResolverChaveItemConciliacao } from "./produto-operacional.js";

type UsuarioReparo = { id: string; nome: string };

export type ResultadoReparoConciliacaoSemana = {
  vinculosMultiplos: number;
  vinculosSimples: number;
  acumulaHabilitados: number;
  conciliacao: Awaited<ReturnType<typeof calcularConciliacaoSemanal>>;
  pendentes: ClienteConciliacaoSemanal[];
};

/** Vincula entregas manuais ao faturamento CA quando o agregado bate (clientes acumuladores). */
export async function autoVincularAcumuloSemana(
  prisma: PrismaClient,
  inicio: Date,
  fim: Date,
  usuario: UsuarioReparo,
): Promise<number> {
  const produtos = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtos);

  const vendas = await prisma.pedido.findMany({
    where: {
      origemPedido: OrigemPedido.CONTA_AZUL,
      dataPedido: { gte: inicio, lte: fim },
    },
    include: {
      cliente: {
        select: {
          externalId: true,
          regraComercial: {
            select: { acumulaPedidos: true, diasAcumulo: true },
          },
        },
      },
      itens: true,
    },
  });

  let vinculos = 0;
  for (const venda of vendas) {
    if (!documentoContaAzulConciliavel(venda)) continue;
    const regra = venda.cliente.regraComercial;
    if (!clienteAcumulaFaturamento(regra)) continue;

    const contaAzulCustomerId = venda.cliente.externalId;
    if (!contaAzulCustomerId) continue;

    const janela = janelaCandidatosVinculo({
      dataPedido: venda.dataPedido,
      acumula: true,
      diasAcumulo: regra?.diasAcumulo,
    });

    const candidatos = await prisma.pedidoOperacional.findMany({
      where: {
        contaAzulCustomerId,
        status: { not: "CANCELADO" },
        dataEntrega: { gte: janela.inicio, lte: janela.fim },
        OR: [{ pedidoContaAzulId: null }, { pedidoContaAzulId: venda.id }],
      },
      include: { itens: true },
      orderBy: { dataEntrega: "asc" },
    });

    const manuais = candidatos.filter((op) => !pedidoCriadoAPartirDoContaAzul(op));
    if (manuais.length === 0) continue;

    const jaVinculados = manuais.every((op) => op.pedidoContaAzulId === venda.id);
    if (jaVinculados) continue;

    const divergencias = calcularDivergenciasAgregadas(
      manuais,
      { ...venda, cliente: { ...venda.cliente, regraComercial: regra } },
      resolverChave,
    );
    if (divergencias.length > 0) continue;

    await confirmarVinculoMultiploConciliacao(prisma, {
      pedidoOperacionalIds: manuais.map((op) => op.id),
      pedidoContaAzulId: venda.id,
      usuario,
      observacoes: "Reparo automático — acumulado bate com venda CA.",
    });
    vinculos += manuais.length;
  }
  return vinculos;
}

/** Habilita acumulaPedidos quando há padrão 2+ entregas / 1 venda CA na semana. */
export async function habilitarAcumuloDetectadoSemana(
  prisma: PrismaClient,
  inicio: Date,
  fim: Date,
): Promise<number> {
  const conciliacao = await calcularConciliacaoSemanal(prisma, inicio, fim);
  let alterados = 0;
  for (const c of conciliacao.clientes) {
    if (c.status !== "divergente") continue;
    if (c.operacional.pedidos < 2 || c.contaAzul.pedidos !== 1) continue;
    const ratioUn =
      c.contaAzul.unidades > 0 ? c.operacional.unidades / c.contaAzul.unidades : 0;
    if (ratioUn < 1.8 || ratioUn > 2.2) continue;

    const regra = await prisma.regraComercialCliente.findUnique({
      where: { contaAzulCustomerId: c.contaAzulCustomerId },
    });
    if (regra?.acumulaPedidos) continue;

    await prisma.regraComercialCliente.upsert({
      where: { contaAzulCustomerId: c.contaAzulCustomerId },
      create: {
        contaAzulCustomerId: c.contaAzulCustomerId,
        acumulaPedidos: true,
        diasAcumulo: 15,
      },
      update: { acumulaPedidos: true },
    });
    alterados += 1;
  }
  return alterados;
}

/** Vínculo 1:1 quando score alto e divergências zeradas. */
export async function autoVincularSimplesSemana(
  prisma: PrismaClient,
  inicio: Date,
  fim: Date,
  usuario: UsuarioReparo,
): Promise<number> {
  const produtos = await carregarProdutosConciliacao(prisma);
  const resolverChave = criarResolverChaveItemConciliacao(produtos);

  const operacionais = await prisma.pedidoOperacional.findMany({
    where: {
      dataEntrega: { gte: inicio, lte: fim },
      status: { not: "CANCELADO" },
      pedidoContaAzulId: null,
      statusConciliacao: { in: ["PLANEJADO", "VINCULO_SUGERIDO"] },
    },
    include: {
      itens: true,
      cliente: { select: { regraComercial: { select: { acumulaPedidos: true } } } },
    },
  });

  const vendas = await prisma.pedido.findMany({
    where: {
      origemPedido: OrigemPedido.CONTA_AZUL,
      dataPedido: { gte: inicio, lte: fim },
    },
    include: {
      cliente: { select: { externalId: true, regraComercial: true } },
      itens: true,
      pedidosOperacionaisVinculo: { select: { id: true } },
    },
  });

  let vinculos = 0;
  for (const op of operacionais) {
    if (clienteAcumulaFaturamento(op.cliente?.regraComercial)) continue;
    if (pedidoCriadoAPartirDoContaAzul(op)) continue;

    let melhor: { venda: (typeof vendas)[0]; score: number } | null = null;
    for (const venda of vendas) {
      if (!documentoContaAzulConciliavel(venda)) continue;
      if ((venda.pedidosOperacionaisVinculo?.length ?? 0) > 0) continue;
      const ext = venda.cliente.externalId;
      if (ext && op.contaAzulCustomerId !== ext) continue;
      const score = scoreSugestaoVinculo(op, venda, resolverChave);
      if (score >= 85 && (!melhor || score > melhor.score)) {
        melhor = { venda, score };
      }
    }
    if (!melhor) continue;

    try {
      await confirmarVinculoConciliacao(prisma, {
        pedidoOperacionalId: op.id,
        pedidoContaAzulId: melhor.venda.id,
        usuario,
        observacoes: "Reparo automático — vínculo sugerido confirmado.",
      });
      vinculos += 1;
    } catch {
      /* já vinculado ou bloqueado */
    }
  }
  return vinculos;
}

export async function repararConciliacaoSemana(
  prisma: PrismaClient,
  inicio: Date,
  fim: Date,
  usuario: UsuarioReparo,
): Promise<ResultadoReparoConciliacaoSemana> {
  const acumulaHabilitados = await habilitarAcumuloDetectadoSemana(prisma, inicio, fim);
  let vinculosMultiplos = await autoVincularAcumuloSemana(prisma, inicio, fim, usuario);
  if (acumulaHabilitados > 0) {
    vinculosMultiplos += await autoVincularAcumuloSemana(prisma, inicio, fim, usuario);
  }
  const vinculosSimples = await autoVincularSimplesSemana(prisma, inicio, fim, usuario);

  const operacionais = await prisma.pedidoOperacional.findMany({
    where: { dataEntrega: { gte: inicio, lte: fim }, status: { not: "CANCELADO" } },
    include: {
      itens: true,
      pedidoContaAzul: {
        include: {
          itens: true,
          cliente: { select: { regraComercial: { select: { acumulaPedidos: true } } } },
        },
      },
      cliente: { select: { regraComercial: { select: { acumulaPedidos: true } } } },
    },
  });
  const produtos = await carregarProdutosConciliacao(prisma);
  await reconciliarDivergenciasAcumuloEsperadas(
    prisma,
    operacionais,
    criarResolverChaveItemConciliacao(produtos),
  );

  const conciliacao = await calcularConciliacaoSemanal(prisma, inicio, fim);
  const pendentes = conciliacao.clientes.filter(
    (c) => c.status === "divergente" || c.status === "venda_sem_pedido",
  );

  return {
    vinculosMultiplos,
    vinculosSimples,
    acumulaHabilitados,
    conciliacao,
    pendentes,
  };
}
