/**
 * Verifica connessione Cloudflare R2 (read/write/delete su bucket configurato).
 * Legge variabili da .env root — credenziali solo backend.
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
dotenv.config({ path: envPath });

const required = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

function loadEnvVars() {
  if (!fs.existsSync(envPath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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
  return vars;
}

const vars = { ...loadEnvVars(), ...process.env };

console.log("=== Verifica Cloudflare R2 ===\n");

let allOk = true;
for (const k of required) {
  const ok = Boolean(vars[k]);
  if (!ok) allOk = false;
  console.log(`${k}: ${ok ? "OK" : "MANCANTE"}`);
}

const backend = vars.STORAGE_BACKEND?.toLowerCase();
console.log(`STORAGE_BACKEND: ${backend ?? "(auto)"}`);
if (backend === "local") {
  console.log("ATTENZIONE: STORAGE_BACKEND=local — i PDF non andranno su R2");
}

if (!allOk) {
  console.log("\nEsegui: CLOUDFLARE_API_TOKEN=xxx npm run setup:r2");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${vars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: vars.R2_ACCESS_KEY_ID,
    secretAccessKey: vars.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = vars.R2_BUCKET_NAME;
const prefix = vars.R2_OBJECT_PREFIX ?? "documents";
const key = `${prefix}/.pmp-verify-${Date.now()}`;

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`\nBucket "${bucket}": raggiungibile`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "pmp-verify",
      ContentType: "text/plain",
    })
  );
  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await got.Body.transformToString();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  if (body !== "pmp-verify") throw new Error("Contenuto oggetto non corrisponde");
  console.log("Read/write/delete: OK");
  console.log("\n=== Esito ===\nR2 pronto per documenti PDF");
  process.exit(0);
} catch (err) {
  console.error("\nR2 ERRORE:", err.message);
  process.exit(1);
}
