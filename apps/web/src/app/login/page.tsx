"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, ErrorState } from "@/components/ui";

export default function LoginPage() {
  const { login, authEnabled, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("assistenza@pmp.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  if (!authEnabled) {
    return (
      <div>
        <PageHeader title="Login" subtitle="Autenticazione disabilitata in modalità demo" />
        <p className="text-slate-600">Imposta AUTH_ENABLED=true per attivare il login.</p>
      </div>
    );
  }

  if (user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fallito");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Login" subtitle="Accedi a Plant Monitor Performance" />
      {error && <ErrorState message={error} />}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full">Accedi</button>
        <p className="text-xs text-slate-500">
          Demo: admin@pmp.local, assistenza@pmp.local, commerciale@pmp.local — password: password123
        </p>
      </form>
    </div>
  );
}
