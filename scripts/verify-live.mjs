#!/usr/bin/env node
/**
 * Verifica allineamento DB ↔ API ↔ frontend su URL live o locale.
 * Uso: node scripts/verify-live.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "https://pmp-web-five.vercel.app").replace(/\/$/, "");

async function check(path, label) {
  const url = `${base}${path}`;
  const res = await fetch(url);
  const ok = res.ok;
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  console.log(`${ok ? "OK" : "FAIL"} ${label} (${res.status}) ${url}`);
  if (!ok) {
    console.error("  ", typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200));
    return false;
  }
  return body;
}

console.log(`=== Verifica allineamento @ ${base} ===\n`);

let failed = false;

const health = await check("/api/health", "API health");
if (!health || health.status !== "ok") failed = true;
else if (!health.data?.postgres) {
  console.error("FAIL DATABASE_URL / Prisma non connesso");
  failed = true;
} else if (health.authEnabled) {
  console.log("  authEnabled=true — skip lettura API protette (usa login)");
} else {
  const customers = await check("/api/customers", "API customers (DB)");
  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    console.error("FAIL Nessun cliente — DB seed o connessione da verificare");
    failed = true;
  } else {
    console.log(`  ${customers.length} clienti caricati dal DB`);
  }

  const sectors = await check("/api/sectors", "API sectors");
  if (!sectors || !Array.isArray(sectors)) failed = true;
}

const home = await fetch(`${base}/`);
console.log(`${home.ok ? "OK" : "FAIL"} Frontend home (${home.status})`);
if (!home.ok) failed = true;

console.log(failed ? "\n=== ESITO: PROBLEMI RILEVATI ===" : "\n=== ESITO: ALLINEAMENTO OK ===");
process.exit(failed ? 1 : 0);
