import { getAuthHeaders } from "../../auth/authHeaders";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type InteractionData = {
  courses: Array<{ id: number; name: string }>;
  enrolledCourses: Array<{
    id: number;
    name: string;
    batchId: number;
    batchName: string;
  }>;
  lessons: Array<{ id: number; title: string; batchId: number }>;
  discussions: Array<{
    id: number; batchId: number; lessonId: number | null;
    type: "DISCUSSION" | "QUESTION"; title: string; content: string;
    status: "OPEN" | "RESOLVED"; isPinned: boolean; isMine: boolean;
    createdAt: string; course: { id: number; name: string };
    batchName: string; lessonTitle: string | null; commentCount: number;
    likeCount: number; likedByMe: boolean;
    author: { id: number; name: string; avatar: string | null; role: string };
    comments: Array<{
      id: number; parentId: number | null; content: string;
      isInstructorAnswer: boolean; isMine: boolean; createdAt: string;
      author: { id: number; name: string; avatar: string | null; role: string };
    }>;
  }>;
};

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}/api/student${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || "Không thể xử lý tương tác.");
  return payload.data as T;
}

export function getInteractions(params: URLSearchParams) {
  const query = params.toString();
  return request<InteractionData>(`/interactions${query ? `?${query}` : ""}`);
}
export function createInteraction(body: unknown) {
  return request("/interactions", { method: "POST", body: JSON.stringify(body) });
}
export function createInteractionComment(id: number, body: unknown) {
  return request(`/interactions/${id}/comments`, { method: "POST", body: JSON.stringify(body) });
}
export function toggleInteractionLike(id: number) {
  return request(`/interactions/${id}/reaction`, { method: "POST" });
}
export function updateInteraction(id: number, body: unknown) {
  return request(`/interactions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function reportInteraction(body: unknown) {
  return request("/interactions/reports", { method: "POST", body: JSON.stringify(body) });
}
