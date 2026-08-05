import type { Express } from "express";

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Diagnóstico read-only do peso do MySQL comercial — GET /api/diagnostico/espaco */
export function registerDiagnosticoEspacoRoute(app: Express) {
  app.get("/api/diagnostico/espaco", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const { getComercialPrisma } = await import("../comercial/db.js");
      const prisma = getComercialPrisma();

      const tables = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT table_name AS t,
                table_rows AS r,
                ROUND(data_length/1024/1024, 2) AS data_mb,
                ROUND(index_length/1024/1024, 2) AS idx_mb,
                ROUND((data_length+index_length)/1024/1024, 2) AS total_mb,
                ROUND(data_free/1024/1024, 2) AS free_mb,
                engine
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
         ORDER BY (data_length+index_length) DESC`,
      );

      const top = tables.map((row) => ({
        tabela: String(row.t),
        linhas_aprox: num(row.r),
        data_mb: num(row.data_mb),
        idx_mb: num(row.idx_mb),
        total_mb: num(row.total_mb),
        livre_mb: num(row.free_mb),
        engine: String(row.engine ?? ""),
      }));

      const total_schema_mb = top.reduce((s, t) => s + t.total_mb, 0);

      const [
        pedidos_operacionais,
        pedidos_operacionais_itens,
        pedidos_operacionais_auditoria,
        pedidos_conciliacao_eventos,
        execucoes_api,
        pedidos_conta_azul,
        itens_pedido_ca,
        clientes,
        produtos,
      ] = await Promise.all([
        prisma.pedidoOperacional.count(),
        prisma.pedidoOperacionalItem.count(),
        prisma.pedidoOperacionalAuditoria.count(),
        prisma.pedidoConciliacaoEvento.count(),
        prisma.execucaoApi.count(),
        prisma.pedido.count(),
        prisma.itemPedido.count(),
        prisma.cliente.count(),
        prisma.produtoComercial.count(),
      ]);

      const snapRows = await prisma.$queryRawUnsafe<Array<{ c: unknown }>>(
        `SELECT COUNT(*) AS c FROM pedidos_operacionais WHERE snapshot_conciliacao IS NOT NULL`,
      );

      const logs_mb = top
        .filter((t) =>
          [
            "pedidos_conciliacao_eventos",
            "pedidos_operacionais_auditoria",
            "execucoes_api",
          ].includes(t.tabela),
        )
        .reduce((s, t) => s + t.total_mb, 0);

      const operacao_mb = top
        .filter((t) =>
          [
            "pedidos_operacionais",
            "pedidos_operacionais_itens",
            "pedidos",
            "itens_pedido",
            "clientes",
            "produtos_comerciais",
          ].includes(t.tabela),
        )
        .reduce((s, t) => s + t.total_mb, 0);

      res.status(200).json({
        ok: true,
        geradoEm: new Date().toISOString(),
        total_schema_mb: Math.round(total_schema_mb * 100) / 100,
        resumo: {
          logs_auditoria_mb: Math.round(logs_mb * 100) / 100,
          dados_operacao_mb: Math.round(operacao_mb * 100) / 100,
          pct_logs_no_total:
            total_schema_mb > 0
              ? Math.round((logs_mb / total_schema_mb) * 1000) / 10
              : 0,
          truncar_logs_provavelmente_ajuda: logs_mb >= operacao_mb || logs_mb >= 50,
        },
        contagens: {
          pedidos_operacionais,
          pedidos_operacionais_itens,
          pedidos_operacionais_auditoria,
          pedidos_conciliacao_eventos,
          execucoes_api,
          pedidos_conta_azul,
          itens_pedido_ca,
          clientes,
          produtos,
          pedidos_com_snapshot: num(snapRows[0]?.c),
        },
        top_tabelas: top.slice(0, 30),
      });
    } catch (err) {
      console.error("[diagnostico/espaco]", err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
