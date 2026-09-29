import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
let building = false, pending = false, debounce;
const server = spawn(process.execPath, ["node_modules/http-server/bin/http-server", "-p", process.env.PORT || "8000", "-c-1", "-a", "127.0.0.1"], { cwd: root, stdio: "inherit" });
let builder;
function build() {
  if (building) { pending = true; return; }
  building = true;
  builder = spawn("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  builder.on("exit", () => { building = false; if (pending) { pending = false; build(); } });
}
for (const dir of ["templates", "locales", "content", "css", "assets/js"]) {
  watch(new URL("../" + dir, import.meta.url), () => { clearTimeout(debounce); debounce = setTimeout(build, 100); });
}
build();
function stop() { builder?.kill(); server.kill(); process.exit(); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
