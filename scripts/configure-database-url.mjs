import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
dotenv.config({ path: envPath });

const projectRef = "kctqmywrtxekvwiynfla";
const region = "eu-west-1";

function upsertEnv(content, key, value) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

function buildDatabaseUrl(password) {
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres.${projectRef}:${encoded}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
}

async function resetPasswordViaApi(password) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn(`Reset password API fallito: ${res.status} ${body}`);
    return false;
  }

  console.log("Password database reimpostata via Supabase Management API");
  return true;
}

async function verifyUrl(url) {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch (err) {
    console.warn("Connessione fallita:", err.message);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

let password = process.env.SUPABASE_DB_PASSWORD ?? "";
let content = fs.readFileSync(envPath, "utf8");

if (!password && process.env.DATABASE_URL) {
  console.log("DATABASE_URL già presente");
  process.exit(0);
}

if (!password) {
  password = crypto.randomBytes(16).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 24);
  const reset = await resetPasswordViaApi(password);
  if (!reset) {
    console.error(
      "Impossibile ottenere la password DB automaticamente.\n" +
        "Imposta SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens) oppure SUPABASE_DB_PASSWORD nel .env,\n" +
        "poi riesegui: node scripts/configure-database-url.mjs"
    );
    process.exit(1);
  }
}

const databaseUrl = buildDatabaseUrl(password);
const ok = await verifyUrl(databaseUrl);
if (!ok) {
  console.error("DATABASE_URL non verificata — controlla SUPABASE_DB_PASSWORD");
  process.exit(1);
}

content = upsertEnv(content, "SUPABASE_DB_PASSWORD", password);
content = upsertEnv(content, "DATABASE_URL", databaseUrl);
fs.writeFileSync(envPath, content, "utf8");

console.log("DATABASE_URL configurata e verificata con Prisma/pg");
