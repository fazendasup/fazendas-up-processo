/**
 * Diagnóstico de espaço no MySQL comercial.
 *
 * Lógica reutilizável usada tanto pelo script `server/run-diagnostico-espaco-comercial.ts`
 * (execução via `tsx`/CLI) quanto pela rota HTTP `GET /api/diagnostico/espaco-comercial`
 * registrada em `server/comercial/diagnostico-espaco-comercial-route.ts`.
 */
import { getComercialPrisma } from "./db.js";

export type DiagnosticoEspacoTabela = {
  t: string;
  r: number | null;
  data_mb: number | null;
  idx_mb: number | null;
  total_mb: number | null;
};

export type DiagnosticoEspacoComercial = {
  success: true;
  timestamp: string;
  data: DiagnosticoEspacoTabela[];
  counts: {
    itens: number;
    pedidos: number;
    eventos: number;
    auditoria: number;
    itensPedidoCa: number;
    pedidosCa: number;
  };
};

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Consulta as 20 maiores tabelas do banco comercial (por tamanho em disco) e as
 * contagens de registros das tabelas principais. Não usa `execSync`/child_process —
 * as queries são executadas diretamente via Prisma.
 */
export async function getDiagnosticoEspacoComercial(): Promise<DiagnosticoEspacoComercial> {
  const prisma = getComercialPrisma();

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT table_name AS t,
            table_rows AS r,
            ROUND(data_length/1024/1024,2) AS data_mb,
            ROUND(index_length/1024/1024,2) AS idx_mb,
            ROUND((data_length+index_length)/1024/1024,2) AS total_mb
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
     ORDER BY (data_length+index_length) DESC
     LIMIT 20`,
  );

  const data: DiagnosticoEspacoTabela[] = rows.map((row) => ({
    t: String(row.t),
    r: num(row.r),
    data_mb: num(row.data_mb),
    idx_mb: num(row.idx_mb),
    total_mb: num(row.total_mb),
  }));

  const [itens, pedidos, eventos, auditoria, itensPedidoCa, pedidosCa] = await Promise.all([
    prisma.pedidoOperacionalItem.count(),
    prisma.pedidoOperacional.count(),
    prisma.pedidoConciliacaoEvento.count(),
    prisma.pedidoOperacionalAuditoria.count(),
    prisma.itemPedido.count(),
    prisma.pedido.count(),
  ]);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    counts: {
      itens,
      pedidos,
      eventos,
      auditoria,
      itensPedidoCa,
      pedidosCa,
    },
  };
}
