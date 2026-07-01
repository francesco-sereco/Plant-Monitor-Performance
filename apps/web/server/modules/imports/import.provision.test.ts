import { describe, expect, it } from "vitest";
import { resolveCanonicalForImport } from "./import.provision.js";

describe("resolveCanonicalForImport", () => {
  it("normalizza O2, TEMPERATURA e FOSFORO", () => {
    expect(resolveCanonicalForImport({ code: "O2", value: 1 }).code).toBe("O2");
    expect(resolveCanonicalForImport({ code: "O2", value: 1 }).name).toBe("Ossigeno disciolto");
    expect(resolveCanonicalForImport({ code: "TEMPERATURA", value: 20 }).code).toBe("TEMP");
    expect(resolveCanonicalForImport({ code: "FOSFORO", value: 1 }).code).toBe("P");
    expect(resolveCanonicalForImport({ code: "NITROSO", value: 0.1 }).code).toBe("NO2");
  });
});
