import type { Request, Response, NextFunction } from "express";
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
  if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
    return res.status(409).json({ error: "Record duplicato" });
  }
  console.error(err);
  return res.status(500).json({ error: "Errore interno del server" });
}
