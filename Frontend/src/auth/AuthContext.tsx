import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearSession,
  getAuthRoles,
  readSession,
  setSession,
  subscribeSession,
} from "./authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<boolean>;
  loginWithToken: (token: string, roles: string[]) => void;
  logout: () => void;
  roles: string[];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useSyncExternalStore(
    subscribeSession,
    readSession,
    () => false,
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean,
    ): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setSession(remember, data.token, data.roles ?? []);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const loginWithToken = useCallback((token: string, roles: string[]) => {
    setSession(false, token, roles);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const roles = getAuthRoles();

  const value = useMemo(
    () => ({ isAuthenticated, login, loginWithToken, logout, roles }),
    [isAuthenticated, login, loginWithToken, logout, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
