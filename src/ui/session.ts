const KEY = "calculadora-frecuencias";

export type StoredSession = {
  text: string;
  nameOverride: string | null;
  step: "input" | "preview" | "results";
};

export function loadSession(): StoredSession | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}
