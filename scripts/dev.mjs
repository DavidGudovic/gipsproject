// Dev runner: Tailwind watch + static server, both torn down together on Ctrl-C.
// (tailwind --watch can't be shell-backgrounded with `&` — it exits when stdin
// closes and truncates the output css on the way out.)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = (name) => `${root}node_modules/.bin/${name}`;
const port = process.env.PORT || "8000";

const tailwind = spawn(
  bin("tailwindcss"),
  ["-i", "css/input.css", "-o", "assets/css/main.css", "--watch=always"],
  { cwd: root, stdio: "inherit" }
);
const server = spawn(bin("http-server"), ["-p", port, "-c-1", root], { stdio: "inherit" });

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  tailwind.kill();
  server.kill();
  process.exit(code);
};
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
tailwind.on("exit", (code) => stop(code ?? 1));
server.on("exit", (code) => stop(code ?? 1));
