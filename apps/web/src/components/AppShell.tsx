"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AuthGuard } from "./auth/AuthGuard";
import { AuthLayout } from "./auth/AuthLayout";
import { roleLabel } from "@/lib/roles";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Clienti" },
  { href: "/plants", label: "Impianti" },
  { href: "/measurements", label: "Rilevazioni" },
  { href: "/measurements/new", label: "Nuova rilevazione" },
  { href: "/parameters", label: "Parametri" },
  { href: "/limits", label: "Limiti" },
  { href: "/analytics", label: "Grafici" },
  { href: "/documents", label: "Documenti" },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, authEnabled, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-brand-900 text-white">
        <div className="border-b border-brand-700 p-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PMP" width={40} height={40} className="rounded" />
            <div>
              <div className="text-sm font-bold leading-tight">Plant Monitor</div>
              <div className="text-xs text-brand-100">Performance</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  active ? "bg-brand-700 font-medium" : "text-brand-100 hover:bg-brand-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {authEnabled && user && (
          <div className="border-t border-brand-700 p-4 text-xs">
            <div className="font-medium">{user.name}</div>
            <div className="text-brand-200">{roleLabel(user.role)}</div>
            <button type="button" onClick={logout} className="mt-2 text-brand-100 underline hover:text-white">
              Esci
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-800">Plant Monitor Performance</h1>
            {authEnabled && user && (
              <div className="text-right text-sm text-slate-600">
                <span className="font-medium text-slate-800">{user.name}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span>{roleLabel(user.role)}</span>
              </div>
            )}
          </div>
          {!authEnabled && (
            <p className="mt-1 text-xs text-amber-600">Modalità demo — autenticazione disabilitata</p>
          )}
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  );
}
