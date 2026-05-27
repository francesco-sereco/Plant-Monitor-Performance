import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const pointSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const samplingPointsRouter = Router();

samplingPointsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly !== "false";
    const points = await prisma.samplingPoint.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
    res.json(points);
  })
);

samplingPointsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = pointSchema.parse(req.body);
    const point = await prisma.samplingPoint.create({ data });
    res.status(201).json(point);
  })
);

samplingPointsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = pointSchema.partial().parse(req.body);
    const point = await prisma.samplingPoint.update({ where: { id: paramId(req.params.id) }, data });
    res.json(point);
  })
);
