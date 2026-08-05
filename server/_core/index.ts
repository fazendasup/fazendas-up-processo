import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// OAuth routes removed - using email/password authentication instead
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerGeocodeRoute } from "./geocodeRoute";
import { registerPublicConfigRoute } from "./publicConfig";
import { getStaticDeployReadiness, serveStatic } from "./static";
import { ensureBootstrapAdmin } from "../bootstrap-admin";
import * as db from "../db";
import { runDrizzleMigrateFromEnv } from "../run-drizzle-migrate";
import { applyRuntimeSchemaEnsures } from "../ensure-runtime-schema";
import { runComercialPrismaMigrateFromEnv } from "../run-comercial-prisma-migrate";
import { initMqttFromEnv, shutdownMqtt } from "./mqtt";
import { APP_VERSION } from "./release-meta";

const projectRoot = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  ".."
);
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

async function findAvailablePort(
  startPort: number = DEFAULT_HTTP_PORT
): Promise<number> {
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

async function runFupPilotoBootstrapIfNeeded() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.FUP_PILOTO_BOOTSTRAP === "0") {
    console.log(
      "[Server] FUP_PILOTO_BOOTSTRAP=0 — bootstrap do projeto FUP - Piloto desativado."
    );
    return;
  }

  const seedPath =
    [
      path.join(process.cwd(), "server", "seed-fup-piloto.mjs"),
      path.join(projectRoot, "server", "seed-fup-piloto.mjs"),
    ].find(candidate => fs.existsSync(candidate)) ??
    path.join(process.cwd(), "server", "seed-fup-piloto.mjs");
  if (!fs.existsSync(seedPath)) {
    console.warn(
      `[Server] Seed FUP - Piloto não encontrado em ${seedPath}; projeto demo não será criado.`
    );
    return;
  }

  await new Promise<void>(resolve => {
    const child = spawn(process.execPath, [seedPath, "--bootstrap"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", err => {
      console.warn("[Server] Bootstrap FUP - Piloto não iniciou:", err);
      resolve();
    });
    child.on("exit", (code, signal) => {
      if (code === 0) {
        console.log("[Server] Bootstrap FUP - Piloto OK.");
      } else {
        console.warn(
          `[Server] Bootstrap FUP - Piloto falhou (code=${code}, signal=${signal ?? "none"}).`
        );
      }
      resolve();
    });
  });
}

async function startServer() {
  console.log("[Server] Iniciando…");
  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[Server] DATABASE_URL não definido. Crie `.env` na raiz do projeto (copie `env.defaults` ou rode: node scripts/ensure-env.mjs)"
    );
  }

  const app = express();
  /** Railway / proxies: cookies `Secure` e rate-limit usam IP/proto corretos. */
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? "1") || 1);
  const server = createServer(app);
  const isProd = process.env.NODE_ENV === "production";

  /**
   * Liveness: **sempre 200** se o processo responde — o Railway usa isto; 503 aqui derrubava o serviço
   * quando o path estático era calculado mal (cwd). Readiness do SPA vai em `staticIndexHtml`.
   */
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const readiness = isProd ? getStaticDeployReadiness() : null;
    const staticReady = !isProd || (readiness?.indexHtmlExists ?? false);
    res.status(200).json({
      ok: true,
      version: APP_VERSION,
      commit:
        process.env.GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      staticIndexHtml: staticReady,
      deploy: !isProd
        ? { mode: "development" }
        : {
            cwd: readiness?.cwd ?? process.cwd(),
            distPublic: readiness?.distPublicPath ?? null,
          },
      envPresent: {
        databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
        jwtSecret: Boolean(process.env.JWT_SECRET?.trim()),
      },
    });
  });

  /** Opcional: readiness estrito (503 se não houver `index.html`) — use no orchestrator só se quiser. */
  app.get("/readyz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isProd) {
      res.status(200).json({ ok: true });
      return;
    }
    const r = getStaticDeployReadiness();
    const ready = r.indexHtmlExists;
    res.status(ready ? 200 : 503).json({
      ok: ready,
      distPublic: r.distPublicPath,
      cwd: r.cwd,
    });
  });

  /**
   * tRPC tem de estar registrado **antes** de `listen` e antes do trabalho pesado da BD.
   * Caso contrário, o fallback SPA chama `next()` em `/api/*` e o pedido terminava em 404 até
   * as migrações/bootstrap terminarem — o cliente nunca recebia `auth.me` e a app não mostrava o login.
   */
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE ?? (isProd ? 500 : 4000)),
    standardHeaders: true,
    legacyHeaders: false,
    /** Railway/proxies: validações estritas do pacote já causaram falhas opacas em ambientes geridos. */
    validate: false,
  });
  const jsonParser = express.json({ limit: "50mb" });
  const urlencodedParser = express.urlencoded({
    limit: "50mb",
    extended: true,
  });
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc", jsonParser);
  app.use("/api/trpc", urlencodedParser);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  console.log(
    "[Server] Rotas /api/trpc registradas (sessão anônima funciona durante a inicialização da BD)."
  );

  try {
    const { registerComercialOAuthRoutes } = await import("../comercial/oauth-routes");
    registerComercialOAuthRoutes(app);
    console.log("[Server] Rotas OAuth Conta Azul (módulo comercial) registradas.");
  } catch (e) {
    console.warn(
      "[Server] Módulo comercial OAuth não carregado:",
      e instanceof Error ? e.message : e
    );
  }

  registerPublicConfigRoute(app);
  registerGeocodeRoute(app);

  try {
    const { registerDiagnosticoEspacoComercialRoute } = await import(
      "../comercial/diagnostico-espaco-comercial-route"
    );
    registerDiagnosticoEspacoComercialRoute(app);
    console.log(
      "[Server] Rota GET /api/diagnostico/espaco-comercial registrada."
    );
  } catch (e) {
    console.warn(
      "[Server] Rota de diagnóstico de espaço comercial não carregada:",
      e instanceof Error ? e.message : e
    );
  }

  /** Site (HTML/JS/CSS) já disponível durante a inicialização da BD — evita página em branco / 404. */
  if (process.env.NODE_ENV !== "development") {
    serveStatic(app);
  }

  const rawPort = process.env.PORT?.trim();
  const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : NaN;
  const preferredPort =
    Number.isFinite(parsedPort) && parsedPort > 0
      ? parsedPort
      : DEFAULT_HTTP_PORT;
  if (isProd && rawPort && (!Number.isFinite(parsedPort) || parsedPort <= 0)) {
    console.error(
      `[Server] PORT inválido (${JSON.stringify(rawPort)}). Railway deve definir PORT numérico.`
    );
    process.exit(1);
  }
  if (isProd && !rawPort) {
    console.warn(
      `[Server] PORT não definido — a usar ${DEFAULT_HTTP_PORT}. No Railway defina PORT (geralmente injectado automaticamente).`
    );
  }
  const port = isProd ? preferredPort : await findAvailablePort(preferredPort);
  if (!isProd && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  const listenHost = process.env.HOST?.trim() || "0.0.0.0";
  if (isProd && (listenHost === "localhost" || listenHost === "127.0.0.1")) {
    console.warn(
      "[Server] HOST aponta para loopback — o tráfego externo (Railway) pode não chegar ao Node. Use 0.0.0.0 ou não defina HOST."
    );
  }

  await new Promise<void>((resolve, reject) => {
    server.listen(port, listenHost, () => resolve());
    server.once("error", reject);
  });
  writeDevServerPortFile(port);
  console.log(
    `[Server] À escuta na porta ${port} — healthcheck /healthz OK (Railway).`
  );
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
      console.log(
        `LAN: abra no outro aparelho http://<IPv4-deste-PC>:${port}/  (ipconfig → IPv4)`
      );
    }
  }

  const onSignal = () => {
    void shutdownMqtt();
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  console.log(
    "[Server] Preparando banco de dados… (Docker: espere o MySQL ~10–15 s na primeira vez)"
  );
  try {
    await runDrizzleMigrateFromEnv();
  } catch (e) {
    console.error(
      "[Server] Migrações Drizzle falharam — o site pode abrir mas a API pode falhar:",
      e
    );
    if (process.env.EXIT_ON_MIGRATE_FAILURE === "1") {
      process.exit(1);
    }
  }

  try {
    await runComercialPrismaMigrateFromEnv();
  } catch (e) {
    console.error(
      "[Server] Migrações Prisma (comercial) falharam — sync Conta Azul e /comercial podem falhar:",
      e
    );
    if (process.env.EXIT_ON_MIGRATE_FAILURE === "1") {
      process.exit(1);
    }
  }

  // Schema evolutivo (colunas/tabelas idempotentes) — fonte única partilhada com os testes.
  await applyRuntimeSchemaEnsures();
  try {
    const bf = await db.backfillLotesProducaoLegado();
    if (
      bf.lotesCriados > 0 ||
      bf.perfisVinculados > 0 ||
      bf.furosVinculados > 0 ||
      bf.eventosHistoricosImportados > 0 ||
      bf.eventosHistoricosRemovidos > 0
    ) {
      console.log(
        `[Server] Backfill lotes produção: projetos=${bf.projetosProcessados} lotes=${bf.lotesCriados} perfis=${bf.perfisVinculados} furos=${bf.furosVinculados} eventosHist=${bf.eventosHistoricosImportados} eventosRemovidos=${bf.eventosHistoricosRemovidos}`,
      );
    }
  } catch (e) {
    console.error("[Server] backfillLotesProducaoLegado falhou:", e);
  }
  try {
    const { sincronizarLogisticaTodasFichas } = await import("../custosProdutoLogisticaSync");
    const logistica = await sincronizarLogisticaTodasFichas();
    if (logistica.atualizadas > 0) {
      console.log(
        `[Server] Logística fichas: projetos=${logistica.projetos} fichas=${logistica.total} atualizadas=${logistica.atualizadas} deduplicadas=${logistica.deduplicadas}`,
      );
    }
  } catch (e) {
    console.error("[Server] sincronizarLogisticaTodasFichas falhou:", e);
  }
  try {
    const { executarCopiaPadraoCoentroRestaurante } = await import("../custosProdutoCopiarPadrao");
    const copia = await executarCopiaPadraoCoentroRestaurante();
    if (copia) {
      console.log(
        `[Server] Cópia padrão Coentro (${copia.origemEncontradaComo ?? copia.origem}): copiadas=${copia.copiadas.length} jaAlinhadas=${copia.jaAlinhadas.length} naoEncontradas=${copia.naoEncontradas.length} erros=${copia.erros.length}`,
      );
      if (copia.copiadas.length > 0) {
        console.log(`[Server] Cópia padrão Coentro — fichas: ${copia.copiadas.join("; ")}`);
      }
      if (copia.erros.length > 0) {
        console.warn("[Server] Cópia padrão Coentro — erros:", copia.erros.join(" | "));
      }
    }
  } catch (e) {
    console.error("[Server] executarCopiaPadraoCoentroRestaurante falhou:", e);
  }
  await db.ensureProjetoMembershipsBootstrap();
  if (process.env.AUTO_MIGRATE_LEGACY_DATA === "1") {
    try {
      const r = await db.migrateAllOperationalDataToFazendaVerticalPrincipal();
      console.log(
        "[Server] AUTO_MIGRATE_LEGACY_DATA=1 concluído — fvpId=%s torres=%s ciclos=%s erros=%s",
        r.fvpId,
        r.verification.torres,
        r.verification.ciclos,
        r.mergeErrors.length
      );
    } catch (e) {
      console.error("[Server] AUTO_MIGRATE_LEGACY_DATA falhou:", e);
    }
  }
  await ensureBootstrapAdmin();
  await runFupPilotoBootstrapIfNeeded();
  console.log("[Server] Banco OK.");

  try {
    const { ensureComercialBootstrapUsuario } = await import(
      "../comercial/bootstrap-comercial-admin"
    );
    await ensureComercialBootstrapUsuario();
  } catch (e) {
    console.warn(
      "[Server] Bootstrap usuário comercial ignorado:",
      e instanceof Error ? e.message : e
    );
  }

  const { tryStartComercialIntegrationJobs } = await import(
    "../comercial/start-integration-jobs"
  );
  tryStartComercialIntegrationJobs();

  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, server);
  }

  console.log(
    "[Server] API pronta" +
      (isProd ? " (site estático + tRPC à escuta)." : " + Vite.")
  );
  void initMqttFromEnv().catch(e =>
    console.warn("[MQTT] Falha ao iniciar:", e)
  );
}

startServer().catch(console.error);
