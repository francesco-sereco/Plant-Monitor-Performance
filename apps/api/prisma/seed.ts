import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.pdfImportJob.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.measurementSession.deleteMany();
  await prisma.document.deleteMany();
  await prisma.limit.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.chemicalParameter.deleteMany();
  await prisma.samplingPoint.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.plantType.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin, assistenza, commerciale] = await Promise.all([
    prisma.user.create({
      data: { name: "Admin", email: "admin@pmp.local", passwordHash, role: "admin" },
    }),
    prisma.user.create({
      data: { name: "Tecnico Assistenza", email: "assistenza@pmp.local", passwordHash, role: "assistenza" },
    }),
    prisma.user.create({
      data: { name: "Commerciale", email: "commerciale@pmp.local", passwordHash, role: "commerciale" },
    }),
  ]);

  const sectors = await Promise.all(
    ["Alimentare", "Farmaceutico", "Industriale"].map((name) =>
      prisma.sector.create({ data: { name, description: `Settore ${name}` } })
    )
  );

  const plantTypes = await Promise.all(
    ["Addolcitore", "Osmosi inversa", "MBR", "Trattamento scarico", "Impianto misto"].map((name) =>
      prisma.plantType.create({ data: { name } })
    )
  );

  const units = await Promise.all(
    [
      { symbol: "mg/L", name: "Milligrammi per litro" },
      { symbol: "pH", name: "pH" },
      { symbol: "µS/cm", name: "Microsiemens per centimetro" },
      { symbol: "NTU", name: "Nephelometric Turbidity Unit" },
      { symbol: "°F", name: "Gradi francesi" },
    ].map((u) => prisma.unit.create({ data: u }))
  );

  const mgL = units.find((u) => u.symbol === "mg/L")!;
  const phUnit = units.find((u) => u.symbol === "pH")!;
  const usCm = units.find((u) => u.symbol === "µS/cm")!;

  const parameters = await Promise.all(
    [
      { code: "COD", name: "COD", defaultUnitId: mgL.id },
      { code: "pH", name: "pH", defaultUnitId: phUnit.id, isNumeric: true },
      { code: "Cloruri", name: "Cloruri", defaultUnitId: mgL.id },
      { code: "Conducibilità", name: "Conducibilità", defaultUnitId: usCm.id },
      { code: "Durezza", name: "Durezza", defaultUnitId: units.find((u) => u.symbol === "°F")!.id },
      { code: "Ferro", name: "Ferro", defaultUnitId: mgL.id },
      { code: "Nitrati", name: "Nitrati", defaultUnitId: mgL.id },
      { code: "Torbidità", name: "Torbidità", defaultUnitId: units.find((u) => u.symbol === "NTU")!.id },
    ].map((p) => prisma.chemicalParameter.create({ data: p }))
  );

  const cod = parameters.find((p) => p.code === "COD")!;
  const phParam = parameters.find((p) => p.code === "pH")!;

  const points = await Promise.all(
    [
      { name: "Ingresso impianto", sortOrder: 1 },
      { name: "Post MBR", sortOrder: 2 },
      { name: "Post pulizia", sortOrder: 3 },
      { name: "Scarico finale", sortOrder: 4 },
    ].map((p) => prisma.samplingPoint.create({ data: p }))
  );

  const ingresso = points.find((p) => p.name === "Ingresso impianto")!;
  const postMbr = points.find((p) => p.name === "Post MBR")!;
  const postPulizia = points.find((p) => p.name === "Post pulizia")!;
  const scarico = points.find((p) => p.name === "Scarico finale")!;

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        code: "ACM001",
        businessName: "Acme Alimentare S.r.l.",
        sectorId: sectors[0].id,
        city: "Milano",
        province: "MI",
        contactName: "Mario Rossi",
        contactEmail: "m.rossi@acme.it",
      },
    }),
    prisma.customer.create({
      data: {
        code: "FAR002",
        businessName: "Pharma Clean S.p.A.",
        sectorId: sectors[1].id,
        city: "Bergamo",
        province: "BG",
        contactName: "Laura Bianchi",
      },
    }),
    prisma.customer.create({
      data: {
        code: "IND003",
        businessName: "Metal Works Industriale",
        sectorId: sectors[2].id,
        city: "Brescia",
        province: "BS",
        contactName: "Giuseppe Verdi",
      },
    }),
  ]);

  const mbrType = plantTypes.find((t) => t.name === "MBR")!;
  const osmosiType = plantTypes.find((t) => t.name === "Osmosi inversa")!;

  const plants = await Promise.all([
    prisma.plant.create({
      data: {
        customerId: customers[0].id,
        plantTypeId: mbrType.id,
        name: "MBR scarico industriale",
        location: "Reparto produzione",
        serialNumber: "MBR-2024-001",
      },
    }),
    prisma.plant.create({
      data: {
        customerId: customers[0].id,
        plantTypeId: osmosiType.id,
        name: "Osmosi processo",
        location: "Laboratorio interno",
      },
    }),
    prisma.plant.create({
      data: {
        customerId: customers[1].id,
        plantTypeId: osmosiType.id,
        name: "Osmosi farmaceutica",
        location: "Clean room",
      },
    }),
    prisma.plant.create({
      data: {
        customerId: customers[2].id,
        plantTypeId: mbrType.id,
        name: "MBR trattamento acque reflue",
        location: "Depuratore interno",
      },
    }),
    prisma.plant.create({
      data: {
        customerId: customers[2].id,
        plantTypeId: plantTypes.find((t) => t.name === "Trattamento scarico")!.id,
        name: "Scarico industriale",
        location: "Uscita impianto",
      },
    }),
  ]);

  const acmePlant = plants[0];

  await prisma.limit.createMany({
    data: [
      {
        chemicalParameterId: cod.id,
        unitId: mgL.id,
        scopeType: "plant",
        scopeId: acmePlant.id,
        maxValue: 100,
        legalReferenceText: "Limite contrattuale scarico COD",
        createdById: admin.id,
      },
      {
        chemicalParameterId: cod.id,
        unitId: mgL.id,
        scopeType: "global",
        scopeId: null,
        maxValue: 160,
        legalReferenceText: "Limite globale COD",
        createdById: admin.id,
      },
      {
        chemicalParameterId: phParam.id,
        unitId: phUnit.id,
        scopeType: "global",
        scopeId: null,
        minValue: 6,
        maxValue: 9,
        createdById: admin.id,
      },
    ],
  });

  const codLimit = await prisma.limit.findFirst({
    where: { chemicalParameterId: cod.id, scopeType: "plant", scopeId: acmePlant.id },
  })!;

  const phLimit = await prisma.limit.findFirst({
    where: { chemicalParameterId: phParam.id, scopeType: "global" },
  })!;

  // Demo COD session - Acme 2026-05-01
  const demoDate = new Date("2026-05-01");
  await prisma.measurementSession.create({
    data: {
      customerId: customers[0].id,
      plantId: acmePlant.id,
      measurementDate: demoDate,
      sourceType: "manual",
      technicianName: "Tecnico Demo",
      status: "confirmed",
      createdById: assistenza.id,
      measurements: {
        create: [
          {
            chemicalParameterId: cod.id,
            samplingPointId: ingresso.id,
            valueNumeric: 1000,
            unitId: mgL.id,
            appliedLimitId: codLimit!.id,
            limitMinSnapshot: null,
            limitMaxSnapshot: 100,
            complianceStatus: "out_of_limit",
          },
          {
            chemicalParameterId: cod.id,
            samplingPointId: postMbr.id,
            valueNumeric: 300,
            unitId: mgL.id,
            appliedLimitId: codLimit!.id,
            limitMinSnapshot: null,
            limitMaxSnapshot: 100,
            complianceStatus: "out_of_limit",
          },
          {
            chemicalParameterId: cod.id,
            samplingPointId: postPulizia.id,
            valueNumeric: 100,
            unitId: mgL.id,
            appliedLimitId: codLimit!.id,
            limitMinSnapshot: null,
            limitMaxSnapshot: 100,
            complianceStatus: "compliant",
          },
          {
            chemicalParameterId: cod.id,
            samplingPointId: scarico.id,
            valueNumeric: 90,
            unitId: mgL.id,
            appliedLimitId: codLimit!.id,
            limitMinSnapshot: null,
            limitMaxSnapshot: 100,
            complianceStatus: "compliant",
          },
        ],
      },
    },
  });

  // Additional measurements for history and out-of-limit cases
  const extraSessions = [
    { date: "2026-04-01", codVal: 950, phVal: 7.2 },
    { date: "2026-03-01", codVal: 880, phVal: 7.0 },
    { date: "2026-02-01", codVal: 920, phVal: 6.8 },
    { date: "2026-01-15", codVal: 110, phVal: 5.5 },
    { date: "2026-01-01", codVal: 850, phVal: 7.1 },
  ];

  for (const s of extraSessions) {
    await prisma.measurementSession.create({
      data: {
        customerId: customers[0].id,
        plantId: acmePlant.id,
        measurementDate: new Date(s.date),
        sourceType: "manual",
        status: "confirmed",
        createdById: assistenza.id,
        measurements: {
          create: [
            {
              chemicalParameterId: cod.id,
              samplingPointId: ingresso.id,
              valueNumeric: s.codVal,
              unitId: mgL.id,
              appliedLimitId: codLimit!.id,
              limitMaxSnapshot: 100,
              complianceStatus: s.codVal > 100 ? "out_of_limit" : "compliant",
            },
            {
              chemicalParameterId: phParam.id,
              samplingPointId: scarico.id,
              valueNumeric: s.phVal,
              unitId: phUnit.id,
              appliedLimitId: phLimit!.id,
              limitMinSnapshot: 6,
              limitMaxSnapshot: 9,
              complianceStatus: s.phVal < 6 || s.phVal > 9 ? "out_of_limit" : "compliant",
            },
          ],
        },
      },
    });
  }

  // Sessions for other plants
  for (let i = 0; i < 5; i++) {
    await prisma.measurementSession.create({
      data: {
        customerId: customers[1 + (i % 2)].id,
        plantId: plants[2 + (i % 3)].id,
        measurementDate: new Date(2026, 3 - i, 15),
        sourceType: i % 2 === 0 ? "lab_autocontrol" : "technical_report",
        status: "confirmed",
        createdById: assistenza.id,
        measurements: {
          create: [
            {
              chemicalParameterId: parameters[2].id,
              samplingPointId: scarico.id,
              valueNumeric: 50 + i * 10,
              unitId: mgL.id,
              complianceStatus: "limit_not_configured",
            },
          ],
        },
      },
    });
  }

  console.log("Seed completato:");
  console.log("- Utenti: admin@pmp.local, assistenza@pmp.local, commerciale@pmp.local (password: password123)");
  console.log("- 3 clienti, 5 impianti, 30+ misure");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
