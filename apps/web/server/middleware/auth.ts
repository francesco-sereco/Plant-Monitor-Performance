import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "../lib/config.js";

function isAuthEnabled() {
  return process.env.AUTH_ENABLED === "true";
}

function jwtSecret() {
  return process.env.JWT_SECRET ?? "dev-secret-change-me";
}

/** Public API paths (relative to /api) that skip mandatory auth. */
function isPublicApiPath(req: Request): boolean {
  const path = req.path.startsWith("/api") ? req.path.slice(4) : req.path;
  return path === "/health" || path.startsWith("/auth") || path.startsWith("/cron");
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  if (!isAuthEnabled()) {
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, jwtSecret()) as AuthUser;
  } catch {
    // ignore invalid token; requireAuth will block if needed
  }
  next();
}

export function requireAuthUnlessPublic(req: Request, res: Response, next: NextFunction) {
  if (!isAuthEnabled() || isPublicApiPath(req)) {
    return next();
  }
  return requireAuth(req, res, next);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAuthEnabled()) {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ error: "Autenticazione richiesta" });
  }
  next();
}

export function requireRoles(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAuthEnabled()) {
      return next();
    }
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permesso negato" });
    }
    next();
  };
}

export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (!isAuthEnabled()) {
    return next();
  }
  if (!req.user || req.user.role === "commerciale") {
    return res.status(403).json({ error: "Sola lettura per il ruolo commerciale" });
  }
  next();
}
