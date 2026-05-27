import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const plantSchema = z.object({
  customerId: z.string().min(1),
  plantTypeId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  installationDate: z.string().datetime().optional().or(z.literal("")),
  location: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
  notes: z.string().optional(),
});

export const plantsRouter = Router();

plantsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId, plantTypeId } = req.query;
    const plants = await prisma.plant.findMany({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(plantTypeId ? { plantTypeId: String(plantTypeId) } : {}),
      },
      include: {
        customer: { include: { sector: true } },
        plantType: true,
      },
      orderBy: { name: "asc" },
    });
    res.json(plants);
  })
);

plantsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const plant = await prisma.plant.findFirst({
      where: { id: paramId(req.params.id), deletedAt: null },
      include: {
        customer: { include: { sector: true } },
        plantType: true,
        measurementSessions: {
          where: { deletedAt: null },
          include: { measurements: { include: { chemicalParameter: true, samplingPoint: true, unit: true } } },
          orderBy: { measurementDate: "desc" },
          take: 20,
        },
      },
    });
    if (!plant) return res.status(404).json({ error: "Impianto non trovato" });
    res.json(plant);
  })
);

plantsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = plantSchema.parse(req.body);
    const plant = await prisma.plant.create({
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : null,
      },
      include: { customer: true, plantType: true },
    });
    res.status(201).json(plant);
  })
);

plantsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = plantSchema.partial().parse(req.body);
    const plant = await prisma.plant.update({
      where: { id: paramId(req.params.id) },
      data: {
        ...data,
        installationDate: data.installationDate
          ? data.installationDate
            ? new Date(data.installationDate)
            : null
          : undefined,
      },
      include: { customer: true, plantType: true },
    });
    res.json(plant);
  })
);

plantsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    await prisma.plant.update({
      where: { id: paramId(req.params.id) },
      data: { deletedAt: new Date(), status: "inactive" },
    });
    res.status(204).send();
  })
);
