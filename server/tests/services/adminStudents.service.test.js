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
  getAdminStudentsPageData,
  getAdminStudentDetail,
  updateAdminStudentStatus,
} from "../../services/adminStudents.service.js";

describe("adminStudents.service", () => {
  beforeEach(() => {
    queryMock.mockReset();
    createNotificationMock.mockReset();
    createNotificationMock.mockResolvedValue(undefined);
  });

  it("should build admin student page summary and list from database results", async () => {
    // Test nghiệp vụ: khi admin mở trang học viên,
    // service phải tổng hợp số liệu thống kê và trả về danh sách học viên cùng thông tin khóa học đã đăng ký.
    queryMock.mockImplementation((query) => {
      if (typeof query === "string" && query.includes("COUNT(*) AS total_students")) {
        return Promise.resolve([[{ total_students: 12, new_registrations: 3 }]]);
      }

      if (typeof query === "string" && query.includes("COUNT(DISTINCT e.student_id) AS active_students")) {
        return Promise.resolve([[{ active_students: 8, average_progress: 72.3456 }]]);
      }

      if (typeof query === "string" && query.includes("enrolled_courses_count")) {
        return Promise.resolve([[
          {
            id: 1,
            name: "Nguyễn Văn A",
            email: "a@example.com",
            avatar: null,
            account_status: "ACTIVE",
            created_at: "2024-01-01",
            enrolled_courses_count: 2,
            progress_percentage: 80,
          },
          {
            id: 2,
            name: "Trần Thị B",
            email: "b@example.com",
            avatar: null,
            account_status: "LOCKED",
            created_at: "2024-02-01",
            enrolled_courses_count: 1,
            progress_percentage: 30,
          },
        ]]);
      }

      if (typeof query === "string" && query.includes("e.student_id AS user_id")) {
        return Promise.resolve([[
          { student_id: 1, course_id: 10, title: "React căn bản" },
          { student_id: 1, course_id: 11, title: "Node.js nâng cao" },
          { student_id: 2, course_id: 12, title: "SQL cho người mới" },
        ]]);
      }

      if (typeof query === "string" && query.includes("WHERE u.user_id = ? AND u.role = 'STUDENT'")) {
        return Promise.resolve([[{ id: 1, name: "Nguyễn Văn A", email: "a@example.com", avatar: null, created_at: "2024-01-01" }]]);
      }

      if (typeof query === "string" && query.includes("c.course_id AS id") && query.includes("c.course_name AS title")) {
        return Promise.resolve([[{ id: 10, title: "React căn bản", progress_percentage: 80 }]]);
      }

      if (typeof query === "string" && query.includes("student_activities")) {
        return Promise.resolve([[{ type: "enrollment", title: "Ghi danh khoa hoc: React căn bản", activity_time: "2024-01-02" }]]);
      }

      return Promise.resolve([[]]);
    });

    const result = await getAdminStudentsPageData();

    expect(result.summary.totalStudents.value).toBe(12);
    expect(result.summary.activeStudents.value).toBe(8);
    expect(result.summary.averageProgress.value).toBe(72.3);
    expect(result.students).toHaveLength(2);
    expect(result.students[0].status).toBe("active");
    expect(result.students[1].status).toBe("suspended");
    expect(result.selectedStudent).toEqual(
      expect.objectContaining({
        id: 1,
        name: "Nguyễn Văn A",
      }),
    );
  });

  it("should return null when the requested student does not exist", async () => {
    // Test nghiệp vụ: nếu admin mở chi tiết một học viên không tồn tại,
    // service phải trả về null thay vì trả về object rỗng.
    queryMock.mockResolvedValueOnce([[]]);

    const result = await getAdminStudentDetail(999);

    expect(result).toBeNull();
  });

  it("should suspend a student and send a notification when the admin changes status", async () => {
    // Test nghiệp vụ: khi admin khóa tài khoản học viên,
    // service phải cập nhật trạng thái trong DB và gửi thông báo tới học viên.
    queryMock
      .mockResolvedValueOnce([[{ id: 5, name: "Lê Văn C", email: "c@example.com", avatar: null, created_at: "2024-03-01" }]])
      .mockResolvedValueOnce([[{ id: 5, title: "React căn bản", progress_percentage: 40 }]])
      .mockResolvedValueOnce([[{ id: 5, title: "Node.js nâng cao", progress_percentage: 70 }]])
      .mockResolvedValueOnce([[{ id: 5, title: "Hoạt động mới", activity_time: "2024-03-10" }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const result = await updateAdminStudentStatus(5, "suspended");

    expect(result).toEqual({ id: 5, status: "suspended" });
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,
        type: "ACCOUNT_LOCKED",
        title: "Tài khoản đã bị khóa",
      }),
    );
  });
});
