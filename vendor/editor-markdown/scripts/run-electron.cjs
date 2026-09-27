#!/usr/bin/env node
/**
 * Lanza Electron filtrando ruido conocido en stderr (Fontconfig / VSync en Linux).
 */
const { spawn } = require("node:child_process");
const path = require("node:path");
const electronPath = require("electron");

const root = path.resolve(__dirname, "..");
const noise = /Fontconfig warning:|GetVSyncParametersIfAvailable\(\)/;

const child = spawn(electronPath, ["."], {
  cwd: root,
  env: {
    ...process.env,
    // Cache propio para no pisar el de Fontconfig del sistema (Arch + Electron).
    XDG_CACHE_HOME: path.join(root, ".cache"),
  },
  stdio: ["inherit", "inherit", "pipe"],
});

let stderrBuf = "";

child.stderr.on("data", (chunk) => {
  stderrBuf += chunk.toString();
  const lines = stderrBuf.split("\n");
  stderrBuf = lines.pop() ?? "";

  for (const line of lines) {
    if (!noise.test(line)) {
      process.stderr.write(`${line}\n`);
    }
  }
});

child.stderr.on("end", () => {
  if (stderrBuf && !noise.test(stderrBuf)) {
    process.stderr.write(stderrBuf);
  }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
