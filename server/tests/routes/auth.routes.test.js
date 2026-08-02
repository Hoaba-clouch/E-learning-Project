import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockLoginUser, mockRegisterStudent, mockRevokeSession, mockGetSessionUser } = vi.hoisted(() => ({
  mockLoginUser: vi.fn(),
  mockRegisterStudent: vi.fn(),
  mockRevokeSession: vi.fn(),
  mockGetSessionUser: vi.fn(),
}));

vi.mock("../../services/auth.service.js", () => ({
  loginUser: mockLoginUser,
  registerStudent: mockRegisterStudent,
  revokeSession: mockRevokeSession,
  getSessionUser: mockGetSessionUser,
}));

import authRoutes from "../../routes/auth.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  return app;
}

describe("auth routes", () => {
  beforeEach(() => {
    mockLoginUser.mockReset();
    mockRegisterStudent.mockReset();
    mockRevokeSession.mockReset();
    mockGetSessionUser.mockReset();
  });

  it("should reject registration when the password does not meet the policy", async () => {
    // Test nghiệp vụ: khi người dùng đăng ký với mật khẩu không đủ mạnh,
    // route phải trả về lỗi 400 ngay trước khi gọi service đăng ký.
    const app = createApp();

    const response = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Nguyễn Văn A",
        email: "student@example.com",
        phone: "0123456789",
        password: "weak",
        confirmPassword: "weak",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.password).toBeDefined();
    expect(mockRegisterStudent).not.toHaveBeenCalled();
  });

  it("should return 201 and created user payload when registration succeeds", async () => {
    // Test nghiệp vụ: khi dữ liệu đăng ký hợp lệ và service trả về user mới,
    // route phải phản hồi mã 201 cùng payload user để client có thể hiển thị kết quả.
    const app = createApp();
    mockRegisterStudent.mockResolvedValue({
      user: {
        id: 7,
        fullName: "Nguyễn Văn A",
        email: "student@example.com",
        phone: "0123456789",
        avatarUrl: null,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const response = await request(app)
      .post("/auth/register")
      .send({
        fullName: "Nguyễn Văn A",
        email: "student@example.com",
        phone: "0123456789",
        password: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("student@example.com");
    expect(mockRegisterStudent).toHaveBeenCalledTimes(1);
  });

  it("should reject login when the account is missing", async () => {
    // Test nghiệp vụ: khi người dùng bỏ qua thông tin đăng nhập,
    // route phải trả về lỗi 400 và không gọi service login.
    const app = createApp();

    const response = await request(app)
      .post("/auth/login")
      .send({ password: "Password123!" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.account).toBeDefined();
    expect(mockLoginUser).not.toHaveBeenCalled();
  });

  it("should return current user information when the request contains a valid token", async () => {
    // Test nghiệp vụ: khi client gửi token hợp lệ trong header Authorization,
    // route phải trả về thông tin user hiện tại từ session.
    const app = createApp();
    mockGetSessionUser.mockReturnValue({
      id: 8,
      fullName: "Nguyễn Văn B",
      email: "teacher@example.com",
      phone: "0987654321",
      avatarUrl: null,
      role: "INSTRUCTOR",
      status: "ACTIVE",
    });

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("teacher@example.com");
    expect(mockGetSessionUser).toHaveBeenCalledWith("valid-token");
  });
});
