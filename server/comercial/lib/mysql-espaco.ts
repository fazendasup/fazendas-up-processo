import type { PrismaClient } from "../generated/prisma/index.js";
import {
  liberarEspacoEventosConciliacao,
  limparEventosConciliacaoAntigos,
  RETENCAO_EVENTOS_CONCILIACAO_DIAS,
} from "./conciliacao-eventos-retencao.js";

/** MySQL 1114 — disco/tablespace cheio (a mensagem cita a tabela do INSERT, não necessariamente a culpada). */
export function isErroMysqlTabelaCheia(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("1114") || /table ['`].+['`] is full/i.test(msg) || msg.includes("is full");
}

export const RETENCAO_AUDITORIA_PEDIDO_DIAS = 60;
export const RETENCAO_EXECUCOES_API_DIAS = 30;

type PrismaEspaco = Pick<
  PrismaClient,
  | "pedidoConciliacaoEvento"
  | "pedidoOperacionalAuditoria"
  | "execucaoApi"
  | "$executeRawUnsafe"
>;

async function limparPorData(
  findIds: (corte: Date, lote: number) => Promise<string[]>,
  deleteIds: (ids: string[]) => Promise<number>,
  dias: number,
  opts?: { lote?: number; maxLotes?: number },
): Promise<number> {
  const lote = opts?.lote ?? 5000;
  const maxLotes = opts?.maxLotes ?? 100;
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  let removidos = 0;
  for (let i = 0; i < maxLotes; i++) {
    const ids = await findIds(corte, lote);
    if (ids.length === 0) break;
    removidos += await deleteIds(ids);
    if (ids.length < lote) break;
  }
  return removidos;
}

export async function limparAuditoriaPedidoAntiga(
  prisma: Pick<PrismaClient, "pedidoOperacionalAuditoria">,
  opts?: { dias?: number; lote?: number; maxLotes?: number },
): Promise<number> {
  return limparPorData(
    async (corte, lote) => {
      const rows = await prisma.pedidoOperacionalAuditoria.findMany({
        where: { criadoEm: { lt: corte } },
        select: { id: true },
        take: lote,
      });
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await prisma.pedidoOperacionalAuditoria.deleteMany({ where: { id: { in: ids } } });
      return r.count;
    },
    opts?.dias ?? RETENCAO_AUDITORIA_PEDIDO_DIAS,
    opts,
  );
}

export async function limparExecucoesApiAntigas(
  prisma: Pick<PrismaClient, "execucaoApi">,
  opts?: { dias?: number; lote?: number; maxLotes?: number },
): Promise<number> {
  return limparPorData(
    async (corte, lote) => {
      const rows = await prisma.execucaoApi.findMany({
        where: { dataExecucao: { lt: corte } },
        select: { id: true },
        take: lote,
      });
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await prisma.execucaoApi.deleteMany({ where: { id: { in: ids } } });
      return r.count;
    },
    opts?.dias ?? RETENCAO_EXECUCOES_API_DIAS,
    opts,
  );
}

/** Zera snapshots grandes de conciliação em pedidos antigos (libera InnoDB sem apagar o pedido). */
export async function limparSnapshotsConciliacaoAntigos(
  prisma: Pick<PrismaClient, "$executeRawUnsafe">,
  opts?: { dias?: number; lote?: number; maxLotes?: number },
): Promise<number> {
  const dias = opts?.dias ?? 45;
  const lote = opts?.lote ?? 500;
  const maxLotes = opts?.maxLotes ?? 40;
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  let atualizados = 0;
  for (let i = 0; i < maxLotes; i++) {
    // MySQL: UPDATE ... LIMIT reclama espaço de JSON sem apagar o pedido.
    const affected = await prisma.$executeRawUnsafe(
      `UPDATE \`pedidos_operacionais\`
       SET \`snapshot_conciliacao\` = NULL
       WHERE \`atualizado_em\` < ?
         AND \`snapshot_conciliacao\` IS NOT NULL
       LIMIT ?`,
      corte,
      lote,
    );
    const n = typeof affected === "bigint" ? Number(affected) : Number(affected);
    if (!Number.isFinite(n) || n <= 0) break;
    atualizados += n;
    if (n < lote) break;
  }
  return atualizados;
}

/**
 * Libera espaço nas tabelas de auditoria/log que costumam encher o disco no Railway.
 * Em emergência, remove os eventos de conciliação mais antigos mesmo dentro da retenção.
 */
export async function liberarEspacoComercial(
  prisma: PrismaEspaco,
  opts?: { emergencia?: boolean },
): Promise<{ removidos: number; detalhe: Record<string, number> }> {
  const detalhe: Record<string, number> = {};
  let removidos = 0;

  const eventosRetencao = await limparEventosConciliacaoAntigos(prisma, {
    dias: opts?.emergencia ? 14 : RETENCAO_EVENTOS_CONCILIACAO_DIAS,
  });
  detalhe.eventosConciliacao = eventosRetencao.removidos;
  removidos += eventosRetencao.removidos;

  detalhe.auditoriaPedido = await limparAuditoriaPedidoAntiga(prisma, {
    dias: opts?.emergencia ? 14 : RETENCAO_AUDITORIA_PEDIDO_DIAS,
  });
  removidos += detalhe.auditoriaPedido;

  detalhe.execucoesApi = await limparExecucoesApiAntigas(prisma, {
    dias: opts?.emergencia ? 7 : RETENCAO_EXECUCOES_API_DIAS,
  });
  removidos += detalhe.execucoesApi;

  detalhe.snapshotsLimpos = await limparSnapshotsConciliacaoAntigos(prisma, {
    dias: opts?.emergencia ? 21 : 45,
  });
  removidos += detalhe.snapshotsLimpos;

  if (opts?.emergencia || removidos === 0) {
    const extra = await liberarEspacoEventosConciliacao(prisma, opts?.emergencia ? 100_000 : 20_000);
    detalhe.eventosEmergencia = extra;
    removidos += extra;
  }

  try {
    // Reclama páginas InnoDB após deletes em massa (best-effort; alguns hosts bloqueiam).
    await prisma.$executeRawUnsafe("OPTIMIZE TABLE `pedidos_conciliacao_eventos`");
    await prisma.$executeRawUnsafe("OPTIMIZE TABLE `pedidos_operacionais_auditoria`");
    await prisma.$executeRawUnsafe("OPTIMIZE TABLE `execucoes_api`");
  } catch (err) {
    console.warn("[mysql-espaco] OPTIMIZE TABLE ignorado:", err instanceof Error ? err.message : err);
  }

  return { removidos, detalhe };
}

export async function comRecuperacaoEspacoMysql<T>(
  prisma: PrismaEspaco,
  operacao: () => Promise<T>,
): Promise<T> {
  try {
    return await operacao();
  } catch (err) {
    if (!isErroMysqlTabelaCheia(err)) throw err;
    console.warn("[mysql-espaco] tabela cheia (1114) — liberando espaço e tentando de novo");
    const { removidos, detalhe } = await liberarEspacoComercial(prisma, { emergencia: true });
    console.warn("[mysql-espaco] liberação:", { removidos, detalhe });
    if (removidos <= 0) throw err;
    return await operacao();
  }
}
