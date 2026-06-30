import Image from "next/image";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PMP" width={48} height={48} className="rounded-lg" />
            <div>
              <div className="text-lg font-bold leading-tight">Plant Monitor</div>
              <div className="text-sm text-brand-100">Performance</div>
            </div>
          </div>
          <p className="mt-10 max-w-sm text-lg leading-relaxed text-brand-100">
            Archivio e analisi dei parametri chimici degli impianti di trattamento acqua.
          </p>
        </div>
        <p className="text-xs text-brand-200">Uso interno — assistenza tecnica, commerciale e amministrazione.</p>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <Image src="/logo.png" alt="PMP" width={40} height={40} className="rounded-lg" />
          <div>
            <div className="text-base font-bold text-slate-900">Plant Monitor Performance</div>
          </div>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
