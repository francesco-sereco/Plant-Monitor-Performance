import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

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
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Record duplicato" });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Riferimento non valido: verifica settore e dati collegati" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record non trovato" });
    }
  }
  console.error(err);
  return res.status(500).json({ error: "Errore interno del server" });
}
