import sharp from "sharp";

await sharp("c:/Users/adson/OneDrive/Área de Trabalho/Fotos site/previas/IMG_0989.jpg")
  .resize(900, 1200, { fit: "inside" })
  .jpeg({ quality: 80 })
  .toFile("c:/Users/adson/OneDrive/Área de Trabalho/Fotos site/previas/IMG_0989-mini.jpg");
console.log("ok");
