// Génère les icônes PWA à partir de public/logo.png
// Usage : node scripts/gen-icons.mjs
import sharp from "sharp";

const SRC = "public/logo.png";
const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  // Icônes "any" (logo sur fond blanc, contenu entier)
  await sharp(SRC)
    .resize(192, 192, { fit: "contain", background: white })
    .flatten({ background: white })
    .png()
    .toFile("public/icon-192.png");

  await sharp(SRC)
    .resize(512, 512, { fit: "contain", background: white })
    .flatten({ background: white })
    .png()
    .toFile("public/icon-512.png");

  await sharp(SRC)
    .resize(180, 180, { fit: "contain", background: white })
    .flatten({ background: white })
    .png()
    .toFile("public/apple-touch-icon.png");

  // Icône maskable : logo réduit à ~70% dans une zone sûre, fond blanc plein
  const inner = await sharp(SRC)
    .resize(360, 360, { fit: "contain", background: white })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: white },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile("public/icon-maskable-512.png");

  console.log("Icônes PWA générées : icon-192, icon-512, icon-maskable-512, apple-icon");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
