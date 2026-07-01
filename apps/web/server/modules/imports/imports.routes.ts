import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../lib/config.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { confirmPdfImport, createPdfImport, updateImportPreview } from "./import.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype?.toLowerCase() ?? "";
    const name = file.originalname?.toLowerCase() ?? "";
    const okMime =
      mime === "application/pdf" ||
      mime === "application/octet-stream" ||
      mime === "binary/octet-stream" ||
      mime === "";
    const okExt = name.endsWith(".pdf");
    if (!okMime && !okExt) {
      cb(new Error("Solo file PDF consentiti"));
      return;
    }
    cb(null, true);
  },
});

const uploadBodySchema = z.object({
  documentType: z.enum(["takeoff_report", "lab_autocontrol"]),
  customerId: z.string().optional(),
  plantId: z.string().optional(),
});

const importParameterSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  samplingPoint: z.string().optional(),
  chemicalParameterId: z.string().optional(),
  unitId: z.string().optional(),
  samplingPointId: z.string().optional(),
  mapped: z.boolean().optional(),
  autoCreated: z.boolean().optional(),
  included: z.boolean().optional(),
});

const confirmSchema = z
  .object({
    customerId: z.string().min(1),
    plantId: z.string().optional(),
    measurementDate: z.string().optional(),
    createPlant: z.object({ plantTypeId: z.string().min(1), name: z.string().min(1) }).optional(),
    parameters: z.array(importParameterSchema).optional(),
  })
  .refine((data) => Boolean(data.plantId || data.createPlant?.name), {
    message: "Seleziona un impianto o indicane uno nuovo",
  });

const previewPatchSchema = z.object({
  customerId: z.string().optional(),
  measurementDate: z.string().optional(),
  parameters: z.array(importParameterSchema).optional(),
});

export const importsRouter = Router();

importsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId } = req.query;
    const jobs = await prisma.pdfImportJob.findMany({
      where: customerId
        ? { document: { customerId: String(customerId), deletedAt: null } }
        : { document: { deletedAt: null } },
      include: {
        document: { include: { customer: true, plant: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(jobs);
  })
);

importsRouter.post(
  "/pdf",
  requireWriteAccess,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File PDF richiesto" });

    const meta = uploadBodySchema.parse(req.body);

    try {
      const job = await createPdfImport({
        buffer: req.file.buffer,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: meta.documentType,
        customerId: meta.customerId,
        plantId: meta.plantId,
        createdById: req.user?.id,
      });

      await writeAuditLog({
        actorUserId: req.user?.id,
        action: "import_upload",
        entityType: "pdf_import_job",
        entityId: job.id,
        afterJson: {
          documentType: meta.documentType,
          filename: req.file.originalname,
          status: job.status,
        },
      });

      res.status(201).json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import fallito";
      return res.status(400).json({ error: message });
    }
  })
);

importsRouter.post(
  "/:id/confirm",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = confirmSchema.parse(req.body);

    try {
      const result = await confirmPdfImport({
        jobId: paramId(req.params.id),
        customerId: data.customerId,
        plantId: data.plantId,
        measurementDate: data.measurementDate,
        createPlant: data.createPlant,
        parameters: data.parameters,
        createdById: req.user?.id,
      });

      await writeAuditLog({
        actorUserId: req.user?.id,
        action: "import_confirm",
        entityType: "pdf_import_job",
        entityId: result.job.id,
        afterJson: { sessionId: result.session.id },
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Conferma import fallita";
      return res.status(400).json({ error: message });
    }
  })
);

importsRouter.patch(
  "/:id/preview",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const data = previewPatchSchema.parse(req.body);
    try {
      const job = await updateImportPreview(paramId(req.params.id), data);
      res.json(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Salvataggio anteprima fallito";
      return res.status(400).json({ error: message });
    }
  })
);

importsRouter.post(
  "/:id/discard",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const job = await prisma.pdfImportJob.findUnique({ where: { id: paramId(req.params.id) } });
    if (!job) return res.status(404).json({ error: "Import non trovato" });

    const updated = await prisma.pdfImportJob.update({
      where: { id: job.id },
      data: { status: "discarded" },
      include: { document: { include: { customer: true, plant: true } } },
    });

    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "import_discard",
      entityType: "pdf_import_job",
      entityId: job.id,
    });

    res.json(updated);
  })
);
