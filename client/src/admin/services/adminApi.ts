import { getAuthHeaders } from "../../auth/authHeaders";
import { clearStoredAuthSession } from "../../auth/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type AdminApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

function handleExpiredAdminSession(status: number) {
  if (status !== 401) return;

  clearStoredAuthSession();

  if (window.location.pathname !== "/admin/login") {
    window.location.assign("/admin/login");
  }
}

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

export async function getAdminData<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    headers: getAuthHeaders(),
    signal,
  });
  const payload = (await response.json()) as AdminApiResponse<T>;

  if (!response.ok || !payload.success || !payload.data) {
    handleExpiredAdminSession(response.status);
    throw new AdminApiError(
      payload.message ?? "Không thể tải dữ liệu quản trị.",
      response.status,
    );
  }

  return payload.data;
}

export async function mutateAdminData<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    method,
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as AdminApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    handleExpiredAdminSession(response.status);
    throw new AdminApiError(
      payload.message ?? "Không thể cập nhật dữ liệu quản trị.",
      response.status,
    );
  }

  return payload.data;
}
