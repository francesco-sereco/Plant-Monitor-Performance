/**
 * Configura Cloudflare R2 per Plant Monitor Performance:
 * - risolve account ID
 * - crea bucket (se assente)
 * - genera token S3 scoped al bucket
 * - scrive variabili in .env
 *
 * Uso:
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/setup-r2.mjs
 *
 * Il token Cloudflare deve avere permessi R2 (Admin Read & Write o equivalente).
 * Dashboard: https://dash.cloudflare.com/profile/api-tokens
 */
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "pmp-documents";
const LOCATION_HINT = process.env.R2_LOCATION_HINT ?? "eeur";
const TOKEN_NAME = process.env.R2_TOKEN_NAME ?? "pmp-api-documents";
const OBJECT_PREFIX = process.env.R2_OBJECT_PREFIX ?? "documents";

dotenv.config({ path: envPath });

function upsertEnv(content, key, value) {
  const line = `${key}=${value.includes(" ") || value.includes("#") ? `"${value}"` : value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
}

async function cfApi(token, method, urlPath, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const msg = data.errors?.map((e) => e.message).join("; ") ?? res.statusText;
    throw new Error(`Cloudflare API ${method} ${urlPath}: ${msg}`);
  }
  return data.result;
}

async function getAccountId(token) {
  if (process.env.R2_ACCOUNT_ID) return process.env.R2_ACCOUNT_ID;
  const accounts = await cfApi(token, "GET", "/accounts");
  if (!accounts?.length) throw new Error("Nessun account Cloudflare trovato per questo token");
  if (accounts.length > 1) {
    console.log("Account multipli trovati, uso il primo:", accounts[0].name);
  }
  return accounts[0].id;
}

async function ensureBucket(token, accountId) {
  try {
    await cfApi(token, "GET", `/accounts/${accountId}/r2/buckets/${BUCKET_NAME}`);
    console.log(`Bucket "${BUCKET_NAME}" già presente`);
    return;
  } catch {
    // bucket assente
  }

  await cfApi(token, "POST", `/accounts/${accountId}/r2/buckets`, {
    name: BUCKET_NAME,
    locationHint: LOCATION_HINT,
  });
  console.log(`Bucket "${BUCKET_NAME}" creato (location: ${LOCATION_HINT})`);
}

async function createR2Token(token, accountId) {
  const result = await cfApi(token, "POST", `/accounts/${accountId}/r2/tokens`, {
    name: `${TOKEN_NAME}-${crypto.randomBytes(4).toString("hex")}`,
    permission: "object-read-write",
    bucket_scopes: [BUCKET_NAME],
  });

  if (!result?.access_key_id || !result?.secret_access_key) {
    throw new Error("Risposta token R2 incompleta (access_key_id / secret_access_key)");
  }
  return result;
}

async function verifyR2Credentials(accountId, accessKeyId, secretAccessKey) {
  const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
  await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  console.log("Verifica S3 R2 OK");
}

async function main() {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!cfToken) {
    console.error(`
CLOUDFLARE_API_TOKEN mancante.

1. Vai su https://dash.cloudflare.com/profile/api-tokens
2. Crea un token con permesso "Account → Workers R2 Storage → Edit" (o R2 Admin)
3. Esegui:

   set CLOUDFLARE_API_TOKEN=il_tuo_token
   node scripts/setup-r2.mjs

In alternativa, crea manualmente un token R2 S3 dal dashboard R2 → Manage API Tokens
e imposta R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env
`);
    process.exit(1);
  }

  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : fs.existsSync(envExamplePath)
      ? fs.readFileSync(envExamplePath, "utf8")
      : "";

  const accountId = await getAccountId(cfToken);
  console.log("Account ID:", accountId);

  await ensureBucket(cfToken, accountId);

  let accessKeyId = process.env.R2_ACCESS_KEY_ID;
  let secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.log("Generazione token R2 S3 scoped al bucket...");
    const tokenResult = await createR2Token(cfToken, accountId);
    accessKeyId = tokenResult.access_key_id;
    secretAccessKey = tokenResult.secret_access_key;
    console.log("Token R2 creato (secret mostrato una sola volta, salvato in .env)");
  } else {
    console.log("R2_ACCESS_KEY_ID già presente in .env, salto creazione token");
  }

  await verifyR2Credentials(accountId, accessKeyId, secretAccessKey);

  envContent = upsertEnv(envContent, "STORAGE_BACKEND", "r2");
  envContent = upsertEnv(envContent, "R2_ACCOUNT_ID", accountId);
  envContent = upsertEnv(envContent, "R2_ACCESS_KEY_ID", accessKeyId);
  envContent = upsertEnv(envContent, "R2_SECRET_ACCESS_KEY", secretAccessKey);
  envContent = upsertEnv(envContent, "R2_BUCKET_NAME", BUCKET_NAME);
  envContent = upsertEnv(envContent, "R2_OBJECT_PREFIX", OBJECT_PREFIX);

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`\nConfigurazione R2 salvata in ${envPath}`);
  console.log(`  STORAGE_BACKEND=r2`);
  console.log(`  R2_BUCKET_NAME=${BUCKET_NAME}`);
  console.log(`  R2_OBJECT_PREFIX=${OBJECT_PREFIX}`);
  console.log("\nRiavvia l'API e verifica GET /api/health → storage.backend = r2");
}

main().catch((err) => {
  console.error("Setup R2 fallito:", err.message);
  process.exit(1);
});
