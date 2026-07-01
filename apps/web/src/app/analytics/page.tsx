"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { api, type Plant, type ChemicalParameter, type SamplingPoint } from "@/lib/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

type TimeSeries = {
  series: { date: string; value: number | null; samplingPoint: string; unit: string; complianceStatus: string }[];
  limitMin: number | null;
  limitMax: number | null;
};

type ReductionResult = {
  initial: { point: string; value: number; unit: string } | null;
  final: { point: string; value: number; unit: string } | null;
  reductionPercent: number | null;
  calculable: boolean;
};

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [parameters, setParameters] = useState<ChemicalParameter[]>([]);
  const [points, setPoints] = useState<SamplingPoint[]>([]);
  const [plantId, setPlantId] = useState(searchParams.get("plantId") ?? "");
  const [parameterId, setParameterId] = useState("");
  const [samplingPointId, setSamplingPointId] = useState("");
  const [series, setSeries] = useState<TimeSeries | null>(null);
  const [reduction, setReduction] = useState<ReductionResult | null>(null);
  const [initialPointId, setInitialPointId] = useState("");
  const [finalPointId, setFinalPointId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Plant[]>("/api/plants"),
      api<ChemicalParameter[]>("/api/chemical-parameters"),
      api<SamplingPoint[]>("/api/sampling-points"),
    ]).then(([p, params, pts]) => {
      setPlants(p);
      setParameters(params);
      setPoints(pts);
      if (!parameterId && params.length > 0) {
        const sorted = [...params].sort((a, b) => a.code.localeCompare(b.code));
        setParameterId(sorted[0].id);
      }
      if (!initialPointId && pts.length > 0) {
        const sorted = [...pts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        setInitialPointId(sorted[0].id);
      }
      if (!finalPointId && pts.length > 1) {
        const sorted = [...pts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        setFinalPointId(sorted[sorted.length - 1].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!plantId || !parameterId) return;
    const qs = new URLSearchParams({ plantId, parameterId });
    if (samplingPointId) qs.set("samplingPointId", samplingPointId);
    api<TimeSeries>(`/api/analytics/time-series?${qs}`)
      .then(setSeries)
      .catch((e) => setError(e.message));
  }, [plantId, parameterId, samplingPointId]);

  useEffect(() => {
    if (!plantId || !parameterId || !initialPointId || !finalPointId) return;
    const qs = new URLSearchParams({ plantId, parameterId, initialPointId, finalPointId });
    api<ReductionResult>(`/api/analytics/performance-reduction?${qs}`)
      .then(setReduction)
      .catch(() => setReduction(null));
  }, [plantId, parameterId, initialPointId, finalPointId]);

  return (
    <div>
      <PageHeader title="Grafici e analytics" subtitle="Andamento storico parametri e riduzione percentuale" />
      {error && <ErrorState message={error} />}

      <div className="card mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="label">Impianto</label>
          <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">Seleziona...</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.customer?.businessName})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Parametro</label>
          <select className="input" value={parameterId} onChange={(e) => setParameterId(e.target.value)}>
            <option value="">Seleziona...</option>
            {parameters.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Punto campionamento (filtro)</label>
          <select className="input" value={samplingPointId} onChange={(e) => setSamplingPointId(e.target.value)}>
            <option value="">Tutti</option>
            {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {series && series.series.length > 0 ? (
        <div className="card mb-6">
          <h3 className="mb-4 font-semibold">Andamento nel tempo</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={series.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#2563eb" name="Valore" dot />
              {series.limitMax != null && (
                <ReferenceLine y={series.limitMax} stroke="#dc2626" strokeDasharray="5 5" label="Limite max" />
              )}
              {series.limitMin != null && (
                <ReferenceLine y={series.limitMin} stroke="#f59e0b" strokeDasharray="5 5" label="Limite min" />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr><th>Data</th><th>Punto</th><th>Valore</th><th>Unità</th></tr>
              </thead>
              <tbody>
                {series.series.map((s, i) => (
                  <tr key={i}>
                    <td>{s.date}</td>
                    <td>{s.samplingPoint}</td>
                    <td>{s.value}</td>
                    <td>{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : plantId && parameterId ? (
        <p className="text-slate-500">Nessun dato disponibile per i filtri selezionati.</p>
      ) : null}

      <div className="card">
        <h3 className="mb-4 font-semibold">Riduzione percentuale</h3>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Punto iniziale</label>
            <select className="input" value={initialPointId} onChange={(e) => setInitialPointId(e.target.value)}>
              {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Punto finale</label>
            <select className="input" value={finalPointId} onChange={(e) => setFinalPointId(e.target.value)}>
              {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {reduction && (
          <div className="rounded-md bg-slate-50 p-4 text-sm">
            {reduction.calculable ? (
              <p className="text-lg font-semibold text-brand-700">
                Riduzione: {reduction.reductionPercent}% ({reduction.initial?.value} → {reduction.final?.value} {reduction.final?.unit})
              </p>
            ) : (
              <p className="text-amber-700">Riduzione non calcolabile (dati mancanti o valore iniziale zero)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AnalyticsContent />
    </Suspense>
  );
}
