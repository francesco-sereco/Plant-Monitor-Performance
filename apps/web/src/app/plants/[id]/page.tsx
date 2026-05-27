"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Plant, type MeasurementSession } from "@/lib/api";
import { ComplianceBadge, complianceRowClass } from "@/components/ComplianceBadge";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

type PlantDetail = Plant & {
  customer?: { businessName: string; sector?: { name: string } };
  plantType?: { name: string };
  measurementSessions?: (MeasurementSession & { measurements: MeasurementSession["measurements"] })[];
};

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<PlantDetail>(`/api/plants/${id}`)
      .then(setPlant)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!plant) return <LoadingState />;

  return (
    <div>
      <PageHeader title={plant.name} subtitle={`Cliente: ${plant.customer?.businessName}`} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Dati impianto</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Tipologia</dt><dd>{plant.plantType?.name}</dd></div>
            <div><dt className="text-slate-500">Settore cliente</dt><dd>{plant.customer?.sector?.name}</dd></div>
            <div><dt className="text-slate-500">Località</dt><dd>{plant.location}</dd></div>
            <div><dt className="text-slate-500">Matricola</dt><dd>{plant.serialNumber}</dd></div>
            <div><dt className="text-slate-500">Stato</dt><dd>{plant.status}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Azioni</h3>
          <div className="flex flex-wrap gap-2">
            <Link href={`/analytics?plantId=${plant.id}`} className="btn-primary">Grafico storico</Link>
            <Link href={`/measurements/new?plantId=${plant.id}&customerId=${plant.customerId}`} className="btn-secondary">Nuova rilevazione</Link>
          </div>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-semibold">Ultime rilevazioni</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Parametro</th>
              <th>Punto</th>
              <th>Valore</th>
              <th>Esito</th>
            </tr>
          </thead>
          <tbody>
            {plant.measurementSessions?.flatMap((s) =>
              s.measurements.map((m) => (
                <tr key={m.id} className={complianceRowClass(m.complianceStatus)}>
                  <td>{new Date(s.measurementDate).toLocaleDateString("it-IT")}</td>
                  <td>{m.chemicalParameter.code}</td>
                  <td>{m.samplingPoint.name}</td>
                  <td>{m.valueNumeric ?? m.valueText} {m.unit.symbol}</td>
                  <td><ComplianceBadge status={m.complianceStatus} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Link href="/plants" className="btn-secondary mt-6 inline-block">← Torna all&apos;elenco</Link>
    </div>
  );
}
