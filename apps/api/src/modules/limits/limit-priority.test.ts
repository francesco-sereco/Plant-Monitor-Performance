import { describe, it, expect } from "vitest";
import { LimitScopeType } from "@prisma/client";

const PRIORITY: LimitScopeType[] = ["plant", "customer", "plant_type", "sector", "global"];

function resolveFromCandidates(
  candidates: { scopeType: LimitScopeType; scopeId: string | null; id: string }[],
  ctx: { plantId: string; customerId: string; plantTypeId: string; sectorId: string }
) {
  for (const scopeType of PRIORITY) {
    const scopeId =
      scopeType === "plant"
        ? ctx.plantId
        : scopeType === "customer"
          ? ctx.customerId
          : scopeType === "plant_type"
            ? ctx.plantTypeId
            : scopeType === "sector"
              ? ctx.sectorId
              : null;
    const match = candidates.find(
      (l) => l.scopeType === scopeType && (scopeType === "global" || l.scopeId === scopeId)
    );
    if (match) return match;
  }
  return null;
}

describe("limit priority", () => {
  const ctx = {
    plantId: "plant-1",
    customerId: "cust-1",
    plantTypeId: "type-1",
    sectorId: "sec-1",
  };

  it("prefers plant over global", () => {
    const candidates = [
      { id: "global", scopeType: "global" as LimitScopeType, scopeId: null },
      { id: "plant", scopeType: "plant" as LimitScopeType, scopeId: "plant-1" },
    ];
    expect(resolveFromCandidates(candidates, ctx)?.id).toBe("plant");
  });

  it("prefers customer over sector", () => {
    const candidates = [
      { id: "sector", scopeType: "sector" as LimitScopeType, scopeId: "sec-1" },
      { id: "customer", scopeType: "customer" as LimitScopeType, scopeId: "cust-1" },
    ];
    expect(resolveFromCandidates(candidates, ctx)?.id).toBe("customer");
  });

  it("returns null when no match", () => {
    expect(resolveFromCandidates([], ctx)).toBeNull();
  });
});
