import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

async function clearTable(name) {
  const { error } = await supabase.from(name).delete().neq("id", "__none__");
  if (error && !error.message.includes("0 rows")) {
    throw new Error(`${name}: ${error.message}`);
  }
}

async function main() {
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const table of [
    "audit_logs",
    "pdf_import_jobs",
    "measurements",
    "measurement_sessions",
    "documents",
    "limits",
    "plants",
    "customers",
    "chemical_parameters",
    "sampling_points",
    "units",
    "plant_types",
    "sectors",
    "users",
  ]) {
    await clearTable(table);
  }

  const adminId = id("usr");
  const assistenzaId = id("usr");
  const commercialeId = id("usr");

  const { error: usersErr } = await supabase.from("users").insert([
    { id: adminId, name: "Admin", email: "admin@pmp.local", password_hash: passwordHash, role: "admin", status: "active", updated_at: now },
    { id: assistenzaId, name: "Tecnico Assistenza", email: "assistenza@pmp.local", password_hash: passwordHash, role: "assistenza", status: "active", updated_at: now },
    { id: commercialeId, name: "Commerciale", email: "commerciale@pmp.local", password_hash: passwordHash, role: "commerciale", status: "active", updated_at: now },
  ]);
  if (usersErr) throw usersErr;

  const sectorIds = ["Alimentare", "Farmaceutico", "Industriale"].map((name) => ({ id: id("sec"), name }));
  const { error: sectorsErr } = await supabase.from("sectors").insert(
    sectorIds.map((s) => ({ ...s, description: `Settore ${s.name}`, updated_at: now }))
  );
  if (sectorsErr) throw sectorsErr;

  const plantTypeIds = ["Addolcitore", "Osmosi inversa", "MBR", "Trattamento scarico", "Impianto misto"].map((name) => ({
    id: id("pt"),
    name,
  }));
  const { error: ptErr } = await supabase.from("plant_types").insert(plantTypeIds.map((p) => ({ ...p, updated_at: now })));
  if (ptErr) throw ptErr;

  const unitDefs = [
    { symbol: "mg/L", name: "Milligrammi per litro" },
    { symbol: "pH", name: "pH" },
    { symbol: "µS/cm", name: "Microsiemens per centimetro" },
    { symbol: "NTU", name: "Nephelometric Turbidity Unit" },
    { symbol: "°F", name: "Gradi francesi" },
  ];
  const unitIds = unitDefs.map((u) => ({ id: id("unit"), ...u }));
  const { error: unitsErr } = await supabase.from("units").insert(unitIds.map((u) => ({ ...u, updated_at: now })));
  if (unitsErr) throw unitsErr;

  const mgL = unitIds.find((u) => u.symbol === "mg/L");
  const phUnit = unitIds.find((u) => u.symbol === "pH");
  const usCm = unitIds.find((u) => u.symbol === "µS/cm");

  const paramDefs = [
    { code: "COD", name: "COD", default_unit_id: mgL.id },
    { code: "pH", name: "pH", default_unit_id: phUnit.id },
    { code: "Cloruri", name: "Cloruri", default_unit_id: mgL.id },
    { code: "Conducibilità", name: "Conducibilità", default_unit_id: usCm.id },
    { code: "Durezza", name: "Durezza", default_unit_id: unitIds.find((u) => u.symbol === "°F").id },
    { code: "Ferro", name: "Ferro", default_unit_id: mgL.id },
    { code: "Nitrati", name: "Nitrati", default_unit_id: mgL.id },
    { code: "Torbidità", name: "Torbidità", default_unit_id: unitIds.find((u) => u.symbol === "NTU").id },
  ];
  const paramIds = paramDefs.map((p) => ({ id: id("par"), ...p, is_numeric: true }));
  const { error: parErr } = await supabase.from("chemical_parameters").insert(paramIds.map((p) => ({ ...p, updated_at: now })));
  if (parErr) throw parErr;

  const cod = paramIds.find((p) => p.code === "COD");
  const phParam = paramIds.find((p) => p.code === "pH");

  const pointDefs = [
    { name: "Ingresso impianto", sort_order: 1 },
    { name: "Post MBR", sort_order: 2 },
    { name: "Post pulizia", sort_order: 3 },
    { name: "Scarico finale", sort_order: 4 },
  ];
  const pointIds = pointDefs.map((p) => ({ id: id("sp"), ...p }));
  const { error: spErr } = await supabase.from("sampling_points").insert(pointIds.map((p) => ({ ...p, updated_at: now })));
  if (spErr) throw spErr;

  const ingresso = pointIds.find((p) => p.name === "Ingresso impianto");
  const postMbr = pointIds.find((p) => p.name === "Post MBR");
  const postPulizia = pointIds.find((p) => p.name === "Post pulizia");
  const scarico = pointIds.find((p) => p.name === "Scarico finale");

  const customerIds = [
    { id: id("cus"), code: "ACM001", business_name: "Acme Alimentare S.r.l.", sector_id: sectorIds[0].id, city: "Milano", province: "MI" },
    { id: id("cus"), code: "FAR002", business_name: "Pharma Clean S.p.A.", sector_id: sectorIds[1].id, city: "Bergamo", province: "BG" },
    { id: id("cus"), code: "IND003", business_name: "Metal Works Industriale", sector_id: sectorIds[2].id, city: "Brescia", province: "BS" },
  ];
  const { error: custErr } = await supabase.from("customers").insert(customerIds.map((c) => ({ ...c, updated_at: now })));
  if (custErr) throw custErr;

  const mbrType = plantTypeIds.find((t) => t.name === "MBR");
  const osmosiType = plantTypeIds.find((t) => t.name === "Osmosi inversa");

  const plantRows = [
    { id: id("pln"), customer_id: customerIds[0].id, plant_type_id: mbrType.id, name: "MBR scarico industriale", location: "Reparto produzione", serial_number: "MBR-2024-001" },
    { id: id("pln"), customer_id: customerIds[0].id, plant_type_id: osmosiType.id, name: "Osmosi processo", location: "Laboratorio interno" },
    { id: id("pln"), customer_id: customerIds[1].id, plant_type_id: osmosiType.id, name: "Osmosi farmaceutica", location: "Clean room" },
    { id: id("pln"), customer_id: customerIds[2].id, plant_type_id: mbrType.id, name: "MBR trattamento acque reflue", location: "Depuratore interno" },
    { id: id("pln"), customer_id: customerIds[2].id, plant_type_id: plantTypeIds.find((t) => t.name === "Trattamento scarico").id, name: "Scarico industriale", location: "Uscita impianto" },
  ];
  const { error: plnErr } = await supabase.from("plants").insert(plantRows.map((p) => ({ ...p, updated_at: now })));
  if (plnErr) throw plnErr;

  const acmePlant = plantRows[0];

  const limitRows = [
    { id: id("lim"), chemical_parameter_id: cod.id, unit_id: mgL.id, scope_type: "plant", scope_id: acmePlant.id, max_value: 100, legal_reference_text: "Limite contrattuale scarico COD", created_by: adminId },
    { id: id("lim"), chemical_parameter_id: cod.id, unit_id: mgL.id, scope_type: "global", scope_id: null, max_value: 160, legal_reference_text: "Limite globale COD", created_by: adminId },
    { id: id("lim"), chemical_parameter_id: phParam.id, unit_id: phUnit.id, scope_type: "global", scope_id: null, min_value: 6, max_value: 9, created_by: adminId },
  ];
  const { error: limErr } = await supabase.from("limits").insert(limitRows.map((l) => ({ ...l, updated_at: now })));
  if (limErr) throw limErr;

  const codLimit = limitRows[0];
  const phLimit = limitRows[2];

  const demoSessionId = id("ses");
  const { error: sesErr } = await supabase.from("measurement_sessions").insert({
    id: demoSessionId,
    customer_id: customerIds[0].id,
    plant_id: acmePlant.id,
    measurement_date: "2026-05-01T00:00:00.000Z",
    source_type: "manual",
    technician_name: "Tecnico Demo",
    status: "confirmed",
    created_by: assistenzaId,
    updated_at: now,
  });
  if (sesErr) throw sesErr;

  const demoMeasurements = [
    { chemical_parameter_id: cod.id, sampling_point_id: ingresso.id, value_numeric: 1000, compliance_status: "out_of_limit" },
    { chemical_parameter_id: cod.id, sampling_point_id: postMbr.id, value_numeric: 300, compliance_status: "out_of_limit" },
    { chemical_parameter_id: cod.id, sampling_point_id: postPulizia.id, value_numeric: 100, compliance_status: "compliant" },
    { chemical_parameter_id: cod.id, sampling_point_id: scarico.id, value_numeric: 90, compliance_status: "compliant" },
  ].map((m) => ({
    id: id("mea"),
    measurement_session_id: demoSessionId,
    unit_id: mgL.id,
    applied_limit_id: codLimit.id,
    limit_max_snapshot: 100,
    updated_at: now,
    ...m,
  }));

  const { error: meaErr } = await supabase.from("measurements").insert(demoMeasurements);
  if (meaErr) throw meaErr;

  const extraSessions = [
    { date: "2026-04-01", codVal: 950, phVal: 7.2 },
    { date: "2026-03-01", codVal: 880, phVal: 7.0 },
    { date: "2026-02-01", codVal: 920, phVal: 6.8 },
    { date: "2026-01-15", codVal: 110, phVal: 5.5 },
    { date: "2026-01-01", codVal: 850, phVal: 7.1 },
  ];

  for (const s of extraSessions) {
    const sessionId = id("ses");
    const { error: e1 } = await supabase.from("measurement_sessions").insert({
      id: sessionId,
      customer_id: customerIds[0].id,
      plant_id: acmePlant.id,
      measurement_date: new Date(s.date).toISOString(),
      source_type: "manual",
      status: "confirmed",
      created_by: assistenzaId,
      updated_at: now,
    });
    if (e1) throw e1;

    const { error: e2 } = await supabase.from("measurements").insert([
      {
        id: id("mea"),
        measurement_session_id: sessionId,
        chemical_parameter_id: cod.id,
        sampling_point_id: ingresso.id,
        value_numeric: s.codVal,
        unit_id: mgL.id,
        applied_limit_id: codLimit.id,
        limit_max_snapshot: 100,
        compliance_status: s.codVal > 100 ? "out_of_limit" : "compliant",
        updated_at: now,
      },
      {
        id: id("mea"),
        measurement_session_id: sessionId,
        chemical_parameter_id: phParam.id,
        sampling_point_id: scarico.id,
        value_numeric: s.phVal,
        unit_id: phUnit.id,
        applied_limit_id: phLimit.id,
        limit_min_snapshot: 6,
        limit_max_snapshot: 9,
        compliance_status: s.phVal < 6 || s.phVal > 9 ? "out_of_limit" : "compliant",
        updated_at: now,
      },
    ]);
    if (e2) throw e2;
  }

  console.log("Seed completato via Supabase REST (service role):");
  console.log("- Utenti: admin@pmp.local, assistenza@pmp.local, commerciale@pmp.local (password: password123)");
  console.log("- 3 clienti, 5 impianti, misure demo incluse");
}

main().catch((err) => {
  console.error("Seed fallito:", err.message ?? err);
  process.exit(1);
});
