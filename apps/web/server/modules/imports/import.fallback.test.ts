import { describe, expect, it } from "vitest";
import { buildFallbackPreviewFromText } from "./import.fallback.js";

const SAMPLE = `
Pianiga, 29/06/2026
Spett.le CONTARINI VINI & SPUMANTI
Via General Cantore 35
31028 VISNA di VAZZOLA (TV)
DZ/mf 26/194
CAMPIONE INGRESSO IMPIANTO DI DEPURAZIONE
COD COD mg/L 3.200
CAMPIONE SCARICO IMPIANTO DI DEPURAZIONE
COD mg/L < 15 160
Azoto nitrico (N) sul posto mg/L < 1 20
`;

describe("buildFallbackPreviewFromText", () => {
  it("estrae cliente e parametri da PDF Ser.eco", () => {
    const preview = buildFallbackPreviewFromText(SAMPLE);
    expect(preview.customerName).toContain("CONTARINI");
    expect(preview.customerReference).toBe("26/194");
    expect(preview.measurementDate).toBe("2026-06-29");
    expect(preview.parameters.length).toBeGreaterThan(0);
    expect(preview.parameters.some((p) => p.code === "COD")).toBe(true);
  });
});
