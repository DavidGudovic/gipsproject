// One-time: pull the base64 logo out of the old parking page into resources/logo.png.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const match = html.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
if (!match) {
  console.error("No base64 PNG found in index.html");
  process.exit(1);
}
const out = new URL("../resources/logo.png", import.meta.url);
writeFileSync(out, Buffer.from(match[1], "base64"));
console.log(`Wrote resources/logo.png (${match[1].length} base64 chars)`);
