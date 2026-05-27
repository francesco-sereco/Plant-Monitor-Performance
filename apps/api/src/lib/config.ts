export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  authEnabled: process.env.AUTH_ENABLED === "true",
  maxPdfSizeMb: Number(process.env.MAX_PDF_SIZE_MB ?? 25),
  storagePath: process.env.STORAGE_PATH ?? "./storage/documents",
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "assistenza" | "commerciale";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
