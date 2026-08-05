import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbQuery,
  mockDbGetConnection,
  mockCreateNotification,
} = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
  mockDbGetConnection: vi.fn(),
  mockCreateNotification: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  default: {
    query: mockDbQuery,
    getConnection: mockDbGetConnection,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: mockCreateNotification,
}));

import {
  getAdminUserDetail,
  updateAdminUser,
  updateAdminUserPermissions,
} from "../../services/adminUsers.service.js";

describe("adminUsers.service", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockDbGetConnection.mockReset();
    mockCreateNotification.mockReset();
  });

  it("should build a complete admin user detail response with recent activity", async () => {
    // Test nghiệp vụ: khi truy vấn chi tiết người dùng của admin,
    // service phải nối dữ liệu người dùng, vai trò và hoạt động gần đây thành một payload đủ dùng.
    mockDbQuery
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 8, name: "Admin A", email: "admin@example.com", phone: "0123456789", avatar: null, role: "ADMIN", status: "ACTIVE", created_at: "2026-01-01", course_count: 0, activity_count: 2, can_manage_users: 1, can_manage_courses: 0, can_manage_finance: 1, can_manage_system: 0 }]])
      .mockResolvedValueOnce([[{ id: 10, title: "Khóa học React", status: "DRAFT" }]])
      .mockResolvedValueOnce([[{ type: "payment", title: "Thanh toán 500000 VND", activity_time: "2026-02-01" }]]);

    const result = await getAdminUserDetail(8);

    expect(result.id).toBe(8);
    expect(result.permissions).toEqual({
      users: true,
      courses: false,
      finance: true,
      system: false,
    });
    expect(result.recentActivity).toHaveLength(1);
  });

  it("should reject invalid role or status updates before touching the database", async () => {
    // Test nghiệp vụ: khi admin cập nhật vai trò hoặc trạng thái không hợp lệ,
    // service phải chặn ngay và không thực hiện bất kỳ thay đổi nào trên DB.
    await expect(updateAdminUser(8, { role: "INVALID", status: "PENDING" })).rejects.toThrow("Invalid user role.");
    expect(mockDbGetConnection).not.toHaveBeenCalled();
  });

  it("should update user role and create profile rows for teacher or student users", async () => {
    // Test nghiệp vụ: khi chuyển vai trò của người dùng sang teacher hoặc student,
    // service phải cập nhật bảng users và tạo record profile tương ứng trong transaction.
    const connection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      query: vi.fn()
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ affectedRows: 1 }]),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    mockDbGetConnection.mockResolvedValue(connection);
    mockDbQuery
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 8, name: "Admin A", email: "admin@example.com", phone: "0123456789", avatar: null, role: "TEACHER", status: "ACTIVE", created_at: "2026-01-01", course_count: 0, activity_count: 2, can_manage_users: 0, can_manage_courses: 0, can_manage_finance: 0, can_manage_system: 0 }]])
      .mockResolvedValueOnce([[{ id: 8, name: "Admin A", email: "admin@example.com", phone: "0123456789", avatar: null, role: "TEACHER", status: "ACTIVE", created_at: "2026-01-01", course_count: 0, activity_count: 2, can_manage_users: 0, can_manage_courses: 0, can_manage_finance: 0, can_manage_system: 0 }]])
      .mockResolvedValueOnce([[{ id: 8, name: "Admin A", email: "admin@example.com", phone: "0123456789", avatar: null, role: "TEACHER", status: "ACTIVE", created_at: "2026-01-01", course_count: 0, activity_count: 2, can_manage_users: 0, can_manage_courses: 0, can_manage_finance: 0, can_manage_system: 0 }]]);

    const result = await updateAdminUser(8, { role: "TEACHER" });

    expect(result.id).toBe(8);
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalled();
  });

  it("should persist admin permissions for an admin user", async () => {
    // Test nghiệp vụ: khi phân quyền cho admin,
    // service phải ghi đúng các cờ permission vào bảng admin_user_permissions.
    mockDbQuery.mockImplementation(async (...args) => {
      if (args[0].includes("CREATE TABLE IF NOT EXISTS admin_user_permissions")) {
        return [];
      }
      if (args[0].includes("SELECT user_id, role FROM users")) {
        return [[{ user_id: 8, role: "ADMIN" }]];
      }
      if (args[0].includes("INSERT INTO admin_user_permissions")) {
        return [];
      }
      return [[{ id: 8, name: "Admin A", email: "admin@example.com", phone: "0123456789", avatar: null, role: "ADMIN", status: "ACTIVE", created_at: "2026-01-01", course_count: 0, activity_count: 2, can_manage_users: 1, can_manage_courses: 1, can_manage_finance: 0, can_manage_system: 0 }]];
    });

    const result = await updateAdminUserPermissions(8, {
      users: true,
      courses: true,
      finance: false,
      system: false,
    });

    expect(result.permissions.users).toBe(true);
    expect(result.permissions.courses).toBe(true);
    expect(result.permissions.finance).toBe(false);
  });
});
