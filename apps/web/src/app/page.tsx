"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader, LoadingState, ErrorState } from "@/components/ui";

type DashboardData = {
  customers: number;
  plants: number;
  sessionsThisMonth: number;
  outOfLimit: number;
  recentDocuments: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/api/analytics/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const cards = [
    { label: "Clienti attivi", value: data.customers, href: "/customers" },
    { label: "Impianti attivi", value: data.plants, href: "/plants" },
    { label: "Rilevazioni del mese", value: data.sessionsThisMonth, href: "/measurements" },
    { label: "Valori fuori limite", value: data.outOfLimit, href: "/measurements?outOfLimit=1" },
    { label: "Documenti PDF", value: data.recentDocuments, href: "/documents" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Panoramica performance impianti trattamento acqua"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card hover:border-brand-300">
            <div className="text-3xl font-bold text-brand-700">{card.value}</div>
            <div className="mt-1 text-sm text-slate-600">{card.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 card">
        <h3 className="mb-2 font-semibold">Scorciatoie</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/measurements/new" className="btn-primary">
            Nuova rilevazione
          </Link>
          <Link href="/customers" className="btn-secondary">
            Gestisci clienti
          </Link>
          <Link href="/analytics" className="btn-secondary">
            Grafico storico
          </Link>
        </div>
      </div>
    </div>
  );
}
