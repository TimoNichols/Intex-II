import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SESSION_KEY } from "./devCredentials";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<boolean>;
  logout: () => void;
  roles: string[];
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(SESSION_KEY) === "1" ||
      window.sessionStorage.getItem(SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
}

let sessionListeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  sessionListeners.push(listener);
  return () => {
    sessionListeners = sessionListeners.filter((l) => l !== listener);
  };
}

function emitSessionChange() {
  sessionListeners.forEach((l) => l());
}

function setSession(remember: boolean, token: string, roles: string[]) {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, "1");
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("auth_roles", JSON.stringify(roles));
    } else {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      window.sessionStorage.setItem("auth_token", token);
      window.sessionStorage.setItem("auth_roles", JSON.stringify(roles));
    }
  } catch {
    /* ignore */
  }
  emitSessionChange();
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem("auth_token");
    window.localStorage.removeItem("auth_token");
    window.sessionStorage.removeItem("auth_roles");
    window.localStorage.removeItem("auth_roles");
  } catch {
    /* ignore */
  }
  emitSessionChange();
}

export function getAuthToken(): string | null {
  try {
    return (
      window.localStorage.getItem("auth_token") ??
      window.sessionStorage.getItem("auth_token")
    );
  } catch {
    return null;
  }
}

export function getAuthRoles(): string[] {
  try {
    const raw =
      window.localStorage.getItem("auth_roles") ??
      window.sessionStorage.getItem("auth_roles");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useSyncExternalStore(
    subscribe,
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

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const roles = getAuthRoles();

  const value = useMemo(
    () => ({ isAuthenticated, login, logout, roles }),
    [isAuthenticated, login, logout, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
