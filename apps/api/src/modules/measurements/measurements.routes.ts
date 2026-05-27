import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { decimalToNumber } from "../../lib/prisma.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";
import { resolveLimit, calculateCompliance } from "../limits/resolve-limit.js";
import { writeAuditLog } from "../audit/audit.service.js";

const measurementInputSchema = z.object({
  chemicalParameterId: z.string().min(1),
  samplingPointId: z.string().min(1),
  valueNumeric: z.number().optional().nullable(),
  valueText: z.string().optional().nullable(),
  unitId: z.string().min(1),
  notes: z.string().optional(),
});

const sessionSchema = z.object({
  customerId: z.string().min(1),
  plantId: z.string().min(1),
  measurementDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  sourceType: z.enum(["manual", "technical_report", "lab_autocontrol", "pdf_import", "other"]).optional(),
  technicianName: z.string().optional(),
  laboratoryName: z.string().optional(),
  status: z.enum(["draft", "confirmed", "corrected"]).optional(),
  notes: z.string().optional(),
  measurements: z.array(measurementInputSchema).min(1),
});

function serializeMeasurement(m: Awaited<ReturnType<typeof fetchMeasurement>>) {
  return {
    ...m,
    valueNumeric: decimalToNumber(m.valueNumeric),
    limitMinSnapshot: decimalToNumber(m.limitMinSnapshot),
    limitMaxSnapshot: decimalToNumber(m.limitMaxSnapshot),
  };
}

async function fetchMeasurement(id: string) {
  return prisma.measurement.findUniqueOrThrow({
    where: { id },
    include: {
      chemicalParameter: true,
      samplingPoint: true,
      unit: true,
      session: {
        include: {
          customer: { include: { sector: true } },
          plant: { include: { plantType: true } },
        },
      },
    },
  });
}

async function buildMeasurementData(
  input: z.infer<typeof measurementInputSchema>,
  plantId: string,
  customerId: string,
  plantTypeId: string,
  sectorId: string,
  at: Date
) {
  const limit = await resolveLimit({
    parameterId: input.chemicalParameterId,
    plantId,
    customerId,
    plantTypeId,
    sectorId,
    at,
  });

  const min = limit ? decimalToNumber(limit.minValue) : null;
  const max = limit ? decimalToNumber(limit.maxValue) : null;
  const complianceStatus = calculateCompliance(input.valueNumeric ?? null, min, max);

  return {
    chemicalParameterId: input.chemicalParameterId,
    samplingPointId: input.samplingPointId,
    valueNumeric: input.valueNumeric ?? null,
    valueText: input.valueText ?? null,
    unitId: input.unitId,
    appliedLimitId: limit?.id ?? null,
    limitMinSnapshot: min,
    limitMaxSnapshot: max,
    complianceStatus,
    notes: input.notes,
  };
}

export const measurementSessionsRouter = Router();

measurementSessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      customerId,
      plantId,
      sectorId,
      parameterId,
      from,
      to,
      page = "1",
      pageSize = "50",
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const size = Math.min(200, Math.max(1, Number(pageSize)));

    const sessions = await prisma.measurementSession.findMany({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(plantId ? { plantId: String(plantId) } : {}),
        ...(sectorId ? { customer: { sectorId: String(sectorId) } } : {}),
        ...(from || to
          ? {
              measurementDate: {
                ...(from ? { gte: new Date(String(from)) } : {}),
                ...(to ? { lte: new Date(String(to)) } : {}),
              },
            }
          : {}),
        ...(parameterId
          ? { measurements: { some: { chemicalParameterId: String(parameterId), deletedAt: null } } }
          : {}),
      },
      include: {
        customer: { include: { sector: true } },
        plant: { include: { plantType: true } },
        measurements: {
          where: { deletedAt: null },
          include: { chemicalParameter: true, samplingPoint: true, unit: true },
        },
      },
      orderBy: { measurementDate: "desc" },
      skip: (pageNum - 1) * size,
      take: size,
    });

    const total = await prisma.measurementSession.count({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(plantId ? { plantId: String(plantId) } : {}),
      },
    });

    res.json({
      data: sessions.map((s) => ({
        ...s,
        measurements: s.measurements.map((m) => ({
          ...m,
          valueNumeric: decimalToNumber(m.valueNumeric),
          limitMinSnapshot: decimalToNumber(m.limitMinSnapshot),
          limitMaxSnapshot: decimalToNumber(m.limitMaxSnapshot),
        })),
      })),
      pagination: { page: pageNum, pageSize: size, total },
    });
  })
);

measurementSessionsRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { customerId, plantId, from, to, parameterId } = req.query;
    const measurements = await prisma.measurement.findMany({
      where: {
        deletedAt: null,
        session: {
          deletedAt: null,
          ...(customerId ? { customerId: String(customerId) } : {}),
          ...(plantId ? { plantId: String(plantId) } : {}),
          ...(from || to
            ? {
                measurementDate: {
                  ...(from ? { gte: new Date(String(from)) } : {}),
                  ...(to ? { lte: new Date(String(to)) } : {}),
                },
              }
            : {}),
        },
        ...(parameterId ? { chemicalParameterId: String(parameterId) } : {}),
      },
      include: {
        chemicalParameter: true,
        samplingPoint: true,
        unit: true,
        session: {
          include: {
            customer: { include: { sector: true } },
            plant: { include: { plantType: true } },
          },
        },
      },
      orderBy: { session: { measurementDate: "desc" } },
    });

    const header =
      "Data;Cliente;Settore;Impianto;Tipologia;Punto;Parametro;Valore;Unita;Esito;Min;Max\n";
    const rows = measurements
      .map((m) => {
        const s = m.session;
        const val = decimalToNumber(m.valueNumeric) ?? m.valueText ?? "";
        return [
          s.measurementDate.toISOString().slice(0, 10),
          s.customer.businessName,
          s.customer.sector.name,
          s.plant.name,
          s.plant.plantType.name,
          m.samplingPoint.name,
          m.chemicalParameter.code,
          val,
          m.unit.symbol,
          m.complianceStatus,
          decimalToNumber(m.limitMinSnapshot) ?? "",
          decimalToNumber(m.limitMaxSnapshot) ?? "",
        ].join(";");
      })
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="rilevazioni.csv"');
    res.send("\uFEFF" + header + rows);
  })
);

measurementSessionsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = await prisma.measurementSession.findFirst({
      where: { id: paramId(req.params.id), deletedAt: null },
      include: {
        customer: { include: { sector: true } },
        plant: { include: { plantType: true } },
        measurements: {
          where: { deletedAt: null },
          include: { chemicalParameter: true, samplingPoint: true, unit: true },
        },
      },
    });
    if (!session) return res.status(404).json({ error: "Rilevazione non trovata" });
    res.json({
      ...session,
      measurements: session.measurements.map((m) => ({
        ...m,
        valueNumeric: decimalToNumber(m.valueNumeric),
        limitMinSnapshot: decimalToNumber(m.limitMinSnapshot),
        limitMaxSnapshot: decimalToNumber(m.limitMaxSnapshot),
      })),
    });
  })
);

measurementSessionsRouter.post(
  "/",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = sessionSchema.parse(req.body);
    const plant = await prisma.plant.findUnique({
      where: { id: data.plantId },
      include: { customer: true },
    });
    if (!plant) return res.status(404).json({ error: "Impianto non trovato" });

    const measurementDate = new Date(data.measurementDate);
    const measurementRows = await Promise.all(
      data.measurements.map((m) =>
        buildMeasurementData(
          m,
          plant.id,
          plant.customerId,
          plant.plantTypeId,
          plant.customer.sectorId,
          measurementDate
        )
      )
    );

    const session = await prisma.measurementSession.create({
      data: {
        customerId: data.customerId,
        plantId: data.plantId,
        measurementDate,
        sourceType: data.sourceType ?? "manual",
        technicianName: data.technicianName,
        laboratoryName: data.laboratoryName,
        status: data.status ?? "confirmed",
        notes: data.notes,
        createdById: req.user?.id,
        measurements: { create: measurementRows },
      },
      include: {
        measurements: { include: { chemicalParameter: true, samplingPoint: true, unit: true } },
        customer: true,
        plant: true,
      },
    });

    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "create",
      entityType: "measurement_session",
      entityId: session.id,
      afterJson: session,
    });

    res.status(201).json({
      ...session,
      measurements: session.measurements.map((m) => ({
        ...m,
        valueNumeric: decimalToNumber(m.valueNumeric),
        limitMinSnapshot: decimalToNumber(m.limitMinSnapshot),
        limitMaxSnapshot: decimalToNumber(m.limitMaxSnapshot),
      })),
    });
  })
);

measurementSessionsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const before = await prisma.measurementSession.findUnique({ where: { id: paramId(req.params.id) } });
    const data = sessionSchema.partial().parse(req.body);
    const session = await prisma.measurementSession.update({
      where: { id: paramId(req.params.id) },
      data: {
        customerId: data.customerId,
        plantId: data.plantId,
        measurementDate: data.measurementDate ? new Date(data.measurementDate) : undefined,
        sourceType: data.sourceType,
        technicianName: data.technicianName,
        laboratoryName: data.laboratoryName,
        status: data.status,
        notes: data.notes,
      },
    });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "update",
      entityType: "measurement_session",
      entityId: session.id,
      beforeJson: before,
      afterJson: session,
    });
    res.json(session);
  })
);

measurementSessionsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const before = await prisma.measurementSession.findUnique({ where: { id: paramId(req.params.id) } });
    await prisma.measurementSession.update({
      where: { id: paramId(req.params.id) },
      data: { deletedAt: new Date(), status: "deleted" },
    });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "delete",
      entityType: "measurement_session",
      entityId: paramId(req.params.id),
      beforeJson: before,
    });
    res.status(204).send();
  })
);

export const measurementsRouter = Router();

measurementsRouter.patch(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const input = measurementInputSchema.partial().parse(req.body);
    const existing = await prisma.measurement.findUnique({
      where: { id: paramId(req.params.id) },
      include: { session: { include: { plant: { include: { customer: true } } } } },
    });
    if (!existing) return res.status(404).json({ error: "Misura non trovata" });

    const plant = existing.session.plant;
    const customer = plant.customer;
    const merged = {
      chemicalParameterId: input.chemicalParameterId ?? existing.chemicalParameterId,
      samplingPointId: input.samplingPointId ?? existing.samplingPointId,
      valueNumeric: input.valueNumeric !== undefined ? input.valueNumeric : decimalToNumber(existing.valueNumeric),
      valueText: input.valueText !== undefined ? input.valueText : existing.valueText,
      unitId: input.unitId ?? existing.unitId,
      notes: input.notes ?? existing.notes,
    };

    const built = await buildMeasurementData(
      merged as z.infer<typeof measurementInputSchema>,
      plant.id,
      plant.customerId,
      plant.plantTypeId,
      customer.sectorId,
      existing.session.measurementDate
    );

    const measurement = await prisma.measurement.update({
      where: { id: paramId(req.params.id) },
      data: built,
    });
    const full = await fetchMeasurement(measurement.id);
    res.json(serializeMeasurement(full));
  })
);

measurementsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    await prisma.measurement.update({
      where: { id: paramId(req.params.id) },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  })
);
