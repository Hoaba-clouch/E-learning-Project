import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireRole,
  mockLoginInstructor,
  mockRegisterInstructor,
  mockGetInstructorDashboardData,
  mockGetInstructorProfileData,
  mockUpdateInstructorProfile,
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
      user: { id: 7, role: "TEACHER" },
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
  mockLoginInstructor: vi.fn(),
  mockRegisterInstructor: vi.fn(),
  mockGetInstructorDashboardData: vi.fn(),
  mockGetInstructorProfileData: vi.fn(),
  mockUpdateInstructorProfile: vi.fn(),
}));

vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: mockRequireAuth,
  requireRole: mockRequireRole,
}));

vi.mock("../../services/instructorAuth.service.js", () => ({
  loginInstructor: mockLoginInstructor,
  registerInstructor: mockRegisterInstructor,
}));

vi.mock("../../services/instructorDashboard.service.js", () => ({
  getInstructorDashboardData: mockGetInstructorDashboardData,
}));

vi.mock("../../services/instructorPortal.service.js", () => ({
  getInstructorProfileData: mockGetInstructorProfileData,
  updateInstructorProfile: mockUpdateInstructorProfile,
}));

import instructorRoutes from "../../routes/instructor.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/instructor", instructorRoutes);
  return app;
}

describe("instructor routes", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockRequireRole.mockReset();
    mockLoginInstructor.mockReset();
    mockRegisterInstructor.mockReset();
    mockGetInstructorDashboardData.mockReset();
    mockGetInstructorProfileData.mockReset();
    mockUpdateInstructorProfile.mockReset();
  });

  it("should login instructor successfully", async () => {
    // Test nghiệp vụ: khi giảng viên đăng nhập đúng thông tin,
    // route phải trả về token và dữ liệu đăng nhập.
    const app = createApp();
    mockLoginInstructor.mockResolvedValue({
      token: "jwt-token",
      user: { id: 7, email: "teacher@example.com" },
    });

    const response = await request(app)
      .post("/instructor/auth/login")
      .send({ email: "teacher@example.com", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe("jwt-token");
    expect(mockLoginInstructor).toHaveBeenCalledWith({
      email: "teacher@example.com",
      password: "Password123!",
    });
  });

  it("should return 400 when instructor login fails with validation error", async () => {
    // Test nghiệp vụ: khi dịch vụ đăng nhập ném lỗi xác thực,
    // route phải chuyển thành lỗi 400 và hiển thị thông báo.
    const app = createApp();
    mockLoginInstructor.mockRejectedValue(new Error("Invalid credentials."));

    const response = await request(app)
      .post("/instructor/auth/login")
      .send({ email: "wrong@example.com", password: "badpass" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid credentials.");
  });

  it("should register instructor and return created instructor data", async () => {
    // Test nghiệp vụ: khi giảng viên đăng ký thành công,
    // route phải trả về 201 với dữ liệu giảng viên mới.
    const app = createApp();
    const createdInstructor = { id: 8, email: "newteacher@example.com" };
    mockRegisterInstructor.mockResolvedValue(createdInstructor);

    const response = await request(app)
      .post("/instructor/auth/register")
      .send({
        fullName: "Giảng viên A",
        email: "newteacher@example.com",
        password: "Password123!",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(createdInstructor);
    expect(mockRegisterInstructor).toHaveBeenCalledWith({
      fullName: "Giảng viên A",
      email: "newteacher@example.com",
      password: "Password123!",
    });
  });

  it("should return instructor dashboard data for authenticated teacher", async () => {
    // Test nghiệp vụ: khi giảng viên hợp lệ xem dashboard,
    // route phải gọi dịch vụ bằng teacherId và trả dữ liệu.
    const app = createApp();
    const dashboardData = { totalCourses: 5, totalStudents: 120 };
    mockGetInstructorDashboardData.mockResolvedValue(dashboardData);

    const response = await request(app)
      .get("/instructor/dashboard")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(dashboardData);
    expect(mockGetInstructorDashboardData).toHaveBeenCalledWith("7");
  });

  it("should return 400 when updating instructor profile fails validation", async () => {
    // Test nghiệp vụ: khi cập nhật profile bị lỗi xác thực,
    // route phải trả về lỗi 400 và không chuyển lỗi nội bộ.
    const app = createApp();
    mockUpdateInstructorProfile.mockRejectedValue(new Error("Avatar URL phải hợp lệ."));

    const response = await request(app)
      .put("/instructor/profile")
      .set("Authorization", "Bearer valid-token")
      .send({ avatarUrl: "invalid-url" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Avatar URL phải hợp lệ.");
    expect(mockUpdateInstructorProfile).toHaveBeenCalledWith("7", { avatarUrl: "invalid-url" });
  });
});
