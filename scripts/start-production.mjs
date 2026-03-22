#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const standaloneServer = path.join(process.cwd(), ".next", "standalone", "server.js");
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const args = existsSync(standaloneServer) ? [standaloneServer] : [nextBin, "start"];
const env = {
  ...process.env,
  PORT: process.env.PORT || "8080",
  HOSTNAME: "0.0.0.0",
};

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
