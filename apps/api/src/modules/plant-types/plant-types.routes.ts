import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const plantTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export const plantTypesRouter = Router();

plantTypesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const types = await prisma.plantType.findMany({ orderBy: { name: "asc" } });
    res.json(types);
  })
);

plantTypesRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = plantTypeSchema.parse(req.body);
    const type = await prisma.plantType.create({ data });
    res.status(201).json(type);
  })
);

plantTypesRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = plantTypeSchema.partial().parse(req.body);
    const type = await prisma.plantType.update({ where: { id: paramId(req.params.id) }, data });
    res.json(type);
  })
);

plantTypesRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    await prisma.plantType.delete({ where: { id: paramId(req.params.id) } });
    res.status(204).send();
  })
);
