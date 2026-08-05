import { getAuthHeaders } from "../../auth/authHeaders";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  content: string;
  referenceType: string | null;
  referenceId: number | null;
  targetUrl: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationData = {
  notifications: AppNotification[];
  unreadCount: number;
};

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/notifications${path}`, {
    method,
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: T;
    message?: string;
  };

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? "Không thể tải thông báo.");
  }

  return payload.data;
}

export function getNotifications() {
  return request<NotificationData>("");
}

export function markNotificationRead(notificationId: number) {
  return request<{ updated: boolean }>(`/${notificationId}/read`, "PATCH");
}

export function markAllNotificationsRead() {
  return request<{ updated: number }>("/read-all", "PATCH");
}

export function getPushPublicKey() {
  return request<{ publicKey: string }>("/push/public-key");
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return request<{ subscribed: boolean }>("/push/subscribe", "POST", {
    subscription,
  });
}
