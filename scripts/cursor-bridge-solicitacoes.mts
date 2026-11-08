/**
 * Cliente CLI da fila Assistente → Cursor.
 *
 * Env:
 *   FUP_APP_URL=https://app.fazendasup.com.br
 *   CURSOR_BRIDGE_SECRET=...
 *
 * Uso:
 *   npx tsx scripts/cursor-bridge-solicitacoes.mts list
 *   npx tsx scripts/cursor-bridge-solicitacoes.mts claim <id>
 *   npx tsx scripts/cursor-bridge-solicitacoes.mts concluir <id> "<resultado>" [commitSha]
 *   npx tsx scripts/cursor-bridge-solicitacoes.mts falhou <id> "<erro>"
 */
import "dotenv/config";

const base = (process.env.FUP_APP_URL ?? process.env.PUBLIC_APP_URL ?? "https://app.fazendasup.com.br")
  .trim()
  .replace(/\/$/, "");
const secret = (process.env.CURSOR_BRIDGE_SECRET ?? "").trim();

if (!secret) {
  console.error("Defina CURSOR_BRIDGE_SECRET (mesmo valor do Railway).");
  process.exit(1);
}

const [cmd, ...rest] = process.argv.slice(2);

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    console.error(res.status, json);
    process.exit(1);
  }
  return json;
}

if (!cmd || cmd === "help") {
  console.log(`FUP cursor-bridge @ ${base}
  list
  claim <id>
  concluir <id> "<resultado>" [commitSha]
  falhou <id> "<erro>"`);
  process.exit(0);
}

if (cmd === "list") {
  const data = await api("/api/cursor-bridge/solicitacoes?status=pendente");
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

if (cmd === "claim") {
  const id = Number(rest[0]);
  if (!id) {
    console.error("Uso: claim <id>");
    process.exit(1);
  }
  const data = await api(`/api/cursor-bridge/solicitacoes/${id}/claim`, { method: "POST", body: "{}" });
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

if (cmd === "concluir") {
  const id = Number(rest[0]);
  const resultado = rest[1];
  const commitSha = rest[2];
  if (!id || !resultado) {
    console.error('Uso: concluir <id> "<resultado>" [commitSha]');
    process.exit(1);
  }
  const data = await api(`/api/cursor-bridge/solicitacoes/${id}/concluir`, {
    method: "POST",
    body: JSON.stringify({ resultado, commitSha: commitSha || undefined }),
  });
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

if (cmd === "falhou") {
  const id = Number(rest[0]);
  const erro = rest[1] ?? "falha";
  if (!id) {
    console.error('Uso: falhou <id> "<erro>"');
    process.exit(1);
  }
  const data = await api(`/api/cursor-bridge/solicitacoes/${id}/falhou`, {
    method: "POST",
    body: JSON.stringify({ erro }),
  });
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.error(`Comando desconhecido: ${cmd}`);
process.exit(1);
