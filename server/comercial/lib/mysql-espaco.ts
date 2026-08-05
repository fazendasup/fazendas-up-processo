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
/** Rastreio GPS do entregador — pontos antigos não são necessários para operação. */
export const RETENCAO_HISTORICO_LOCALIZACAO_DIAS = 14;

/** Tabelas de log/auditoria seguras para TRUNCATE em emergência (reclaim de disco com file-per-table). */
const TABELAS_LOG_TRUNCATE = [
  "historico_localizacao_entrega",
  "pedidos_conciliacao_eventos",
  "execucoes_api",
  "pedidos_operacionais_auditoria",
] as const;

type PrismaEspaco = Pick<
  PrismaClient,
  | "pedidoConciliacaoEvento"
  | "pedidoOperacionalAuditoria"
  | "execucaoApi"
  | "historicoLocalizacaoEntrega"
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
 * TRUNCATE devolve espaço ao SO com innodb_file_per_table.
 * DELETE só marca páginas livres dentro do .ibd — não resolve disco 100% cheio para OUTRAS tabelas.
 */
export async function truncarTabelasLogComercial(
  prisma: Pick<PrismaClient, "$executeRawUnsafe">,
): Promise<Record<string, string>> {
  const resultado: Record<string, string> = {};
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const tabela of TABELAS_LOG_TRUNCATE) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tabela}\``);
        resultado[tabela] = "ok";
      } catch (err) {
        resultado[tabela] = err instanceof Error ? err.message : String(err);
        console.warn(`[mysql-espaco] TRUNCATE ${tabela} falhou:`, resultado[tabela]);
      }
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
  return resultado;
}

/**
 * Libera espaço nas tabelas de auditoria/log que costumam encher o disco no Railway.
 * Em emergência: TRUNCATE dos logs (único jeito confiável de devolver bytes ao disco).
 */
export async function liberarEspacoComercial(
  prisma: PrismaEspaco,
  opts?: { emergencia?: boolean },
): Promise<{ removidos: number; detalhe: Record<string, number | string> }> {
  const detalhe: Record<string, number | string> = {};
  let removidos = 0;

  if (opts?.emergencia) {
    // Conta antes do truncate para telemetria
    const [ev, au, ex, gps] = await Promise.all([
      prisma.pedidoConciliacaoEvento.count().catch(() => 0),
      prisma.pedidoOperacionalAuditoria.count().catch(() => 0),
      prisma.execucaoApi.count().catch(() => 0),
      prisma.historicoLocalizacaoEntrega.count().catch(() => 0),
    ]);
    const trunc = await truncarTabelasLogComercial(prisma);
    detalhe.truncate = JSON.stringify(trunc);
    detalhe.eventosTruncados = ev;
    detalhe.auditoriaTruncada = au;
    detalhe.execucoesTruncadas = ex;
    detalhe.gpsTruncado = gps;
    removidos += ev + au + ex + gps;

    detalhe.snapshotsLimpos = await limparSnapshotsConciliacaoAntigos(prisma, {
      dias: 0,
      maxLotes: 80,
    });
    removidos += Number(detalhe.snapshotsLimpos) || 0;

    return { removidos, detalhe };
  }

  // Retenção normal: GPS antigo (maior tabela em produção)
  detalhe.gpsAntigo = await limparPorData(
    async (corte, lote) => {
      const rows = await prisma.historicoLocalizacaoEntrega.findMany({
        where: { criadoEm: { lt: corte } },
        select: { id: true },
        take: lote,
      });
      return rows.map((r) => r.id);
    },
    async (ids) => {
      const r = await prisma.historicoLocalizacaoEntrega.deleteMany({ where: { id: { in: ids } } });
      return r.count;
    },
    RETENCAO_HISTORICO_LOCALIZACAO_DIAS,
    { lote: 10_000, maxLotes: 200 },
  );
  removidos += Number(detalhe.gpsAntigo) || 0;

  const eventosRetencao = await limparEventosConciliacaoAntigos(prisma, {
    dias: RETENCAO_EVENTOS_CONCILIACAO_DIAS,
  });
  detalhe.eventosConciliacao = eventosRetencao.removidos;
  removidos += eventosRetencao.removidos;

  detalhe.auditoriaPedido = await limparAuditoriaPedidoAntiga(prisma);
  removidos += Number(detalhe.auditoriaPedido) || 0;

  detalhe.execucoesApi = await limparExecucoesApiAntigas(prisma);
  removidos += Number(detalhe.execucoesApi) || 0;

  detalhe.snapshotsLimpos = await limparSnapshotsConciliacaoAntigos(prisma);
  removidos += Number(detalhe.snapshotsLimpos) || 0;

  if (removidos === 0) {
    const extra = await liberarEspacoEventosConciliacao(prisma, 20_000);
    detalhe.eventosEmergencia = extra;
    removidos += extra;
  }

  try {
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
    console.warn("[mysql-espaco] tabela cheia (1114) — TRUNCATE de logs e nova tentativa");
    const { removidos, detalhe } = await liberarEspacoComercial(prisma, { emergencia: true });
    console.warn("[mysql-espaco] liberação emergência:", { removidos, detalhe });
    // Sempre tenta de novo após TRUNCATE — mesmo com removidos=0 o .ibd pode ter encolhido.
    try {
      return await operacao();
    } catch (retryErr) {
      if (isErroMysqlTabelaCheia(retryErr)) {
        const e = new Error(
          "Banco comercial sem espaço em disco (MySQL 1114). Logs foram truncados; se persistir, aumente o disco do MySQL no Railway.",
        );
        (e as Error & { cause?: unknown }).cause = retryErr;
        throw e;
      }
      throw retryErr;
    }
  }
}
