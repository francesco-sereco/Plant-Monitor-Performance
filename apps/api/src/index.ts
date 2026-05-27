import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";
import { optionalAuth, requireAuth } from "./middleware/auth.js";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootStorage = path.resolve(__dirname, "../../../storage/documents");
process.env.STORAGE_PATH = process.env.STORAGE_PATH ?? rootStorage;

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(optionalAuth);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", authEnabled: config.authEnabled });
});

app.use("/api/auth", authRouter);

if (config.authEnabled) {
  app.use("/api", requireAuth);
}

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

app.listen(config.port, () => {
  console.log(`API PMP in ascolto su http://localhost:${config.port}`);
});
