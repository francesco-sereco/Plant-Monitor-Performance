"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Customer } from "@/lib/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Customer>(`/api/customers/${id}`)
      .then(setCustomer)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!customer) return <LoadingState />;

  return (
    <div>
      <PageHeader title={customer.businessName} subtitle={`Codice: ${customer.code}`} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Dati cliente</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Settore</dt><dd>{customer.sector?.name}</dd></div>
            <div><dt className="text-slate-500">Città</dt><dd>{customer.city} {customer.province && `(${customer.province})`}</dd></div>
            <div><dt className="text-slate-500">Referente</dt><dd>{customer.contactName}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{customer.contactEmail}</dd></div>
            <div><dt className="text-slate-500">Telefono</dt><dd>{customer.contactPhone}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Impianti ({customer.plants?.length ?? 0})</h3>
          <ul className="space-y-2">
            {customer.plants?.map((p) => (
              <li key={p.id}>
                <Link href={`/plants/${p.id}`} className="text-brand-600 hover:underline">
                  {p.name}
                </Link>
                <span className="ml-2 text-xs text-slate-500">{p.plantType?.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link href="/customers" className="btn-secondary">← Torna all&apos;elenco</Link>
    </div>
  );
}
