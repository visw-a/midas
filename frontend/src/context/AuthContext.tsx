import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, authApi } from "../api/client";

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .me()
      .then(() => setStatus("authenticated"))
      .catch(() => setStatus("unauthenticated"));
  }, []);

  async function login(password: string) {
    setError(null);
    try {
      await authApi.login(password);
      setStatus("authenticated");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
      throw e;
    }
  }

  async function logout() {
    await authApi.logout().catch(() => undefined);
    setStatus("unauthenticated");
  }

  return <AuthContext.Provider value={{ status, login, logout, error }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
