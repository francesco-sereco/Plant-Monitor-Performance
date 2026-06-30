/**
 * Verifica stack dati (Supabase PostgreSQL) + file (Cloudflare R2).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script) {
  const res = spawnSync(process.execPath, [path.join(root, "scripts", script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return res.status ?? 1;
}

console.log("=== Plant Monitor Performance — verifica stack ===\n");
console.log("Supabase → dati strutturati (PostgreSQL / Prisma)\n");

const supabaseCode = run("verify-supabase.mjs");
console.log("\n---\n");
console.log("Cloudflare R2 → documenti PDF (storage privato)\n");

const r2Code = run("verify-r2.mjs");

console.log("\n=== Riepilogo ===");
console.log(`Supabase (dati): ${supabaseCode === 0 ? "OK" : "ERRORE"}`);
console.log(`R2 (documenti):   ${r2Code === 0 ? "OK" : "ERRORE"}`);

process.exit(supabaseCode === 0 && r2Code === 0 ? 0 : 1);
