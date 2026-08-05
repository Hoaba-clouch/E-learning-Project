import type { AuthSession } from "./auth.types";

const AUTH_SESSION_KEY = "learnx.auth.session";

function parseSession(rawSession: string | null) {
  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (
      !session.token ||
      !session.user ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function getStoredAuthSession() {
  const localSession = parseSession(localStorage.getItem(AUTH_SESSION_KEY));

  if (localSession) {
    return localSession;
  }

  localStorage.removeItem(AUTH_SESSION_KEY);

  const sessionSession = parseSession(sessionStorage.getItem(AUTH_SESSION_KEY));

  if (sessionSession) {
    return sessionSession;
  }

  sessionStorage.removeItem(AUTH_SESSION_KEY);
  return null;
}

export function setStoredAuthSession(session: AuthSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  otherStorage.removeItem(AUTH_SESSION_KEY);
}

export function isAuthSessionRemembered() {
  return Boolean(parseSession(localStorage.getItem(AUTH_SESSION_KEY)));
}

export function clearStoredAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
}
