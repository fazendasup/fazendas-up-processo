import "dotenv/config";
import ngrok from "@ngrok/ngrok";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Garante leitura do .env na raiz do projeto (cmd as vezes inicia em outra pasta). */
function loadEnvFromRoot() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) {
    console.error(
      `Nao existe .env em:\n  ${envPath}\n` +
        "Crie com pnpm run setup:env ou copie env.defaults para .env e adicione NGROK_AUTHTOKEN."
    );
    process.exit(1);
  }
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFromRoot();

const devPortFile = path.join(root, ".dev-server-port");
let port = Number.parseInt(process.env.PORT ?? "3456", 10);
if (existsSync(devPortFile)) {
  const fromFile = Number.parseInt(readFileSync(devPortFile, "utf8").trim(), 10);
  if (Number.isFinite(fromFile) && fromFile >= 1 && fromFile <= 65535) {
    port = fromFile;
    console.log(`Porta do tunel: ${port} (lida de .dev-server-port apos pnpm dev).`);
  }
}
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error("PORT invalida no ambiente.");
  process.exit(1);
}

if (!process.env.NGROK_AUTHTOKEN?.trim()) {
  console.error(
    "NGROK_AUTHTOKEN vazio. No arquivo .env na pasta do projeto adicione:\n" +
      "NGROK_AUTHTOKEN=seu_token\n\n" +
      "Token: https://dashboard.ngrok.com/get-started/your-authtoken"
  );
  process.exit(1);
}

ngrok.loggingCallback((level, _target, message) => {
  console.error(`[ngrok ${level}] ${message}`);
}, "INFO");

console.log("");
console.log("AVISO: cada sessao do ngrok gera um link NOVO.");
console.log("Links antigos (ex.: ...ngrok-free.dev) param de funcionar quando voce fecha o tunel");
console.log("ou o PC — erro ERR_NGROK_3200 = tunel offline. Use sempre o link impresso abaixo.");
console.log("");
console.log("Conectando ao ngrok (pode levar ate 1-2 min em rede lenta)...");

function waitForUrl(listener, maxAttempts = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      const u = listener.url();
      if (u) {
        clearInterval(id);
        resolve(u);
        return;
      }
      if (n >= maxAttempts) {
        clearInterval(id);
        reject(new Error("URL publica nao apareceu a tempo."));
      }
    }, intervalMs);
  });
}

const connectMs = 120_000;
const ngrokDomain = process.env.NGROK_DOMAIN?.trim();
if (ngrokDomain) {
  console.log(`Dominio reservado ngrok: ${ngrokDomain} (conta ngrok com dominio fixo).`);
}

let listener;
try {
  listener = await Promise.race([
    ngrok.forward({
      addr: port,
      authtoken_from_env: true,
      ...(ngrokDomain ? { domain: ngrokDomain } : {}),
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout ${connectMs / 1000}s ao conectar ao ngrok. Firewall ou rede bloqueando?`)),
        connectMs
      )
    ),
  ]);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

let url = listener.url();
if (!url) {
  try {
    url = await waitForUrl(listener);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    try {
      await listener.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
}

const urlFile = path.join(root, ".ngrok-public-url");
try {
  const base = url.replace(/\/$/, "");
  writeFileSync(
    urlFile,
    `${base}\n${base}/hoje\n`,
    "utf8"
  );
  console.log(`URL salva em: ${urlFile} (atualize o atalho / favorito com o conteudo desse arquivo).`);
} catch (e) {
  console.error("Nao foi possivel gravar .ngrok-public-url:", e instanceof Error ? e.message : e);
}

console.log("");
console.log("========================================");
console.log("  URL PARA O CELULAR (copie tudo):");
console.log(`  ${url}`);
console.log("  Pagina Hoje:");
console.log(`  ${url.replace(/\/$/, "")}/hoje`);
console.log("========================================");
console.log("");
console.log(`Tunel ativo -> localhost:${port} (pnpm dev precisa estar rodando).`);
console.log("Ctrl+C aqui encerra o tunel.");

const shutdown = async () => {
  try {
    await listener.close();
  } catch {
    /* ignore */
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// Mantém o processo vivo mesmo em ambientes onde stdin fecha automaticamente.
const keepAlive = setInterval(() => {}, 60_000);
process.stdin.resume();
process.stdin.on("end", () => {
  /* stdin pode fechar em terminais não interativos; ignorar */
});
process.on("exit", () => clearInterval(keepAlive));
