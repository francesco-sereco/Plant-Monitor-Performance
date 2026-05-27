"use client";

import { useEffect, useState } from "react";
import { api, type Limit, type ChemicalParameter, type Unit } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

export default function LimitsPage() {
  const { canWrite } = useAuth();
  const [limits, setLimits] = useState<Limit[]>([]);
  const [parameters, setParameters] = useState<ChemicalParameter[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    chemicalParameterId: "",
    unitId: "",
    scopeType: "global",
    scopeId: "",
    minValue: "",
    maxValue: "",
    legalReferenceText: "",
  });

  const load = () => {
    Promise.all([
      api<Limit[]>("/api/limits"),
      api<ChemicalParameter[]>("/api/chemical-parameters"),
      api<Unit[]>("/api/units"),
    ])
      .then(([l, p, u]) => {
        setLimits(l);
        setParameters(p);
        setUnits(u);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/limits", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scopeId: form.scopeType === "global" ? null : form.scopeId || null,
          minValue: form.minValue ? Number(form.minValue) : null,
          maxValue: form.maxValue ? Number(form.maxValue) : null,
        }),
      });
      setForm({ chemicalParameterId: "", unitId: "", scopeType: "global", scopeId: "", minValue: "", maxValue: "", legalReferenceText: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  const scopeLabels: Record<string, string> = {
    global: "Globale",
    sector: "Settore",
    plant_type: "Tipologia impianto",
    customer: "Cliente",
    plant: "Impianto",
  };

  return (
    <div>
      <PageHeader title="Limiti" subtitle="Limiti configurabili per parametro e ambito (RF-011 priorità)" />
      {error && <ErrorState message={error} />}

      <div className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Priorità applicazione: impianto → cliente → tipologia → settore → globale
      </div>

      {canWrite && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Parametro</label>
            <select className="input" required value={form.chemicalParameterId} onChange={(e) => setForm({ ...form, chemicalParameterId: e.target.value })}>
              <option value="">Seleziona...</option>
              {parameters.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unità</label>
            <select className="input" required value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
              <option value="">Seleziona...</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ambito</label>
            <select className="input" value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })}>
              {Object.entries(scopeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {form.scopeType !== "global" && (
            <div>
              <label className="label">ID ambito</label>
              <input className="input" value={form.scopeId} onChange={(e) => setForm({ ...form, scopeId: e.target.value })} placeholder="ID cliente/impianto/settore/tipologia" />
            </div>
          )}
          <div>
            <label className="label">Min</label>
            <input type="number" step="any" className="input" value={form.minValue} onChange={(e) => setForm({ ...form, minValue: e.target.value })} />
          </div>
          <div>
            <label className="label">Max</label>
            <input type="number" step="any" className="input" value={form.maxValue} onChange={(e) => setForm({ ...form, maxValue: e.target.value })} />
          </div>
          <div>
            <label className="label">Riferimento</label>
            <input className="input" value={form.legalReferenceText} onChange={(e) => setForm({ ...form, legalReferenceText: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Aggiungi limite</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parametro</th>
                <th>Ambito</th>
                <th>Min</th>
                <th>Max</th>
                <th>Unità</th>
                <th>Riferimento</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((l) => (
                <tr key={l.id}>
                  <td>{l.chemicalParameter?.code}</td>
                  <td>{scopeLabels[l.scopeType] ?? l.scopeType}</td>
                  <td>{l.minValue ?? "—"}</td>
                  <td>{l.maxValue ?? "—"}</td>
                  <td>{l.unit?.symbol}</td>
                  <td>{l.legalReferenceText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
