import { getStoredAuthSession } from "./authStorage";

export function getAuthHeaders(): Record<string, string> {
  const session = getStoredAuthSession();

  if (!session) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}
