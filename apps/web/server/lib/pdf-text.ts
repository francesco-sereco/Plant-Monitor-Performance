import pdfParse from "pdf-parse/lib/pdf-parse.js";

const PDF_MAGIC = Buffer.from("%PDF");

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);
}

/** Estrazione testo da PDF con layer testuale (pdf-parse). */
export async function extractPdfText(buffer: Buffer, maxChars = 12_000): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    return result.text.replace(/\s+/g, " ").trim().slice(0, maxChars);
  } catch {
    return legacyExtractPdfText(buffer, maxChars);
  }
}

/** Fallback leggero per PDF con testo in parentesi Tj. */
function legacyExtractPdfText(buffer: Buffer, maxChars: number): string {
  const raw = buffer.toString("latin1");
  const parts: string[] = [];
  const parenRegex = /\(([^\\)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(raw)) !== null) {
    const text = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .trim();
    if (text.length > 1 && /[a-zA-Z0-9À-ÿ]/.test(text)) {
      parts.push(text);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}
