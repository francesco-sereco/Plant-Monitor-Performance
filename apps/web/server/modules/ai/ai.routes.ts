import { Router } from "express";
import { z } from "zod";
import { getGroqEnv } from "../../lib/env.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import {
  GroqApiError,
  GroqNotConfiguredError,
  isGroqConfigured,
  pingAi,
} from "./ai.service.js";

const pingSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export const aiRouter = Router();

aiRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const { model } = getGroqEnv();
    res.json({
      configured: isGroqConfigured(),
      model,
      provider: "groq",
    });
  })
);

aiRouter.post(
  "/ping",
  requireAuth,
  requireRoles("admin", "assistenza"),
  asyncHandler(async (req, res) => {
    const { message } = pingSchema.parse(req.body);

    try {
      const result = await pingAi(message);
      res.json(result);
    } catch (error) {
      if (error instanceof GroqNotConfiguredError) {
        return res.status(503).json({ error: error.message });
      }
      if (error instanceof GroqApiError) {
        return res.status(502).json({ error: "Servizio AI temporaneamente non disponibile" });
      }
      throw error;
    }
  })
);
