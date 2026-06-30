import type { Limit, LimitScopeType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { calculateCompliance, calculateReduction } from "./compliance.js";

export { calculateCompliance, calculateReduction };

export type ResolveLimitContext = {
  parameterId: string;
  plantId: string;
  customerId: string;
  plantTypeId: string;
  sectorId: string;
  at?: Date;
};

const PRIORITY: LimitScopeType[] = ["plant", "customer", "plant_type", "sector", "global"];

export async function resolveLimit(ctx: ResolveLimitContext): Promise<Limit | null> {
  const at = ctx.at ?? new Date();

  const candidates = await prisma.limit.findMany({
    where: {
      chemicalParameterId: ctx.parameterId,
      active: true,
      OR: [{ validFrom: null }, { validFrom: { lte: at } }],
      AND: [{ OR: [{ validTo: null }, { validTo: { gte: at } }] }],
    },
  });

  for (const scopeType of PRIORITY) {
    const scopeId = getScopeId(scopeType, ctx);
    const match = candidates.find(
      (limit) => limit.scopeType === scopeType && (scopeType === "global" || limit.scopeId === scopeId)
    );
    if (match) return match;
  }

  return null;
}

function getScopeId(scopeType: LimitScopeType, ctx: ResolveLimitContext): string | null {
  switch (scopeType) {
    case "plant":
      return ctx.plantId;
    case "customer":
      return ctx.customerId;
    case "plant_type":
      return ctx.plantTypeId;
    case "sector":
      return ctx.sectorId;
    case "global":
      return null;
    default:
      return null;
  }
}
