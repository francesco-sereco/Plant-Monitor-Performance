import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireCronSecret } from "../../middleware/cron-auth.js";
import { runDatabaseKeepaliveCheck } from "./db-check.service.js";

export const cronRouter = Router();

cronRouter.get(
  "/db-check",
  requireCronSecret,
  asyncHandler(async (req, res) => {
    const force = req.query.force === "true";
    const result = await runDatabaseKeepaliveCheck({ force });

    if (result.skipped) {
      return res.json({
        skipped: true,
        reason: result.reason,
        check: result.check,
      });
    }

    res.json({
      skipped: false,
      status: result.check.status,
      note: result.check.note,
      checkedAt: result.check.checkedAt,
      sectorCount: result.sectorCount,
      parameterCount: result.parameterCount,
    });
  })
);
