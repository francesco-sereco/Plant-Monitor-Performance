"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Customer, type Sector, type Plant, type PlantType, type PdfImportJob } from "@/lib/api";
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
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importJobs, setImportJobs] = useState<PdfImportJob[]>([]);
  const [importUploading, setImportUploading] = useState(false);
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [form, setForm] = useState({
    code: "",
    businessName: "",
    sectorId: "",
    city: "",
    contactName: "",
  });
  const [sectorForm, setSectorForm] = useState({ name: "", description: "" });
  const [plantForm, setPlantForm] = useState({
    customerId: "",
    plantTypeId: "",
    name: "",
    location: "",
  });
  const [importForm, setImportForm] = useState({
    documentType: "takeoff_report" as "takeoff_report" | "lab_autocontrol",
    customerId: "",
    plantId: "",
    file: null as File | null,
  });
  const [confirmForm, setConfirmForm] = useState({
    customerId: "",
    plantId: "",
    measurementDate: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api<Customer[]>(`/api/customers?search=${encodeURIComponent(search)}&sectorId=${sectorId}`),
      api<Sector[]>("/api/sectors"),
      api<Plant[]>("/api/plants"),
      api<PlantType[]>("/api/plant-types"),
      api<PdfImportJob[]>("/api/imports"),
    ])
      .then(([c, s, p, t, jobs]) => {
        setCustomers(c);
        setSectors(s);
        setPlants(p);
        setPlantTypes(t);
        setImportJobs(jobs);
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

  const openImportForm = () => {
    const next = !showImportForm;
    setShowImportForm(next);
    if (next) {
      setShowForm(false);
      setShowSectorForm(false);
      setShowPlantForm(false);
      setError("");
      setImportForm({
        documentType: "takeoff_report",
        customerId: "",
        plantId: "",
        file: null,
      });
    }
  };

  const handleImportUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.file) {
      setError("Seleziona un file PDF");
      return;
    }
    const fd = new FormData();
    fd.append("file", importForm.file);
    fd.append("documentType", importForm.documentType);
    if (importForm.customerId) fd.append("customerId", importForm.customerId);
    if (importForm.plantId) fd.append("plantId", importForm.plantId);

    try {
      setError("");
      setImportUploading(true);
      await api("/api/imports/pdf", { method: "POST", body: fd });
      setShowImportForm(false);
      setImportForm({ documentType: "takeoff_report", customerId: "", plantId: "", file: null });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore import");
    } finally {
      setImportUploading(false);
    }
  };

  const openConfirmImport = (job: PdfImportJob) => {
    setConfirmingJobId(job.id);
    setConfirmForm({
      customerId: job.document.customer?.id ?? importForm.customerId ?? "",
      plantId: job.document.plant?.id ?? "",
      measurementDate: job.structuredOutputJson?.measurementDate ?? "",
    });
    setError("");
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingJobId) return;
    if (!confirmForm.customerId || !confirmForm.plantId) {
      setError("Seleziona cliente e impianto per confermare l'import");
      return;
    }
    try {
      setError("");
      await api(`/api/imports/${confirmingJobId}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          customerId: confirmForm.customerId,
          plantId: confirmForm.plantId,
          measurementDate: confirmForm.measurementDate || undefined,
        }),
      });
      setConfirmingJobId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore conferma import");
    }
  };

  const handleDiscardImport = async (jobId: string) => {
    try {
      setError("");
      await api(`/api/imports/${jobId}/discard`, { method: "POST", body: JSON.stringify({}) });
      if (confirmingJobId === jobId) setConfirmingJobId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  const importStatusLabel: Record<string, string> = {
    uploaded: "Caricato",
    processing: "In elaborazione",
    needs_review: "Da confermare",
    confirmed: "Confermato",
    failed: "Fallito",
    discarded: "Scartato",
  };

  const documentTypeLabel: Record<string, string> = {
    takeoff_report: "Rapportino",
    lab_autocontrol: "Autocontrollo",
    other_pdf: "Altro PDF",
  };

  const plantsForCustomer = (customerId: string) => plants.filter((p) => p.customerId === customerId);

  const openCustomerForm = () => {
    const next = !showForm;
    setShowForm(next);
    if (next) {
      setShowSectorForm(false);
      setShowPlantForm(false);
      setShowImportForm(false);
      setError("");
      setForm((f) => ({
        ...f,
        sectorId: f.sectorId || sectorId || sectors[0]?.id || "",
      }));
    }
  };

  const openPlantForm = (customerId = "") => {
    setShowPlantForm(true);
    setShowForm(false);
    setShowSectorForm(false);
    setShowImportForm(false);
    setError("");
    setPlantForm({
      customerId,
      plantTypeId: plantTypes[0]?.id ?? "",
      name: "",
      location: "",
    });
  };

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = plantForm.name.trim();
    if (!plantForm.customerId) {
      setError("Seleziona un cliente per l'impianto");
      return;
    }
    if (!plantForm.plantTypeId) {
      setError("Seleziona una tipologia impianto");
      return;
    }
    if (!name) {
      setError("Inserisci il nome dell'impianto");
      return;
    }
    try {
      setError("");
      await api("/api/plants", {
        method: "POST",
        body: JSON.stringify({
          customerId: plantForm.customerId,
          plantTypeId: plantForm.plantTypeId,
          name,
          location: plantForm.location.trim() || undefined,
        }),
      });
      setShowPlantForm(false);
      setPlantForm({ customerId: "", plantTypeId: "", name: "", location: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
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
      <PageHeader title="Clienti" subtitle="Anagrafica clienti, settori e impianti" />
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
                if (!showSectorForm) {
                  setShowForm(false);
                  setShowPlantForm(false);
                }
              }}
            >
              {showSectorForm ? "Annulla settore" : "Nuovo settore"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                if (showPlantForm) {
                  setShowPlantForm(false);
                } else {
                  openPlantForm();
                }
              }}
            >
              {showPlantForm ? "Annulla impianto" : "Nuovo impianto"}
            </button>
            <button className="btn-secondary" onClick={openImportForm}>
              {showImportForm ? "Annulla import" : "Importa da file"}
            </button>
          </>
        )}
      </div>

      {showImportForm && canWrite && (
        <form onSubmit={handleImportUpload} className="card mb-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm text-slate-600">
              Carica un PDF di <strong>rapportino di asporto</strong> o <strong>autocontrollo di laboratorio</strong>.
              I dati estratti restano in anteprima finché non li confermi manualmente.
            </p>
          </div>
          <div>
            <label className="label">Tipo documento</label>
            <select
              className="input"
              value={importForm.documentType}
              onChange={(e) =>
                setImportForm({
                  ...importForm,
                  documentType: e.target.value as "takeoff_report" | "lab_autocontrol",
                })
              }
            >
              <option value="takeoff_report">Rapportino di asporto</option>
              <option value="lab_autocontrol">Autocontrollo di laboratorio</option>
            </select>
          </div>
          <div>
            <label className="label">File PDF</label>
            <input
              className="input"
              type="file"
              accept="application/pdf,.pdf"
              required
              onChange={(e) =>
                setImportForm({ ...importForm, file: e.target.files?.[0] ?? null })
              }
            />
          </div>
          <div>
            <label className="label">Cliente (consigliato)</label>
            <select
              className="input"
              value={importForm.customerId}
              onChange={(e) =>
                setImportForm({ ...importForm, customerId: e.target.value, plantId: "" })
              }
            >
              <option value="">Rileva dal PDF o seleziona...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Impianto (opzionale)</label>
            <select
              className="input"
              value={importForm.plantId}
              disabled={!importForm.customerId}
              onChange={(e) => setImportForm({ ...importForm, plantId: e.target.value })}
            >
              <option value="">Seleziona dopo il cliente...</option>
              {plantsForCustomer(importForm.customerId).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end md:col-span-2">
            <button type="submit" className="btn-primary" disabled={importUploading}>
              {importUploading ? "Caricamento..." : "Carica e analizza"}
            </button>
          </div>
        </form>
      )}

      {confirmingJobId && canWrite && (() => {
        const job = importJobs.find((j) => j.id === confirmingJobId);
        if (!job) return null;
        const preview = job.structuredOutputJson;
        return (
          <form onSubmit={handleConfirmImport} className="card mb-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Conferma import</h3>
                <p className="text-sm text-slate-600">{job.document.originalFilename}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setConfirmingJobId(null)}>
                Chiudi
              </button>
            </div>
            {preview?.customerName && (
              <p className="text-sm text-slate-700">
                Cliente rilevato: <strong>{preview.customerName}</strong>
                {preview.plantName ? ` — Impianto: ${preview.plantName}` : ""}
              </p>
            )}
            {preview?.warnings?.map((w) => (
              <p key={w} className="text-sm text-amber-700">
                {w}
              </p>
            ))}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Cliente</label>
                <select
                  className="input"
                  required
                  value={confirmForm.customerId}
                  onChange={(e) =>
                    setConfirmForm({ ...confirmForm, customerId: e.target.value, plantId: "" })
                  }
                >
                  <option value="">Seleziona...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Impianto</label>
                <select
                  className="input"
                  required
                  value={confirmForm.plantId}
                  disabled={!confirmForm.customerId}
                  onChange={(e) => setConfirmForm({ ...confirmForm, plantId: e.target.value })}
                >
                  <option value="">Seleziona...</option>
                  {plantsForCustomer(confirmForm.customerId).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Data rilevazione</label>
                <input
                  className="input"
                  type="date"
                  value={confirmForm.measurementDate}
                  onChange={(e) => setConfirmForm({ ...confirmForm, measurementDate: e.target.value })}
                />
              </div>
            </div>
            {preview?.parameters && preview.parameters.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parametro</th>
                      <th>Valore</th>
                      <th>Punto</th>
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.parameters.map((row, idx) => (
                      <tr key={`${row.code ?? row.name ?? idx}`}>
                        <td>{row.code ?? row.name ?? "—"}</td>
                        <td>
                          {row.value} {row.unit ?? ""}
                        </td>
                        <td>{row.samplingPoint ?? "—"}</td>
                        <td>{row.mapped ? "Mappato" : "Da verificare"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary">
                Conferma e crea rilevazione
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleDiscardImport(job.id)}
              >
                Scarta import
              </button>
            </div>
          </form>
        );
      })()}

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

      {showPlantForm && canWrite && (
        <form onSubmit={handleCreatePlant} className="card mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Cliente</label>
            <select
              className="input"
              required
              value={plantForm.customerId}
              onChange={(e) => setPlantForm({ ...plantForm, customerId: e.target.value })}
            >
              <option value="">Seleziona...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipologia</label>
            <select
              className="input"
              required
              value={plantForm.plantTypeId}
              onChange={(e) => setPlantForm({ ...plantForm, plantTypeId: e.target.value })}
            >
              <option value="">Seleziona...</option>
              {plantTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nome impianto</label>
            <input
              className="input"
              required
              value={plantForm.name}
              onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })}
              placeholder="Es. Linea trattamento 1"
            />
          </div>
          <div>
            <label className="label">Località</label>
            <input
              className="input"
              value={plantForm.location}
              onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })}
              placeholder="Opzionale"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button type="submit" className="btn-primary">Salva impianto</button>
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
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Import da PDF</h2>
            <p className="mb-3 text-sm text-slate-600">
              Rapportini e autocontrolli caricati qui. I dati non diventano ufficiali finché non confermi l&apos;anteprima.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Stato</th>
                    <th>Parametri</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {importJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-slate-500">
                        Nessun import. Usa &quot;Importa da file&quot; per caricare un rapportino o autocontrollo.
                      </td>
                    </tr>
                  ) : (
                    importJobs.map((job) => (
                      <tr key={job.id}>
                        <td>{job.document.originalFilename}</td>
                        <td>{documentTypeLabel[job.document.documentType] ?? job.document.documentType}</td>
                        <td>{job.document.customer?.businessName ?? "—"}</td>
                        <td>{importStatusLabel[job.status] ?? job.status}</td>
                        <td>{job.structuredOutputJson?.parameters?.length ?? 0}</td>
                        <td className="space-x-3 whitespace-nowrap">
                          {canWrite && (job.status === "needs_review" || job.status === "uploaded" || job.status === "failed") && (
                            <>
                              <button
                                type="button"
                                onClick={() => openConfirmImport(job)}
                                className="text-brand-600 hover:underline"
                              >
                                Anteprima
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDiscardImport(job.id)}
                                className="text-slate-600 hover:underline"
                              >
                                Scarta
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Impianti</h2>
            <p className="mb-3 text-sm text-slate-600">
              Gli impianti creati qui compaiono nel menu Impianto della schermata Nuova rilevazione.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Cliente</th>
                    <th>Tipologia</th>
                    <th>Località</th>
                  </tr>
                </thead>
                <tbody>
                  {plants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-slate-500">
                        Nessun impianto configurato. Aggiungine uno con &quot;Nuovo impianto&quot;.
                      </td>
                    </tr>
                  ) : (
                    plants.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.customer?.businessName}</td>
                        <td>{p.plantType?.name}</td>
                        <td>{p.location || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

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
                        <td className="space-x-3 whitespace-nowrap">
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => openPlantForm(c.id)}
                              className="text-brand-600 hover:underline"
                            >
                              Impianti
                            </button>
                          )}
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
