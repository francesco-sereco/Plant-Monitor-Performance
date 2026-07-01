import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../lib/config.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { getDocumentStorage } from "../../lib/storage/index.js";

const uploadSchema = z.object({
  customerId: z.string().min(1),
  plantId: z.string().optional(),
  measurementSessionId: z.string().optional(),
  documentType: z.enum(["takeoff_report", "lab_autocontrol", "other_pdf"]).optional(),
});

async function validateDocumentRelations(meta: z.infer<typeof uploadSchema>): Promise<string | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: meta.customerId, deletedAt: null },
  });
  if (!customer) return "Cliente non trovato";

  if (meta.plantId) {
    const plant = await prisma.plant.findFirst({
      where: { id: meta.plantId, customerId: meta.customerId, deletedAt: null },
    });
    if (!plant) return "Impianto non valido per il cliente indicato";
  }

  if (meta.measurementSessionId) {
    const session = await prisma.measurementSession.findFirst({
      where: { id: meta.measurementSessionId, deletedAt: null },
    });
    if (!session) return "Sessione di rilevazione non trovata";
    if (session.customerId !== meta.customerId) {
      return "Sessione non appartenente al cliente indicato";
    }
    if (meta.plantId && session.plantId !== meta.plantId) {
      return "Sessione non appartenente all'impianto indicato";
    }
  }

  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPdfSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Solo file PDF consentiti"));
      return;
    }
    cb(null, true);
  },
});

export const documentsRouter = Router();

documentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { customerId, plantId } = req.query;
    const documents = await prisma.document.findMany({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(plantId ? { plantId: String(plantId) } : {}),
      },
      include: { customer: true, plant: true },
      orderBy: { uploadedAt: "desc" },
    });
    res.json(documents);
  })
);

documentsRouter.post(
  "/upload",
  requireWriteAccess,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File PDF richiesto" });

    const meta = uploadSchema.parse(req.body);
    const relationError = await validateDocumentRelations(meta);
    if (relationError) return res.status(400).json({ error: relationError });
    const storedFilename = `${crypto.randomUUID()}${path.extname(req.file.originalname)}`;
    const storage = getDocumentStorage();
    const stored = await storage.save({
      buffer: req.file.buffer,
      storedFilename,
      mimeType: req.file.mimetype,
    });

    const document = await prisma.document.create({
      data: {
        customerId: meta.customerId,
        plantId: meta.plantId || null,
        measurementSessionId: meta.measurementSessionId || null,
        documentType: meta.documentType ?? "other_pdf",
        originalFilename: req.file.originalname,
        storedFilename: stored.storedFilename,
        storagePath: stored.storagePath,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: req.user?.id,
      },
      include: { customer: true, plant: true },
    });

    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "upload",
      entityType: "document",
      entityId: document.id,
      afterJson: { filename: document.originalFilename, size: document.fileSize },
    });

    res.status(201).json(document);
  })
);

documentsRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findFirst({
      where: { id: paramId(req.params.id), deletedAt: null },
    });
    if (!document) return res.status(404).json({ error: "Documento non trovato" });

    const storage = getDocumentStorage();
    if (!(await storage.exists(document.storagePath))) {
      return res.status(404).json({ error: "File non trovato nello storage" });
    }

    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "download",
      entityType: "document",
      entityId: document.id,
      afterJson: { filename: document.originalFilename, customerId: document.customerId },
    });

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalFilename)}"`
    );
    const stream = await storage.createReadStream(document.storagePath);
    stream.pipe(res);
  })
);

documentsRouter.delete(
  "/:id",
  requireWriteAccess,
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findUnique({ where: { id: paramId(req.params.id) } });
    if (!document) return res.status(404).json({ error: "Documento non trovato" });
    await prisma.document.update({
      where: { id: paramId(req.params.id) },
      data: { deletedAt: new Date() },
    });
    await writeAuditLog({
      actorUserId: req.user?.id,
      action: "delete",
      entityType: "document",
      entityId: document.id,
      beforeJson: document,
    });
    res.status(204).send();
  })
);
