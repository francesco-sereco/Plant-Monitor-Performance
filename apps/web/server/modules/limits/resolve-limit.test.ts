import { describe, it, expect } from "vitest";
import { calculateCompliance, calculateReduction } from "./compliance.js";

describe("calculateCompliance", () => {
  it("returns compliant when within limits", () => {
    expect(calculateCompliance(50, 0, 100)).toBe("compliant");
  });

  it("returns out_of_limit when above max", () => {
    expect(calculateCompliance(150, 0, 100)).toBe("out_of_limit");
  });

  it("returns out_of_limit when below min", () => {
    expect(calculateCompliance(5, 6, 9)).toBe("out_of_limit");
  });

  it("returns limit_not_configured when no limits", () => {
    expect(calculateCompliance(50, null, null)).toBe("limit_not_configured");
  });

  it("returns incomplete when value is null", () => {
    expect(calculateCompliance(null, 0, 100)).toBe("incomplete");
  });
});

describe("calculateReduction", () => {
  it("calculates 70% reduction", () => {
    expect(calculateReduction(1000, 300)).toBe(70);
  });

  it("calculates 90% reduction", () => {
    expect(calculateReduction(1000, 100)).toBe(90);
  });

  it("returns null when initial is zero", () => {
    expect(calculateReduction(0, 50)).toBeNull();
  });

  it("returns null when data missing", () => {
    expect(calculateReduction(null, 100)).toBeNull();
  });
});
