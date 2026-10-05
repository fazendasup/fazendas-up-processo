import type { Express, Request, Response } from "express";
import { isOperationalAdminRole, isProcessAccessRole } from "@shared/const";
import { sdk } from "./_core/sdk";
import {
  listarRevisoesBpf,
  obterBpfEstado,
  restaurarRevisaoBpf,
  salvarBpfEstado,
} from "./bpfDb";

async function usuario(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

function nomeUsuario(user: { name?: string | null; email?: string | null }): string {
  const nome = user.name?.trim();
  if (nome) return nome;
  const email = user.email?.trim();
  if (email) return email;
  return "Administrador";
}

export function registerBpfRoutes(app: Express): void {
  app.get("/api/bpf", async (req: Request, res: Response) => {
    const user = await usuario(req);
    if (!user || !isProcessAccessRole(user.role)) {
      res.status(401).json({ error: "Sem acesso aos procedimentos." });
      return;
    }
    const estado = await obterBpfEstado();
    const revisoes = await listarRevisoesBpf(30);
    res.json({
      conteudo: estado?.conteudo ?? null,
      atualizadoEm: estado?.updatedAt ?? null,
      atualizadoPor: estado?.atualizadoPorNome ?? null,
      podeEditar: isOperationalAdminRole(user.role),
      revisoes: revisoes.map(item => ({
        id: item.id,
        resumo: item.resumo,
        userName: item.userName,
        createdAt: item.createdAt,
      })),
    });
  });

  app.put("/api/bpf", async (req: Request, res: Response) => {
    const user = await usuario(req);
    if (!user || !isOperationalAdminRole(user.role)) {
      res.status(403).json({ error: "Só o administrador grava POP e FIT." });
      return;
    }
    const conteudo = req.body?.conteudo;
    if (!conteudo || typeof conteudo !== "object") {
      res.status(400).json({ error: "Conteúdo inválido." });
      return;
    }
    const resumo =
      typeof req.body?.resumo === "string" ? req.body.resumo : "Alteração";
    try {
      await salvarBpfEstado({
        conteudo,
        resumo,
        registrarRevisao: req.body?.registrarRevisao === true,
        userId: user.id,
        userName: nomeUsuario(user),
      });
      const revisoes = await listarRevisoesBpf(30);
      res.json({ ok: true, revisoes });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Falha ao salvar.",
      });
    }
  });

  app.post("/api/bpf/restaurar", async (req: Request, res: Response) => {
    const user = await usuario(req);
    if (!user || !isOperationalAdminRole(user.role)) {
      res.status(403).json({ error: "Só o administrador restaura uma revisão." });
      return;
    }
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Revisão inválida." });
      return;
    }
    try {
      const conteudo = await restaurarRevisaoBpf(id, user.id, nomeUsuario(user));
      const revisoes = await listarRevisoesBpf(30);
      res.json({ ok: true, conteudo, revisoes });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Falha ao restaurar.",
      });
    }
  });
}
