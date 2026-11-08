import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import {
  claimSolicitacaoAlteracaoSistema,
  concluirSolicitacaoAlteracaoSistema,
  falharSolicitacaoAlteracaoSistema,
  getSolicitacaoAlteracaoSistema,
  listSolicitacoesAlteracaoSistema,
} from "./cursorBridgeDb";

function bridgeAuthorized(req: Request): boolean {
  const secret = ENV.cursorBridgeSecret;
  if (!secret) return false;
  const header = String(req.headers.authorization ?? "");
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const alt = String(req.headers["x-cursor-bridge-secret"] ?? "").trim();
  return bearer === secret || alt === secret;
}

function deny(res: Response) {
  if (!ENV.cursorBridgeSecret) {
    res.status(503).json({
      ok: false,
      error: "CURSOR_BRIDGE_SECRET não configurado no servidor.",
    });
    return;
  }
  res.status(401).json({ ok: false, error: "Não autorizado." });
}

export function registerCursorBridgeRoutes(app: Express): void {
  app.get("/api/cursor-bridge/solicitacoes", async (req, res) => {
    if (!bridgeAuthorized(req)) {
      deny(res);
      return;
    }
    try {
      const status =
        typeof req.query.status === "string" && req.query.status.trim()
          ? req.query.status.trim()
          : "pendente";
      const projetoIdRaw = req.query.projetoId;
      const projetoId =
        typeof projetoIdRaw === "string" && projetoIdRaw.trim()
          ? Number(projetoIdRaw)
          : undefined;
      const rows = await listSolicitacoesAlteracaoSistema({
        status: status === "todas" ? undefined : status,
        projetoId: Number.isFinite(projetoId) ? projetoId : undefined,
        limit: 30,
      });
      res.json({ ok: true, solicitacoes: rows });
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : "Erro ao listar",
      });
    }
  });

  app.get("/api/cursor-bridge/solicitacoes/:id", async (req, res) => {
    if (!bridgeAuthorized(req)) {
      deny(res);
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ ok: false, error: "id inválido" });
      return;
    }
    const row = await getSolicitacaoAlteracaoSistema(id);
    if (!row) {
      res.status(404).json({ ok: false, error: "Não encontrada" });
      return;
    }
    res.json({ ok: true, solicitacao: row });
  });

  app.post("/api/cursor-bridge/solicitacoes/:id/claim", async (req, res) => {
    if (!bridgeAuthorized(req)) {
      deny(res);
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ ok: false, error: "id inválido" });
      return;
    }
    const claimed = await claimSolicitacaoAlteracaoSistema(id);
    if (!claimed) {
      res.status(404).json({ ok: false, error: "Não encontrada" });
      return;
    }
    if (!claimed.claimed) {
      res.status(409).json({
        ok: false,
        error: `Pedido em status ${claimed.row.status} (só pendente pode ser reivindicado).`,
        solicitacao: claimed.row,
      });
      return;
    }
    res.json({ ok: true, solicitacao: claimed.row });
  });

  app.post("/api/cursor-bridge/solicitacoes/:id/concluir", async (req, res) => {
    if (!bridgeAuthorized(req)) {
      deny(res);
      return;
    }
    const id = Number(req.params.id);
    const resultado = String(req.body?.resultado ?? "").trim();
    if (!resultado) {
      res.status(400).json({ ok: false, error: "Informe resultado" });
      return;
    }
    const commitSha =
      typeof req.body?.commitSha === "string" ? req.body.commitSha.trim() || null : null;
    const row = await concluirSolicitacaoAlteracaoSistema(id, { resultado, commitSha });
    if (!row) {
      res.status(404).json({ ok: false, error: "Não encontrada" });
      return;
    }
    res.json({ ok: true, solicitacao: row });
  });

  app.post("/api/cursor-bridge/solicitacoes/:id/falhou", async (req, res) => {
    if (!bridgeAuthorized(req)) {
      deny(res);
      return;
    }
    const id = Number(req.params.id);
    const erro = String(req.body?.erro ?? "").trim() || "Falha sem detalhe";
    const row = await falharSolicitacaoAlteracaoSistema(id, erro);
    if (!row) {
      res.status(404).json({ ok: false, error: "Não encontrada" });
      return;
    }
    res.json({ ok: true, solicitacao: row });
  });
}
