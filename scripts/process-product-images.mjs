/**
 * Turns AI-generated master images into optimised storefront WebP files.
 *
 *   assets/product-masters/<slug>.(png|jpg|jpeg|webp)  ->  public/products/ai/<slug>.webp
 *
 * Masters should be square and >= 1536px. Output is up to 1200px square WebP (never upscaled), quality
 * stepped down until it is <= TARGET_KB (default 200) or the floor is reached.
 * Only slugs that exist in prisma/catalogue-additions.ts are processed.
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, parse } from "node:path";

const IN = "assets/product-masters";
const OUT = "public/products/ai";
const SIZE = 1200;
const TARGET_KB = Number(process.env.TARGET_KB || 200);
const slugs = new Set([...(await import("node:fs")).readFileSync("prisma/catalogue-additions.ts", "utf8").matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]));

mkdirSync(OUT, { recursive: true });
if (!existsSync(IN)) { console.log(`No masters directory (${IN}). Nothing to do.`); process.exit(0); }
const report = [];
for (const file of readdirSync(IN)) {
  const { name, ext } = parse(file);
  if (!/^\.(png|jpe?g|webp)$/i.test(ext)) continue;
  if (!slugs.has(name)) { console.warn(`skip ${file}: not a known catalogue slug`); continue; }
  const meta = await sharp(join(IN, file)).metadata();
  let q = 82, buf;
  do {
    buf = await sharp(join(IN, file)).resize(SIZE, SIZE, { fit: "cover", withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toBuffer();
    q -= 6;
  } while (buf.length > TARGET_KB * 1024 && q >= 50);
  writeFileSync(join(OUT, `${name}.webp`), buf);
  report.push({ slug: name, master: `${meta.width}x${meta.height}`, kb: Math.round(buf.length / 1024), square: meta.width === meta.height });
}
console.table(report);
