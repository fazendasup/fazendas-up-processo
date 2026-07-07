import type { PrismaClient } from "../generated/prisma/index.js";

/** Eventos de auditoria além deste prazo são removidos automaticamente. */
export const RETENCAO_EVENTOS_CONCILIACAO_DIAS = 90;

const INTERVALO_LIMPEZA_MS = 6 * 60 * 60 * 1000;
let ultimaLimpezaAgendada = 0;

export function isErroTabelaConciliacaoEventosCheia(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("1114") ||
    msg.includes("is full") ||
    msg.includes("pedidos_conciliacao_eventos")
  );
}

export async function limparEventosConciliacaoAntigos(
  prisma: Pick<PrismaClient, "pedidoConciliacaoEvento">,
  opts?: { dias?: number; lote?: number; maxLotes?: number },
): Promise<{ removidos: number }> {
  const dias = opts?.dias ?? RETENCAO_EVENTOS_CONCILIACAO_DIAS;
  const lote = opts?.lote ?? 5000;
  const maxLotes = opts?.maxLotes ?? 200;
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  let removidos = 0;

  for (let i = 0; i < maxLotes; i++) {
    const antigos = await prisma.pedidoConciliacaoEvento.findMany({
      where: { criadoEm: { lt: corte } },
      select: { id: true },
      take: lote,
    });
    if (antigos.length === 0) break;
    const r = await prisma.pedidoConciliacaoEvento.deleteMany({
      where: { id: { in: antigos.map((e) => e.id) } },
    });
    removidos += r.count;
    if (antigos.length < lote) break;
  }

  return { removidos };
}

/** Remove os eventos mais antigos quando a tabela está sem espaço. */
export async function liberarEspacoEventosConciliacao(
  prisma: Pick<PrismaClient, "pedidoConciliacaoEvento">,
  alvoRemover = 50_000,
): Promise<number> {
  const loteMax = 5000;
  let removidos = 0;

  while (removidos < alvoRemover) {
    const lote = Math.min(loteMax, alvoRemover - removidos);
    const antigos = await prisma.pedidoConciliacaoEvento.findMany({
      orderBy: { criadoEm: "asc" },
      select: { id: true },
      take: lote,
    });
    if (antigos.length === 0) break;
    const r = await prisma.pedidoConciliacaoEvento.deleteMany({
      where: { id: { in: antigos.map((e) => e.id) } },
    });
    removidos += r.count;
    if (antigos.length < lote) break;
  }

  return removidos;
}

export async function limparEventosConciliacaoAntigosIfDue(
  prisma: Pick<PrismaClient, "pedidoConciliacaoEvento">,
): Promise<void> {
  const now = Date.now();
  if (now - ultimaLimpezaAgendada < INTERVALO_LIMPEZA_MS) return;
  ultimaLimpezaAgendada = now;
  try {
    await limparEventosConciliacaoAntigos(prisma);
  } catch (err) {
    console.error("[conciliacao] falha na limpeza agendada de eventos", err);
  }
}

export async function recuperarEspacoEventosConciliacao(
  prisma: Pick<PrismaClient, "pedidoConciliacaoEvento">,
): Promise<number> {
  const { removidos: porRetencao } = await limparEventosConciliacaoAntigos(prisma);
  if (porRetencao > 0) return porRetencao;
  return liberarEspacoEventosConciliacao(prisma, 20_000);
}
