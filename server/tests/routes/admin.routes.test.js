import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockRequireAdminPermission,
  mockGetAdminDashboardData,
  mockGetAdminTeacherDetail,
  mockUpdateAdminTeacherStatus,
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
      user: {
        id: 1,
        role: "ADMIN",
      },
    };

    next();
  }),
  mockRequireRole: vi.fn((requiredRole) => {
    return (req, res, next) => {
      if (req.auth?.user?.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập chức năng này.",
        });
      }

      next();
    };
  }),
  mockRequireAdminPermission: vi.fn(() => {
    return (_req, _res, next) => next();
  }),
  mockGetAdminDashboardData: vi.fn(),
  mockGetAdminTeacherDetail: vi.fn(),
  mockUpdateAdminTeacherStatus: vi.fn(),
}));

vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: mockRequireAuth,
  requireRole: mockRequireRole,
}));

vi.mock("../../middleware/adminPermission.middleware.js", () => ({
  requireAdminPermission: mockRequireAdminPermission,
}));

vi.mock("../../services/adminDashboard.service.js", () => ({
  getAdminDashboardData: mockGetAdminDashboardData,
}));

vi.mock("../../services/adminTeachers.service.js", () => ({
  getAdminTeacherDetail: mockGetAdminTeacherDetail,
  updateAdminTeacherStatus: mockUpdateAdminTeacherStatus,
}));

import adminRoutes from "../../routes/admin.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/admin", adminRoutes);
  return app;
}

describe("admin routes", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockRequireRole.mockReset();
    mockRequireAdminPermission.mockReset();
    mockGetAdminDashboardData.mockReset();
    mockGetAdminTeacherDetail.mockReset();
    mockUpdateAdminTeacherStatus.mockReset();
  });

  it("should return admin dashboard data for authenticated admin", async () => {
    // Test nghiệp vụ: khi admin hợp lệ truy cập dashboard,
    // route phải trả về dữ liệu dashboard thành công.
    const app = createApp();
    const dashboardData = { totalStudents: 200, totalCourses: 30 };
    mockGetAdminDashboardData.mockResolvedValue(dashboardData);

    const response = await request(app)
      .get("/admin/dashboard")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(dashboardData);
    expect(mockGetAdminDashboardData).toHaveBeenCalledTimes(1);
  });

  it("should return 404 when requested teacher detail is not found", async () => {
    // Test nghiệp vụ: khi admin yêu cầu chi tiết giáo viên không tồn tại,
    // route phải trả về 404 và thông báo rõ ràng.
    const app = createApp();
    mockGetAdminTeacherDetail.mockResolvedValue(null);

    const response = await request(app)
      .get("/admin/teachers/999")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Teacher not found.");
    expect(mockGetAdminTeacherDetail).toHaveBeenCalledWith("999");
  });

  it("should reject invalid teacher status values", async () => {
    // Test nghiệp vụ: khi admin gửi trạng thái giáo viên không hợp lệ,
    // route phải trả về lỗi 400 trước khi gọi service cập nhật.
    const app = createApp();

    const response = await request(app)
      .patch("/admin/teachers/10/status")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "not-a-valid-status" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid teacher status.");
    expect(mockUpdateAdminTeacherStatus).not.toHaveBeenCalled();
  });

  it("should update teacher status successfully when valid data is provided", async () => {
    // Test nghiệp vụ: khi admin cập nhật trạng thái giáo viên hợp lệ,
    // route phải trả về dữ liệu giáo viên đã cập nhật.
    const app = createApp();
    const updatedTeacher = { id: 10, name: "Giáo viên A", status: "active" };
    mockUpdateAdminTeacherStatus.mockResolvedValue(updatedTeacher);

    const response = await request(app)
      .patch("/admin/teachers/10/status")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "active" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(updatedTeacher);
    expect(mockUpdateAdminTeacherStatus).toHaveBeenCalledWith("10", "active");
  });
});
