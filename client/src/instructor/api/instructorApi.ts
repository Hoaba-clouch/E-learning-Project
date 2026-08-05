import { getInstructorAuthToken } from "../auth/instructorAuth";

export const INSTRUCTOR_API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type QueryValue = string | number | boolean | null | undefined;

type InstructorApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export function buildInstructorApiUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, INSTRUCTOR_API_BASE_URL);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function instructorApiRequest<T>(
  path: string,
  {
    method = "GET",
    query,
    body,
    headers,
    signal,
  }: InstructorApiRequestOptions = {},
) {
  const response = await fetch(buildInstructorApiUrl(path, query), {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(getInstructorAuthToken()
        ? { Authorization: `Bearer ${getInstructorAuthToken()}` }
        : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}
