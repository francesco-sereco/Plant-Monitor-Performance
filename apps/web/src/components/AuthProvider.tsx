"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";

type User = { id: string; name: string; email: string; role: string };

type AuthContextType = {
  user: User | null;
  authEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canWrite: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  authEnabled: false,
  login: async () => {},
  logout: () => {},
  canWrite: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    api<{ authEnabled: boolean }>("/api/auth/status")
      .then((s) => setAuthEnabled(s.authEnabled))
      .catch(() => setAuthEnabled(false));

    const token = localStorage.getItem("pmp_token");
    if (token) {
      api<{ user: User }>("/api/auth/me")
        .then((r) => setUser(r.user))
        .catch(() => setAuthToken(null));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const canWrite = !authEnabled || (user != null && user.role !== "commerciale");

  return (
    <AuthContext.Provider value={{ user, authEnabled, login, logout, canWrite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
