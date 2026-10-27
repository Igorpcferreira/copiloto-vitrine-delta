import { spawn } from "node:child_process";
const mode = process.argv[2] || "dev";
if (!["dev", "build", "start"].includes(mode))
  throw new Error("Invalid demo mode");
console.log("[Delta] Demo local: catálogo estático Radial; sem sincronização de estoque ou envio de leads.");
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", mode, ...process.argv.slice(3)],
  { stdio: "inherit", env: { ...process.env, VITRINE_DEMO: "true" } },
);
child.on("exit", (code) => process.exit(code ?? 1));
