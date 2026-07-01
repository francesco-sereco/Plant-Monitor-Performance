import type { ImportPreview, ImportPreviewParameter } from "./import.types.js";

function parseEuropeanNumber(raw: string): number | string {
  const cleaned = raw.replace(/[<>\s]/g, "").trim();
  // Formato italiano migliaia: 3.200 → 3200
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  const normalized = cleaned.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : raw.trim();
}

function normalizeSamplingPoint(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("ingresso")) return "ingresso";
  if (s.includes("ossidazione")) return "ossidazione";
  if (s.includes("scarico")) return "scarico";
  return section;
}

/** Estrazione euristica per PDF Ser.eco (rapportini / autocontrolli). */
export function buildFallbackPreviewFromText(text: string): ImportPreview {
  const preview: ImportPreview = { parameters: [], warnings: [] };

  const customerMatch =
    text.match(/Spett\.?\s*le\s+([A-ZÀ-ÿ0-9][A-ZÀ-ÿ0-9 &'.-]+?)(?:\s+Via|\s+Alla|\s+\d{5})/i) ??
    text.match(/Spett\.?\s*le\s+([^\n]+)/i);
  if (customerMatch?.[1]) {
    preview.customerName = customerMatch[1].replace(/\s+/g, " ").trim();
  }

  const cityMatch = text.match(/\d{5}\s+([A-ZÀ-ÿ' ]+?)\s*\([A-Z]{2}\)/i);
  if (cityMatch?.[1]) preview.customerCity = cityMatch[1].trim();

  const addressMatch = text.match(/Via\s+[^\n]+/i);
  if (addressMatch?.[0]) preview.customerAddress = addressMatch[0].trim();

  const refMatch = text.match(/DZ\/mf\s*(\d+\/\d+)/i);
  if (refMatch?.[1]) preview.customerReference = refMatch[1];

  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch?.[1]) {
    const [d, m, y] = dateMatch[1].split("/");
    preview.measurementDate = `${y}-${m}-${d}`;
  }

  const techMatch = text.match(/Responsabile Assistenza tecnica\s+([^\n]+)/i);
  if (techMatch?.[1]) preview.technicianName = techMatch[1].trim();

  preview.laboratoryName = "Ser.eco. depurazione acque srl";

  const sections = text.split(/CAMPIONE\s+/i).slice(1);
  for (const block of sections) {
    const headerEnd = block.indexOf("Parametro");
    const header = headerEnd > 0 ? block.slice(0, headerEnd) : block.split("\n")[0] ?? "";
    const samplingPoint = normalizeSamplingPoint(header);

    const codMatch = block.match(/COD\b[^0-9]*mg\/L\s*([<]?\s*[\d.,]+)/i);
    if (codMatch?.[1]) {
      preview.parameters.push({
        code: "COD",
        name: "COD",
        value: parseEuropeanNumber(codMatch[1]),
        unit: "mg/L",
        samplingPoint,
      });
    }

    const rows: Array<[string, string, string?]> = [
      ["O2", "Ossigeno disciolto", "mg/L"],
      ["TEMPERATURA", "Temperatura", "°C"],
      ["SST", "Solidi Sospesi Totali", "g/L"],
      ["NITROSO", "Azoto nitroso", "mg/L"],
      ["NITRICO", "Azoto nitrico", "mg/L"],
      ["NH4", "Azoto ammoniacale", "mg/L"],
      ["FOSFORO", "Fosforo", "mg/L"],
    ];

    for (const [code, name, unit] of rows) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const unitPattern = (unit ?? "mg/L").replace("°", "°");
      const pattern = new RegExp(
        `${escapedName}[^\\d<]*${unitPattern}\\s*([<]?\\s*[\\d.,]+)`,
        "i"
      );
      const match = block.match(pattern);
      if (match?.[1]) {
        preview.parameters.push({
          code,
          name,
          value: parseEuropeanNumber(match[1]),
          unit,
          samplingPoint,
        });
      }
    }
  }

  if (preview.parameters.length > 0) {
    preview.warnings.push("Anteprima da parser locale (AI non disponibile o risposta non valida)");
  }

  return preview;
}

export function mergePreview(primary: ImportPreview, fallback: ImportPreview): ImportPreview {
  return {
    customerName: primary.customerName ?? fallback.customerName,
    customerCity: primary.customerCity ?? fallback.customerCity,
    customerAddress: primary.customerAddress ?? fallback.customerAddress,
    customerReference: primary.customerReference ?? fallback.customerReference,
    plantName: primary.plantName ?? fallback.plantName,
    measurementDate: primary.measurementDate ?? fallback.measurementDate,
    technicianName: primary.technicianName ?? fallback.technicianName,
    laboratoryName: primary.laboratoryName ?? fallback.laboratoryName,
    parameters: primary.parameters.length > 0 ? primary.parameters : fallback.parameters,
    warnings: [...primary.warnings, ...fallback.warnings.filter((w) => !primary.warnings.includes(w))],
  };
}
