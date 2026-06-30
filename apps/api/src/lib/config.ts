type StorageBackend = "local" | "r2";

function resolveStorageBackend(): StorageBackend {
  const explicit = process.env.STORAGE_BACKEND?.toLowerCase();
  if (explicit === "r2" || explicit === "local") return explicit;

  const hasR2 =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME;
  return hasR2 ? "r2" : "local";
}

const storageBackend = resolveStorageBackend();

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  authEnabled: process.env.AUTH_ENABLED === "true",
  maxPdfSizeMb: Number(process.env.MAX_PDF_SIZE_MB ?? 25),
  /** @deprecated Usa config.storage.localPath */
  storagePath: process.env.STORAGE_PATH ?? "./storage/documents",
  storage: {
    backend: storageBackend,
    localPath: process.env.STORAGE_PATH ?? "./storage/documents",
    r2: {
      accountId: process.env.R2_ACCOUNT_ID ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      bucket: process.env.R2_BUCKET_NAME ?? "pmp-documents",
      prefix: process.env.R2_OBJECT_PREFIX ?? "documents",
    },
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
};

export function assertR2Config(): void {
  if (config.storage.backend !== "r2") return;
  const missing: string[] = [];
  const { r2 } = config.storage;
  if (!r2.accountId) missing.push("R2_ACCOUNT_ID");
  if (!r2.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!r2.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!r2.bucket) missing.push("R2_BUCKET_NAME");
  if (missing.length > 0) {
    throw new Error(`Storage R2 attivo ma variabili mancanti: ${missing.join(", ")}`);
  }
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "assistenza" | "commerciale";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
