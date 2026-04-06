import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD, SESSION_KEY } from './devCredentials';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string, remember: boolean) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return (
      window.localStorage.getItem(SESSION_KEY) === '1' ||
      window.sessionStorage.getItem(SESSION_KEY) === '1'
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

function setSession(remember: boolean) {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, '1');
    } else {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    }
  } catch {
    /* ignore quota / private mode */
  }
  emitSessionChange();
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  emitSessionChange();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useSyncExternalStore(subscribe, readSession, () => false);

  const login = useCallback((email: string, password: string, remember: boolean) => {
    const ok =
      email.trim().toLowerCase() === DEV_LOGIN_EMAIL.toLowerCase() && password === DEV_LOGIN_PASSWORD;
    if (ok) {
      setSession(remember);
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
