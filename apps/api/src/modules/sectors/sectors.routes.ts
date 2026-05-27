import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const sectorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
});

export const sectorsRouter = Router();

sectorsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } });
    res.json(sectors);
  })
);

sectorsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = sectorSchema.parse(req.body);
    const sector = await prisma.sector.create({ data });
    res.status(201).json(sector);
  })
);

sectorsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = sectorSchema.partial().parse(req.body);
    const sector = await prisma.sector.update({ where: { id: paramId(req.params.id) }, data });
    res.json(sector);
  })
);

sectorsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    await prisma.sector.delete({ where: { id: paramId(req.params.id) } });
    res.status(204).send();
  })
);
