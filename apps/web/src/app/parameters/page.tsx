"use client";

import { useEffect, useState } from "react";
import { api, type ChemicalParameter, type Unit } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

export default function ParametersPage() {
  const { canWrite } = useAuth();
  const [parameters, setParameters] = useState<ChemicalParameter[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: "", name: "", defaultUnitId: "" });

  const load = () => {
    Promise.all([
      api<ChemicalParameter[]>("/api/chemical-parameters?activeOnly=false"),
      api<Unit[]>("/api/units"),
    ])
      .then(([p, u]) => {
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
      await api("/api/chemical-parameters", { method: "POST", body: JSON.stringify(form) });
      setForm({ code: "", name: "", defaultUnitId: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  return (
    <div>
      <PageHeader title="Parametri chimici" subtitle="Dizionario parametri e unità di misura" />
      {error && <ErrorState message={error} />}

      {canWrite && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Codice</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="label">Nome</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Unità predefinita</label>
            <select className="input" value={form.defaultUnitId} onChange={(e) => setForm({ ...form, defaultUnitId: e.target.value })}>
              <option value="">Seleziona...</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Aggiungi parametro</button>
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
                <th>Codice</th>
                <th>Nome</th>
                <th>Unità default</th>
                <th>Attivo</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((p) => (
                <tr key={p.id}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.defaultUnit?.symbol}</td>
                  <td>{p.active ? "Sì" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
