import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { decimalToNumber } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { calculateReduction } from "../limits/resolve-limit.js";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/time-series",
  asyncHandler(async (req, res) => {
    const { plantId, parameterId, samplingPointId, from, to } = req.query;
    if (!plantId || !parameterId) {
      return res.status(400).json({ error: "plantId e parameterId richiesti" });
    }

    const measurements = await prisma.measurement.findMany({
      where: {
        deletedAt: null,
        chemicalParameterId: String(parameterId),
        ...(samplingPointId ? { samplingPointId: String(samplingPointId) } : {}),
        session: {
          deletedAt: null,
          plantId: String(plantId),
          ...(from || to
            ? {
                measurementDate: {
                  ...(from ? { gte: new Date(String(from)) } : {}),
                  ...(to ? { lte: new Date(String(to)) } : {}),
                },
              }
            : {}),
        },
      },
      include: {
        samplingPoint: true,
        unit: true,
        session: true,
      },
      orderBy: { session: { measurementDate: "asc" } },
    });

    const series = measurements.map((m) => ({
      date: m.session.measurementDate.toISOString().slice(0, 10),
      value: decimalToNumber(m.valueNumeric),
      samplingPoint: m.samplingPoint.name,
      unit: m.unit.symbol,
      complianceStatus: m.complianceStatus,
      limitMin: decimalToNumber(m.limitMinSnapshot),
      limitMax: decimalToNumber(m.limitMaxSnapshot),
    }));

    const limitMax = series.find((s) => s.limitMax != null)?.limitMax ?? null;
    const limitMin = series.find((s) => s.limitMin != null)?.limitMin ?? null;

    res.json({ series, limitMin, limitMax });
  })
);

analyticsRouter.get(
  "/out-of-limit",
  asyncHandler(async (req, res) => {
    const { customerId, plantId, from, to } = req.query;
    const measurements = await prisma.measurement.findMany({
      where: {
        deletedAt: null,
        complianceStatus: "out_of_limit",
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
      },
      include: {
        chemicalParameter: true,
        samplingPoint: true,
        unit: true,
        session: {
          include: {
            customer: true,
            plant: true,
          },
        },
      },
      orderBy: { session: { measurementDate: "desc" } },
      take: 100,
    });

    res.json(
      measurements.map((m) => ({
        id: m.id,
        date: m.session.measurementDate,
        customer: m.session.customer.businessName,
        plant: m.session.plant.name,
        parameter: m.chemicalParameter.code,
        samplingPoint: m.samplingPoint.name,
        value: decimalToNumber(m.valueNumeric),
        unit: m.unit.symbol,
        limitMin: decimalToNumber(m.limitMinSnapshot),
        limitMax: decimalToNumber(m.limitMaxSnapshot),
      }))
    );
  })
);

analyticsRouter.get(
  "/performance-reduction",
  asyncHandler(async (req, res) => {
    const { plantId, parameterId, initialPointId, finalPointId, date } = req.query;
    if (!plantId || !parameterId || !initialPointId || !finalPointId) {
      return res.status(400).json({
        error: "plantId, parameterId, initialPointId e finalPointId richiesti",
      });
    }

    const whereDate = date ? { measurementDate: new Date(String(date)) } : undefined;

    const initial = await prisma.measurement.findFirst({
      where: {
        deletedAt: null,
        chemicalParameterId: String(parameterId),
        samplingPointId: String(initialPointId),
        session: { deletedAt: null, plantId: String(plantId), ...whereDate },
      },
      include: { samplingPoint: true, unit: true, session: true },
      orderBy: { session: { measurementDate: "desc" } },
    });

    const final = await prisma.measurement.findFirst({
      where: {
        deletedAt: null,
        chemicalParameterId: String(parameterId),
        samplingPointId: String(finalPointId),
        session: { deletedAt: null, plantId: String(plantId), ...whereDate },
      },
      include: { samplingPoint: true, unit: true, session: true },
      orderBy: { session: { measurementDate: "desc" } },
    });

    const initialValue = initial ? decimalToNumber(initial.valueNumeric) : null;
    const finalValue = final ? decimalToNumber(final.valueNumeric) : null;
    const reductionPercent = calculateReduction(initialValue, finalValue);

    res.json({
      initial: initial
        ? {
            point: initial.samplingPoint.name,
            value: initialValue,
            unit: initial.unit.symbol,
            date: initial.session.measurementDate,
          }
        : null,
      final: final
        ? {
            point: final.samplingPoint.name,
            value: finalValue,
            unit: final.unit.symbol,
            date: final.session.measurementDate,
          }
        : null,
      reductionPercent,
      calculable: reductionPercent != null,
    });
  })
);

analyticsRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [customers, plants, sessionsThisMonth, outOfLimit, recentDocuments] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null, status: "active" } }),
      prisma.plant.count({ where: { deletedAt: null, status: "active" } }),
      prisma.measurementSession.count({
        where: { deletedAt: null, measurementDate: { gte: monthStart } },
      }),
      prisma.measurement.count({ where: { deletedAt: null, complianceStatus: "out_of_limit" } }),
      prisma.document.count({ where: { deletedAt: null } }),
    ]);

    res.json({
      customers,
      plants,
      sessionsThisMonth,
      outOfLimit,
      recentDocuments,
    });
  })
);
