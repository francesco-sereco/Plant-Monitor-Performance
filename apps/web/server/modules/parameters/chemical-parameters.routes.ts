import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const parameterSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  defaultUnitId: z.string().optional().nullable(),
  description: z.string().optional(),
  isNumeric: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const chemicalParametersRouter = Router();

chemicalParametersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly !== "false";
    const parameters = await prisma.chemicalParameter.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: { defaultUnit: true },
      orderBy: { code: "asc" },
    });
    res.json(parameters);
  })
);

chemicalParametersRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = parameterSchema.parse(req.body);
    const parameter = await prisma.chemicalParameter.create({
      data,
      include: { defaultUnit: true },
    });
    res.status(201).json(parameter);
  })
);

chemicalParametersRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = parameterSchema.partial().parse(req.body);
    const parameter = await prisma.chemicalParameter.update({
      where: { id: paramId(req.params.id) },
      data,
      include: { defaultUnit: true },
    });
    res.json(parameter);
  })
);
