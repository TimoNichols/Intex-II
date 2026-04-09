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

/** Returned by login() when credentials are valid but MFA is required. */
export type MfaChallenge = { mfaRequired: true; mfaToken: string };

type AuthContextValue = {
  isAuthenticated: boolean;
  /**
   * Returns `true` on a fully-authenticated login, a `MfaChallenge` object
   * when MFA is required, or `false` on invalid credentials / network error.
   */
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<true | false | MfaChallenge>;
  /**
   * Completes the MFA step. Verifies `mfaToken` + TOTP `code` and, on success,
   * stores the resulting full JWT.
   */
  loginMfa: (
    mfaToken: string,
    code: string,
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
    ): Promise<true | false | MfaChallenge> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return false;
        const data = await res.json();

        // Server signals that a TOTP code is still required.
        if (data.mfaRequired === true && typeof data.mfaToken === "string") {
          return { mfaRequired: true, mfaToken: data.mfaToken } satisfies MfaChallenge;
        }

        setSession(remember, data.token, data.roles ?? []);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const loginMfa = useCallback(
    async (mfaToken: string, code: string, remember: boolean): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/mfa/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mfaToken, code }),
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
    () => ({ isAuthenticated, login, loginMfa, loginWithToken, logout, roles }),
    [isAuthenticated, login, loginMfa, loginWithToken, logout, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
