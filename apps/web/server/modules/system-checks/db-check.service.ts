import { SystemCheckStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const DB_KEEPALIVE_CHECK_KEY = "database_keepalive";
const MIN_INTERVAL_MS = 5 * 24 * 60 * 60 * 1000;

export type DbProbeSample = {
  id: string;
  name: string;
  active: boolean;
};

export type DbCheckValidation = {
  status: SystemCheckStatus;
  note: string;
  sectorCount: number;
  parameterCount: number;
};

export function validateDbProbe(
  sectors: DbProbeSample[],
  parameterCount: number
): DbCheckValidation {
  if (sectors.length === 0) {
    return {
      status: SystemCheckStatus.error,
      note: "Nessun settore trovato nel database",
      sectorCount: 0,
      parameterCount,
    };
  }

  const invalidSector = sectors.find(
    (sector) => !sector.id || !sector.name.trim() || typeof sector.active !== "boolean"
  );
  if (invalidSector) {
    return {
      status: SystemCheckStatus.error,
      note: `Settore non valido: id=${invalidSector.id || "mancante"}`,
      sectorCount: sectors.length,
      parameterCount,
    };
  }

  if (parameterCount === 0) {
    return {
      status: SystemCheckStatus.error,
      note: "Nessun parametro chimico configurato",
      sectorCount: sectors.length,
      parameterCount: 0,
    };
  }

  return {
    status: SystemCheckStatus.ok,
    note: `DB ok: ${sectors.length} settori, ${parameterCount} parametri`,
    sectorCount: sectors.length,
    parameterCount,
  };
}

export async function shouldRunDbCheck(force = false): Promise<boolean> {
  if (force) return true;

  const last = await prisma.systemCheck.findUnique({
    where: { checkKey: DB_KEEPALIVE_CHECK_KEY },
    select: { checkedAt: true },
  });
  if (!last) return true;

  return Date.now() - last.checkedAt.getTime() >= MIN_INTERVAL_MS;
}

export async function runDatabaseKeepaliveCheck(options?: { force?: boolean }) {
  const force = options?.force ?? false;
  const checkedAt = new Date();

  if (!(await shouldRunDbCheck(force))) {
    const existing = await prisma.systemCheck.findUnique({
      where: { checkKey: DB_KEEPALIVE_CHECK_KEY },
    });
    return {
      skipped: true as const,
      reason: "Intervallo minimo di 5 giorni non ancora trascorso",
      check: existing,
    };
  }

  const [sectors, parameterCount] = await Promise.all([
    prisma.sector.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.chemicalParameter.count(),
  ]);

  const validation = validateDbProbe(sectors, parameterCount);

  const check = await prisma.systemCheck.upsert({
    where: { checkKey: DB_KEEPALIVE_CHECK_KEY },
    create: {
      checkKey: DB_KEEPALIVE_CHECK_KEY,
      status: validation.status,
      note: validation.note,
      checkedAt,
    },
    update: {
      status: validation.status,
      note: validation.note,
      checkedAt,
    },
  });

  return {
    skipped: false as const,
    check,
    sectorCount: validation.sectorCount,
    parameterCount: validation.parameterCount,
  };
}
