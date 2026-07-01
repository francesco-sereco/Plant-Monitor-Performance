import "./lib/env.js";
import express from "express";
import {
  assertSupabaseConfig,
  assertDataStackSeparation,
  assertGroqConfig,
  assertProductionConfig,
} from "./lib/env.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { assertR2Config, config } from "./lib/config.js";
import { optionalAuth, requireAuthUnlessPublic } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { sectorsRouter } from "./modules/sectors/sectors.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { plantTypesRouter } from "./modules/plant-types/plant-types.routes.js";
import { plantsRouter } from "./modules/plants/plants.routes.js";
import { unitsRouter } from "./modules/units/units.routes.js";
import { chemicalParametersRouter } from "./modules/parameters/chemical-parameters.routes.js";
import { samplingPointsRouter } from "./modules/sampling-points/sampling-points.routes.js";
import { limitsRouter } from "./modules/limits/limits.routes.js";
import {
  measurementSessionsRouter,
  measurementsRouter,
} from "./modules/measurements/measurements.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";
import { cronRouter } from "./modules/system-checks/cron.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";

assertSupabaseConfig();
assertDataStackSeparation();
assertGroqConfig();
assertProductionConfig();
assertR2Config();

function collectAllowedOrigins(): Set<string> {
  const entries = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return new Set(entries.filter((value): value is string => Boolean(value)));
}

function isAllowedOrigin(origin: string, allowed: Set<string>): boolean {
  if (allowed.has(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:" && protocol !== "http:") return false;
    // Same Vercel project: production alias + preview deployments
    if (hostname.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

function resolveCorsOrigin() {
  const allowed = collectAllowedOrigins();

  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || isAllowedOrigin(origin, allowed)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origine non consentita da CORS"));
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootStorage = path.resolve(__dirname, "../../../storage/documents");
process.env.STORAGE_PATH = process.env.STORAGE_PATH ?? rootStorage;

const app = express();

app.use(cors({ origin: resolveCorsOrigin(), credentials: true }));
app.use(express.json());
app.use(optionalAuth);

app.use("/api/cron", cronRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    authEnabled: config.authEnabled,
    data: {
      provider: "supabase",
      postgres: Boolean(process.env.DATABASE_URL),
      configured: Boolean(config.supabase.url && config.supabase.serviceRoleKey),
    },
    files: {
      provider: config.storage.backend === "r2" ? "cloudflare-r2" : "local",
      backend: config.storage.backend,
      bucket: config.storage.backend === "r2" ? config.storage.r2.bucket : undefined,
    },
    ai: {
      provider: "groq",
      configured: Boolean(process.env.GROQ_API_KEY),
    },
  });
});

app.use("/api/auth", authRouter);

app.use("/api", requireAuthUnlessPublic);

app.use("/api/ai", aiRouter);

app.use("/api/sectors", sectorsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/plant-types", plantTypesRouter);
app.use("/api/plants", plantsRouter);
app.use("/api/units", unitsRouter);
app.use("/api/chemical-parameters", chemicalParametersRouter);
app.use("/api/sampling-points", samplingPointsRouter);
app.use("/api/limits", limitsRouter);
app.use("/api/measurement-sessions", measurementSessionsRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/documents", documentsRouter);

app.use(errorHandler);

export default app;
