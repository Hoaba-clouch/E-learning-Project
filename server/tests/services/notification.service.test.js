import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDbQuery, mockSetVapidDetails, mockSendNotification } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
  mockSetVapidDetails: vi.fn(),
  mockSendNotification: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  default: {
    query: mockDbQuery,
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

import {
  createNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "../../services/notification.service.js";

describe("notification.service", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockSetVapidDetails.mockReset();
    mockSendNotification.mockReset();
  });

  it("should map notifications and unread count from database rows", async () => {
    // Test nghiệp vụ: khi hệ thống đọc danh sách thông báo của một người dùng,
    // service phải chuyển dữ liệu từ DB thành payload có cấu trúc rõ ràng,
    // đồng thời tính đúng số thông báo chưa đọc.
    mockDbQuery
      .mockResolvedValueOnce([
        [
          {
            notification_id: 10,
            notification_type: "USER_REGISTERED",
            title: "Học viên mới đăng ký",
            content: "Một học viên vừa đăng ký tài khoản.",
            reference_type: "USER",
            reference_id: 42,
            target_url: "/admin/students",
            priority: "NORMAL",
            is_read: 0,
            read_at: null,
            created_at: "2026-01-01 10:00:00",
          },
        ],
      ])
      .mockResolvedValueOnce([[{ unread_count: 1 }]]);

    const result = await getNotifications(7, 10);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toEqual({
      id: 10,
      type: "USER_REGISTERED",
      title: "Học viên mới đăng ký",
      content: "Một học viên vừa đăng ký tài khoản.",
      referenceType: "USER",
      referenceId: 42,
      targetUrl: "/admin/students",
      priority: "NORMAL",
      isRead: false,
      readAt: null,
      createdAt: "2026-01-01 10:00:00",
    });
    expect(result.unreadCount).toBe(1);
    expect(mockDbQuery).toHaveBeenCalledTimes(2);
  });

  it("should mark a notification as read for the matching user only", async () => {
    // Test nghiệp vụ: khi người dùng đánh dấu một thông báo đã đọc,
    // service phải chỉ cập nhật đúng bản ghi thuộc về user đó và trả về true khi có thay đổi.
    mockDbQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await markNotificationRead(7, 10);

    expect(result).toBe(true);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE notifications"),
      [10, 7],
    );
  });

  it("should mark all unread notifications as read for one user", async () => {
    // Test nghiệp vụ: khi người dùng chọn đánh dấu tất cả thông báo đã đọc,
    // service phải cập nhật tất cả bản ghi chưa đọc của user đó và báo đúng số lượng bản ghi đã cập nhật.
    mockDbQuery.mockResolvedValueOnce([{ affectedRows: 3 }]);

    const result = await markAllNotificationsRead(7);

    expect(result).toEqual({ updated: 3 });
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ? AND is_read = FALSE"),
      [7],
    );
  });

  it("should insert a notification and return its new id", async () => {
    // Test nghiệp vụ: khi tạo một thông báo mới, service phải ghi bản ghi vào DB
    // và trả về id của thông báo vừa tạo để phía trên có thể theo dõi hoặc điều hướng.
    mockDbQuery.mockResolvedValueOnce([{ insertId: 99 }]);

    const result = await createNotification({
      userId: 7,
      type: "SYSTEM",
      title: "Thông báo hệ thống",
      content: "Bạn có một thay đổi mới.",
      targetUrl: "/courses",
    });

    expect(result).toBe(99);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notifications"),
      [7, "SYSTEM", "Thông báo hệ thống", "Bạn có một thay đổi mới.", null, null, "/courses", "NORMAL"],
    );
  });

  it("should save a valid push subscription and enable web push preference", async () => {
    // Test nghiệp vụ: khi client gửi subscription push hợp lệ,
    // service phải lưu thông tin subscription và bật tùy chọn web push cho người dùng.
    mockDbQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await savePushSubscription(
      7,
      {
        endpoint: "https://example.com/push",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key",
        },
      },
      "Mozilla/5.0",
    );

    expect(result).toEqual({ subscribed: true });
    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(mockDbQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO push_subscriptions"),
      [7, "https://example.com/push", "p256dh-key", "auth-key", "Mozilla/5.0"],
    );
  });
});
