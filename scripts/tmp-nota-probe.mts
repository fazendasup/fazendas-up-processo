import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db";
import { getComercialEnv } from "../server/comercial/env";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service";
import { createContaAzulHttp } from "../server/comercial/integrations/conta-azul/conta-azul.client";

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);

async function tentar(path: string) {
  const response = await http.get(path, {
    validateStatus: () => true,
    responseType: "arraybuffer",
    headers: { accept: "application/json, application/xml, application/pdf, */*" },
  });
  const buf = Buffer.from(response.data);
  const inicio = buf.subarray(0, 12).toString("utf8").replace(/[^\x20-\x7E]/g, ".");
  console.log(response.status, path.split("?")[0], buf.length, inicio);
}

await tentar("/v1/notas-fiscais?data_inicial=2026-09-27&data_final=2026-10-11&pagina=1&tamanho_pagina=10");
await tentar("/v1/notas-fiscais/13261050321726000102550010000046281650141999");

await prisma.$disconnect();
