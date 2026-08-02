import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDbExecute, mockDbGetConnection, mockCreateNotificationsForRole, bcryptMock } = vi.hoisted(() => ({
  mockDbExecute: vi.fn(),
  mockDbGetConnection: vi.fn(),
  mockCreateNotificationsForRole: vi.fn(),
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock("../../db.js", () => ({
  default: {
    execute: mockDbExecute,
    getConnection: mockDbGetConnection,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotificationsForRole: mockCreateNotificationsForRole,
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}));

import bcrypt from "bcryptjs";
import db from "../../db.js";
import { loginUser, registerStudent, revokeSession } from "../../services/auth.service.js";

describe("auth.service login and registration flow", () => {
  beforeEach(() => {
    mockDbExecute.mockReset();
    mockDbGetConnection.mockReset();
    mockCreateNotificationsForRole.mockReset();
    bcryptMock.compare.mockReset();
    bcryptMock.hash.mockReset();
  });

  it("should return unauthenticated when no matching account exists", async () => {
    // Test nghiệp vụ: khi người dùng nhập một tài khoản không tồn tại trong hệ thống,
    // service phải dừng lại ngay và trả về kết quả chưa xác thực với thông báo phù hợp.
    mockDbExecute.mockResolvedValueOnce([[]]);

    const result = await loginUser({
      account: "not-found@example.com",
      password: "Password123!",
    });

    expect(result.authenticated).toBe(false);
    expect(result.message).toContain("Tài khoản hoặc mật khẩu không đúng");
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("should return unauthenticated when the password is wrong", async () => {
    // Test nghiệp vụ: khi mật khẩu nhập không đúng, hệ thống không nên tạo session
    // mà phải trả về lỗi xác thực và giữ nguyên trạng thái chưa đăng nhập.
    mockDbExecute.mockResolvedValueOnce([
      [
        {
          user_id: 1,
          full_name: "Nguyễn Văn A",
          email: "student@example.com",
          password_hash: "hashed-password",
          phone: "0123456789",
          avatar_url: null,
          role: "STUDENT",
          status: "ACTIVE",
        },
      ],
    ]);
    bcryptMock.compare.mockResolvedValue(false);

    const result = await loginUser({
      account: "student@example.com",
      password: "WrongPassword1!",
    });

    expect(result.authenticated).toBe(false);
    expect(result.message).toContain("Tài khoản hoặc mật khẩu không đúng");
    expect(result.session).toBeUndefined();
    expect(bcrypt.compare).toHaveBeenCalledWith("WrongPassword1!", "hashed-password");
  });

  it("should return a session and sanitized user when login succeeds", async () => {
    // Test nghiệp vụ: khi người dùng nhập đúng tài khoản, mật khẩu và trạng thái ACTIVE,
    // service phải tạo session mới và trả về thông tin user đã được làm sạch.
    mockDbExecute.mockResolvedValueOnce([
      [
        {
          user_id: 1,
          full_name: "Nguyễn Văn A",
          email: "student@example.com",
          password_hash: "hashed-password",
          phone: "0123456789",
          avatar_url: null,
          role: "STUDENT",
          status: "ACTIVE",
        },
      ],
    ]);
    bcryptMock.compare.mockResolvedValue(true);

    const result = await loginUser({
      account: "student@example.com",
      password: "Password123!",
    });

    expect(result.authenticated).toBe(true);
    expect(result.session).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        expiresAt: expect.any(String),
      }),
    );
    expect(result.user).toEqual({
      id: 1,
      fullName: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0123456789",
      avatarUrl: null,
      role: "STUDENT",
      status: "ACTIVE",
    });

    revokeSession(result.session.token);
  });

  it("should return conflict when email or phone already exists", async () => {
    // Test nghiệp vụ: khi người dùng đăng ký với email hoặc số điện thoại đã tồn tại,
    // service phải chặn đăng ký ngay và trả về lỗi conflict để route xử lý tiếp.
    mockDbExecute.mockResolvedValueOnce([
      [
        {
          email: "student@example.com",
          phone: "0123456789",
        },
      ],
    ]);

    const result = await registerStudent({
      fullName: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0123456789",
      password: "Password123!",
    });

    expect(result.conflict).toBe(true);
    expect(result.field).toBe("email");
    expect(result.message).toContain("được sử dụng");
  });
});
