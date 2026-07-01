import type { Request, Response, NextFunction } from "express";

/** Vercel Cron invia Authorization: Bearer <CRON_SECRET> se la variabile è impostata. */
export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "CRON_SECRET non configurato" });
  }

  const header = req.headers.authorization;
  if (header !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  next();
}
