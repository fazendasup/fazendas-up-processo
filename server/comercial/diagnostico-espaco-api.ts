/**
 * Diagnóstico de espaço no MySQL comercial — versão para uso via HTTP.
 * Reaproveita a mesma query do script `server/run-diagnostico-espaco-comercial.ts`.
 */
import { getComercialPrisma } from "./db.js";

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type DiagnosticoEspacoTabela = {
  t: string;
  r: number | null;
  data_mb: number | null;
  idx_mb: number | null;
  total_mb: number | null;
};

export type DiagnosticoEspacoCounts = {
  itens: number;
  pedidos: number;
  eventos: number;
  auditoria: number;
  itensPedidoCa: number;
  pedidosCa: number;
};

export type DiagnosticoEspacoResult = {
  success: true;
  timestamp: string;
  data: DiagnosticoEspacoTabela[];
  counts: DiagnosticoEspacoCounts;
};

/** Executa o diagnóstico de espaço do MySQL comercial (20 maiores tabelas + contagens principais). */
export async function getDiagnosticoEspaco(): Promise<DiagnosticoEspacoResult> {
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

  const counts: DiagnosticoEspacoCounts = {
    itens: await prisma.pedidoOperacionalItem.count(),
    pedidos: await prisma.pedidoOperacional.count(),
    eventos: await prisma.pedidoConciliacaoEvento.count(),
    auditoria: await prisma.pedidoOperacionalAuditoria.count(),
    itensPedidoCa: await prisma.itemPedido.count(),
    pedidosCa: await prisma.pedido.count(),
  };

  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    counts,
  };
}
