import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const content = fs.readFileSync(envPath, "utf8");

const vars = {};
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  vars[key] = val;
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
];

console.log("=== Verifica variabili .env ===\n");
let allOk = true;
for (const k of required) {
  const ok = Boolean(vars[k]);
  if (!ok) allOk = false;
  console.log(`${k}: ${ok ? `OK (${vars[k].length} caratteri)` : "MANCANTE"}`);
}

if (vars.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const u = new URL(vars.NEXT_PUBLIC_SUPABASE_URL);
    console.log(`\nURL host: ${u.hostname}`);
    console.log(`URL formato: ${u.protocol === "https:" ? "OK" : "INVALIDO (serve https)"}`);
  } catch {
    console.log("\nURL formato: INVALIDO");
    allOk = false;
  }
}

if (vars.DATABASE_URL) {
  const db = vars.DATABASE_URL;
  console.log(`\nDATABASE_URL protocollo: ${db.startsWith("postgresql://") || db.startsWith("postgres://") ? "OK" : "INVALIDO"}`);
  console.log(`DATABASE_URL host supabase: ${db.includes("supabase") ? "OK" : "ATTENZIONE (non sembra Supabase)"}`);
}

async function testAnonKey() {
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  console.log("\n=== Test connessione Supabase (anon key) ===\n");
  const res = await fetch(`${vars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
    headers: {
      apikey: vars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${vars.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });
  console.log(`REST API status: ${res.status} ${res.statusText}`);
  const body = await res.text();
  if (res.status === 401 && body.includes("Invalid API key")) {
    console.log("Anon key: ERRORE (chiave non valida)");
    allOk = false;
  } else {
    console.log("Anon key: OK (progetto raggiungibile)");
  }
}

async function testAuthHealth() {
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  console.log("\n=== Test Auth API ===\n");
  const res = await fetch(`${vars.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: vars.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  });
  console.log(`Auth health: ${res.status} ${res.ok ? "OK" : "ERRORE"}`);
  if (!res.ok) allOk = false;
}

async function testServiceRole() {
  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.SUPABASE_SERVICE_ROLE_KEY) return;
  console.log("\n=== Test service role key ===\n");
  const res = await fetch(`${vars.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: vars.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${vars.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  console.log(`REST API status: ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 404) {
    console.log("Service role key: OK");
  } else if (res.status === 401) {
    console.log("Service role key: ERRORE (chiave non valida)");
    allOk = false;
  }
}

await testAuthHealth();
await testAnonKey();
await testServiceRole();

console.log(`\n=== Esito ===\n${allOk && vars.DATABASE_URL && vars.SUPABASE_SERVICE_ROLE_KEY ? "Pronto per migrazione" : "Completa le variabili mancanti prima di migrare"}`);

const canMigrate = Boolean(vars.DATABASE_URL);
if (!canMigrate) {
  console.log("\nPer migrare su Supabase serve almeno DATABASE_URL nel file .env (root del progetto).");
  console.log("Salva il file .env (Ctrl+S) dopo aver compilato le righe vuote.");
}

process.exit(allOk && vars.DATABASE_URL && vars.SUPABASE_SERVICE_ROLE_KEY ? 0 : 1);
