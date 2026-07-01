import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const sectorSchema = z.object({
  name: z.string().trim().min(1, "Il nome del settore è obbligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  active: z.boolean().optional(),
});

async function findSectorByName(name: string) {
  return prisma.sector.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

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
    const existing = await findSectorByName(data.name);
    if (existing) {
      return res.status(409).json({
        error: `Esiste già il settore "${existing.name}"`,
      });
    }
    const sector = await prisma.sector.create({ data });
    res.status(201).json(sector);
  })
);

sectorsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = sectorSchema.partial().parse(req.body);
    if (data.name) {
      const existing = await findSectorByName(data.name);
      if (existing && existing.id !== paramId(req.params.id)) {
        return res.status(409).json({
          error: `Esiste già il settore "${existing.name}"`,
        });
      }
    }
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
