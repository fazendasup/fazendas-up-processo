import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const convert = require("heic-convert") as (opts: {
  buffer: Buffer;
  format: "JPEG";
  quality: number;
}) => Promise<ArrayBuffer>;

const origem = "c:\\Users\\adson\\OneDrive\\Área de Trabalho\\Fotos site";
const destino = path.join(origem, "previas");
await mkdir(destino, { recursive: true });

const bruto = await readFile(path.join(origem, "IMG_6625.HEIC"));
const jpeg = Buffer.from(await convert({ buffer: bruto, format: "JPEG", quality: 0.85 }));
const cheia = path.join(destino, "IMG_6625.jpg");
await writeFile(cheia, jpeg);
await sharp(jpeg).resize(900, 1200, { fit: "inside" }).jpeg({ quality: 80 }).toFile(path.join(destino, "IMG_6625-mini.jpg"));
console.log(jpeg.length);
