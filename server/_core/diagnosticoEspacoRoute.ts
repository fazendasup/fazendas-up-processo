import type { Express, Request, Response } from "express";

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function montarDiagnostico() {
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
    historico_localizacao_entrega,
    pedidos_conta_azul,
    itens_pedido_ca,
  ] = await Promise.all([
    prisma.pedidoOperacional.count(),
    prisma.pedidoOperacionalItem.count(),
    prisma.pedidoOperacionalAuditoria.count(),
    prisma.pedidoConciliacaoEvento.count(),
    prisma.execucaoApi.count(),
    prisma.historicoLocalizacaoEntrega.count(),
    prisma.pedido.count(),
    prisma.itemPedido.count(),
  ]);

  const logs_mb = top
    .filter((t) =>
      [
        "historico_localizacao_entrega",
        "pedidos_conciliacao_eventos",
        "pedidos_operacionais_auditoria",
        "execucoes_api",
      ].includes(t.tabela),
    )
    .reduce((s, t) => s + t.total_mb, 0);

  return {
    ok: true as const,
    geradoEm: new Date().toISOString(),
    total_schema_mb: Math.round(total_schema_mb * 100) / 100,
    resumo: {
      logs_auditoria_mb: Math.round(logs_mb * 100) / 100,
      pct_logs_no_total:
        total_schema_mb > 0 ? Math.round((logs_mb / total_schema_mb) * 1000) / 10 : 0,
      maior_tabela: top[0]?.tabela ?? null,
      maior_tabela_mb: top[0]?.total_mb ?? 0,
    },
    contagens: {
      pedidos_operacionais,
      pedidos_operacionais_itens,
      pedidos_operacionais_auditoria,
      pedidos_conciliacao_eventos,
      execucoes_api,
      historico_localizacao_entrega,
      pedidos_conta_azul,
      itens_pedido_ca,
    },
    top_tabelas: top.slice(0, 15),
  };
}

/** Diagnóstico + liberação de emergência do MySQL comercial. */
export function registerDiagnosticoEspacoRoute(app: Express) {
  app.get("/api/diagnostico/espaco", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      res.status(200).json(await montarDiagnostico());
    } catch (err) {
      console.error("[diagnostico/espaco]", err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * Libera espaço agora (TRUNCATE de GPS/logs).
   * GET ou POST — uso operacional de emergência.
   * Ex.: https://app.fazendasup.com.br/api/diagnostico/espaco/liberar
   */
  const liberar = async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const { getComercialPrisma } = await import("../comercial/db.js");
      const { liberarEspacoComercial } = await import("../comercial/lib/mysql-espaco.js");
      const prisma = getComercialPrisma();
      const antes = await montarDiagnostico();
      const result = await liberarEspacoComercial(prisma, { emergencia: true });
      const depois = await montarDiagnostico();
      res.status(200).json({
        ok: true,
        liberacao: result,
        antes: { total_schema_mb: antes.total_schema_mb, contagens: antes.contagens, top: antes.top_tabelas.slice(0, 5) },
        depois: { total_schema_mb: depois.total_schema_mb, contagens: depois.contagens, top: depois.top_tabelas.slice(0, 5) },
      });
    } catch (err) {
      console.error("[diagnostico/espaco/liberar]", err);
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  app.get("/api/diagnostico/espaco/liberar", liberar);
  app.post("/api/diagnostico/espaco/liberar", liberar);
}
