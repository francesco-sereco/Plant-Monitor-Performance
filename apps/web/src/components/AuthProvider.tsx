"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken } from "@/lib/api";

type User = { id: string; name: string; email: string; role: string };

type AuthContextType = {
  user: User | null;
  authEnabled: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canWrite: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  authEnabled: false,
  ready: false,
  login: async () => {},
  logout: () => {},
  canWrite: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const status = await api<{ authEnabled: boolean }>("/api/auth/status");
        if (cancelled) return;
        setAuthEnabled(status.authEnabled);

        const token = localStorage.getItem("pmp_token");
        if (token && status.authEnabled) {
          try {
            const me = await api<{ user: User }>("/api/auth/me");
            if (!cancelled) setUser(me.user);
          } catch {
            setAuthToken(null);
          }
        }
      } catch {
        if (!cancelled) setAuthEnabled(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    if (authEnabled) {
      router.push("/login");
    }
  }, [authEnabled, router]);

  const canWrite = !authEnabled || (user != null && user.role !== "commerciale");

  return (
    <AuthContext.Provider value={{ user, authEnabled, ready, login, logout, canWrite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
