import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

/**
 * Pasta `dist/public` do Vite (HTML + `/assets`).
 * Em produção o bundle é `dist/index.js` — resolvemos `dist/public` **ao lado do ficheiro em execução**,
 * não com `process.cwd()` (Railway/outros hosts podem arrancar com cwd diferente da raiz → SPA “sumia”).
 */
export function distPublicPath(): string {
  if (process.env.NODE_ENV === "development") {
    return path.resolve(import.meta.dirname, "../..", "dist", "public");
  }
  const bundleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(bundleDir, "public");
}

/** Para `/healthz` e diagnóstico Railway — não expõe segredos. */
export function getStaticDeployReadiness(): {
  cwd: string;
  distPublicPath: string;
  folderExists: boolean;
  indexHtmlExists: boolean;
} {
  const cwd = process.cwd();
  const distPublic = distPublicPath();
  const folderExists = fs.existsSync(distPublic);
  const indexHtmlExists = folderExists && fs.existsSync(path.join(distPublic, "index.html"));
  return { cwd, distPublicPath: distPublic, folderExists, indexHtmlExists };
}

/**
 * HTML + assets. Em produção monta-se antes da BD para o browser já receber páginas.
 */
export function serveStatic(app: Express) {
  const distPath = distPublicPath();
  const indexPath = path.join(distPath, "index.html");
  if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
    console.error(
      `[static] Build em falta: ${distPath} (cwd=${process.cwd()}) — falta pasta ou index.html. Corra vite build na imagem.`,
    );
    /** Evita "Cannot GET /" sem pista: resposta 503 explícita até o artefacto existir. */
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api")) return next();
      res
        .status(503)
        .type("html")
        .send(
          `<!DOCTYPE html><meta charset="utf-8"><title>Fazendas Up — build em falta</title>` +
            `<pre>Ficheiros estáticos em falta.\ncwd=${process.cwd()}\nesperado: ${indexPath}\n` +
            `Verifique se o Docker/build corre \`pnpm run build\` e copia \`dist/\` para a imagem.</pre>`,
        );
    });
    return;
  }
  console.log(`[static] Ficheiros públicos: ${distPath}`);

  const sendPwaAsset = (route: string, fileName: string, contentType: string) => {
    app.get(route, (_req, res, next) => {
      res.set("Cache-Control", "no-cache");
      res.type(contentType);
      res.sendFile(path.join(distPath, fileName), (err) => {
        if (err) next();
      });
    });
  };
  sendPwaAsset("/sw.js", "sw.js", "application/javascript");
  sendPwaAsset("/manifest.webmanifest", "manifest.webmanifest", "application/manifest+json");

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

    const indexFile = indexPath;
    res.sendFile(indexFile, (err) => {
      if (err) {
        console.error("[static] Falha ao enviar index.html:", err);
        next(err);
      }
    });
  });
}
