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
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    businessName: "",
    sectorId: "",
    city: "",
    contactName: "",
  });
  const [sectorForm, setSectorForm] = useState({ name: "", description: "" });

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
    if (!form.sectorId) {
      setError("Seleziona un settore prima di salvare");
      return;
    }
    if (!sectors.some((s) => s.id === form.sectorId)) {
      setError("Settore non valido: ricarica la pagina o crea un nuovo settore");
      return;
    }
    try {
      setError("");
      await api("/api/customers", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ code: "", businessName: "", sectorId: "", city: "", contactName: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  const openCustomerForm = () => {
    const next = !showForm;
    setShowForm(next);
    if (next) {
      setShowSectorForm(false);
      setError("");
      setForm((f) => ({
        ...f,
        sectorId: f.sectorId || sectorId || sectors[0]?.id || "",
      }));
    }
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sectorForm.name.trim();
    if (!name) {
      setError("Inserisci il nome del settore");
      return;
    }
    try {
      const sector = await api<Sector>("/api/sectors", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: sectorForm.description.trim() || undefined,
        }),
      });
      setShowSectorForm(false);
      setSectorForm({ name: "", description: "" });
      setError("");
      if (showForm) {
        setForm((f) => ({ ...f, sectorId: sector.id }));
      }
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
          <>
            <button className="btn-primary" onClick={openCustomerForm}>
              {showForm ? "Annulla cliente" : "Nuovo cliente"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowSectorForm(!showSectorForm);
                if (!showSectorForm) setShowForm(false);
              }}
            >
              {showSectorForm ? "Annulla settore" : "Nuovo settore"}
            </button>
          </>
        )}
      </div>

      {showSectorForm && canWrite && (
        <form onSubmit={handleCreateSector} className="card mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Nome settore</label>
            <input
              className="input"
              required
              value={sectorForm.name}
              onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
              placeholder="Es. Alimentare"
            />
          </div>
          <div>
            <label className="label">Descrizione</label>
            <input
              className="input"
              value={sectorForm.description}
              onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
              placeholder="Opzionale"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Salva settore</button>
          </div>
        </form>
      )}

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
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Settori</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrizione</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-slate-500">
                        Nessun settore configurato. Aggiungine uno con &quot;Nuovo settore&quot;.
                      </td>
                    </tr>
                  ) : (
                    sectors.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.description || "—"}</td>
                        <td>{s.active ? "Attivo" : "Disattivo"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Clienti</h2>
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
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-slate-500">
                        Nessun cliente trovato.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
