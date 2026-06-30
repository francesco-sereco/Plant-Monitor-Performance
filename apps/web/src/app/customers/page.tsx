"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Customer, type Sector } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useAuthReady } from "@/hooks/useAuthReady";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

export default function CustomersPage() {
  const { canWrite } = useAuth();
  const authReady = useAuthReady();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [search, setSearch] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    businessName: "",
    sectorId: "",
    city: "",
    contactName: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api<Customer[]>(`/api/customers?search=${encodeURIComponent(search)}&sectorId=${sectorId}`),
      api<Sector[]>("/api/sectors"),
    ])
      .then(([c, s]) => {
        setCustomers(c);
        setSectors(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authReady) return;
    load();
  }, [authReady, search, sectorId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/customers", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ code: "", businessName: "", sectorId: "", city: "", contactName: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  return (
    <div>
      <PageHeader title="Clienti" subtitle="Anagrafica clienti e settori" />
      {error && <ErrorState message={error} />}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Cerca per nome o codice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
          <option value="">Tutti i settori</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annulla" : "Nuovo cliente"}
          </button>
        )}
      </div>

      {showForm && canWrite && (
        <form onSubmit={handleCreate} className="card mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Codice</label>
            <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="label">Ragione sociale</label>
            <input className="input" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div>
            <label className="label">Settore</label>
            <select className="input" required value={form.sectorId} onChange={(e) => setForm({ ...form, sectorId: e.target.value })}>
              <option value="">Seleziona...</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Città</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="label">Referente</label>
            <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Salva cliente</button>
          </div>
        </form>
      )}

      {loading || !authReady ? (
        <LoadingState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Ragione sociale</th>
                <th>Settore</th>
                <th>Città</th>
                <th>Impianti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.businessName}</td>
                  <td>{c.sector?.name}</td>
                  <td>{c.city}</td>
                  <td>{c.plants?.length ?? 0}</td>
                  <td>
                    <Link href={`/customers/${c.id}`} className="text-brand-600 hover:underline">
                      Dettaglio
                    </Link>
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
