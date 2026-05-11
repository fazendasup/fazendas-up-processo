import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function distPublicPath(): string {
  /** Bundle em `dist/index.js`: `cwd` é a raiz da app (Docker WORKDIR /app). */
  return process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(process.cwd(), "dist", "public");
}

/**
 * HTML + assets. Em produção monta-se antes da BD para o browser já receber páginas.
 */
export function serveStatic(app: Express) {
  const distPath = distPublicPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `[static] Pasta em falta: ${distPath} (cwd=${process.cwd()}) — construa o cliente com vite build.`,
    );
    return;
  }
  console.log(`[static] Ficheiros públicos: ${distPath}`);

  app.use(
    express.static(distPath, {
      index: "index.html",
      fallthrough: true,
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    }),
  );

  /** Fallback SPA (GET/HEAD): não usar `app.get('*')` — compatibilidade Express/path-to-regexp. */
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/assets/")) return next();

    const indexFile = path.resolve(distPath, "index.html");
    res.sendFile(indexFile, (err) => {
      if (err) {
        console.error("[static] Falha ao enviar index.html:", err);
        next(err);
      }
    });
  });
}
