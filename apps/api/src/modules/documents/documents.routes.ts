import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../lib/config.js";
import { paramId } from "../../lib/params.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireWriteAccess } from "../../middleware/auth.js";
import { writeAuditLog } from "../audit/audit.service.js";

const uploadSchema = z.object({
  customerId: z.string().min(1),
  plantId: z.string().optional(),
  measurementSessionId: z.string().optional(),
  documentType: z.enum(["takeoff_report", "lab_autocontrol", "other_pdf"]).optional(),
});

function ensureStorageDir() {
  const dir = path.resolve(config.storagePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureStorageDir()),
  filename: (_req, file, cb) => {
    const stored = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, stored);
  },
});

const upload = multer({
  storage,
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
    const document = await prisma.document.create({
      data: {
        customerId: meta.customerId,
        plantId: meta.plantId || null,
        measurementSessionId: meta.measurementSessionId || null,
        documentType: meta.documentType ?? "other_pdf",
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        storagePath: req.file.path,
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
    if (!fs.existsSync(document.storagePath)) {
      return res.status(404).json({ error: "File non trovato nello storage" });
    }
    res.download(document.storagePath, document.originalFilename);
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
