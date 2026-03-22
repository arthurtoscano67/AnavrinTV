#!/usr/bin/env node

import { rename, access, mkdir, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const apiDir = path.join(cwd, "src", "app", "api");
const proxyRouteFile = path.join(cwd, "src", "app", "proxy", "route.ts");
const tempRoot = path.join(cwd, ".pages-build-temp");
const hiddenApiDir = path.join(tempRoot, "api");
const hiddenProxyRouteFile = path.join(tempRoot, "proxy-route.ts");

async function exists(target) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function withHiddenApiDirectory(run) {
  const apiExists = await exists(apiDir);
  const proxyRouteExists = await exists(proxyRouteFile);

  if (apiExists || proxyRouteExists) {
    await mkdir(tempRoot, { recursive: true });
  }

  if (apiExists) {
    if (await exists(hiddenApiDir)) {
      throw new Error(`Temporary Pages build directory already exists: ${hiddenApiDir}`);
    }

    await rename(apiDir, hiddenApiDir);
  }

  if (proxyRouteExists) {
    if (await exists(hiddenProxyRouteFile)) {
      throw new Error(`Temporary Pages proxy route already exists: ${hiddenProxyRouteFile}`);
    }

    await rename(proxyRouteFile, hiddenProxyRouteFile);
  }

  try {
    return await run();
  } finally {
    if (await exists(hiddenProxyRouteFile)) {
      await rename(hiddenProxyRouteFile, proxyRouteFile);
    }

    if (await exists(hiddenApiDir)) {
      await rename(hiddenApiDir, apiDir);
    }

    if (await exists(tempRoot)) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

async function main() {
  await withHiddenApiDirectory(
    () =>
      new Promise((resolve, reject) => {
        const env = {
          ...process.env,
          GITHUB_PAGES: "true",
          NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "root",
        };

        const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
          cwd,
          env,
          stdio: "inherit",
        });

        child.on("exit", (code, signal) => {
          if (signal) {
            reject(new Error(`Pages build terminated by signal ${signal}.`));
            return;
          }

          if (code !== 0) {
            reject(new Error(`Pages build failed with exit code ${code ?? 1}.`));
            return;
          }

          resolve();
        });
      }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Pages build failed.");
  process.exit(1);
});
