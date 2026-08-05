import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const createNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    query: queryMock,
  },
}));

vi.mock("../../services/notification.service.js", () => ({
  createNotification: createNotificationMock,
}));

import {
  getAdminTeachersPageData,
  getAdminTeacherDetail,
  updateAdminTeacherStatus,
} from "../../services/adminTeachers.service.js";

describe("adminTeachers.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
  });

  it("should build admin teacher page summary and teacher list from database data", async () => {
    // Test nghiệp vụ: khi admin mở trang giảng viên,
    // service phải tổng hợp thống kê tổng quan và map danh sách giảng viên về format dùng cho UI.
    queryMock
      .mockImplementation((query) => {
        if (typeof query === "string" && query.includes("FROM users u")) {
          return Promise.resolve([[
            {
              id: 1,
              name: "Nguyễn Văn A",
              email: "a@example.com",
              phone: "0900000001",
              avatar: null,
              account_status: "ACTIVE",
              created_at: "2024-01-01",
              specialization: "React",
              experience_years: 5,
              qualification: "Thạc sĩ",
              workplace: "FPT",
              course_count: 2,
              student_count: 10,
              average_rating: 4.7,
            },
            {
              id: 2,
              name: "Trần Thị B",
              email: "b@example.com",
              phone: "0900000002",
              avatar: null,
              account_status: "LOCKED",
              created_at: "2024-02-01",
              specialization: null,
              experience_years: null,
              qualification: null,
              workplace: null,
              course_count: 0,
              student_count: 0,
              average_rating: 0,
            },
          ]]);
        }

        if (typeof query === "string" && query.includes("SELECT course_id AS id, teacher_id, course_name AS title")) {
          return Promise.resolve([[
            { id: 11, teacher_id: 1, title: "React căn bản" },
            { id: 12, teacher_id: 1, title: "Node.js cho người mới" },
          ]]);
        }

        if (typeof query === "string" && query.includes("COUNT(DISTINCT e.student_id) AS total_students")) {
          return Promise.resolve([[{ total_students: 15 }]]);
        }

        return Promise.resolve([[]]);
      });

    const result = await getAdminTeachersPageData();

    expect(result.summary.totalTeachers).toBe(2);
    expect(result.summary.activeTeachers).toBe(1);
    expect(result.summary.totalCourses).toBe(2);
    expect(result.summary.totalStudents).toBe(15);
    expect(result.teachers[0].status).toBe("active");
    expect(result.teachers[1].status).toBe("suspended");
    expect(result.teachers[0].courses[0].title).toBe("React căn bản");
    expect(result.teachers[1].specialization).toBe("Chưa cập nhật");
  });

  it("should return null when the teacher detail is not found", async () => {
    // Test nghiệp vụ: nếu admin mở chi tiết một giảng viên không tồn tại,
    // service phải trả về null thay vì trả về object rỗng.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await getAdminTeacherDetail(999);

    expect(result).toBeNull();
  });

  it("should suspend a teacher and send a notification when the admin changes status", async () => {
    // Test nghiệp vụ: khi admin khóa tài khoản giảng viên,
    // service phải cập nhật trạng thái và gửi thông báo cho giảng viên đó.
    queryMock
      .mockResolvedValueOnce([[{ id: 5, name: "Lê Văn D", email: "d@example.com", phone: "0900000005", avatar: null, created_at: "2024-03-01", bio: null, specialization: "Java", experience_years: 3, qualification: "Cử nhân", workplace: "ĐH B" }]])
      .mockResolvedValueOnce([[{ id: 20, title: "Java Spring", status: "PUBLISHED", student_count: 8, rating: 4.5 }]])
      .mockResolvedValueOnce([[{ type: "course", title: "Tạo khóa học", activity_time: "2024-03-10" }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await updateAdminTeacherStatus(5, "suspended");

    expect(result).toEqual({ id: 5, status: "suspended" });
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,
        type: "ACCOUNT_LOCKED",
        title: "Tài khoản giảng viên đã bị khóa",
      }),
    );
  });
});
