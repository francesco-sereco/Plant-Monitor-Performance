#!/usr/bin/env node
/**
 * Verifica completezza variabili .env per deploy Vercel (progetto unificato).
 * Non stampa i valori, solo presenza e placeholder.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
  "STORAGE_BACKEND",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

const OPTIONAL = ["AUTH_ENABLED", "MAX_PDF_SIZE_MB", "R2_OBJECT_PREFIX", "SUPABASE_DB_PASSWORD"];

const PLACEHOLDER = /your-|change-me|\[PASSWORD\]/i;

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
    vars[key] = value;
  }
  return vars;
}

if (!fs.existsSync(envPath)) {
  console.error("MANCANTE: file .env nella root del monorepo");
  process.exit(1);
}

const vars = parseEnv(fs.readFileSync(envPath, "utf8"));
const missing = [];
const placeholder = [];
const ok = [];

for (const key of REQUIRED) {
  const value = vars[key];
  if (!value) {
    if (key === "DATABASE_URL" && vars.SUPABASE_DB_PASSWORD) {
      ok.push(`${key} (derivabile da SUPABASE_DB_PASSWORD)`);
      continue;
    }
    missing.push(key);
  } else if (PLACEHOLDER.test(value)) {
    placeholder.push(key);
  } else {
    ok.push(key);
  }
}

for (const key of OPTIONAL) {
  const value = vars[key];
  if (value && !PLACEHOLDER.test(value)) ok.push(`${key} (opzionale)`);
}

console.log("=== Audit variabili ambiente (Vercel unified) ===\n");
console.log(`OK (${ok.length}): ${ok.join(", ") || "nessuna"}`);
if (placeholder.length) console.log(`\nPLACEHOLDER da sostituire: ${placeholder.join(", ")}`);
if (missing.length) console.log(`\nMANCANTI: ${missing.join(", ")}`);
console.log("\nNon necessarie su Vercel: NEXT_PUBLIC_API_URL, API_PORT, STORAGE_PATH");
process.exit(missing.length || placeholder.length ? 1 : 0);
