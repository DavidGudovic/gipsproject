// One-time: convert curated work photos to WebP (full + thumb), build the og-image,
// and derive optimized logo/favicon assets. Run via `npm run images`.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = (f) => path.join(root, "resources/images", f);
const outDir = path.join(root, "assets/img/work");
mkdirSync(outDir, { recursive: true });
mkdirSync(path.join(root, "assets/img"), { recursive: true });

// Gallery order: strongest work first, mixed orientations for the masonry flow.
const CURATED = [
  "image35.jpeg", // swirl decorative ceiling
  "image37.jpeg", // craftsman shaping curved column
  "image6.jpeg",  // coffered grid ceiling
  "image33.jpeg", // curved columns + niche shelving
  "image25.jpeg", // corridor portals
  "image31.jpeg", // TV wall with niche
  "image38.jpeg", // swirl ceiling, coastal view
  "image16.jpeg", // perforated acoustic wall panels
  "image20.jpeg", // living room feature wall
  "image30.jpeg", // curved stud framing
  "image14.jpeg", // perforated acoustic ceiling
  "image17.jpeg", // commercial suspended ceiling build
];

const results = [];
for (let i = 0; i < CURATED.length; i++) {
  const name = `work-${String(i + 1).padStart(2, "0")}`;
  const base = sharp(src(CURATED[i])).rotate(); // .rotate() applies EXIF orientation
  const full = await base
    .clone()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${name}.webp`));
  await base
    .clone()
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(outDir, `${name}-thumb.webp`));
  results.push({ name, source: CURATED[i], w: full.width, h: full.height });
}

await sharp(src("image35.jpeg"))
  .rotate()
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .jpeg({ quality: 82 })
  .toFile(path.join(root, "assets/img/og-image.jpg"));

const logo = path.join(root, "resources/logo.png");
await sharp(logo)
  .resize(480, null, { withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(path.join(root, "assets/img/logo.webp"));
await sharp(logo).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(path.join(root, "assets/img/favicon-32.png"));
await sharp(logo).resize(180, 180, { fit: "contain", background: { r: 251, g: 248, b: 242, alpha: 1 } })
  .png().toFile(path.join(root, "assets/img/apple-touch-icon.png"));

console.table(results);
console.log("Done. Update content/images.js if the curated list changed.");
