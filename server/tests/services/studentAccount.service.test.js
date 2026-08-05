import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindStudentByPhone,
  mockGetStudentCertificateRows,
  mockGetStudentEnrollmentStatsRow,
  mockGetStudentPaymentRows,
  mockGetStudentProfileRow,
  mockUpdateStudentProfileRow,
  mockUpdateSessionUser,
} = vi.hoisted(() => ({
  mockFindStudentByPhone: vi.fn(),
  mockGetStudentCertificateRows: vi.fn(),
  mockGetStudentEnrollmentStatsRow: vi.fn(),
  mockGetStudentPaymentRows: vi.fn(),
  mockGetStudentProfileRow: vi.fn(),
  mockUpdateStudentProfileRow: vi.fn(),
  mockUpdateSessionUser: vi.fn(),
}));

vi.mock("../../services/studentAccount.repository.js", () => ({
  findStudentByPhone: mockFindStudentByPhone,
  getStudentCertificateRows: mockGetStudentCertificateRows,
  getStudentEnrollmentStatsRow: mockGetStudentEnrollmentStatsRow,
  getStudentPaymentRows: mockGetStudentPaymentRows,
  getStudentProfileRow: mockGetStudentProfileRow,
  updateStudentProfileRow: mockUpdateStudentProfileRow,
}));

vi.mock("../../services/auth.service.js", () => ({
  updateSessionUser: mockUpdateSessionUser,
}));

import {
  getStudentAccountOverview,
  getStudentAccountProfile,
  updateStudentAccountProfile,
} from "../../services/studentAccount.service.js";

describe("studentAccount.service", () => {
  beforeEach(() => {
    mockFindStudentByPhone.mockReset();
    mockGetStudentCertificateRows.mockReset();
    mockGetStudentEnrollmentStatsRow.mockReset();
    mockGetStudentPaymentRows.mockReset();
    mockGetStudentProfileRow.mockReset();
    mockUpdateStudentProfileRow.mockReset();
    mockUpdateSessionUser.mockReset();
  });

  it("should build a full profile view with summary and recent activities", async () => {
    // Test nghiệp vụ: khi lấy hồ sơ học viên, service phải gom dữ liệu profile,
    // thống kê khóa học, chứng chỉ và lịch sử thanh toán thành một view hoàn chỉnh.
    mockGetStudentProfileRow.mockResolvedValue({
      user_id: 7,
      full_name: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0123456789",
      avatar_url: null,
      status: "ACTIVE",
      date_of_birth: "1998-01-01",
      gender: "MALE",
      address: "Hà Nội",
    });
    mockGetStudentEnrollmentStatsRow.mockResolvedValue({
      total_courses: 3,
      active_courses: 2,
      completed_courses: 1,
      average_progress: 70,
    });
    mockGetStudentCertificateRows.mockResolvedValue([
      {
        certificate_id: 1,
        certificate_code: "CERT-001",
        certificate_url: "/uploads/certificates/test.pdf",
        issued_at: "2026-02-01",
        batch_id: 10,
        batch_name: "Batch 01",
        batch_code: "B01",
        course_id: 100,
        course_name: "React Advanced",
        level: "Intermediate",
        teacher_id: 3,
        teacher_name: "Cô Linh",
      },
    ]);
    mockGetStudentPaymentRows.mockResolvedValue([
      {
        payment_id: 1,
        amount: 500000,
        payment_method: "MOMO",
        payment_status: "SUCCESS",
        transaction_code: "TXN-001",
        paid_at: "2026-02-02",
        created_at: "2026-02-02",
        batch_id: 10,
        batch_name: "Batch 01",
        batch_code: "B01",
        course_id: 100,
        course_name: "React Advanced",
        teacher_id: 3,
        teacher_name: "Cô Linh",
      },
    ]);

    const result = await getStudentAccountProfile(7);

    expect(result).toEqual(
      expect.objectContaining({
        profile: expect.objectContaining({
          fullName: "Nguyễn Văn A",
          genderLabel: "Nam",
        }),
        summary: expect.objectContaining({
          totalCourses: 3,
          activeCourses: 2,
          completedCourses: 1,
          certificatesCount: 1,
          successfulPayments: 1,
        }),
      }),
    );
    expect(result.recentActivities[0].type).toBe("PAYMENT");
  });

  it("should reject invalid profile payloads before updating the profile", async () => {
    // Test nghiệp vụ: khi dữ liệu hồ sơ không hợp lệ, service phải dừng ngay,
    // không gọi repository update và trả về lỗi chi tiết để route xử lý.
    const result = await updateStudentAccountProfile(7, "token-123", {
      fullName: "AB",
      phone: "123",
      dateOfBirth: "not-a-date",
      gender: "INVALID",
      address: "x".repeat(300),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errors).toEqual(
      expect.objectContaining({
        fullName: "Họ và tên cần ít nhất 3 ký tự.",
      }),
    );
    expect(mockUpdateStudentProfileRow).not.toHaveBeenCalled();
  });

  it("should update the profile and refresh the session user when the payload is valid", async () => {
    // Test nghiệp vụ: khi hồ sơ hợp lệ, service phải cập nhật profile trong DB,
    // đồng thời cập nhật lại thông tin user trong session bằng token tương ứng.
    mockGetStudentProfileRow.mockResolvedValueOnce({
      user_id: 7,
      full_name: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0123456789",
      avatar_url: null,
      status: "ACTIVE",
      date_of_birth: null,
      gender: null,
      address: null,
    });
    mockFindStudentByPhone.mockResolvedValueOnce(null);
    mockUpdateStudentProfileRow.mockResolvedValueOnce({
      user_id: 7,
      full_name: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0987654321",
      avatar_url: null,
      status: "ACTIVE",
      date_of_birth: "1998-01-01",
      gender: "MALE",
      address: "Hà Nội",
    });
    mockUpdateSessionUser.mockReturnValue({
      id: 7,
      fullName: "Nguyễn Văn A",
      email: "student@example.com",
      phone: "0987654321",
      avatarUrl: null,
      role: "STUDENT",
      status: "ACTIVE",
    });

    const result = await updateStudentAccountProfile(7, "token-123", {
      fullName: "Nguyễn Văn A",
      phone: "0987654321",
      dateOfBirth: "1998-01-01",
      gender: "MALE",
      address: "Hà Nội",
    });

    expect(result.ok).toBe(true);
    expect(result.data.profile.phone).toBe("0987654321");
    expect(mockUpdateSessionUser).toHaveBeenCalledWith("token-123", expect.objectContaining({
      user_id: 7,
      phone: "0987654321",
    }));
  });

  it("should return null when the student profile does not exist", async () => {
    // Test nghiệp vụ: khi không tìm thấy hồ sơ học viên, service phải trả về null
    // thay vì cố gắng tạo một view giả hoặc lỗi không kiểm soát.
    mockGetStudentProfileRow.mockResolvedValueOnce(null);

    const result = await getStudentAccountOverview(999);

    expect(result).toBeNull();
  });
});
