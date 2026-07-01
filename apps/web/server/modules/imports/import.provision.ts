import { prisma } from "../../lib/prisma.js";
import type { ImportPreviewParameter } from "./import.types.js";

const CANONICAL_PARAMS: Record<
  string,
  { code: string; name: string; defaultUnit: string }
> = {
  cod: { code: "COD", name: "COD", defaultUnit: "mg/L" },
  o2: { code: "O2", name: "Ossigeno disciolto", defaultUnit: "mg/L" },
  ossigeno: { code: "O2", name: "Ossigeno disciolto", defaultUnit: "mg/L" },
  temperatura: { code: "TEMP", name: "Temperatura", defaultUnit: "°C" },
  temp: { code: "TEMP", name: "Temperatura", defaultUnit: "°C" },
  sst: { code: "SST", name: "Solidi sospesi totali", defaultUnit: "g/L" },
  nitroso: { code: "NO2", name: "Azoto nitroso", defaultUnit: "mg/L" },
  nitrico: { code: "N-NO3", name: "Azoto nitrico", defaultUnit: "mg/L" },
  nitrati: { code: "N-NO3", name: "Azoto nitrico", defaultUnit: "mg/L" },
  nh4: { code: "NH4", name: "Azoto ammoniacale", defaultUnit: "mg/L" },
  fosforo: { code: "P", name: "Fosforo", defaultUnit: "mg/L" },
  ph: { code: "pH", name: "pH", defaultUnit: "pH" },
  bod: { code: "BOD", name: "BOD", defaultUnit: "mg/L" },
};

const UNIT_LABELS: Record<string, string> = {
  "mg/L": "Milligrammi per litro",
  "g/L": "Grammi per litro",
  "°C": "Gradi Celsius",
  "°F": "Gradi Fahrenheit",
  pH: "pH",
  "µS/cm": "Microsiemens per centimetro",
  NTU: "Nephelometric Turbidity Unit",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveCanonical(row: ImportPreviewParameter): {
  code: string;
  name: string;
  defaultUnit: string;
} {
  const keys = [row.code, row.name].filter(Boolean).map((k) => normalizeKey(k!));
  for (const key of keys) {
    if (CANONICAL_PARAMS[key]) return CANONICAL_PARAMS[key];
    for (const [alias, canon] of Object.entries(CANONICAL_PARAMS)) {
      if (key.includes(alias) || alias.includes(key)) return canon;
    }
  }
  const code = (row.code ?? row.name ?? "PARAM")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 16)
    .toUpperCase();
  return {
    code: code || "PARAM",
    name: row.name ?? row.code ?? code,
    defaultUnit: row.unit ?? "mg/L",
  };
}

export function resolveCanonicalForImport(row: ImportPreviewParameter): {
  code: string;
  name: string;
  defaultUnit: string;
} {
  return resolveCanonical(row);
}

export async function ensureUnit(symbol: string): Promise<{ id: string; symbol: string }> {
  const trimmed = symbol.trim();
  const existing = await prisma.unit.findFirst({
    where: { symbol: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;

  return prisma.unit.create({
    data: {
      symbol: trimmed,
      name: UNIT_LABELS[trimmed] ?? trimmed,
    },
  });
}

export async function ensureChemicalParameter(row: ImportPreviewParameter): Promise<{
  id: string;
  defaultUnitId: string | null;
  created: boolean;
  code: string;
  name: string;
}> {
  const canon = resolveCanonical(row);
  const unitSymbol = row.unit?.trim() || canon.defaultUnit;
  const unit = await ensureUnit(unitSymbol);

  const byCode = await prisma.chemicalParameter.findUnique({ where: { code: canon.code } });
  if (byCode) {
    return {
      id: byCode.id,
      defaultUnitId: byCode.defaultUnitId ?? unit.id,
      created: false,
      code: byCode.code,
      name: byCode.name,
    };
  }

  const nameKey = normalizeKey(canon.name);
  const all = await prisma.chemicalParameter.findMany({ where: { active: true } });
  const byName = all.find((p) => normalizeKey(p.name) === nameKey);
  if (byName) {
    return {
      id: byName.id,
      defaultUnitId: byName.defaultUnitId ?? unit.id,
      created: false,
      code: byName.code,
      name: byName.name,
    };
  }

  const created = await prisma.chemicalParameter.create({
    data: {
      code: canon.code,
      name: canon.name,
      defaultUnitId: unit.id,
      description: "Creato automaticamente da import PDF",
      isNumeric: true,
      active: true,
    },
  });

  return {
    id: created.id,
    defaultUnitId: created.defaultUnitId,
    created: true,
    code: created.code,
    name: created.name,
  };
}
