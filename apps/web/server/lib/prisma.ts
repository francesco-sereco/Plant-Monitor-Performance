import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}pgbouncer=true`;
  }
  return url;
}

const datasourceUrl = databaseUrl();
if (datasourceUrl && datasourceUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = datasourceUrl;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;

export function decimalToNumber(value: { toNumber(): number } | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

export function toDecimal(value: number | null | undefined) {
  return value ?? null;
}
