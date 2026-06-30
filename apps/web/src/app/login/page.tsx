"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ErrorState, LoadingState } from "@/components/ui";

function LoginForm() {
  const { login, authEnabled, ready, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (ready && user) {
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/");
    }
  }, [ready, user, router, redirectTo]);

  if (!ready) {
    return <LoadingState />;
  }

  if (!authEnabled) {
    return (
      <div className="card text-center">
        <h2 className="text-xl font-bold text-slate-900">Autenticazione disabilitata</h2>
        <p className="mt-2 text-sm text-slate-600">
          L&apos;applicazione è in modalità demo. Imposta <code className="text-xs">AUTH_ENABLED=true</code> per
          richiedere il login.
        </p>
      </div>
    );
  }

  if (user) {
    return <LoadingState message="Reindirizzamento..." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accesso non riuscito. Verifica email e password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Accedi</h2>
        <p className="mt-1 text-sm text-slate-500">Inserisci le credenziali per accedere all&apos;applicazione.</p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            required
            autoComplete="email"
            autoFocus
            disabled={submitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.it"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input pr-10"
              required
              autoComplete="current-password"
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Nascondi" : "Mostra"}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Accesso riservato al personale autorizzato.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
