import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// OAuth routes removed - using email/password authentication instead
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { ensureBootstrapAdmin } from "../bootstrap-admin";
import * as db from "../db";
import { runDrizzleMigrateFromEnv } from "../run-drizzle-migrate";
import { initMqttFromEnv, shutdownMqtt } from "./mqtt";
import { APP_VERSION } from "./release-meta";

const projectRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const devPortFile = path.join(projectRoot, ".dev-server-port");

/** Porta HTTP local padrão em dev (evita conflito com outros projetos na mesma máquina, ex. 3000). */
const DEFAULT_HTTP_PORT = 3456;

function writeDevServerPortFile(port: number) {
  if (process.env.NODE_ENV !== "development") return;
  try {
    fs.writeFileSync(devPortFile, String(port), "utf8");
  } catch {
    /* ignore */
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = DEFAULT_HTTP_PORT): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function listLanIPv4Urls(port: number): string[] {
  const urls: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const a of list) {
      const fam = String(a.family);
      const v4 = fam === "IPv4" || fam === "4";
      if (!v4 || a.internal) continue;
      urls.push(`http://${a.address}:${port}/`);
    }
  }
  return urls;
}

async function startServer() {
  console.log("[Server] Iniciando…");
  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[Server] DATABASE_URL não definido. Crie `.env` na raiz do projeto (copie `env.defaults` ou rode: node scripts/ensure-env.mjs)",
    );
  }

  const app = express();
  /** Railway / proxies: cookies `Secure` e rate-limit usam IP/proto corretos. */
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? "1") || 1);
  const server = createServer(app);
  const isProd = process.env.NODE_ENV === "production";

  /** Railway healthcheck: tem de responder **antes** da preparação pesada da BD (senão "service unavailable"). */
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      version: APP_VERSION,
      commit: process.env.GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  });

  /** Site (HTML/JS/CSS) já disponível durante o arranque da BD — evita página em branco / 404. */
  if (process.env.NODE_ENV !== "development") {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || String(DEFAULT_HTTP_PORT), 10);
  const port = isProd ? preferredPort : await findAvailablePort(preferredPort);
  if (!isProd && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  const listenHost = process.env.HOST?.trim() || "0.0.0.0";

  await new Promise<void>((resolve, reject) => {
    server.listen(port, listenHost, () => resolve());
    server.once("error", reject);
  });
  writeDevServerPortFile(port);
  console.log(`[Server] À escuta na porta ${port} — healthcheck /healthz OK (Railway).`);
  console.log(`Server running on http://localhost:${port}/`);
  if (listenHost === "0.0.0.0" || listenHost === "::") {
    const lan = listLanIPv4Urls(port);
    if (lan.length > 0) {
      console.log("LAN (mesma rede Wi‑Fi/Ethernet):");
      for (const u of lan) console.log(`  ${u}`);
      console.log(
        "Se nao abrir no celular: o Firewall do Windows pode bloquear a porta — rode uma vez (como admin): npm run dev:firewall",
      );
    } else {
      console.log(`LAN: abra no outro aparelho http://<IPv4-deste-PC>:${port}/  (ipconfig → IPv4)`);
    }
  }

  const onSignal = () => {
    void shutdownMqtt();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  console.log(
    "[Server] A preparar base de dados… (Docker: espere o MySQL ~10–15 s na primeira vez)",
  );
  try {
    await runDrizzleMigrateFromEnv();
  } catch (e) {
    console.error("[Server] Migrações Drizzle falharam — o site pode abrir mas a API pode falhar:", e);
    if (process.env.EXIT_ON_MIGRATE_FAILURE === "1") {
      process.exit(1);
    }
  }

  await db.ensureUsersRoleVarchar();
  await db.ensureCiclosDosagemColumn();
  await db.ensurePlanosPlantioGerminacaoColumns();
  await db.ensureTransplantiosRastreioColumns();
  await db.ensureReceitasCrescimentoNovasColunas();
  await db.ensureEstoqueItensTable();
  await db.ensureVisionCultivoTables();
  await db.ensureProjetosTables();
  await db.ensureProjetoModulosTable();
  await db.ensureProjetosMicroverdesSupport();
  await db.ensureBancadasSchemaColumns();
  await db.ensureProjetoMembershipsBootstrap();
  const schemaEns = await db.ensureIncompleteMultiProjetoSchema();
  if (schemaEns.ok && schemaEns.columnsAdded.length > 0) {
    console.log(
      `[Server] Multi-projeto: colunas projetoId criadas em ${schemaEns.columnsAdded.length} tabela(s): ${schemaEns.columnsAdded.join(", ")} (nullRows=${schemaEns.nullRowsPatched})`,
    );
  }
  if (process.env.AUTO_MIGRATE_LEGACY_DATA === "1") {
    try {
      const r = await db.migrateAllOperationalDataToFazendaVerticalPrincipal();
      console.log(
        "[Server] AUTO_MIGRATE_LEGACY_DATA=1 concluído — fvpId=%s torres=%s ciclos=%s erros=%s",
        r.fvpId,
        r.verification.torres,
        r.verification.ciclos,
        r.mergeErrors.length,
      );
    } catch (e) {
      console.error("[Server] AUTO_MIGRATE_LEGACY_DATA falhou:", e);
    }
  }
  await ensureBootstrapAdmin();
  console.log("[Server] Banco OK. A registar API…");

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE ?? (isProd ? 500 : 4000)),
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/trpc", apiLimiter);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, server);
  }

  console.log("[Server] API pronta" + (isProd ? " (site estático já estava à escuta)." : " + Vite."));
  void initMqttFromEnv().catch((e) => console.warn("[MQTT] Falha ao iniciar:", e));
}

startServer().catch(console.error);
