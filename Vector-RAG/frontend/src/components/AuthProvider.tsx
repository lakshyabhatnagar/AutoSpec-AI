"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthToken, fetchMe, postLogin, postLogout, postSignup, setAuthToken } from "@/services/api";
import type { User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetchMe();
    if (res.data) setUser(res.data);
    else {
      clearAuthToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchMe().then((res) => {
      if (!mounted) return;
      if (res.data) setUser(res.data);
      else clearAuthToken();
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await postLogin({ email, password });
    if (!res.data) return res.error || "Login failed";
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return null;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await postSignup({ name, email, password });
    if (!res.data) return res.error || "Sign up failed";
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await postLogout();
    clearAuthToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout, refresh }), [user, loading, login, signup, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
