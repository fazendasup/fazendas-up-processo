import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer, type ConfigEnv, type UserConfig } from "vite";
import viteConfigExport from "../../vite.config";

function resolveViteUserConfig(): UserConfig {
  const env: ConfigEnv = {
    command: "serve",
    mode: "development",
    isSsrBuild: false,
  };
  return typeof viteConfigExport === "function" ? viteConfigExport(env) : viteConfigExport;
}

export async function setupVite(app: Express, server: Server) {
  const viteConfig = resolveViteUserConfig();
  const baseServer = viteConfig.server ?? {};
  const baseHmr =
    baseServer.hmr && typeof baseServer.hmr === "object" && !Array.isArray(baseServer.hmr) ? baseServer.hmr : {};
  const serverOptions = {
    ...baseServer,
    middlewareMode: true as const,
    hmr: { ...baseHmr, server },
    /** Sempre permitir Host = IPv4/hostname da LAN (createViteServer substitui `server` inteiro). */
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  const clientTemplate = path.resolve(
    import.meta.dirname,
    "../..",
    "client",
    "index.html",
  );

  async function sendSpa(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  }

  /**
   * `/bpf` é rota SPA (Header + iframe). Sem isto, o Vite serve
   * `public/bpf/index.html` e a barra do ERP some.
   */
  app.get(["/bpf", "/bpf/"], (req, res, next) => {
    void sendSpa(req, res, next);
  });

  app.use(vite.middlewares);
  app.use("*", (req, res, next) => {
    void sendSpa(req, res, next);
  });
}
