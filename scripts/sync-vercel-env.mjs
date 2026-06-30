#!/usr/bin/env node
/**
 * Sincronizza variabili da .env verso un progetto Vercel (senza stampare i valori).
 * Uso: node scripts/sync-vercel-env.mjs [apps/web] [--skip KEY1,KEY2]
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetCwd = path.resolve(root, process.argv[2] ?? "apps/web");
const skipArg = process.argv.find((a) => a.startsWith("--skip="));
const skip = new Set(
  (skipArg?.slice("--skip=".length) ??
    "API_PORT,STORAGE_PATH,SUPABASE_ACCESS_TOKEN,NEXT_PUBLIC_API_URL,AUTH_ENABLED")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  console.error("File .env non trovato nella root del monorepo.");
  process.exit(1);
}

function parseEnv(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value || value.includes("your-") || value === "change-me-in-production") continue;
    vars[key] = value;
  }
  return vars;
}

const vars = parseEnv(fs.readFileSync(envPath, "utf8"));
const keys = Object.keys(vars).filter((k) => !skip.has(k));

console.log(`Sincronizzazione ${keys.length} variabili verso ${targetCwd}`);

// MVP: auth disabilitata in produzione finché il login non è validato end-to-end
for (const env of ["production", "preview"]) {
  const add = spawnSync(
    "npx",
    ["vercel@latest", "env", "add", "AUTH_ENABLED", env, "--yes", "--force"],
    { input: "false", encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], shell: true, cwd: targetCwd }
  );
  if (add.status === 0) console.log(`  OK AUTH_ENABLED [${env}] = false (forzato MVP)`);
}

for (const key of keys) {
  const value = vars[key];
  for (const env of ["production", "preview", "development"]) {
    const add = spawnSync(
      "npx",
      ["vercel@latest", "env", "add", key, env, "--yes", "--force"],
      {
        input: value,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        cwd: targetCwd,
      }
    );
    if (add.status !== 0 && !add.stderr?.includes("already exists")) {
      console.error(`Errore su ${key} (${env}):`, add.stderr?.trim() || add.stdout?.trim());
    } else {
      console.log(`  OK ${key} [${env}]`);
    }
  }
}

console.log("Sincronizzazione completata.");
