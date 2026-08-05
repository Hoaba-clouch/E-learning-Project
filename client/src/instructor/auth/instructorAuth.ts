export type InstructorAuthSession = {
  teacherId: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  workplace?: string;
  token: string;
  expiresAt: string;
};

const STORAGE_KEY = "instructorAuthSession";
const FALLBACK_TEACHER_ID = 4;

export function getInstructorAuthSession(): InstructorAuthSession | null {
  try {
    const rawSession = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession) as InstructorAuthSession;
    if (
      !parsed.teacherId ||
      !parsed.email ||
      !parsed.token ||
      Date.parse(parsed.expiresAt) <= Date.now()
    ) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function setInstructorAuthSession(session: InstructorAuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("instructor-auth-change"));
}

export function clearInstructorAuthSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("instructor-auth-change"));
}

export function hasInstructorAuthSession() {
  return Boolean(getInstructorAuthSession());
}

export function getInstructorAuthTeacherId() {
  return getInstructorAuthSession()?.teacherId ?? FALLBACK_TEACHER_ID;
}

export function getInstructorAuthToken() {
  return getInstructorAuthSession()?.token ?? "";
}
