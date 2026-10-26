import "dotenv/config";
import { createRequire } from "node:module";
import { inflateRawSync } from "node:zlib";
import { getComercialPrisma } from "../server/comercial/db";
import { getComercialEnv } from "../server/comercial/env";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service";
import { createContaAzulHttp } from "../server/comercial/integrations/conta-azul/conta-azul.client";

const require = createRequire(import.meta.url);
const { gerarPDF } = require("nfe-danfe-pdf") as {
  gerarPDF: (xml: string) => Promise<object>;
};
const pdfkitPath = require.resolve("pdfkit", { paths: [require.resolve("nfe-danfe-pdf")] });
const PDFDocument = require(pdfkitPath) as { prototype: { end: (...args: unknown[]) => unknown } };
const capturas = new WeakMap<object, Buffer[]>();
const fimOriginal = PDFDocument.prototype.end;
PDFDocument.prototype.end = function (this: object, ...args: unknown[]) {
  const partes: Buffer[] = [];
  capturas.set(this, partes);
  (this as { on: Function }).on("data", (chunk: Buffer) => partes.push(Buffer.from(chunk)));
  return fimOriginal.apply(this, args);
};

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);
const lista = await http.get(
  "/v1/notas-fiscais?data_inicial=2026-10-01&data_final=2026-10-11&pagina=1&tamanho_pagina=10",
  { validateStatus: () => true },
);
const chave = lista.data?.itens?.[0]?.chave_acesso as string | undefined;
if (!chave) throw new Error("sem nota");
const arquivo = await http.get(`/v1/notas-fiscais/${chave}`, {
  validateStatus: () => true,
  responseType: "arraybuffer",
});
const bytes = Buffer.from(arquivo.data);
let xml = bytes.toString("utf8");
if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
  const method = bytes.readUInt16LE(8);
  const compSize = bytes.readUInt32LE(18);
  const nameLen = bytes.readUInt16LE(26);
  const extraLen = bytes.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;
  const data = bytes.subarray(start, start + compSize);
  xml = (method === 8 ? inflateRawSync(data) : data).toString("utf8");
}
const doc = await gerarPDF(xml);
const pdf = await new Promise<Buffer>((resolve) => {
  (doc as { on: Function }).on("end", () => resolve(Buffer.concat(capturas.get(doc) ?? [])));
});
console.log(pdf.subarray(0, 5).toString("utf8"), pdf.length, pdf.toString("latin1").includes("DANFE"));
await prisma.$disconnect();
