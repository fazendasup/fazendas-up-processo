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
  console.log("[Server] Ligação ao MySQL e migrações em curso… (se falhar: Docker `docker compose up -d mysql` e espere ~10–15 s)");
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
  console.log("[Server] Banco OK. Configurando HTTP…");

  const app = express();
  /** Railway / proxies: cookies `Secure` e rate-limit usam IP/proto corretos. */
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? "1") || 1);
  const server = createServer(app);
  const isProd = process.env.NODE_ENV === "production";
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE ?? (isProd ? 500 : 4000)),
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/trpc", apiLimiter);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  /** Health HTTP simples (uptime / load balancer) — não passa pelo rate limit do tRPC. */
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      version: APP_VERSION,
      commit: process.env.GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
  });

  // OAuth removed - using email/password authentication instead
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const preferredPort = parseInt(process.env.PORT || String(DEFAULT_HTTP_PORT), 10);
  /** Railway/Fly/Render injetam `PORT`; o proxy só encaminha para essa porta — não procurar porta livre em produção. */
  const port =
    isProd ? preferredPort : await findAvailablePort(preferredPort);

  if (!isProd && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // development mode uses Vite (módulo à parte — não empacotar `vite` na imagem --prod)
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  /** 0.0.0.0 = aceita conexões da rede local (celular/outro PC). Use HOST=127.0.0.1 só em localhost. */
  const listenHost = process.env.HOST?.trim() || "0.0.0.0";

  server.listen(port, listenHost, () => {
    writeDevServerPortFile(port);
    console.log(`Server running on http://localhost:${port}/`);
    if (listenHost === "0.0.0.0" || listenHost === "::") {
      const lan = listLanIPv4Urls(port);
      if (lan.length > 0) {
        console.log("LAN (mesma rede Wi‑Fi/Ethernet):");
        for (const u of lan) console.log(`  ${u}`);
        console.log(
          "Se nao abrir no celular: o Firewall do Windows pode bloquear a porta — rode uma vez (como admin): npm run dev:firewall"
        );
      } else {
        console.log(`LAN: abra no outro aparelho http://<IPv4-deste-PC>:${port}/  (ipconfig → IPv4)`);
      }
    }
    void initMqttFromEnv().catch((e) => console.warn("[MQTT] Falha ao iniciar:", e));
  });

  const onSignal = () => {
    void shutdownMqtt();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
}

startServer().catch(console.error);
