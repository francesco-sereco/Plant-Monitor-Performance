import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootEnvPath = path.resolve(__dirname, "../../../../.env");
dotenv.config({ path: rootEnvPath });

const SUPABASE_PROJECT_REF = "kctqmywrtxekvwiynfla";
const SUPABASE_REGION = "eu-west-1";

/** Costruisce DATABASE_URL da SUPABASE_DB_PASSWORD se DATABASE_URL non è impostata. */
function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL) return;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return;
  const encoded = encodeURIComponent(password);
  process.env.DATABASE_URL = `postgresql://postgres.${SUPABASE_PROJECT_REF}:${encoded}@aws-0-${SUPABASE_REGION}.pooler.supabase.com:5432/postgres`;
}

ensureDatabaseUrl();

/** Ricarica .env dalla root del monorepo (idempotente). */
export function loadRootEnv(): void {
  dotenv.config({ path: rootEnvPath });
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${name}`);
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function assertSupabaseConfig(): void {
  const { url, serviceRoleKey } = getSupabaseEnv();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");

  if (missing.length > 0) {
    console.warn(
      `[PMP] Variabili Supabase mancanti: ${missing.join(", ")}. ` +
        "Copia .env.example → .env e inserisci i valori dal dashboard Supabase."
    );
  }
}
