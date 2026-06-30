import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { decimalToNumber } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";
import { resolveLimit } from "./resolve-limit.js";
import { writeAuditLog } from "../audit/audit.service.js";

const limitSchema = z.object({
  chemicalParameterId: z.string().min(1),
  unitId: z.string().min(1),
  scopeType: z.enum(["global", "sector", "plant_type", "customer", "plant"]),
  scopeId: z.string().optional().nullable(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  legalReferenceText: z.string().optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

export const limitsRouter = Router();

limitsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { parameterId, scopeType } = req.query;
    const limits = await prisma.limit.findMany({
      where: {
        ...(parameterId ? { chemicalParameterId: String(parameterId) } : {}),
        ...(scopeType ? { scopeType: scopeType as never } : {}),
      },
      include: { chemicalParameter: true, unit: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      limits.map((l) => ({
        ...l,
        minValue: decimalToNumber(l.minValue),
        maxValue: decimalToNumber(l.maxValue),
      }))
    );
  })
);

limitsRouter.get(
  "/resolve",
  asyncHandler(async (req, res) => {
    const parameterId = String(req.query.parameterId ?? "");
    const plantId = String(req.query.plantId ?? "");
    if (!parameterId || !plantId) {
      return res.status(400).json({ error: "parameterId e plantId richiesti" });
    }
    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
      include: { customer: true },
    });
    if (!plant) return res.status(404).json({ error: "Impianto non trovato" });

    const limit = await resolveLimit({
      parameterId,
      plantId: plant.id,
      customerId: plant.customerId,
      plantTypeId: plant.plantTypeId,
      sectorId: plant.customer.sectorId,
    });

    if (!limit) return res.json({ limit: null });

    res.json({
      limit: {
        ...limit,
        minValue: decimalToNumber(limit.minValue),
        maxValue: decimalToNumber(limit.maxValue),
      },
    });
  })
);

limitsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = limitSchema.parse(req.body);
    const limit = await prisma.limit.create({
      data: {
        ...data,
        scopeId: data.scopeType === "global" ? null : data.scopeId ?? null,
        minValue: data.minValue ?? null,
        maxValue: data.maxValue ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        createdById: req.user?.id,
      },
      include: { chemicalParameter: true, unit: true },
    });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "create",
      entityType: "limit",
      entityId: limit.id,
      afterJson: limit,
    });
    res.status(201).json({
      ...limit,
      minValue: decimalToNumber(limit.minValue),
      maxValue: decimalToNumber(limit.maxValue),
    });
  })
);

limitsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const before = await prisma.limit.findUnique({ where: { id: paramId(req.params.id) } });
    const data = limitSchema.partial().parse(req.body);
    const limit = await prisma.limit.update({
      where: { id: paramId(req.params.id) },
      data: {
        ...data,
        scopeId: data.scopeType === "global" ? null : data.scopeId,
        minValue: data.minValue ?? undefined,
        maxValue: data.maxValue ?? undefined,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validTo: data.validTo ? new Date(data.validTo) : undefined,
      },
      include: { chemicalParameter: true, unit: true },
    });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "update",
      entityType: "limit",
      entityId: limit.id,
      beforeJson: before,
      afterJson: limit,
    });
    res.json({
      ...limit,
      minValue: decimalToNumber(limit.minValue),
      maxValue: decimalToNumber(limit.maxValue),
    });
  })
);

limitsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const before = await prisma.limit.findUnique({ where: { id: paramId(req.params.id) } });
    await prisma.limit.delete({ where: { id: paramId(req.params.id) } });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "delete",
      entityType: "limit",
      entityId: paramId(req.params.id),
      beforeJson: before,
    });
    res.status(204).send();
  })
);
