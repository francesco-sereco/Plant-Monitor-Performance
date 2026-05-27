"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Plant, type Customer, type PlantType } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

export default function PlantsPage() {
  const { canWrite } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: "", plantTypeId: "", name: "", location: "" });

  const load = () => {
    setLoading(true);
    Promise.all([
      api<Plant[]>(`/api/plants?customerId=${customerId}`),
      api<Customer[]>("/api/customers"),
      api<PlantType[]>("/api/plant-types"),
    ])
      .then(([p, c, t]) => {
        setPlants(p);
        setCustomers(c);
        setPlantTypes(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [customerId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/plants", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  return (
    <div>
      <PageHeader title="Impianti" subtitle="Impianti di trattamento acqua per cliente" />
      {error && <ErrorState message={error} />}
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input max-w-xs" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Tutti i clienti</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.businessName}</option>
          ))}
        </select>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annulla" : "Nuovo impianto"}
          </button>
        )}
      </div>

      {showForm && canWrite && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Cliente</label>
            <select className="input" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Seleziona...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.businessName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipologia</label>
            <select className="input" required value={form.plantTypeId} onChange={(e) => setForm({ ...form, plantTypeId: e.target.value })}>
              <option value="">Seleziona...</option>
              {plantTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nome impianto</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Località</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Salva impianto</button>
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
                <th>Nome</th>
                <th>Cliente</th>
                <th>Tipologia</th>
                <th>Località</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plants.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.customer?.businessName}</td>
                  <td>{p.plantType?.name}</td>
                  <td>{p.location}</td>
                  <td>{p.status}</td>
                  <td>
                    <Link href={`/plants/${p.id}`} className="text-brand-600 hover:underline">Dettaglio</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
