import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";

const customerSchema = z.object({
  code: z.string().min(1),
  businessName: z.string().min(1),
  sectorId: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
  notes: z.string().optional(),
});

export const customersRouter = Router();

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, sectorId, includeArchived } = req.query;
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(includeArchived !== "true" ? { status: "active" } : {}),
        ...(sectorId ? { sectorId: String(sectorId) } : {}),
        ...(search
          ? {
              OR: [
                { businessName: { contains: String(search), mode: "insensitive" } },
                { code: { contains: String(search), mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { sector: true, plants: { where: { deletedAt: null } } },
      orderBy: { businessName: "asc" },
    });
    res.json(customers);
  })
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findFirst({
      where: { id: paramId(req.params.id), deletedAt: null },
      include: {
        sector: true,
        plants: {
          where: { deletedAt: null },
          include: { plantType: true },
        },
      },
    });
    if (!customer) return res.status(404).json({ error: "Cliente non trovato" });
    res.json(customer);
  })
);

customersRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const sector = await prisma.sector.findUnique({ where: { id: data.sectorId } });
    if (!sector) {
      return res.status(400).json({ error: "Settore non trovato: seleziona un settore dall'elenco" });
    }
    const customer = await prisma.customer.create({
      data: {
        ...data,
        contactEmail: data.contactEmail || null,
      },
      include: { sector: true },
    });
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);
    if (data.sectorId) {
      const sector = await prisma.sector.findUnique({ where: { id: data.sectorId } });
      if (!sector) {
        return res.status(400).json({ error: "Settore non trovato: seleziona un settore dall'elenco" });
      }
    }
    const customer = await prisma.customer.update({
      where: { id: paramId(req.params.id) },
      data: { ...data, contactEmail: data.contactEmail || undefined },
      include: { sector: true },
    });
    res.json(customer);
  })
);

customersRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    await prisma.customer.update({
      where: { id: paramId(req.params.id) },
      data: { deletedAt: new Date(), status: "archived" },
    });
    res.status(204).send();
  })
);
