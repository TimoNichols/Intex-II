import { SESSION_KEY } from "./devCredentials";

let sessionListeners: (() => void)[] = [];

export function subscribeSession(listener: () => void) {
  sessionListeners.push(listener);
  return () => {
    sessionListeners = sessionListeners.filter((l) => l !== listener);
  };
}

export function readSession(): boolean {
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

function emitSessionChange() {
  sessionListeners.forEach((l) => l());
}

export function setSession(remember: boolean, token: string, roles: string[]) {
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

export function clearSession() {
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
