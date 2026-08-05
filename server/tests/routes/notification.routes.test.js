import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockGetNotifications,
  mockGetVapidPublicKey,
  mockSavePushSubscription,
  mockMarkAllNotificationsRead,
  mockMarkNotificationRead,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn((req, res, next) => {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== "Bearer valid-token") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
      });
    }

    req.auth = {
      token: "valid-token",
      user: { id: 5, role: "STUDENT" },
    };

    next();
  }),
  mockGetNotifications: vi.fn(),
  mockGetVapidPublicKey: vi.fn(),
  mockSavePushSubscription: vi.fn(),
  mockMarkAllNotificationsRead: vi.fn(),
  mockMarkNotificationRead: vi.fn(),
}));

vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("../../services/notification.service.js", () => ({
  getNotifications: mockGetNotifications,
  getVapidPublicKey: mockGetVapidPublicKey,
  savePushSubscription: mockSavePushSubscription,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
  markNotificationRead: mockMarkNotificationRead,
}));

import notificationRoutes from "../../routes/notification.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/notifications", notificationRoutes);
  return app;
}

describe("notification routes", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockGetNotifications.mockReset();
    mockGetVapidPublicKey.mockReset();
    mockSavePushSubscription.mockReset();
    mockMarkAllNotificationsRead.mockReset();
    mockMarkNotificationRead.mockReset();
  });

  it("should return notifications list for authenticated user", async () => {
    // Test nghiệp vụ: khi người dùng đã đăng nhập xem thông báo,
    // route phải trả về danh sách thông báo thành công.
    const app = createApp();
    const notifications = [
      { id: 1, message: "Thông báo 1" },
      { id: 2, message: "Thông báo 2" },
    ];
    mockGetNotifications.mockResolvedValue(notifications);

    const response = await request(app)
      .get("/notifications?limit=10")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(notifications);
    expect(mockGetNotifications).toHaveBeenCalledWith(5, "10");
  });

  it("should expose VAPID public key without errors", async () => {
    // Test nghiệp vụ: route public key VAPID phải trả về khóa công khai cho client.
    const app = createApp();
    mockGetVapidPublicKey.mockReturnValue("PUBLIC_KEY_SAMPLE");

    const response = await request(app)
      .get("/notifications/push/public-key")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.publicKey).toBe("PUBLIC_KEY_SAMPLE");
  });

  it("should save push subscription and return 201", async () => {
    // Test nghiệp vụ: khi client đăng ký nhận thông báo đẩy,
    // route phải trả về 201 với dữ liệu đăng ký.
    const app = createApp();
    const subscription = { endpoint: "https://example.com/push" };
    mockSavePushSubscription.mockResolvedValue({ saved: true });

    const response = await request(app)
      .post("/notifications/push/subscribe")
      .set("Authorization", "Bearer valid-token")
      .set("User-Agent", "Vitest")
      .send({ subscription });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ saved: true });
    expect(mockSavePushSubscription).toHaveBeenCalledWith(5, subscription, "Vitest");
  });

  it("should mark notification as read and return updated result", async () => {
    // Test nghiệp vụ: khi người dùng đánh dấu thông báo đã đọc,
    // route phải trả về updated=true nếu thành công.
    const app = createApp();
    mockMarkNotificationRead.mockResolvedValue(true);

    const response = await request(app)
      .patch("/notifications/11/read")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ updated: true });
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(5, 11);
  });

  it("should return 404 when marking a non-existent notification as read", async () => {
    // Test nghiệp vụ: khi thông báo không tồn tại,
    // route phải trả về 404 và thông báo rõ ràng.
    const app = createApp();
    mockMarkNotificationRead.mockResolvedValue(false);

    const response = await request(app)
      .patch("/notifications/999/read")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Không tìm thấy thông báo.");
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(5, 999);
  });
});
