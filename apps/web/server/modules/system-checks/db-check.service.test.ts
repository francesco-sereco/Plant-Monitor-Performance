import { describe, it, expect } from "vitest";
import { SystemCheckStatus } from "@prisma/client";
import { validateDbProbe } from "./db-check.service.js";

describe("validateDbProbe", () => {
  it("returns ok when sectors and parameters are present", () => {
    const result = validateDbProbe(
      [{ id: "s1", name: "Industria", active: true }],
      12
    );
    expect(result.status).toBe(SystemCheckStatus.ok);
    expect(result.note).toContain("DB ok");
    expect(result.sectorCount).toBe(1);
    expect(result.parameterCount).toBe(12);
  });

  it("returns error when no sectors exist", () => {
    const result = validateDbProbe([], 3);
    expect(result.status).toBe(SystemCheckStatus.error);
    expect(result.note).toContain("Nessun settore");
  });

  it("returns error when sector name is empty", () => {
    const result = validateDbProbe([{ id: "s1", name: "  ", active: true }], 3);
    expect(result.status).toBe(SystemCheckStatus.error);
    expect(result.note).toContain("non valido");
  });

  it("returns error when no chemical parameters exist", () => {
    const result = validateDbProbe([{ id: "s1", name: "Industria", active: true }], 0);
    expect(result.status).toBe(SystemCheckStatus.error);
    expect(result.note).toContain("parametro chimico");
  });
});
