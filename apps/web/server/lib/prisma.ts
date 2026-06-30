import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function decimalToNumber(value: { toNumber(): number } | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

export function toDecimal(value: number | null | undefined) {
  return value ?? null;
}
