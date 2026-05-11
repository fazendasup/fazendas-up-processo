import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function distPublicPath(): string {
  /** Em produção o bundle corre em `dist/index.js` com `cwd` na raiz da app (Docker/Railway). */
  return process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(process.cwd(), "dist", "public");
}

/**
 * HTML + ficheiros JS/CSS — pode montar-se **antes** da BD e da API.
 * Assim o browser já carrega a página enquanto o servidor prepara MySQL (Railway).
 */
export function serveStatic(app: Express) {
  const distPath = distPublicPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  /** Só GET: não interceptar POST /api/trpc antes das rotas API estarem registadas. */
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
