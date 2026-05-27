import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const unitSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const unitsRouter = Router();

unitsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const units = await prisma.unit.findMany({ orderBy: { symbol: "asc" } });
    res.json(units);
  })
);

unitsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = unitSchema.parse(req.body);
    const unit = await prisma.unit.create({ data });
    res.status(201).json(unit);
  })
);

unitsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = unitSchema.partial().parse(req.body);
    const unit = await prisma.unit.update({ where: { id: paramId(req.params.id) }, data });
    res.json(unit);
  })
);
