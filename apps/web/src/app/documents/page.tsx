"use client";

import { useEffect, useState } from "react";
import { api, type Document, type Customer, type Plant } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function DocumentsPage() {
  const { canWrite } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [upload, setUpload] = useState({ customerId: "", plantId: "", file: null as File | null });

  const load = () => {
    api<Document[]>("/api/documents")
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api<Customer[]>("/api/customers").then(setCustomers);
  }, []);

  useEffect(() => {
    if (upload.customerId) {
      api<Plant[]>(`/api/plants?customerId=${upload.customerId}`).then(setPlants);
    }
  }, [upload.customerId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upload.file || !upload.customerId) return;
    const formData = new FormData();
    formData.append("file", upload.file);
    formData.append("customerId", upload.customerId);
    if (upload.plantId) formData.append("plantId", upload.plantId);

    try {
      const token = localStorage.getItem("pmp_token");
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload fallito");
      }
      setUpload({ customerId: "", plantId: "", file: null });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore upload");
    }
  };

  return (
    <div>
      <PageHeader title="Documenti PDF" subtitle="Allegati rapportini e autocontrolli (storage privato)" />
      {error && <ErrorState message={error} />}

      {canWrite && (
        <form onSubmit={handleUpload} className="card mb-6 grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">Cliente</label>
            <select className="input" required value={upload.customerId} onChange={(e) => setUpload({ ...upload, customerId: e.target.value, plantId: "" })}>
              <option value="">Seleziona...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Impianto (opz.)</label>
            <select className="input" value={upload.plantId} onChange={(e) => setUpload({ ...upload, plantId: e.target.value })}>
              <option value="">Nessuno</option>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File PDF</label>
            <input type="file" accept="application/pdf" className="input" required onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] ?? null })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">Carica PDF</button>
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
                <th>File</th>
                <th>Cliente</th>
                <th>Impianto</th>
                <th>Dimensione</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.originalFilename}</td>
                  <td>{d.customer?.businessName}</td>
                  <td>{d.plant?.name ?? "—"}</td>
                  <td>{Math.round(d.fileSize / 1024)} KB</td>
                  <td>{new Date(d.uploadedAt).toLocaleDateString("it-IT")}</td>
                  <td>
                    <a href={`${API_URL}/api/documents/${d.id}/download`} className="text-brand-600 hover:underline" target="_blank" rel="noreferrer">
                      Download
                    </a>
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
