"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, type Customer, type Plant, type ChemicalParameter, type MeasurementSession } from "@/lib/api";
import { ComplianceBadge, complianceRowClass } from "@/components/ComplianceBadge";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function MeasurementsContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<MeasurementSession[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [parameters, setParameters] = useState<ChemicalParameter[]>([]);
  const [filters, setFilters] = useState({
    customerId: searchParams.get("customerId") ?? "",
    plantId: searchParams.get("plantId") ?? "",
    parameterId: "",
    from: "",
    to: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const outOfLimitOnly = searchParams.get("outOfLimit") === "1";

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.customerId) qs.set("customerId", filters.customerId);
    if (filters.plantId) qs.set("plantId", filters.plantId);
    if (filters.parameterId) qs.set("parameterId", filters.parameterId);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);

    Promise.all([
      api<{ data: MeasurementSession[] }>(`/api/measurement-sessions?${qs}`),
      api<Customer[]>("/api/customers"),
      api<Plant[]>(`/api/plants?customerId=${filters.customerId}`),
      api<ChemicalParameter[]>("/api/chemical-parameters"),
    ])
      .then(([res, c, p, params]) => {
        setSessions(res.data);
        setCustomers(c);
        setPlants(p);
        setParameters(params);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filters]);

  const exportCsv = () => {
    const qs = new URLSearchParams();
    if (filters.customerId) qs.set("customerId", filters.customerId);
    if (filters.plantId) qs.set("plantId", filters.plantId);
    if (filters.parameterId) qs.set("parameterId", filters.parameterId);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    window.open(`${API_URL}/api/measurement-sessions/export?${qs}`, "_blank");
  };

  const rows = sessions.flatMap((s) =>
    s.measurements
      .filter((m) => !outOfLimitOnly || m.complianceStatus === "out_of_limit")
      .map((m) => ({ session: s, measurement: m }))
  );

  return (
    <div>
      <PageHeader title="Rilevazioni" subtitle="Storico parametri chimici con filtri" />
      {error && <ErrorState message={error} />}
      <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <select className="input" value={filters.customerId} onChange={(e) => setFilters({ ...filters, customerId: e.target.value, plantId: "" })}>
          <option value="">Tutti i clienti</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
        </select>
        <select className="input" value={filters.plantId} onChange={(e) => setFilters({ ...filters, plantId: e.target.value })}>
          <option value="">Tutti gli impianti</option>
          {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={filters.parameterId} onChange={(e) => setFilters({ ...filters, parameterId: e.target.value })}>
          <option value="">Tutti i parametri</option>
          {parameters.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>
        <input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <div className="flex gap-2">
          <Link href="/measurements/new" className="btn-primary">Nuova</Link>
          <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
        </div>
      </div>

      {outOfLimitOnly && <p className="mb-3 text-sm text-red-700">Filtro attivo: solo valori fuori limite</p>}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Settore</th>
                <th>Impianto</th>
                <th>Parametro</th>
                <th>Punto</th>
                <th>Valore</th>
                <th>Esito</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ session, measurement: m }) => (
                <tr key={m.id} className={complianceRowClass(m.complianceStatus)}>
                  <td>{new Date(session.measurementDate).toLocaleDateString("it-IT")}</td>
                  <td>{session.customer?.businessName}</td>
                  <td>{session.customer?.sector?.name}</td>
                  <td>{session.plant?.name}</td>
                  <td>{m.chemicalParameter.code}</td>
                  <td>{m.samplingPoint.name}</td>
                  <td>{m.valueNumeric ?? m.valueText} {m.unit.symbol}</td>
                  <td><ComplianceBadge status={m.complianceStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MeasurementsContent />
    </Suspense>
  );
}
