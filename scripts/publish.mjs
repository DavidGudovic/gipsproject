import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const publicPaths = ["index.html", "en", "assets", "robots.txt", "sitemap.xml", "llms.txt"];
const extensions = new Set([".html", ".css", ".js", ".woff", ".woff2", ".ttf", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico", ".txt", ".xml"]);
let count = 0;

async function copyPublic(relative, target) {
  const source = path.join(root, relative);
  const stat = await fs.lstat(source);
  if (relative.split(path.sep).some(part => part.startsWith(".")) || stat.isSymbolicLink()) {
    throw new Error(`Refusing hidden file or symlink: ${relative}`);
  }
  if (stat.isDirectory()) {
    await fs.mkdir(path.join(target, relative), { recursive: true, mode: 0o755 });
    for (const entry of await fs.readdir(source)) await copyPublic(path.join(relative, entry), target);
    return;
  }
  if (!stat.isFile() || !extensions.has(path.extname(relative).toLowerCase())) {
    throw new Error(`Unexpected public file: ${relative}`);
  }
  await fs.copyFile(source, path.join(target, relative));
  await fs.chmod(path.join(target, relative), 0o644);
  count++;
}

const staging = await fs.mkdtemp(path.join(root, ".dist-"));
try {
  for (const relative of publicPaths) await copyPublic(relative, staging);
  for (const required of ["index.html", "en/index.html", "assets/css/main.css", "robots.txt", "sitemap.xml", "llms.txt"]) {
    if (!(await fs.stat(path.join(staging, required))).isFile()) throw new Error(`Missing public file: ${required}`);
  }
  const existing = await fs.lstat(output).catch(error => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error("dist must be a normal generated directory");
  await fs.rm(output, { recursive: true, force: true });
  await fs.rename(staging, output);
  await fs.chmod(output, 0o755);
  console.log(`Published ${count} public files to dist/ (no repository, source files or dependencies).`);
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
