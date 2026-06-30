export function LoadingState({ fullScreen, message }: { fullScreen?: boolean; message?: string }) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{message ?? "Caricamento..."}</span>
    </div>
  );
  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50">{content}</div>;
  }
  return <div className="py-12 text-center">{content}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
