#!/usr/bin/env node
/**
 * Genera CRON_SECRET (se assente) in .env e lo sincronizza su Vercel.
 * Non stampa il valore del secret.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const targetCwd = path.join(root, "apps/web");

function readEnv(content) {
  const lines = content.split("\n");
  const vars = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return { lines, vars };
}

function upsertCronSecret(content, secret) {
  const marker = "# Cron Vercel — keepalive database Supabase";
  const block = [
    "",
    "# =============================================================================",
    marker,
    "# Genera un valore casuale; Vercel lo invia come Bearer su /api/cron/db-check",
    "# =============================================================================",
    `CRON_SECRET=${secret}`,
  ].join("\n");

  if (content.includes("CRON_SECRET=")) {
    return content.replace(/^CRON_SECRET=.*$/m, `CRON_SECRET=${secret}`);
  }

  if (content.includes(marker)) {
    return content.replace(/# =+\n# Cron Vercel[\s\S]*?(?=\n# =+|\n*$)/, block.trim());
  }

  const trimmed = content.replace(/\s*$/, "");
  return `${trimmed}${block}\n`;
}

let content = "";
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, "utf8");
}

const { vars } = readEnv(content);
let secret = vars.CRON_SECRET?.replace(/^["']|["']$/g, "");
let created = false;

if (!secret) {
  secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(envPath, upsertCronSecret(content, secret), "utf8");
  created = true;
  console.log("CRON_SECRET creato in .env");
} else {
  console.log("CRON_SECRET già presente in .env");
}

const environments = ["production", "preview", "development"];
let synced = 0;

for (const env of environments) {
  const add = spawnSync(
    "npx",
    ["vercel@latest", "env", "add", "CRON_SECRET", env, "--yes", "--force"],
    {
      input: secret,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      cwd: targetCwd,
    }
  );
  if (add.status === 0) {
    synced += 1;
    console.log(`  OK CRON_SECRET [${env}]`);
  } else {
    const err = (add.stderr || add.stdout || "").trim();
    console.error(`  Errore CRON_SECRET [${env}]: ${err || "sconosciuto"}`);
  }
}

if (synced === 0) {
  console.error(
    "Nessuna variabile sincronizzata su Vercel. Verifica login CLI: npx vercel whoami"
  );
  process.exit(1);
}

console.log(
  created
    ? "Setup completato: secret locale + Vercel."
    : "Setup completato: secret esistente sincronizzato su Vercel."
);
