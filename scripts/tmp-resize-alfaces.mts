import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const origem = "C:\\Users\\adson\\.cursor\\projects\\c-Users-adson-dev-fazendas-up-processo\\assets";
const destinos = [
  "C:\\Users\\adson\\fazendas_up_site\\client\\public\\produtos",
  "c:\\Users\\adson\\OneDrive\\Área de Trabalho\\Fotos site\\editadas",
];
const arquivos = [
  ["alface-americana-2.jpg", "americana.jpg"],
  ["alface-crespa-roxa.jpg", "alface-roxa.jpg"],
  ["alface-crespa.jpg", "alface.jpg"],
];

for (const pasta of destinos) await mkdir(pasta, { recursive: true });

for (const [entrada, saidaNome] of arquivos) {
  const buffer = await sharp(path.join(origem, entrada))
    .resize(1600, 2133, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  for (const pasta of destinos) {
    const saida = path.join(pasta, saidaNome);
    await sharp(buffer).toFile(saida);
    console.log(saida, buffer.length);
  }
}
