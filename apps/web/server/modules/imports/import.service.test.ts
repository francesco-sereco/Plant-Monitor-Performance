import { describe, expect, it } from "vitest";
import { extractPdfText, isPdfBuffer } from "../../lib/pdf-text.js";

describe("pdf-text", () => {
  it("riconosce magic bytes PDF", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.4"))).toBe(true);
    expect(isPdfBuffer(Buffer.from("NOTPDF"))).toBe(false);
  });

  it("estrae testo tra parentesi nel buffer PDF", () => {
    const fakePdf = Buffer.from('%PDF-1.4\nBT (Cliente ACME) Tj (COD 120 mg/L) ET');
    expect(extractPdfText(fakePdf)).toContain("Cliente ACME");
    expect(extractPdfText(fakePdf)).toContain("COD 120 mg/L");
  });
});
