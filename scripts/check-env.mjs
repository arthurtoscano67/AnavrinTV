#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const strict = process.argv.includes("--strict");
const cwd = process.cwd();
const envFiles = [".env", ".env.production", ".env.local"];

function parseEnvFile(filePath) {
  const parsed = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

const fileEnv = {};
const foundFiles = [];

for (const name of envFiles) {
  const fullPath = path.join(cwd, name);
  if (!existsSync(fullPath)) continue;
  Object.assign(fileEnv, parseEnvFile(fullPath));
  foundFiles.push(name);
}

const env = { ...fileEnv, ...process.env };
const get = (name) => String(env[name] ?? "").trim();

const warnings = [];
const errors = [];

function requireKey(name, detail) {
  if (!get(name)) {
    errors.push(detail ?? `${name} is missing.`);
  }
}

function warnKey(name, detail) {
  if (!get(name)) {
    warnings.push(detail ?? `${name} is missing.`);
  }
}

function validateJsonArray(name, detail) {
  const raw = get(name);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      errors.push(detail ?? `${name} must be a non-empty JSON array.`);
    }
  } catch {
    errors.push(detail ?? `${name} must contain valid JSON.`);
  }
}

if (strict) {
  requireKey("NEXT_PUBLIC_SUI_NETWORK", "NEXT_PUBLIC_SUI_NETWORK is required.");
  requireKey("NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID", "NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID is required.");
  requireKey("NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS", "NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS is required.");
  requireKey("ANAVRIN_SEAL_KEY", "ANAVRIN_SEAL_KEY is required.");
  requireKey("ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY", "ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY is required.");
  requireKey("NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON", "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON is required.");
  validateJsonArray(
    "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON",
    "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON must be a valid, non-empty JSON array of Seal server configs.",
  );
} else {
  warnKey("NEXT_PUBLIC_SUI_NETWORK", "NEXT_PUBLIC_SUI_NETWORK is missing.");
  warnKey("NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID", "NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID is missing.");
  warnKey("NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS", "NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS is missing.");
  warnKey("ANAVRIN_SEAL_KEY", "ANAVRIN_SEAL_KEY is missing.");
  warnKey("ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY", "ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY is missing.");
  warnKey(
    "NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL",
    "NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL is missing. Direct Walrus writes will be used instead.",
  );
  warnKey("NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON", "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON is missing.");
  warnKey("NEXT_PUBLIC_ENOKI_API_KEY", "NEXT_PUBLIC_ENOKI_API_KEY is missing. zkLogin will be disabled.");
  warnKey(
    "NEXT_PUBLIC_ENOKI_REDIRECT_URL",
    "NEXT_PUBLIC_ENOKI_REDIRECT_URL is missing. zkLogin redirect flows will rely on the current origin.",
  );
  warnKey("NEXT_PUBLIC_ENOKI_GOOGLE_CLIENT_ID", "Google zkLogin client ID is missing.");
  warnKey("NEXT_PUBLIC_ENOKI_FACEBOOK_CLIENT_ID", "Facebook zkLogin client ID is missing.");
  warnKey("NEXT_PUBLIC_ENOKI_TWITCH_CLIENT_ID", "Twitch zkLogin client ID is missing.");

  const hasAnyEnokiProvider =
    get("NEXT_PUBLIC_ENOKI_GOOGLE_CLIENT_ID") ||
    get("NEXT_PUBLIC_ENOKI_FACEBOOK_CLIENT_ID") ||
    get("NEXT_PUBLIC_ENOKI_TWITCH_CLIENT_ID");

  if (!hasAnyEnokiProvider) {
    warnings.push("No Enoki OAuth provider client IDs are configured.");
  }

  if (get("NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON")) {
    validateJsonArray(
      "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON",
      "NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON must be a valid, non-empty JSON array of Seal server configs.",
    );
  }
}

const missingSummary = errors.length ? `\n- ${errors.join("\n- ")}` : "";
const warningSummary = warnings.length ? `\n- ${warnings.join("\n- ")}` : "";

if (foundFiles.length) {
  console.log(`Loaded env files: ${foundFiles.join(", ")}`);
} else {
  console.log("No local env files found. Using process environment only.");
}

if (errors.length) {
  console.error(`\nEnvironment check failed:${missingSummary}`);
  if (warningSummary) {
    console.warn(`\nWarnings:${warningSummary}`);
  }
  process.exit(1);
}

if (warningSummary) {
  console.warn(`\nWarnings:${warningSummary}`);
}

if (strict) {
  console.log("\nEnvironment check passed in strict mode.");
} else {
  console.log("\nEnvironment check passed.");
}
