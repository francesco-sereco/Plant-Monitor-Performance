import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

function getPrismaErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) {
    return undefined;
  }
  const code = (err as { code: unknown }).code;
  return typeof code === "string" && code.startsWith("P") ? code : undefined;
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validazione fallita", details: err.flatten() });
  }

  if (err instanceof Error && err.message === "Origine non consentita da CORS") {
    return res.status(403).json({ error: err.message });
  }

  if (err instanceof Error && /file troppo grande|PDF consentiti|Unexpected field/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }

  const prismaCode = getPrismaErrorCode(err);
  if (prismaCode === "P2002") {
    return res.status(409).json({ error: "Record duplicato" });
  }
  if (prismaCode === "P2003") {
    return res.status(400).json({ error: "Riferimento non valido: verifica settore e dati collegati" });
  }
  if (prismaCode === "P2025") {
    return res.status(404).json({ error: "Record non trovato" });
  }

  console.error(err);
  return res.status(500).json({ error: "Errore interno del server" });
}
