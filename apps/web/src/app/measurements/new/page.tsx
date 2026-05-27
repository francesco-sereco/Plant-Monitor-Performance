"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Customer, type Plant, type ChemicalParameter, type SamplingPoint, type Unit } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, ErrorState, LoadingState } from "@/components/ui";

type MeasurementRow = {
  chemicalParameterId: string;
  samplingPointId: string;
  valueNumeric: string;
  unitId: string;
};

export default function NewMeasurementPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewMeasurementContent />
    </Suspense>
  );
}

function NewMeasurementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canWrite } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [parameters, setParameters] = useState<ChemicalParameter[]>([]);
  const [points, setPoints] = useState<SamplingPoint[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: searchParams.get("customerId") ?? "",
    plantId: searchParams.get("plantId") ?? "",
    measurementDate: new Date().toISOString().slice(0, 10),
    technicianName: "",
    notes: "",
  });
  const [rows, setRows] = useState<MeasurementRow[]>([
    { chemicalParameterId: "", samplingPointId: "", valueNumeric: "", unitId: "" },
  ]);

  useEffect(() => {
    Promise.all([
      api<Customer[]>("/api/customers"),
      api<ChemicalParameter[]>("/api/chemical-parameters"),
      api<SamplingPoint[]>("/api/sampling-points"),
      api<Unit[]>("/api/units"),
    ]).then(([c, p, pts, u]) => {
      setCustomers(c);
      setParameters(p);
      setPoints(pts);
      setUnits(u);
    });
  }, []);

  useEffect(() => {
    if (form.customerId) {
      api<Plant[]>(`/api/plants?customerId=${form.customerId}`).then(setPlants);
    } else {
      setPlants([]);
    }
  }, [form.customerId]);

  const addRow = () => {
    setRows([...rows, { chemicalParameterId: "", samplingPointId: "", valueNumeric: "", unitId: "" }]);
  };

  const updateRow = (index: number, field: keyof MeasurementRow, value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    if (field === "chemicalParameterId") {
      const param = parameters.find((p) => p.id === value);
      if (param?.defaultUnitId) next[index].unitId = param.defaultUnitId;
    }
    setRows(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      setError("Permesso negato: sola lettura");
      return;
    }
    try {
      await api("/api/measurement-sessions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          measurementDate: new Date(form.measurementDate).toISOString(),
          measurements: rows.map((r) => ({
            chemicalParameterId: r.chemicalParameterId,
            samplingPointId: r.samplingPointId,
            valueNumeric: r.valueNumeric ? Number(r.valueNumeric) : null,
            unitId: r.unitId,
          })),
        }),
      });
      router.push("/measurements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  return (
    <div>
      <PageHeader title="Nuova rilevazione" subtitle="Inserimento manuale parametri chimici" />
      {error && <ErrorState message={error} />}
      {!canWrite && <ErrorState message="Il ruolo commerciale non può inserire rilevazioni" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Cliente</label>
            <select className="input" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, plantId: "" })} disabled={!canWrite}>
              <option value="">Seleziona...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Impianto</label>
            <select className="input" required value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })} disabled={!canWrite}>
              <option value="">Seleziona...</option>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data rilevazione</label>
            <input type="date" className="input" required value={form.measurementDate} onChange={(e) => setForm({ ...form, measurementDate: e.target.value })} disabled={!canWrite} />
          </div>
          <div>
            <label className="label">Tecnico</label>
            <input className="input" value={form.technicianName} onChange={(e) => setForm({ ...form, technicianName: e.target.value })} disabled={!canWrite} />
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold">Misure</h3>
          {rows.map((row, i) => (
            <div key={i} className="mb-4 grid gap-3 border-b border-slate-100 pb-4 md:grid-cols-4">
              <div>
                <label className="label">Parametro</label>
                <select className="input" required value={row.chemicalParameterId} onChange={(e) => updateRow(i, "chemicalParameterId", e.target.value)} disabled={!canWrite}>
                  <option value="">Seleziona...</option>
                  {parameters.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Punto campionamento</label>
                <select className="input" required value={row.samplingPointId} onChange={(e) => updateRow(i, "samplingPointId", e.target.value)} disabled={!canWrite}>
                  <option value="">Seleziona...</option>
                  {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Valore</label>
                <input type="number" step="any" className="input" required value={row.valueNumeric} onChange={(e) => updateRow(i, "valueNumeric", e.target.value)} disabled={!canWrite} />
              </div>
              <div>
                <label className="label">Unità</label>
                <select className="input" required value={row.unitId} onChange={(e) => updateRow(i, "unitId", e.target.value)} disabled={!canWrite}>
                  <option value="">Seleziona...</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                </select>
              </div>
            </div>
          ))}
          {canWrite && (
            <button type="button" onClick={addRow} className="btn-secondary">+ Aggiungi riga</button>
          )}
        </div>

        {canWrite && (
          <button type="submit" className="btn-primary">Salva rilevazione</button>
        )}
      </form>
    </div>
  );
}
