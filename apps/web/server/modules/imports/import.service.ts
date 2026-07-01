import crypto from "crypto";
import path from "path";
import { prisma } from "../../lib/prisma.js";
import { getGroqEnv } from "../../lib/env.js";
import { extractPdfText, isPdfBuffer } from "../../lib/pdf-text.js";
import { getDocumentStorage } from "../../lib/storage/index.js";
import { groqChatCompletion } from "../ai/groq.client.js";
import { resolveLimit, calculateCompliance } from "../limits/resolve-limit.js";
import { decimalToNumber } from "../../lib/prisma.js";
import type { ImportDocumentType, ImportPreview, ImportPreviewParameter } from "./import.types.js";

const DOCUMENT_TYPE_LABEL: Record<ImportDocumentType, string> = {
  takeoff_report: "rapportino di asporto",
  lab_autocontrol: "autocontrollo di laboratorio",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseJsonFromReply(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? reply.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("JSON estratto non valido");
  }
}

function coercePreview(data: unknown): ImportPreview {
  const obj = (data ?? {}) as Record<string, unknown>;
  const parameters = Array.isArray(obj.parameters)
    ? obj.parameters
        .map((p) => {
          const row = p as Record<string, unknown>;
          const value = row.value;
          if (value === undefined || value === null || value === "") return null;
          return {
            code: typeof row.code === "string" ? row.code : undefined,
            name: typeof row.name === "string" ? row.name : undefined,
            value: typeof value === "number" ? value : String(value),
            unit: typeof row.unit === "string" ? row.unit : undefined,
            samplingPoint: typeof row.samplingPoint === "string" ? row.samplingPoint : undefined,
          } satisfies ImportPreviewParameter;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  return {
    customerName: typeof obj.customerName === "string" ? obj.customerName : undefined,
    customerCity: typeof obj.customerCity === "string" ? obj.customerCity : undefined,
    customerAddress: typeof obj.customerAddress === "string" ? obj.customerAddress : undefined,
    customerReference: typeof obj.customerReference === "string" ? obj.customerReference : undefined,
    plantName: typeof obj.plantName === "string" ? obj.plantName : undefined,
    measurementDate: typeof obj.measurementDate === "string" ? obj.measurementDate : undefined,
    technicianName: typeof obj.technicianName === "string" ? obj.technicianName : undefined,
    laboratoryName: typeof obj.laboratoryName === "string" ? obj.laboratoryName : undefined,
    parameters,
    warnings: [],
  };
}

export async function extractImportPreview(
  text: string,
  documentType: ImportDocumentType,
  fetchFn?: typeof fetch
): Promise<ImportPreview> {
  const { apiKey, model } = getGroqEnv();
  if (!apiKey) {
    return {
      parameters: [],
      warnings: ["GROQ_API_KEY non configurata: anteprima manuale richiesta"],
    };
  }

  const docLabel = DOCUMENT_TYPE_LABEL[documentType];
  const prompt = `Sei un assistente per un software di monitoraggio impianti di trattamento acque.
Analizza il testo estratto da un ${docLabel} e restituisci SOLO un oggetto JSON valido con questa struttura:
{
  "customerName": "ragione sociale cliente",
  "customerCity": "città opzionale",
  "customerAddress": "indirizzo opzionale",
  "customerReference": "riferimento documento es. 26/194",
  "plantName": "nome impianto se presente",
  "measurementDate": "YYYY-MM-DD",
  "technicianName": "tecnico se presente",
  "laboratoryName": "laboratorio se presente",
  "parameters": [
    { "code": "COD", "name": "COD", "value": 123.4, "unit": "mg/L", "samplingPoint": "ingresso" }
  ]
}
Regole:
- customerName è il destinatario del documento (es. CONTARINI VINI & SPUMANTI), non il mittente Ser.eco.
- samplingPoint usa: ingresso, ossidazione, scarico (o nomi equivalenti nel testo).
- Per valori con "<" conserva il valore numerico (es. "< 15" → 15) e indica nel name se limite di rilevazione.
- Includi solo parametri chimici con valore numerico o testuale leggibile.
- Non inventare valori assenti nel testo.
- Usa codici standard se riconoscibili (COD, BOD, pH, SST, OSSIGENO, TEMPERATURA, NITRATI, FOSFORO, ecc.).

Testo PDF:
${text.slice(0, 10_000)}`;

  const result = await groqChatCompletion({
    apiKey,
    model,
    userMessage: prompt,
    maxTokens: 2048,
    timeoutMs: 30_000,
    fetchFn,
  });

  const preview = coercePreview(parseJsonFromReply(result.reply));
  preview.warnings.push("Anteprima generata da AI: conferma obbligatoria prima del salvataggio");
  return preview;
}

const PARAM_ALIASES: Record<string, string[]> = {
  COD: ["cod"],
  Nitrati: ["azoto nitrico", "n-no3", "nitrico"],
  pH: ["ph"],
  Torbidità: ["torbidita", "ntu"],
};

const POINT_ALIASES: Record<string, string[]> = {
  "ingresso impianto": ["ingresso", "campione ingresso"],
  "post mbr": ["ossidazione", "mbr"],
  "scarico finale": ["scarico", "effluente", "campione scarico"],
};

function matchesAlias(key: string, aliases: string[]): boolean {
  const k = normalizeKey(key);
  return aliases.some((a) => k.includes(normalizeKey(a)) || normalizeKey(a).includes(k));
}

export async function enrichImportPreview(preview: ImportPreview): Promise<ImportPreview> {
  const [parameters, units, samplingPoints] = await Promise.all([
    prisma.chemicalParameter.findMany({ where: { active: true } }),
    prisma.unit.findMany(),
    prisma.samplingPoint.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const defaultSamplingPoint = samplingPoints[0];
  const enrichedParams: ImportPreviewParameter[] = [];

  for (const row of preview.parameters) {
    const codeKey = row.code ? normalizeKey(row.code) : "";
    const nameKey = row.name ? normalizeKey(row.name) : "";
    const match =
      parameters.find((p) => normalizeKey(p.code) === codeKey) ??
      parameters.find((p) => normalizeKey(p.name) === nameKey) ??
      parameters.find((p) => nameKey && normalizeKey(p.name).includes(nameKey)) ??
      parameters.find((p) =>
        Object.entries(PARAM_ALIASES).some(
          ([code, aliases]) =>
            normalizeKey(p.code) === normalizeKey(code) &&
            (matchesAlias(nameKey, aliases) || matchesAlias(codeKey, aliases))
        )
      );

    const unitMatch = row.unit
      ? units.find((u) => normalizeKey(u.symbol) === normalizeKey(row.unit!))
      : undefined;

    const pointKey = row.samplingPoint ? normalizeKey(row.samplingPoint) : "";
    const pointMatch =
      samplingPoints.find((sp) => normalizeKey(sp.name) === pointKey) ??
      samplingPoints.find((sp) => pointKey && normalizeKey(sp.name).includes(pointKey)) ??
      samplingPoints.find((sp) =>
        Object.entries(POINT_ALIASES).some(
          ([pointName, aliases]) =>
            normalizeKey(sp.name) === normalizeKey(pointName) && matchesAlias(pointKey, aliases)
        )
      );

    const chemicalParameterId = match?.id;
    const unitId = unitMatch?.id ?? match?.defaultUnitId ?? undefined;
    const samplingPointId = pointMatch?.id ?? defaultSamplingPoint?.id;
    const mapped = Boolean(chemicalParameterId && unitId && samplingPointId);

    enrichedParams.push({
      ...row,
      chemicalParameterId,
      unitId,
      samplingPointId,
      mapped,
    });

    if (!mapped) {
      preview.warnings.push(
        `Parametro non mappato: ${row.code ?? row.name ?? "sconosciuto"} (${row.value} ${row.unit ?? ""})`.trim()
      );
    }
  }

  return { ...preview, parameters: enrichedParams };
}

export async function resolveCustomerId(
  explicitCustomerId: string | undefined,
  preview: ImportPreview
): Promise<string | null> {
  if (explicitCustomerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: explicitCustomerId, deletedAt: null },
    });
    return customer?.id ?? null;
  }

  if (!preview.customerName) return null;
  const key = normalizeKey(preview.customerName);
  const customers = await prisma.customer.findMany({ where: { deletedAt: null } });
  const match =
    customers.find((c) => normalizeKey(c.businessName) === key) ??
    customers.find((c) => normalizeKey(c.businessName).includes(key)) ??
    customers.find((c) => key.includes(normalizeKey(c.businessName)));
  return match?.id ?? null;
}

function slugCodeFromName(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
  return base || "CLI";
}

async function ensureCustomerFromPreview(
  preview: ImportPreview,
  explicitCustomerId?: string
): Promise<{ customerId: string; created: boolean }> {
  const existing = await resolveCustomerId(explicitCustomerId, preview);
  if (existing) {
    preview.customerExists = true;
    return { customerId: existing, created: false };
  }

  if (!preview.customerName) {
    throw new Error("Cliente non trovato nel PDF: seleziona un cliente manualmente");
  }

  const sector = await prisma.sector.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
  if (!sector) throw new Error("Nessun settore configurato: crea almeno un settore");

  let code = preview.customerReference?.replace(/\//g, "") ?? slugCodeFromName(preview.customerName);
  const taken = await prisma.customer.findUnique({ where: { code } });
  if (taken) code = `${code.slice(0, 6)}${Date.now().toString().slice(-4)}`;

  const customer = await prisma.customer.create({
    data: {
      code,
      businessName: preview.customerName,
      sectorId: sector.id,
      city: preview.customerCity,
      address: preview.customerAddress,
      notes: preview.customerReference ? `Rif. import PDF: ${preview.customerReference}` : undefined,
    },
  });

  preview.customerExists = false;
  preview.warnings.push(
    `Cliente creato automaticamente (${customer.businessName}, settore ${sector.name}): verifica anagrafica in conferma`
  );

  return { customerId: customer.id, created: true };
}

export async function createPdfImport(params: {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  documentType: ImportDocumentType;
  customerId?: string;
  plantId?: string;
  createdById?: string;
  fetchFn?: typeof fetch;
}) {
  if (!isPdfBuffer(params.buffer)) {
    throw new Error("Il file non è un PDF valido");
  }

  const storedFilename = `${crypto.randomUUID()}${path.extname(params.originalFilename) || ".pdf"}`;
  const storage = getDocumentStorage();
  const stored = await storage.save({
    buffer: params.buffer,
    storedFilename,
    mimeType: params.mimeType,
  });

  const extractedText = await extractPdfText(params.buffer);
  let preview: ImportPreview = { parameters: [], warnings: [] };
  let status: "uploaded" | "needs_review" | "failed" = "uploaded";
  let errorMessage: string | undefined;
  let parserType: string | undefined;

  if (extractedText.length < 40) {
    preview.warnings.push(
      "Testo PDF insufficiente o non leggibile. Verifica il file o inserisci i dati manualmente dopo la conferma."
    );
    status = "needs_review";
  } else {
    try {
      preview = await extractImportPreview(extractedText, params.documentType, params.fetchFn);
      preview = await enrichImportPreview(preview);
      parserType = "groq-json";
      status = "needs_review";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Estrazione fallita";
      preview.warnings.push(errorMessage);
      status = "failed";
    }
  }

  const { customerId: resolvedCustomerId } = await ensureCustomerFromPreview(preview, params.customerId);

  if (params.plantId) {
    const plant = await prisma.plant.findFirst({
      where: { id: params.plantId, customerId: resolvedCustomerId, deletedAt: null },
    });
    if (!plant) throw new Error("Impianto non valido per il cliente indicato");
  }

  const document = await prisma.document.create({
    data: {
      customerId: resolvedCustomerId,
      plantId: params.plantId ?? null,
      documentType: params.documentType,
      originalFilename: params.originalFilename,
      storedFilename: stored.storedFilename,
      storagePath: stored.storagePath,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      uploadedById: params.createdById,
    },
  });

  const job = await prisma.pdfImportJob.create({
    data: {
      documentId: document.id,
      status,
      parserType,
      rawExtractedText: extractedText || null,
      structuredOutputJson: preview as object,
      errorMessage,
      createdById: params.createdById,
    },
    include: {
      document: { include: { customer: true, plant: true } },
    },
  });

  return job;
}

export async function confirmPdfImport(params: {
  jobId: string;
  customerId: string;
  plantId: string;
  measurementDate?: string;
  createdById?: string;
  createPlant?: { plantTypeId: string; name: string };
}) {
  const job = await prisma.pdfImportJob.findUnique({
    where: { id: params.jobId },
    include: { document: true },
  });
  if (!job) throw new Error("Import non trovato");
  if (job.status === "confirmed") throw new Error("Import già confermato");
  if (job.status === "discarded") throw new Error("Import scartato");

  const preview = job.structuredOutputJson as ImportPreview | null;
  if (!preview?.parameters?.length) {
    throw new Error("Nessun parametro da importare nell'anteprima");
  }

  let plant = await prisma.plant.findFirst({
    where: { id: params.plantId, customerId: params.customerId, deletedAt: null },
    include: { customer: true },
  });

  if (!plant && params.createPlant) {
    plant = await prisma.plant.create({
      data: {
        customerId: params.customerId,
        plantTypeId: params.createPlant.plantTypeId,
        name: params.createPlant.name,
      },
      include: { customer: true },
    });
  }

  if (!plant) throw new Error("Impianto non valido per il cliente selezionato");

  const mapped = preview.parameters.filter((p) => p.mapped && p.chemicalParameterId && p.unitId && p.samplingPointId);
  if (mapped.length === 0) {
    throw new Error("Nessun parametro mappato su anagrafica: verifica codici e unità");
  }

  const measurementDate = new Date(
    params.measurementDate ?? preview.measurementDate ?? new Date().toISOString().slice(0, 10)
  );

  const measurementRows = await Promise.all(
    mapped.map(async (row) => {
      const valueNumeric =
        typeof row.value === "number"
          ? row.value
          : Number.isFinite(Number(row.value))
            ? Number(row.value)
            : null;
      const valueText = valueNumeric === null ? String(row.value) : null;

      const limit = await resolveLimit({
        parameterId: row.chemicalParameterId!,
        plantId: plant.id,
        customerId: plant.customerId,
        plantTypeId: plant.plantTypeId,
        sectorId: plant.customer.sectorId,
        at: measurementDate,
      });

      const min = limit ? decimalToNumber(limit.minValue) : null;
      const max = limit ? decimalToNumber(limit.maxValue) : null;

      return {
        chemicalParameterId: row.chemicalParameterId!,
        samplingPointId: row.samplingPointId!,
        valueNumeric,
        valueText,
        unitId: row.unitId!,
        appliedLimitId: limit?.id ?? null,
        limitMinSnapshot: min,
        limitMaxSnapshot: max,
        complianceStatus: calculateCompliance(valueNumeric, min, max),
      };
    })
  );

  const session = await prisma.measurementSession.create({
    data: {
      customerId: plant.customerId,
      plantId: plant.id,
      measurementDate,
      sourceType: "pdf_import",
      technicianName: preview.technicianName,
      laboratoryName: preview.laboratoryName,
      status: "confirmed",
      notes: `Import PDF: ${job.document.originalFilename}`,
      createdById: params.createdById,
      measurements: { create: measurementRows },
    },
    include: {
      measurements: { include: { chemicalParameter: true, samplingPoint: true, unit: true } },
    },
  });

  await prisma.document.update({
    where: { id: job.documentId },
    data: { measurementSessionId: session.id, plantId: plant.id, customerId: plant.customerId },
  });

  const updatedJob = await prisma.pdfImportJob.update({
    where: { id: job.id },
    data: { status: "confirmed" },
    include: {
      document: { include: { customer: true, plant: true } },
    },
  });

  return { job: updatedJob, session };
}
