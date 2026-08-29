import type { Express } from "express";
import { getDiagnosticoEspacoComercial } from "./diagnostico-espaco-comercial.js";

/**
 * `GET /api/diagnostico/espaco-comercial` — versão HTTP do script
 * `server/run-diagnostico-espaco-comercial.ts`, permitindo baixar o diagnóstico
 * em JSON via navegador/curl sem precisar de acesso ao terminal.
 */
export function registerDiagnosticoEspacoComercialRoute(app: Express) {
  app.get("/api/diagnostico/espaco-comercial", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const diagnostico = await getDiagnosticoEspacoComercial();
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="diagnostico-espaco-comercial.json"',
      );
      res.status(200).json(diagnostico);
    } catch (e) {
      console.error("[Diagnóstico] Falha ao gerar diagnóstico de espaço comercial:", e);
      res.status(500).json({
        success: false,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      });
    }
  });
}
