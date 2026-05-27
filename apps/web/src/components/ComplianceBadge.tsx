const labels: Record<string, string> = {
  compliant: "Conforme",
  out_of_limit: "Fuori limite",
  limit_not_configured: "Limite non configurato",
  incomplete: "Incompleto",
  not_applicable: "N/A",
};

const styles: Record<string, string> = {
  compliant: "bg-green-100 text-green-800",
  out_of_limit: "bg-red-100 text-red-800 font-semibold",
  limit_not_configured: "bg-amber-100 text-amber-800",
  incomplete: "bg-slate-100 text-slate-600",
  not_applicable: "bg-slate-100 text-slate-600",
};

export function ComplianceBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${styles[status] ?? styles.incomplete}`}
      title={labels[status] ?? status}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function complianceRowClass(status: string) {
  return status === "out_of_limit" ? "bg-red-50 text-red-900" : "";
}
