import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const getConnectionMock = vi.hoisted(() => vi.fn());
const createAuthSessionMock = vi.hoisted(() => vi.fn());
const bcryptCompareMock = vi.hoisted(() => vi.fn());
const bcryptHashMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../../services/auth.service.js", () => ({
  createAuthSession: createAuthSessionMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

import { loginInstructor, registerInstructor } from "../../services/instructorAuth.service.js";

const demoInstructorRow = {
  id: 4,
  name: "Nguyen Van A",
  email: "a@example.com",
  phone: "+84900000000",
  passwordHash: "$2a$10$examplehash",
  avatar: "http://example.com/avatar.jpg",
  status: "ACTIVE",
  specialization: "React",
  workplace: "FPT",
};

beforeEach(() => {
  queryMock.mockReset();
  getConnectionMock.mockReset();
  createAuthSessionMock.mockReset();
  bcryptCompareMock.mockReset();
  bcryptHashMock.mockReset();
});

describe("instructorAuth.service", () => {
  it("should throw when login payload is missing email or password", async () => {
    // Test nghiệp vụ: nếu thiếu email hoặc mật khẩu,
    // service phải ném lỗi xác thực rõ ràng và không truy vấn database.
    await expect(loginInstructor({ email: "", password: "" })).rejects.toThrow(
      "Email và mật khẩu không được để trống.",
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("should throw when instructor does not exist", async () => {
    // Test nghiệp vụ: nếu email giảng viên không có trong hệ thống,
    // service phải báo tài khoản không tồn tại.
    queryMock.mockResolvedValueOnce([[]]);

    await expect(loginInstructor({ email: "noone@example.com", password: "password" })).rejects.toThrow(
      "Tài khoản giảng viên không tồn tại.",
    );
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("should throw when instructor account is not active", async () => {
    // Test nghiệp vụ: nếu tài khoản giảng viên không ở trạng thái ACTIVE,
    // service phải từ chối đăng nhập.
    queryMock.mockResolvedValueOnce([[{ ...demoInstructorRow, status: "LOCKED" }]]);

    await expect(loginInstructor({ email: "a@example.com", password: "password" })).rejects.toThrow(
      "Tài khoản giảng viên chưa hoạt động hoặc đã bị khóa.",
    );
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("should throw when password is incorrect", async () => {
    // Test nghiệp vụ: nếu mật khẩu không khớp,
    // service phải trả về lỗi mật khẩu không đúng.
    queryMock.mockResolvedValueOnce([[demoInstructorRow]]);
    bcryptCompareMock.mockResolvedValue(false);

    await expect(loginInstructor({ email: "a@example.com", password: "wrongpass" })).rejects.toThrow(
      "Mật khẩu không đúng.",
    );
    expect(bcryptCompareMock).toHaveBeenCalledWith("wrongpass", demoInstructorRow.passwordHash);
  });

  it("should succeed login with bcrypt password and return session data", async () => {
    // Test nghiệp vụ: khi mật khẩu đúng,
    // service phải tạo session và trả về thông tin instructor kèm token.
    queryMock.mockResolvedValueOnce([[demoInstructorRow]]);
    bcryptCompareMock.mockResolvedValue(true);
    createAuthSessionMock.mockReturnValue({ token: "jwt-token", expiresAt: "2030-01-01T00:00:00Z" });

    const result = await loginInstructor({ email: "A@Example.COM", password: "Password123" });

    expect(result).toEqual({
      teacherId: 4,
      name: "Nguyen Van A",
      email: "a@example.com",
      role: "React",
      avatar: "http://example.com/avatar.jpg",
      workplace: "FPT",
      token: "jwt-token",
      expiresAt: "2030-01-01T00:00:00Z",
      user: {
        id: 4,
        fullName: "Nguyen Van A",
        email: "a@example.com",
        phone: "+84900000000",
        avatarUrl: "http://example.com/avatar.jpg",
        role: "TEACHER",
        status: "ACTIVE",
      },
    });
  });

  it("should allow legacy demo passwords when hash matches legacy hash", async () => {
    // Test nghiệp vụ: nếu tài khoản sử dụng mã hash demo cũ,
    // service vẫn cho phép đăng nhập với password legacy hợp lệ.
    queryMock.mockResolvedValueOnce([[{ ...demoInstructorRow, passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy" }]]);
    bcryptCompareMock.mockResolvedValue(false);
    createAuthSessionMock.mockReturnValue({ token: "legacy-token", expiresAt: "2030-01-01T00:00:00Z" });

    const result = await loginInstructor({ email: "a@example.com", password: "password" });

    expect(result.token).toBe("legacy-token");
    expect(result.user.email).toBe("a@example.com");
  });

  it("should throw when register payload is incomplete", async () => {
    // Test nghiệp vụ: nếu đăng ký thiếu trường bắt buộc,
    // service phải báo lỗi và không tạo user.
    await expect(registerInstructor({ name: "", email: "", password: "" })).rejects.toThrow(
      "Họ tên, email và mật khẩu không được để trống.",
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("should throw when register password is too short", async () => {
    // Test nghiệp vụ: nếu mật khẩu đăng ký có ít hơn 6 ký tự,
    // service phải báo lỗi độ dài mật khẩu.
    await expect(registerInstructor({ name: "A", email: "a@example.com", password: "123" })).rejects.toThrow(
      "Mật khẩu cần ít nhất 6 ký tự.",
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("should throw when register email already exists", async () => {
    // Test nghiệp vụ: nếu email đã tồn tại trong users,
    // service phải báo lỗi trùng email.
    queryMock.mockResolvedValueOnce([[{ user_id: 5 }]]);

    await expect(
      registerInstructor({ name: "Teacher", email: "a@example.com", password: "password" }),
    ).rejects.toThrow("Email này đã được sử dụng.");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("should register instructor and create profile when payload is valid", async () => {
    // Test nghiệp vụ: khi đăng ký giảng viên mới hợp lệ,
    // service phải chèn user, tạo profile, commit transaction và trả dữ liệu session.
    const connection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };

    getConnectionMock.mockResolvedValue(connection);
    queryMock.mockResolvedValueOnce([[]]);
    bcryptHashMock.mockResolvedValue("hashed-password");
    connection.query
      .mockResolvedValueOnce([{ insertId: 55 }])
      .mockResolvedValueOnce([{ insertId: 66 }]);
    queryMock.mockResolvedValueOnce([[{ ...demoInstructorRow, id: 55, email: "new@example.com", passwordHash: "hashed-password" }]]);
    createAuthSessionMock.mockReturnValue({ token: "new-token", expiresAt: "2030-01-01T00:00:00Z" });

    const result = await registerInstructor({
      name: "New Teacher",
      email: "new@example.com",
      password: "securepass",
      phone: "+84900000001",
      specialization: "Vue",
      workplace: "Tutorials",
    });

    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      ["New Teacher", "new@example.com", "hashed-password", "+84900000001"],
    );
    expect(connection.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO teacher_profiles"),
      [55, "Vue", "Tutorials"],
    );
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
    expect(result.token).toBe("new-token");
    expect(result.user.email).toBe("new@example.com");
  });
});
