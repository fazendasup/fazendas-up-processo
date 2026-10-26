import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const origem = "C:\\Users\\adson\\.cursor\\projects\\c-Users-adson-dev-fazendas-up-processo\\assets\\manjericao-folhas.jpg";
const destinos = [
  "C:\\Users\\adson\\fazendas_up_site\\client\\public\\produtos",
  "c:\\Users\\adson\\OneDrive\\Área de Trabalho\\Fotos site\\editadas",
];

for (const pasta of destinos) await mkdir(pasta, { recursive: true });

const buffer = await sharp(origem)
  .resize(1600, 2133, { fit: "cover", position: "centre" })
  .jpeg({ quality: 90, mozjpeg: true })
  .toBuffer();

for (const pasta of destinos) {
  const saida = path.join(pasta, "manjericao.jpg");
  await sharp(buffer).toFile(saida);
  console.log(saida, buffer.length);
}
